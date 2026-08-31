/** #6: axe over every surface, so a violation fails the pull request that
 *  introduced it rather than an audit six months later.
 *
 *  This is a registry for skills about plain language and accessibility.
 *  Failing WCAG here would be its own kind of statement.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { findViolations, describeViolations } from "../test/axe";
import { makeSkill } from "../test/fixtures";
import { About } from "./About";
import { Submit } from "./Submit";
import { SkillCard } from "./SkillCard";
import { TierBand, ContributeBand } from "./Bands";
import { DownloadBox } from "./DownloadBox";
import type { SkillDetail } from "../lib/types";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

async function expectClean(ui: React.ReactElement) {
  const { container } = render(ui);
  const violations = await findViolations(container);
  expect(violations, describeViolations(violations)).toEqual([]);
}

const detail = (over: Partial<SkillDetail> = {}): SkillDetail => ({
  ...makeSkill(),
  files: [{ path: "SKILL.md", size: 4096, executed: false }],
  archive: { path: "data/skills/ns/example-skill.zip", size: 5697 },
  ...over,
});

describe("no axe violations", () => {
  it("About", async () => { await expectClean(<About />); });

  it("a skill card", async () => {
    await expectClean(<SkillCard skill={makeSkill()} />);
  });

  it("a reviewed skill card, which renders more", async () => {
    await expectClean(<SkillCard skill={makeSkill({
      tier: "reviewed", namespace: "civic-skills", data_sensitivity: "protected",
      localization: "generalized",
      reviewed: { date: "2026-08-30", expires: "2027-08-30",
                  reviewers: ["AI Lab for Cities at Harvard"], notes: "" },
    })} />);
  });

  it("the tier band", async () => {
    await expectClean(<TierBand counts={{ total: 10, reviewed: 2, community: 8 }} />);
  });

  it("the contribute band", async () => {
    await expectClean(<ContributeBand repo="https://example.test/repo" />);
  });

  it("the download box", async () => {
    await expectClean(<DownloadBox skill={detail()} />);
  });

  it("the submission form", async () => {
    await expectClean(<Submit repo={REPO} skills={[]} mode="new" />);
  });

  it("the update mode", async () => {
    await expectClean(
      <Submit repo={REPO} skills={[makeSkill()]} mode="update" add="ns/example-skill" />,
    );
  });
});

/** Guards the guard. A harness that reports nothing because it is misconfigured
 *  looks exactly like a clean codebase. */
describe("the axe harness actually reports", () => {
  it("catches an input with no label", async () => {
    const { container } = render(<input type="text" />);
    const violations = await findViolations(container);
    expect(violations.map((v) => v.id)).toContain("label");
  });

  it("catches an image with no alt text", async () => {
    const { container } = render(<img src="x.png" />);
    const violations = await findViolations(container);
    expect(violations.map((v) => v.id)).toContain("image-alt");
  });

  it("catches a button with no accessible name", async () => {
    const { container } = render(<button />);
    const violations = await findViolations(container);
    expect(violations.map((v) => v.id)).toContain("button-name");
  });

  it("prints enough to act on", async () => {
    const { container } = render(<input type="text" />);
    const text = describeViolations(await findViolations(container));
    expect(text).toMatch(/label/);
    expect(text).toMatch(/<input/);
  });
});
