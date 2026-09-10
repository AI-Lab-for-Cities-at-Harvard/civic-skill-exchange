/** L1 over the whole diff, not just what survived it.
 *
 *  `discoverChanged` can only see directories that still exist, so a pull
 *  request that *deleted* somebody else's skill validated as "no skill
 *  directories" and exited 0 (#154). The promise L1 makes in docs/SECURITY.md
 *  is about paths — "touches nothing outside `skills/{that-user}/`" — so the
 *  check has to run on the changed-path list, where a deletion is still
 *  visible.
 *
 *  The exemption is maintainers, resolved outside this module: who maintains
 *  the exchange is a fact about the organization, and the validator stays a
 *  function of its inputs.
 */

import { describe, it, expect } from "vitest";
import { checkChangedOwnership, authorForSkillCheck } from "./skill";

const messages = (paths: string[], author?: string, maintainer = false) =>
  checkChangedOwnership(paths, { author, maintainer })
    .map((f) => `${f.where}: ${f.message}`);

describe("checkChangedOwnership", () => {
  it("passes a pull request confined to the author's own namespace", () => {
    expect(messages([
      "skills/alice/one/SKILL.md",
      "skills/alice/one/scripts/thing.py",
    ], "alice")).toEqual([]);
  });

  it("fails a deletion from somebody else's namespace, naming path and namespace", () => {
    const found = messages(["skills/other/skill/SKILL.md"], "alice");
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("skills/other/skill/SKILL.md");
    expect(found[0]).toContain("other");
    expect(found[0]).toContain("alice");
  });

  it("exempts a maintainer's deletion", () => {
    expect(messages(["skills/other/skill/SKILL.md"], "alice", true)).toEqual([]);
  });

  /* A rename arrives in the diff as two paths. Only the destination is the
     author's, so a check that looked at the new path alone would let anyone
     migrate a skill out of a namespace they do not own. */
  it("fails a move out of another namespace on the deletion side", () => {
    const found = messages([
      "skills/other/skill/SKILL.md",
      "skills/alice/skill/SKILL.md",
    ], "alice");
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("skills/other/skill/SKILL.md");
  });

  it("exempts a maintainer's move", () => {
    expect(messages([
      "skills/other/skill/SKILL.md",
      "skills/alice/skill/SKILL.md",
    ], "alice", true)).toEqual([]);
  });

  it("names every offending path, not just the first", () => {
    expect(messages([
      "skills/other/skill/SKILL.md",
      "skills/other/skill/references/x.md",
    ], "alice")).toHaveLength(2);
  });

  /* rules.ts skips the author check for the reserved namespace, because
     CODEOWNERS requires maintainer approval on it. Path ownership follows the
     same rule rather than inventing a second one. */
  it("leaves the reserved namespace to CODEOWNERS", () => {
    expect(messages(["skills/civic-skills/one/SKILL.md"], "alice")).toEqual([]);
  });

  it("folds the login but not the namespace, which is exact-case (#155)", () => {
    expect(messages(["skills/alice/one/SKILL.md"], "Alice")).toEqual([]);
    expect(messages(["skills/Alice/one/SKILL.md"], "alice")).toHaveLength(1);
  });

  it("ignores paths outside skills/, and blank lines", () => {
    expect(messages([
      "", "  ", "README.md", "site/src/App.tsx", "scripts/scan.py",
    ], "alice")).toEqual([]);
  });

  /* The generated manifests are registry-owned and regenerated on every merge,
     so they appear in every namespace at once on maintenance work. */
  it("ignores the generated manifest in another namespace", () => {
    expect(messages([
      "skills/other/skill/.codex-plugin/plugin.json",
    ], "alice")).toEqual([]);
  });

  it("does not exempt a hand-written file that merely looks generated", () => {
    expect(messages([
      "skills/other/skill/nested/.codex-plugin/plugin.json",
    ], "alice")).toHaveLength(1);
  });

  it("flags a file dropped straight into skills/", () => {
    const found = messages(["skills/NOTICE.md"], "alice");
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("skills/NOTICE.md");
  });

  /* With no author there is nothing to compare against — the local runs of the
     validator pass none. Inventing a failure there would make `npm run check`
     disagree with CI in the other direction. */
  it("checks nothing when no author was given", () => {
    expect(messages(["skills/other/skill/SKILL.md"])).toEqual([]);
  });
});

/** Namespaces are exact-case (#155): the directory is the one canonical
 *  spelling and an uppercase character in it is rejected elsewhere. The login
 *  is case-insensitive, so the author is folded before comparing — an
 *  account typed as "Alice" owns skills/alice/ and nothing else. */
describe("checkChangedOwnership is exact-case on the namespace", () => {
  it("lets an author typed with capitals own the lowercase namespace", () => {
    expect(messages(["skills/alice/one/SKILL.md"], "Alice")).toEqual([]);
  });

  it("does not let that author own a namespace spelled with capitals", () => {
    expect(messages(["skills/Alice/one/SKILL.md"], "Alice")).toHaveLength(1);
  });

  it("does not treat a differently-cased reserved namespace as reserved", () => {
    expect(messages(["skills/Civic-Skills/one/SKILL.md"], "alice")).toHaveLength(1);
  });
});

/** The exemption has to reach both ownership checks (#176). The path-level
 *  check above takes `maintainer` directly; the per-skill check in
 *  checkFrontmatter takes an author and fails a namespace that differs from
 *  it, so for a maintainer it has to see no author at all — which is exactly
 *  how the local `npm run check` already runs. */
describe("authorForSkillCheck", () => {
  it("hands the per-skill check the pull request author when not a maintainer", () => {
    expect(authorForSkillCheck("alice", false)).toBe("alice");
  });

  it("hands it no author when the workflow resolved a maintainer", () => {
    expect(authorForSkillCheck("sgarcese-hbs", true)).toBeUndefined();
  });

  it("is a no-op locally, where there is no author to begin with", () => {
    expect(authorForSkillCheck(undefined, false)).toBeUndefined();
  });
});
