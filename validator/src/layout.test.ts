/** #85: a skill in the wrong place used to pass every check.
 *
 *  These pin the shape that got through — four files at the repository root,
 *  one of them SKILL.md — and the exemption #78 needs.
 */

import { describe, it, expect } from "vitest";
import { checkChangedLayout, checkNamespaceCollisions } from "./layout";

describe("checkChangedLayout", () => {
  it("accepts a skill in the right place", () => {
    expect(checkChangedLayout([
      "skills/cityofx/permit-status/SKILL.md",
      "skills/cityofx/permit-status/scripts/check.py",
    ])).toEqual([]);
  });

  it("rejects the shape that got through — a skill at the repository root", () => {
    const findings = checkChangedLayout([
      "generalize-skill/SKILL.md",
      "generalize-skill/assets/context.template.yml",
      "generalize-skill/references/contract.md",
      "generalize-skill/references/what-is-local.md",
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.where).toBe("generalize-skill/SKILL.md");
    expect(findings[0]?.message).toContain("skills/{your-github-username}");
  });

  it("names the directory to move, so the fix is obvious", () => {
    const findings = checkChangedLayout(["generalize-skill/SKILL.md"]);
    expect(findings[0]?.message).toContain("Move generalize-skill into");
  });

  it("rejects a SKILL.md at the very top of the tree", () => {
    expect(checkChangedLayout(["SKILL.md"])).toHaveLength(1);
  });

  it("rejects a skill one level too shallow", () => {
    expect(checkChangedLayout(["skills/permit-status/SKILL.md"])).toHaveLength(1);
  });

  it("rejects a skill one level too deep", () => {
    expect(checkChangedLayout(["skills/cityofx/permit-status/sub/SKILL.md"]))
      .toHaveLength(1);
  });

  it("allows a template SKILL.md under references/, per #78", () => {
    expect(checkChangedLayout([
      "skills/cityofx/generalize/references/SKILL.md",
      "skills/cityofx/generalize/assets/example.SKILL.md",
    ])).toEqual([]);
  });

  it("ignores everything that is not a SKILL.md", () => {
    expect(checkChangedLayout([
      "README.md", "docs/ARCHITECTURE.md", "site/src/App.tsx",
      "scripts/build_index.py", ".claude-plugin/marketplace.json",
    ])).toEqual([]);
  });

  it("does not mistake a file merely containing the name", () => {
    expect(checkChangedLayout([
      "docs/MY-SKILL.md.txt", "site/src/lib/skill.ts", "SKILL.md.example",
    ])).toEqual([]);
  });

  it("reports every misplaced skill, not just the first", () => {
    expect(checkChangedLayout([
      "one/SKILL.md", "two/SKILL.md",
    ])).toHaveLength(2);
  });

  it("tolerates blank lines, which a changed-file list carries", () => {
    expect(checkChangedLayout(["", "  ", "skills/a/b/SKILL.md"])).toEqual([]);
  });
});

/** #155: 'alice' and 'ALICE' name the same GitHub account — logins are
 *  case-insensitive — so both landing under skills/ reads as one person
 *  holding two namespaces. checkNamespaceCase (rules.ts) rejects any single
 *  uppercase namespace on its own; this catches what that per-skill check
 *  cannot — two namespaces in the same changed-file list that a reviewer
 *  would read as distinct but that collide once case is ignored. */
describe("checkNamespaceCollisions", () => {
  it("rejects two namespaces in one batch that differ only by case", () => {
    const findings = checkNamespaceCollisions([
      "skills/alice/one/SKILL.md",
      "skills/ALICE/two/SKILL.md",
    ]);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.map((f) => f.message).join(" ")).toMatch(/case/);
  });

  it("accepts the same namespace repeated across several skills", () => {
    expect(checkNamespaceCollisions([
      "skills/alice/one/SKILL.md",
      "skills/alice/two/SKILL.md",
    ])).toEqual([]);
  });

  it("accepts two namespaces that do not collide", () => {
    expect(checkNamespaceCollisions([
      "skills/alice/one/SKILL.md",
      "skills/bob/two/SKILL.md",
    ])).toEqual([]);
  });

  it("ignores paths outside skills/, and blank lines", () => {
    expect(checkNamespaceCollisions(["", "  ", "README.md", "site/src/App.tsx"]))
      .toEqual([]);
  });

  it("reports only once per colliding pair, not once per file", () => {
    const findings = checkNamespaceCollisions([
      "skills/alice/one/SKILL.md",
      "skills/alice/one/scripts/x.py",
      "skills/ALICE/two/SKILL.md",
      "skills/ALICE/two/scripts/y.py",
    ]);
    expect(findings).toHaveLength(1);
  });
});
