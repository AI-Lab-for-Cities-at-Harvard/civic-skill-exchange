/** A single skill one level down (ADR 0006, decisions 1 and 4; #273).
 *
 *  A nested listing is `skills/{ns}/{name}/skills/{name}/SKILL.md`, with the
 *  two generated manifests at the listing root and nothing else there. Flat
 *  listings keep passing until the move retires them, so both layouts are
 *  accepted here, and each is held to its own rules.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkChangedLayout } from "./layout";
import {
  checkStructureCore, innerSkillLayout, isNestedSkillListing, nestedSkillLayout, skillLayoutFor,
  MAX_FILES_PER_SKILL, SKILL_LAYOUT, type Entry,
} from "./structure-core";
import { checkStructure } from "./structure";
import { validateSkill } from "./skill";

const CATEGORIES = ["data-analysis", "housing"];

const bytes = (s: string) => new TextEncoder().encode(s);
const file = (path: string, content = "x\n"): Entry =>
  ({ path, kind: "file", bytes: bytes(content) });
const dir = (path: string): Entry => ({ path, kind: "dir" });
const messages = (f: { where: string; message: string }[]) =>
  f.map((x) => `${x.where}: ${x.message}`).join(" | ");

const NAME = "permit-explainer";
const INNER = `skills/${NAME}`;

/** A nested listing's entries, sorted the way readEntries sorts them. */
const nested = (...extra: Entry[]): Entry[] => [
  dir(".claude-plugin"),
  file(".claude-plugin/plugin.json", "{}\n"),
  dir(".codex-plugin"),
  file(".codex-plugin/plugin.json", "{}\n"),
  dir("skills"),
  dir(INNER),
  file(`${INNER}/SKILL.md`, "---\nname: permit-explainer\n---\n"),
  ...extra,
].sort((a, b) => a.path.localeCompare(b.path));

const check = (...extra: Entry[]) => checkStructureCore(nested(...extra), nestedSkillLayout(NAME));

describe("telling the layouts apart", () => {
  it("reads a listing with skills/ and no root SKILL.md as nested", () => {
    expect(isNestedSkillListing(nested())).toBe(true);
    expect(skillLayoutFor(nested(), NAME)).not.toBe(SKILL_LAYOUT);
  });

  it("reads a listing with a root SKILL.md as flat", () => {
    const flat = [file("SKILL.md"), dir("references"), file("references/a.md")];
    expect(isNestedSkillListing(flat)).toBe(false);
    expect(skillLayoutFor(flat, NAME)).toBe(SKILL_LAYOUT);
  });

  it("reads a dropped folder as flat, which is what the submission page has", () => {
    expect(isNestedSkillListing([file("SKILL.md"), file("scripts/x.py")])).toBe(false);
  });
});

describe("a nested listing's root", () => {
  it("accepts the generated manifests and skills/{name}/", () => {
    expect(check()).toEqual([]);
  });

  it.each([
    ["README.md", "README.md"],
    ["context.template.yml", "context.template.yml"],
    ["notes/extra.md", "notes"],
  ])("refuses %s, and says it goes in skills/{name}/", (path, where) => {
    const entries = path.includes("/") ? [dir(where), file(path)] : [file(path)];
    const findings = check(...entries);
    expect(findings.map((f) => f.where)).toEqual([where]);
    expect(findings[0]?.message).toContain(`skills/${NAME}/${where}`);
  });

  it("refuses a root SKILL.md beside skills/, and says where it goes", () => {
    // Discovery reads this as flat (there is a root SKILL.md), so the nested
    // rules only meet it when a caller asks for them.
    const findings = checkStructureCore(
      [...nested(), file("SKILL.md", "---\nname: x\n---\n")], nestedSkillLayout(NAME));
    expect(findings.map((f) => f.where)).toContain("SKILL.md");
  });

  it("refuses a server config at the root: a skill with an MCP server is a plugin", () => {
    const findings = check(file(".mcp.json", "{}\n"));
    expect(findings.map((f) => f.where)).toEqual([".mcp.json"]);
    expect(findings[0]?.message).toMatch(/plugins\//);
  });

  it.each([".codex-plugin/other.json", ".claude-plugin/marketplace.json"])(
    "refuses %s beside the generated manifest", (path) => {
      expect(check(file(path, "{}\n")).map((f) => f.where)).toEqual([path]);
    });

  it("refuses a second skill directory, and names the plugin route", () => {
    const findings = check(dir("skills/other"), file("skills/other/SKILL.md"));
    expect(findings.map((f) => f.where)).toEqual(["skills/other"]);
    expect(findings[0]?.message).toContain(`skills/${NAME}/`);
    expect(findings[0]?.message).toMatch(/plugins\//);
  });

  it("refuses an inner directory under a different name", () => {
    const entries: Entry[] = [
      dir(".codex-plugin"), file(".codex-plugin/plugin.json", "{}\n"),
      dir("skills"), dir("skills/wrong-name"), file("skills/wrong-name/SKILL.md"),
    ];
    const findings = checkStructureCore(entries, nestedSkillLayout(NAME));
    expect(findings.map((f) => f.where)).toEqual(["skills/wrong-name"]);
    expect(findings[0]?.message).toContain(`skills/${NAME}/`);
  });

  it("refuses a file directly in skills/", () => {
    expect(check(file("skills/README.md")).map((f) => f.where)).toEqual(["skills/README.md"]);
  });
});

describe("a nested listing's inner directory", () => {
  it("accepts what a flat skill may carry", () => {
    expect(check(
      dir(`${INNER}/references`), file(`${INNER}/references/notes.md`),
      dir(`${INNER}/scripts`), file(`${INNER}/scripts/helper.py`),
      file(`${INNER}/context.template.yml`),
    )).toEqual([]);
  });

  it.each(["hooks/hooks.json", "settings.json", "settings.local.json", ".lsp.json"])(
    "refuses %s, as in a plugin's skill", (path) => {
      const findings = check(file(`${INNER}/${path}`, "{}\n"));
      expect(findings.map((f) => f.where)).toEqual([`${INNER}/${path}`]);
    });

  it.each([".mcp.json", "mcp.json"])(
    "refuses %s: no client reads a server config inside the skill", (path) => {
      const findings = check(file(`${INNER}/${path}`, "{}\n"));
      expect(findings.map((f) => f.where)).toEqual([`${INNER}/${path}`]);
      expect(findings[0]?.message).toMatch(/plugins\//);
    });

  it.each([".claude-plugin/plugin.json", ".codex-plugin/plugin.json"])(
    "refuses %s: the registry generates the manifests at the listing root", (path) => {
      expect(check(file(`${INNER}/${path}`, "{}\n")).map((f) => f.where))
        .toEqual([`${INNER}/${path}`]);
    });

  it.each(["extra/SKILL.md", "references/SKILL.md", "assets/templates/SKILL.md"])(
    "refuses %s below the skill's own, and suggests SKILL.example.md", (path) => {
      const findings = check(file(`${INNER}/${path}`));
      expect(findings.map((f) => f.where)).toEqual([`${INNER}/${path}`]);
      expect(findings[0]?.message).toContain("SKILL.example.md");
    });

  it("accepts an example renamed SKILL.example.md", () => {
    expect(check(file(`${INNER}/references/SKILL.example.md`))).toEqual([]);
  });

  it("still applies the caps to the whole listing, manifests included", () => {
    // The two manifests and SKILL.md count, so MAX - 3 more files fill it.
    const fill = (n: number) => Array.from({ length: n },
      (_, i) => file(`${INNER}/references/${String(i).padStart(3, "0")}.md`));
    expect(check(...fill(MAX_FILES_PER_SKILL - 3))).toEqual([]);
    expect(messages(check(...fill(MAX_FILES_PER_SKILL - 2)))).toMatch(/file cap/);
  });
});

/** The submission page validates the folder an author brings with the rules
 *  CI applies once it sits in skills/{name}/. One layout holds them, and the
 *  nested layout delegates to it, so there is one copy of the rule. */
describe("innerSkillLayout, the inner directory's rules on their own", () => {
  const inner = (...extra: Entry[]) =>
    checkStructureCore([file("SKILL.md"), ...extra], innerSkillLayout(NAME));

  it.each([".mcp.json", "mcp.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json"])(
    "refuses %s, which a flat listing on disk still allows", (path) => {
      expect(inner(file(path, "{}\n")).map((f) => f.where)).toEqual([path]);
      expect(checkStructureCore([file("SKILL.md"), file(path, "{}\n")])).toEqual([]);
    });

  it.each(["hooks/hooks.json", "settings.json", ".lsp.json", "references/SKILL.md"])(
    "refuses %s, as the flat rules do", (path) => {
      expect(inner(file(path, "{}\n")).map((f) => f.where)).toEqual([path]);
    });

  it("gives the same message the nested layout gives inside skills/{name}/", () => {
    for (const path of [".mcp.json", "mcp.json", ".codex-plugin/plugin.json", "settings.json"]) {
      expect(check(file(`${INNER}/${path}`, "{}\n"))[0]?.message)
        .toBe(inner(file(path, "{}\n"))[0]?.message);
    }
  });
});

describe("a flat skill, until the move retires it", () => {
  const flat = (...extra: Entry[]) => checkStructureCore([file("SKILL.md"), ...extra]);

  it.each(["references/SKILL.md", "assets/SKILL.md", "nested/SKILL.md"])(
    "refuses %s, reversing #78's exemption, and suggests SKILL.example.md", (path) => {
      const findings = flat(file(path));
      expect(findings.map((f) => f.where)).toEqual([path]);
      expect(findings[0]?.message).toContain("SKILL.example.md");
    });
});

// --------------------------------------------------------------------------- //
// On disk: checkStructure and validateSkill pick the layout themselves.

const singleSkill = (name: string) => `---
name: ${name}
description: Explains a building permit's status in plain language for the resident who applied.
license: MIT
metadata:
  civic.category: housing
  civic.scope: municipal
  civic.language: en
  civic.data-sensitivity: none
  civic.human-review: advisory-only
  civic.maintainer: Test User
  civic.affiliation: individual
  civic.deployment: none
---

# ${name}

Body.
`;

describe("validating a nested listing on disk", () => {
  let root: string;
  let listing: string;

  const write = (rel: string, content: string) => {
    const path = join(listing, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "cse-nested-"));
    listing = join(root, "skills", "testuser", NAME);
    write(".codex-plugin/plugin.json", "{}\n");
    write(".claude-plugin/plugin.json", "{}\n");
    write(`${INNER}/SKILL.md`, singleSkill(NAME));
    write(`${INNER}/references/notes.md`, "# Notes\n");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("passes structure and frontmatter", () => {
    expect(checkStructure(listing)).toEqual([]);
    expect(validateSkill(listing, CATEGORIES, "testuser").findings).toEqual([]);
  });

  it("reads the inner SKILL.md with inPlugin false, so civic metadata stays in it", () => {
    // In a plugin these three fields would be refused as describing the whole
    // plugin. Here they are required, so dropping one is a finding.
    write(`${INNER}/SKILL.md`, singleSkill(NAME).replace("  civic.maintainer: Test User\n", ""));
    expect(messages(validateSkill(listing, CATEGORIES, "testuser").findings))
      .toMatch(/civic\.maintainer is required/);
  });

  it("holds the inner SKILL.md's name to the listing's", () => {
    write(`${INNER}/SKILL.md`, singleSkill("something-else"));
    expect(messages(validateSkill(listing, CATEGORIES, "testuser").findings))
      .toMatch(/does not match the directory/);
  });

  it("reports a missing inner SKILL.md under its own path", () => {
    rmSync(join(listing, INNER, "SKILL.md"));
    const findings = validateSkill(listing, CATEGORIES, "testuser").findings;
    expect(findings.map((f) => f.where)).toContain(`${INNER}: SKILL.md`);
  });

  it("refuses an inner directory under another name", () => {
    rmSync(join(listing, "skills"), { recursive: true });
    write("skills/other/SKILL.md", singleSkill("other"));
    expect(messages(validateSkill(listing, CATEGORIES, "testuser").findings))
      .toMatch(/skills\/other: /);
  });

  it("refuses an author file left at the listing root", () => {
    write("README.md", "# readme\n");
    expect(messages(checkStructure(listing))).toContain(`skills/${NAME}/README.md`);
  });

  it("still accepts a flat listing", () => {
    rmSync(join(listing, "skills"), { recursive: true });
    write("SKILL.md", singleSkill(NAME));
    expect(validateSkill(listing, CATEGORIES, "testuser").findings).toEqual([]);
  });
});

describe("--layout, over changed paths", () => {
  it("accepts a nested skill", () => {
    expect(checkChangedLayout([
      `skills/testuser/${NAME}/skills/${NAME}/SKILL.md`,
      `skills/testuser/${NAME}/skills/${NAME}/references/notes.md`,
    ])).toEqual([]);
  });

  it("still accepts a flat skill", () => {
    expect(checkChangedLayout([`skills/testuser/${NAME}/SKILL.md`])).toEqual([]);
  });

  it("refuses an inner directory whose name is not the listing's", () => {
    const findings = checkChangedLayout([`skills/testuser/${NAME}/skills/other/SKILL.md`]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain(`skills/testuser/${NAME}/skills/${NAME}/SKILL.md`);
  });

  it.each([
    `skills/testuser/${NAME}/references/SKILL.md`,
    `skills/testuser/${NAME}/assets/SKILL.md`,
    `skills/testuser/${NAME}/skills/${NAME}/references/SKILL.md`,
    `skills/testuser/${NAME}/skills/${NAME}/extra/SKILL.md`,
    "plugins/testuser/housing/skills/brief/references/SKILL.md",
    "plugins/testuser/housing/skills/brief/assets/SKILL.md",
  ])("refuses %s below a skill's own, and suggests SKILL.example.md", (path) => {
    const findings = checkChangedLayout([path]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("SKILL.example.md");
  });
});
