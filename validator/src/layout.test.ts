/** #85: a skill in the wrong place used to pass every check.
 *
 *  These pin the shape that got through — four files at the repository root,
 *  one of them SKILL.md — and the exemption #78 needs.
 */

import { describe, it, expect } from "vitest";
import { checkChangedLayout } from "./layout";

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
