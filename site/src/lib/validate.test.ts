/** The site imports the validator workspace directly — no duplicated logic.
 *  These tests exist to prove the wiring, not to re-test the rules. */

import { describe, it, expect } from "vitest";
import { checkFrontmatter } from "@civic-skill-exchange/validator/rules";
import {
  checkStructureCore, checkPathSafety, ALLOWED_SUFFIXES, MAX_FILES_PER_SKILL,
  singleSkillLayout, SKILL_LAYOUT,
} from "@civic-skill-exchange/validator";

const CATEGORIES = ["finance"];

const front = {
  name: "example-skill",
  description: "An example skill long enough to clear the minimum description length.",
  license: "MIT",
  metadata: {
    "civic.category": "finance",
    "civic.scope": "any",
    "civic.data-sensitivity": "none",
    "civic.human-review": "none",
    "civic.maintainer": "Test",
    "civic.affiliation": "individual",
    "civic.deployment": "none",
    "civic.language": "en",
  },
};

describe("the shared validator is importable from the site", () => {
  it("accepts a valid skill", () => {
    expect(checkFrontmatter(front, { categories: CATEGORIES })).toEqual([]);
  });

  it("rejects an invalid one, with a field to attach the error to", () => {
    const findings = checkFrontmatter(
      { ...front, name: "Bad Name" }, { categories: CATEGORIES },
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.where).toBe("name");
  });

  it("skips the directory check in the browser, where there is no directory", () => {
    expect(checkFrontmatter(front, { categories: CATEGORIES })).toEqual([]);
  });
});

/**
 * The structural rules reach the browser too, via the package entry point.
 *
 * These prove the wiring works from this side. What keeps the boundary honest
 * is validator/src/purity.test.ts, which reads the source for node: imports —
 * typechecking does not catch them, because @types/node is hoisted.
 */
describe("the structural rules are importable from the site", () => {
  it("accepts a well-formed entry list", () => {
    expect(checkStructureCore([
      { path: "SKILL.md", kind: "file", bytes: new TextEncoder().encode("---\nname: x\n---\n\nBody.\n") },
    ])).toEqual([]);
  });

  it("enforces the same file-type allowlist CI enforces", () => {
    expect(ALLOWED_SUFFIXES.has(".md")).toBe(true);
    // The point is that an archive is refused here exactly as it is in CI —
    // not what the cap happens to be. Asserting the number would only pin a
    // constant that measurement is allowed to move.
    expect(ALLOWED_SUFFIXES.has(".zip")).toBe(false);
    expect(MAX_FILES_PER_SKILL).toBeGreaterThan(0);
  });

  it("catches a symlink entry, which a browser could not spot for itself", () => {
    const findings = checkStructureCore([{ path: "link.md", kind: "symlink" }]);
    expect(findings[0]?.message).toMatch(/symlinks are not permitted/);
  });

  it("guards the paths a filesystem walk could never produce", () => {
    expect(checkPathSafety([
      { path: "../escape.md", kind: "file", bytes: new Uint8Array() },
    ])[0]?.message).toMatch(/escapes the skill directory/);
  });
});

/** ADR 0006: CI checks a listing's inner directory, and the submission page
 *  checks the flat folder an author brings, which is what lands there. Both
 *  run SKILL_LAYOUT, so the page refuses exactly what CI refuses inside
 *  skills/{name}/, a server config and a manifest copy included. */
describe("the submission page's flat folder gets the inner-directory rules", () => {
  const file = (path: string) =>
    ({ path, kind: "file" as const, bytes: new TextEncoder().encode("x\n") });
  const folder = [
    file(".claude-plugin/plugin.json"), file(".mcp.json"),
    file("SKILL.md"), file("hooks/hooks.json"), file("mcp.json"),
    file("references/SKILL.md"), file("references/notes.md"), file("settings.json"),
  ];
  const NAME = "example-skill";

  it("refuses a deep SKILL.md and suggests SKILL.example.md", () => {
    const findings = checkStructureCore(
      [file("SKILL.md"), file("references/SKILL.md")], SKILL_LAYOUT);
    expect(findings.map((f) => f.where)).toEqual(["references/SKILL.md"]);
    expect(findings[0]?.message).toContain("SKILL.example.md");
  });

  it.each([".mcp.json", "mcp.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json"])(
    "refuses %s, which only the registry writes, at the listing root", (path) => {
      const entries = [file("SKILL.md"), file(path)];
      expect(checkStructureCore(entries, SKILL_LAYOUT).map((f) => f.where))
        .toEqual([path]);
    });

  it("finds what CI finds in the same files one level down, in the same words", () => {
    const inner = `skills/${NAME}`;
    const nested = [
      { path: "skills", kind: "dir" as const },
      { path: inner, kind: "dir" as const },
      ...folder.map((e) => ({ ...e, path: `${inner}/${e.path}` })),
    ];
    const page = checkStructureCore(folder, SKILL_LAYOUT);
    const ci = checkStructureCore(nested, singleSkillLayout("testuser", NAME));
    expect(page.map((f) => f.where)).toEqual([
      ".claude-plugin/plugin.json", ".mcp.json", "hooks/hooks.json", "mcp.json",
      "references/SKILL.md", "settings.json",
    ]);
    expect(ci).toEqual(page.map((f) => ({
      where: `${inner}/${f.where}`,
      // The deep-SKILL.md message names the path it is about; the rest don't.
      message: f.where.endsWith("SKILL.md")
        ? f.message.split(f.where).join(`${inner}/${f.where}`) : f.message,
    })));
  });
});
