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
import { readSkillZip } from "./zip";
import { MAX_FILE_BYTES } from "@civic-skill-exchange/validator";

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
