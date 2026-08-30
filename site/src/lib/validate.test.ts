/** The site imports the validator workspace directly — no duplicated logic.
 *  These tests exist to prove the wiring, not to re-test the rules. */

import { describe, it, expect } from "vitest";
import { checkFrontmatter } from "@civic-skill-exchange/validator/rules";
import {
  checkStructureCore, checkPathSafety, ALLOWED_SUFFIXES, MAX_FILES_PER_SKILL,
} from "@civic-skill-exchange/validator";

const CATEGORIES = ["budget-finance"];

const front = {
  name: "example-skill",
  description: "An example skill long enough to clear the minimum description length.",
  license: "MIT",
  metadata: {
    "civic.category": "budget-finance",
    "civic.jurisdiction": "generic",
    "civic.data-sensitivity": "none",
    "civic.human-review": "none",
    "civic.maintainer": "Test",
    "civic.contact": "t@example.com",
    "civic.affiliation": "individual",
    "civic.deployment": "none",
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
    expect(ALLOWED_SUFFIXES.has(".zip")).toBe(false);
    expect(MAX_FILES_PER_SKILL).toBe(60);
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
