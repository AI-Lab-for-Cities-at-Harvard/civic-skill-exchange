/** #6: axe over every surface, so a violation fails the pull request that
 *  introduced it rather than an audit six months later.
 *
 *  This is a registry for skills about plain language and accessibility.
 *  Failing WCAG here would be its own kind of statement.
 *
 *  Every surface, in every locale (#150). The strings differ, and so do the
 *  accessible names built out of them.
 */

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { DEFAULT_LOCALE, locales, setLocale } from "../i18n/strings";
import { findViolations, describeViolations } from "../test/axe";
import { makeSkill } from "../test/fixtures";
import { About } from "./About";
import { Submit } from "./Submit";
import { PluginSubmit } from "./PluginSubmit";
import { strToU8 } from "fflate";
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

afterEach(async () => { await setLocale(DEFAULT_LOCALE); });

describe.each(locales())("no axe violations — %s", (tag) => {
  beforeEach(async () => { await setLocale(tag); });

  it("About", async () => { await expectClean(<About skills={[]} />); });

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

  it("the plugin form, with one skill complete and one with gaps", async () => {
    const file = (path: string, text: string) => ({ path, kind: "file" as const, bytes: strToU8(text) });
    const meta = "metadata:\n  civic.category: policy\n  civic.scope: municipal\n" +
      "  civic.language: en\n  civic.data-sensitivity: none\n  civic.human-review: none\n";
    await expectClean(
      <PluginSubmit repo={REPO} directoryName="housing" left={[]} entries={[
        file("plugin.json", JSON.stringify({ name: "housing", description: "d" })),
        file("mcp.json", JSON.stringify({ mcpServers: {
          census: { type: "streamable-http", url: "https://census.example.org/mcp" } } })),
        file("skills/a/SKILL.md", `---\nname: a\ndescription: A skill.\nlicense: MIT\n${meta}---\n\nBody.\n`),
        file("skills/b/SKILL.md", "---\nname: b\ndescription: B skill.\nlicense: MIT\n---\n\nBody.\n"),
      ]} />,
    );
  });

  it("a converted Claude Code plugin, asking for a server's address (#250)", async () => {
    const file = (path: string, text: string) => ({ path, kind: "file" as const, bytes: strToU8(text) });
    const { container } = render(
      <PluginSubmit repo={REPO} directoryName="housing" left={[]} claudeCode entries={[
        file(".claude-plugin/plugin.json", JSON.stringify({ name: "housing", description: "d" })),
        file(".mcp.json", JSON.stringify({ mcpServers: {
          census: { type: "http", url: "${CENSUS_URL}" } } })),
        file("skills/b/SKILL.md", "---\nname: b\ndescription: B skill.\nlicense: MIT\n---\n\nBody.\n"),
      ]} />,
    );
    expect(container.querySelector("[data-testid='server-address-census'] input")).not.toBeNull();
    const violations = await findViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
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
