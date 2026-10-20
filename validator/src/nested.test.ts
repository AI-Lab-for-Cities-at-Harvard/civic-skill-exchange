/** A single skill one level down (ADR 0006, decisions 1 and 4; #273, #276).
 *
 *  A listing is `skills/{ns}/{name}/skills/{name}/SKILL.md`, with the two
 *  generated manifests at the listing root and nothing else there. The flat
 *  layout, SKILL.md at the listing root, is retired: it is refused, on disk and
 *  over changed paths, with the path it belongs at.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkChangedLayout } from "./layout";
import {
  checkStructureCore, singleSkillLayout, MAX_FILES_PER_SKILL, SKILL_LAYOUT, type Entry,
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

const NAMESPACE = "testuser";
const NAME = "permit-explainer";
const INNER = `skills/${NAME}`;
const NESTED_SKILL_MD = `skills/${NAMESPACE}/${NAME}/skills/${NAME}/SKILL.md`;

/** A listing's entries, sorted the way readEntries sorts them. */
const listing = (...extra: Entry[]): Entry[] => [
  dir(".claude-plugin"),
  file(".claude-plugin/plugin.json", "{}\n"),
  dir(".codex-plugin"),
  file(".codex-plugin/plugin.json", "{}\n"),
  dir("skills"),
  dir(INNER),
  file(`${INNER}/SKILL.md`, "---\nname: permit-explainer\n---\n"),
  ...extra,
].sort((a, b) => a.path.localeCompare(b.path));

const layout = singleSkillLayout(NAMESPACE, NAME);
const check = (...extra: Entry[]) => checkStructureCore(listing(...extra), layout);

describe("a listing's root", () => {
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

  it("refuses a root SKILL.md beside skills/, and names the nested path", () => {
    const findings = check(file("SKILL.md", "---\nname: x\n---\n"));
    expect(findings.map((f) => f.where)).toEqual(["SKILL.md"]);
    expect(findings[0]?.message).toContain(NESTED_SKILL_MD);
  });

  it("refuses a flat listing, SKILL.md at the root and no skills/, naming the nested path", () => {
    const flat = [
      file("SKILL.md", "---\nname: x\n---\n"), dir("references"), file("references/a.md"),
    ];
    const findings = checkStructureCore(flat, layout);
    expect(findings.map((f) => f.where)).toEqual(["SKILL.md", "references"]);
    expect(findings[0]?.message).toContain(NESTED_SKILL_MD);
    expect(findings[1]?.message).toContain(`skills/${NAME}/references`);
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
    const findings = checkStructureCore(entries, layout);
    expect(findings.map((f) => f.where)).toEqual(["skills/wrong-name"]);
    expect(findings[0]?.message).toContain(`skills/${NAME}/`);
  });

  it("refuses a file directly in skills/", () => {
    expect(check(file("skills/README.md")).map((f) => f.where)).toEqual(["skills/README.md"]);
  });
});

describe("a listing's inner directory", () => {
  it("accepts what a skill may carry", () => {
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
 *  CI applies once it sits in skills/{name}/. One layout holds them,
 *  SKILL_LAYOUT, and the listing's layout delegates to it, so there is one
 *  copy of the rule. */
describe("SKILL_LAYOUT, the author's folder on its own", () => {
  const folder = (...extra: Entry[]) => checkStructureCore([file("SKILL.md"), ...extra]);

  it.each([".mcp.json", "mcp.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json"])(
    "refuses %s", (path) => {
      expect(folder(file(path, "{}\n")).map((f) => f.where)).toEqual([path]);
      expect(checkStructureCore([file("SKILL.md"), file(path, "{}\n")], SKILL_LAYOUT))
        .toEqual(folder(file(path, "{}\n")));
    });

  it.each(["hooks/hooks.json", "settings.json", ".lsp.json", "references/SKILL.md"])(
    "refuses %s", (path) => {
      expect(folder(file(path, "{}\n")).map((f) => f.where)).toEqual([path]);
    });

  it.each(["references/SKILL.md", "assets/SKILL.md", "nested/SKILL.md"])(
    "refuses %s, reversing #78's exemption, and suggests SKILL.example.md", (path) => {
      const findings = folder(file(path));
      expect(findings.map((f) => f.where)).toEqual([path]);
      expect(findings[0]?.message).toContain("SKILL.example.md");
    });

  it("gives the same message the listing's layout gives inside skills/{name}/", () => {
    for (const path of [".mcp.json", "mcp.json", ".codex-plugin/plugin.json", "settings.json"]) {
      expect(check(file(`${INNER}/${path}`, "{}\n"))[0]?.message)
        .toBe(folder(file(path, "{}\n"))[0]?.message);
    }
  });
});

// --------------------------------------------------------------------------- //
// On disk: checkStructure and validateSkill read the listing.

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

describe("validating a listing on disk", () => {
  let root: string;
  let listingDir: string;

  const write = (rel: string, content: string) => {
    const path = join(listingDir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "cse-nested-"));
    listingDir = join(root, "skills", NAMESPACE, NAME);
    write(".codex-plugin/plugin.json", "{}\n");
    write(".claude-plugin/plugin.json", "{}\n");
    write(`${INNER}/SKILL.md`, singleSkill(NAME));
    write(`${INNER}/references/notes.md`, "# Notes\n");
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("passes structure and frontmatter", () => {
    expect(checkStructure(listingDir)).toEqual([]);
    expect(validateSkill(listingDir, CATEGORIES, NAMESPACE).findings).toEqual([]);
  });

  it("reads the inner SKILL.md with inPlugin false, so civic metadata stays in it", () => {
    // In a plugin these three fields would be refused as describing the whole
    // plugin. Here they are required, so dropping one is a finding.
    write(`${INNER}/SKILL.md`, singleSkill(NAME).replace("  civic.maintainer: Test User\n", ""));
    expect(messages(validateSkill(listingDir, CATEGORIES, NAMESPACE).findings))
      .toMatch(/civic\.maintainer is required/);
  });

  it("holds the inner SKILL.md's name to the listing's", () => {
    write(`${INNER}/SKILL.md`, singleSkill("something-else"));
    expect(messages(validateSkill(listingDir, CATEGORIES, NAMESPACE).findings))
      .toMatch(/does not match the directory/);
  });

  it("reports a missing inner SKILL.md under its own path", () => {
    rmSync(join(listingDir, INNER, "SKILL.md"));
    const findings = validateSkill(listingDir, CATEGORIES, NAMESPACE).findings;
    expect(findings.map((f) => f.where)).toContain(`${INNER}: SKILL.md`);
  });

  it("refuses an inner directory under another name", () => {
    rmSync(join(listingDir, "skills"), { recursive: true });
    write("skills/other/SKILL.md", singleSkill("other"));
    expect(messages(validateSkill(listingDir, CATEGORIES, NAMESPACE).findings))
      .toMatch(/skills\/other: /);
  });

  it("refuses an author file left at the listing root", () => {
    write("README.md", "# readme\n");
    expect(messages(checkStructure(listingDir))).toContain(`skills/${NAME}/README.md`);
  });

  it("refuses a flat listing, and names where its SKILL.md goes", () => {
    renameSync(join(listingDir, INNER, "SKILL.md"), join(listingDir, "SKILL.md"));
    rmSync(join(listingDir, "skills"), { recursive: true });
    const structure = checkStructure(listingDir);
    expect(structure.map((f) => f.where)).toEqual(["SKILL.md"]);
    expect(structure[0]?.message).toContain(NESTED_SKILL_MD);
    const findings = validateSkill(listingDir, CATEGORIES, NAMESPACE).findings;
    expect(findings.map((f) => f.where)).toEqual(["SKILL.md", `${INNER}: SKILL.md`]);
  });
});

describe("--layout, over changed paths", () => {
  it("accepts a skill one level down", () => {
    expect(checkChangedLayout([
      `skills/${NAMESPACE}/${NAME}/skills/${NAME}/SKILL.md`,
      `skills/${NAMESPACE}/${NAME}/skills/${NAME}/references/notes.md`,
    ])).toEqual([]);
  });

  it("refuses a flat skill, and names the nested path", () => {
    const findings = checkChangedLayout([`skills/${NAMESPACE}/${NAME}/SKILL.md`]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.where).toBe(`skills/${NAMESPACE}/${NAME}/SKILL.md`);
    expect(findings[0]?.message).toContain(NESTED_SKILL_MD);
  });

  it("refuses an inner directory whose name is not the listing's", () => {
    const findings = checkChangedLayout([`skills/${NAMESPACE}/${NAME}/skills/other/SKILL.md`]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain(NESTED_SKILL_MD);
  });

  it.each([
    `skills/${NAMESPACE}/${NAME}/references/SKILL.md`,
    `skills/${NAMESPACE}/${NAME}/assets/SKILL.md`,
    `skills/${NAMESPACE}/${NAME}/skills/${NAME}/references/SKILL.md`,
    `skills/${NAMESPACE}/${NAME}/skills/${NAME}/extra/SKILL.md`,
    "plugins/testuser/housing/skills/brief/references/SKILL.md",
    "plugins/testuser/housing/skills/brief/assets/SKILL.md",
  ])("refuses %s below a skill's own, and suggests SKILL.example.md", (path) => {
    const findings = checkChangedLayout([path]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("SKILL.example.md");
  });
});
