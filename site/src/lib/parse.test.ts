import { describe, it, expect } from "vitest";
import { draftFromSkillMd } from "./parse";

const SKILL = `---
name: permit-status-explainer
description: Explains why a permit is stuck.
license: MIT
allowed-tools: Read, Grep
metadata:
  civic.category: permitting-licensing
  civic.jurisdiction: us-local
  civic.maintainer: City of X
  civic.deployment: team
---

Body text that should not appear in the form.
`;

describe("draftFromSkillMd", () => {
  it("fills the form from a file somebody already has", () => {
    const { draft, problems } = draftFromSkillMd(SKILL, "cityofx");
    expect(problems).toEqual([]);
    expect(draft.name).toBe("permit-status-explainer");
    expect(draft.category).toBe("permitting-licensing");
    expect(draft.maintainer).toBe("City of X");
    expect(draft.author).toBe("cityofx");
  });

  it("keeps the defaults for fields the file does not set", () => {
    expect(draftFromSkillMd(SKILL).draft.dataSensitivity).toBe("none");
  });

  it("joins allowed-tools whether it was a list or a string", () => {
    expect(draftFromSkillMd(SKILL).draft.tools).toBe("Read, Grep");
    const asList = SKILL.replace("allowed-tools: Read, Grep", "allowed-tools:\n  - Read\n  - Grep");
    expect(draftFromSkillMd(asList).draft.tools).toBe("Read, Grep");
  });

  it("says so when there is no --- block", () => {
    expect(draftFromSkillMd("# Just a heading").problems[0]).toMatch(/---/);
  });

  it("refuses a YAML alias, which is the billion-laughs vector", () => {
    const aliased = "---\na: &x [1]\nb: *x\n---\n";
    expect(draftFromSkillMd(aliased).problems.length).toBeGreaterThan(0);
  });

  it("reports a broken block rather than throwing", () => {
    expect(draftFromSkillMd("---\n: : :\n---\n").problems.length).toBeGreaterThan(0);
  });
});
