/** Reading a submitted archive in the browser.
 *
 *  The registry publishes one zip per skill (#40), rooted at the skill
 *  directory. Dropping that same zip back on the submission page is the
 *  round-trip, so the reader is shaped by what write_archive() emits.
 *
 *  Unpacking happens in memory and never writes a path, which is what takes
 *  zip-slip off the table — it is a path-traversal-on-write attack. The escape
 *  checks below are still here because a malicious path must not reach
 *  checkStructureCore as though it were a real file, and because the submitter
 *  should be told their archive is malformed.
 */

import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { PLUGIN_ROOT_MANIFEST, readSkillZip } from "./zip";
import { MAX_FILE_BYTES, PLUGIN_MANIFEST } from "@civic-skill-exchange/validator";

const SKILL = `---
name: permit-status-explainer
description: Explains why a building permit is stuck, in plain language.
---

Body.
`;

function archive(files: Record<string, Uint8Array | string>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) {
    entries[k] = typeof v === "string" ? strToU8(v) : v;
  }
  return zipSync(entries);
}

const PUBLISHED = () => archive({
  "permit-status-explainer/SKILL.md": SKILL,
  "permit-status-explainer/scripts/reading_level.py": "print(1)\n",
  "permit-status-explainer/references/swaps.md": "# Swaps\n",
});

describe("readSkillZip", () => {
  it("strips the single root directory the published archive carries", () => {
    const { entries } = readSkillZip(PUBLISHED());
    expect(entries.map((e) => e.path).sort()).toEqual([
      "SKILL.md", "references/swaps.md", "scripts/reading_level.py",
    ]);
  });

  it("reports the directory name, which is what the name check compares against", () => {
    expect(readSkillZip(PUBLISHED()).directoryName).toBe("permit-status-explainer");
  });

  it("accepts an archive with no wrapping directory", () => {
    const { entries, directoryName } = readSkillZip(archive({ "SKILL.md": SKILL }));
    expect(entries.map((e) => e.path)).toEqual(["SKILL.md"]);
    expect(directoryName).toBeUndefined();
  });

  it("hands back bytes, which is the shape checkStructureCore takes", () => {
    const file = readSkillZip(archive({ "SKILL.md": SKILL })).entries[0];
    expect(file?.kind).toBe("file");
    expect(file?.kind === "file" ? file.bytes : null).toBeInstanceOf(Uint8Array);
  });

  it("surfaces the frontmatter so the same rules can run on it", () => {
    expect(readSkillZip(PUBLISHED()).skillMd).toContain("name: permit-status-explainer");
  });

  it("says so when there is no SKILL.md at the root", () => {
    const { skillMd, problems } = readSkillZip(archive({ "a/notes.md": "x" }));
    expect(skillMd).toBeNull();
    expect(problems.join(" ")).toMatch(/SKILL\.md/);
  });
});

describe("readSkillZip refuses malformed paths", () => {
  it("drops an entry escaping the root, and says which", () => {
    const { entries, problems } = readSkillZip(archive({
      "SKILL.md": SKILL, "../../etc/passwd": "x",
    }));
    expect(entries.map((e) => e.path)).toEqual(["SKILL.md"]);
    expect(problems.join(" ")).toMatch(/\.\./);
  });

  it("drops an absolute path", () => {
    const { entries, problems } = readSkillZip(archive({
      "SKILL.md": SKILL, "/etc/passwd": "x",
    }));
    expect(entries.every((e) => !e.path.startsWith("/"))).toBe(true);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("drops a backslash path, which Windows tooling writes and posix checks miss", () => {
    const { problems } = readSkillZip(archive({
      "SKILL.md": SKILL, "..\\\\..\\\\evil.md": "x",
    }));
    expect(problems.length).toBeGreaterThan(0);
  });
});

describe("readSkillZip refuses a decompression bomb before inflating it", () => {
  it("skips an entry whose declared size exceeds the per-file cap", () => {
    // Highly compressible, so the archive stays small while the entry does not.
    const big = new Uint8Array(MAX_FILE_BYTES + 1024);
    const { entries, problems } = readSkillZip(archive({
      "SKILL.md": SKILL, "huge.txt": big,
    }));
    expect(entries.map((e) => e.path)).toEqual(["SKILL.md"]);
    expect(problems.join(" ")).toMatch(/too large/i);
  });

  it("stops once the declared total exceeds the whole-skill cap", () => {
    const files: Record<string, Uint8Array> = { "SKILL.md": strToU8(SKILL) };
    for (let i = 0; i < 12; i++) files[`f${i}.txt`] = new Uint8Array(MAX_FILE_BYTES - 1);
    const { problems } = readSkillZip(archive(files));
    expect(problems.join(" ")).toMatch(/whole skill|total/i);
  });
});

// --------------------------------------------------------------------------- //
// #213: a plugin is a folder with plugin.json at its root, and dropping one
// switches the page into plugin mode by itself (ruling 1).

const MANIFEST = JSON.stringify({ name: "housing-dashboards", description: "x" });

describe("readSkillZip with a plugin", () => {
  it("looks for the validator's manifest file", () => {
    expect(PLUGIN_ROOT_MANIFEST).toBe(PLUGIN_MANIFEST);
  });

  const plugin = (root = "housing-dashboards/") => archive({
    [`${root}plugin.json`]: MANIFEST,
    [`${root}mcp.json`]: "{}",
    [`${root}skills/housing-brief/SKILL.md`]: SKILL,
    [`${root}skills/housing-brief/references/brief.md`]: "# Brief\n",
  });

  it("says a root plugin.json is a plugin, and a skill is not", () => {
    expect(readSkillZip(plugin()).plugin).toBe(true);
    expect(readSkillZip(PUBLISHED()).plugin).toBe(false);
  });

  it("does not ask a plugin for a root SKILL.md", () => {
    const read = readSkillZip(plugin());
    expect(read.skillMd).toBeNull();
    expect(read.problems).toEqual([]);
  });

  it("reads a plugin zipped without a wrapper folder", () => {
    const read = readSkillZip(plugin(""));
    expect(read.plugin).toBe(true);
    expect(read.directoryName).toBeUndefined();
    expect(read.entries.map((e) => e.path)).toContain("skills/housing-brief/SKILL.md");
  });

  it("finds the wrapper folder past the __MACOSX folder Finder adds", () => {
    const zip = archive({
      "housing-dashboards/plugin.json": MANIFEST,
      "housing-dashboards/skills/housing-brief/SKILL.md": SKILL,
      "__MACOSX/housing-dashboards/._plugin.json": "junk",
      "__MACOSX/housing-dashboards/skills/housing-brief/._SKILL.md": "junk",
    });
    const read = readSkillZip(zip);
    expect(read.directoryName).toBe("housing-dashboards");
    expect(read.plugin).toBe(true);
    expect(read.entries.map((e) => e.path).sort()).toEqual([
      "plugin.json", "skills/housing-brief/SKILL.md",
    ]);
  });

  it("leaves out the files a client or the registry writes, and says so", () => {
    const zip = archive({
      "plugin.json": MANIFEST,
      "skills/housing-brief/SKILL.md": SKILL,
      ".claude-plugin/plugin.json": "{}",
      ".codex-plugin/plugin.json": "{}",
      ".mcp.json": "{}",
    });
    const read = readSkillZip(zip);
    expect(read.entries.map((e) => e.path).sort()).toEqual([
      "plugin.json", "skills/housing-brief/SKILL.md",
    ]);
    expect(read.problems).toHaveLength(3);
    expect(read.problems.join("\n")).toContain(".codex-plugin/plugin.json");
  });

  it("recognises a Claude Code package, which has no plugin.json at its root", () => {
    const zip = archive({
      ".claude-plugin/plugin.json": "{}",
      ".mcp.json": "{}",
      "skills/housing-brief/SKILL.md": SKILL,
    });
    const read = readSkillZip(zip);
    expect(read.plugin).toBe(false);
    expect(read.clientPackage).toBe(true);
    expect(read.problems).toEqual([]);
  });
});
