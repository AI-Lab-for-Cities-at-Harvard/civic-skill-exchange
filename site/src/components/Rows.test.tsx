/** The browse page's collapsible rows (#208, ADR 0008 decisions 1 and 2).
 *
 *  A closed row is the name, the namespace, the tier word, the Lab label when
 *  it applies, the category and a Details button. The tier's note leaves the
 *  closed row's sight and nothing else does: it stays in the markup, visually
 *  hidden, so a screen reader still hears "Community, automated checks only".
 *  An open row adds the tier chip with its note, the other badges, the
 *  description, the scopes and the link to the listing's page.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkillRow, PluginRow } from "./Rows";
import { makePlugin, makeSkill } from "../test/fixtures";
import { strings } from "../i18n/strings";

afterEach(cleanup);

const REVIEWED = {
  date: "2026-08-30", expires: "2027-08-30",
  reviewers: ["AI Lab for Cities at Harvard"], notes: "",
};

const row = (ui: React.ReactElement) => {
  const { container } = render(<ul>{ui}</ul>);
  const li = container.querySelector("li")!;
  const toggle = within(li).getByRole("button");
  const body = document.getElementById(toggle.getAttribute("aria-controls")!)!;
  const head = li.firstElementChild as HTMLElement;
  return { li, head, toggle, body };
};

describe("a closed skill row", () => {
  it("names the skill as a heading at the level it is given, and links it", () => {
    const { head } = row(<SkillRow level={3}
      skill={makeSkill({ name: "permit-status-explainer", namespace: "cityofboston" })} />);
    const h = within(head).getByRole("heading", { level: 3 });
    expect(within(h).getByRole("link", { name: "permit-status-explainer" }))
      .toHaveAttribute("href", "#/skill/cityofboston/permit-status-explainer");
    expect(within(head).getByText("cityofboston")).toBeInTheDocument();
  });

  it("takes its heading level from its parent", () => {
    const { head } = row(<SkillRow level={2} skill={makeSkill()} />);
    expect(within(head).getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(within(head).queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("shows the tier word, with its note visually hidden but still there", () => {
    const { head } = row(<SkillRow level={3} skill={makeSkill({ tier: "community" })} />);
    const word = strings().vocabulary.tier.community;
    const chip = within(head).getByText(word, { exact: false });
    expect(chip).toHaveClass("badge");
    const note = within(chip).getByText(strings().badges.tier.communityNote, { exact: false });
    expect(note).toHaveClass("vh");
  });

  it("hides a Reviewed listing's reviewer the same way", () => {
    const { head } = row(<SkillRow level={3} skill={makeSkill({ tier: "reviewed", reviewed: REVIEWED })} />);
    expect(within(head).getByText(/AI Lab for Cities at Harvard/)).toHaveClass("vh");
  });

  it("carries the Lab label on a Lab listing, beside the tier", () => {
    const { head } = row(<SkillRow level={3} skill={makeSkill({ namespace: "civic-skills" })} />);
    expect(within(head).getByText(strings().badges.lab)).toBeInTheDocument();
    // ADR 0002 decision 3: the Community chip stays on the Lab's rows too.
    expect(within(head).getByText(strings().vocabulary.tier.community, { exact: false }))
      .toBeInTheDocument();
  });

  it("carries no Lab label on anybody else's listing", () => {
    const { li } = row(<SkillRow level={3} skill={makeSkill({ namespace: "cityofx" })} />);
    expect(within(li).queryByText(strings().badges.lab)).toBeNull();
  });

  it("names both categories", () => {
    const { head } = row(<SkillRow level={3}
      skill={makeSkill({ category: "finance", category_secondary: "legal" })} />);
    expect(head).toHaveTextContent("Finance · Legal");
  });

  it("leaves the description, the scopes and the other badges to the open row", () => {
    const { head, body } = row(<SkillRow level={3} skill={makeSkill({
      description: "Explains permits.", scope: "municipal", data_sensitivity: "pii",
    })} />);
    expect(head).not.toHaveTextContent("Explains permits.");
    expect(head).not.toHaveTextContent(strings().vocabulary.scope.municipal);
    expect(head).not.toHaveTextContent(strings().vocabulary.sensitivity.pii);
    expect(body).not.toBeVisible();
  });

  it("has a real Details button that says what it opens", () => {
    const { toggle, body } = row(<SkillRow level={3} skill={makeSkill({ name: "permit-explainer" })} />);
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(body).toBeInTheDocument();
    expect(body).toHaveAttribute("hidden");
    // Twenty-four "Details" buttons need twenty-four names.
    expect(toggle).toHaveAccessibleName(`${strings().browse.details} permit-explainer`);
  });
});

describe("an open skill row", () => {
  async function opened(over = {}) {
    const r = row(<SkillRow level={3} skill={makeSkill({
      name: "permit-explainer", namespace: "ns", description: "Explains permits.",
      language: "es", scope: "municipal", scope_secondary: "regional",
      data_sensitivity: "pii", localization: "localized", ...over,
    })} />);
    await userEvent.setup().click(r.toggle);
    return r;
  }

  it("opens and closes on its button", async () => {
    const { toggle, body } = await opened();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(body).toBeVisible();
    expect(toggle).toHaveAccessibleName(`${strings().browse.hide} permit-explainer`);
    await userEvent.setup().click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(body).not.toBeVisible();
  });

  it("shows the tier chip with its note, and the other badges", async () => {
    const { body } = await opened();
    const note = within(body).getByText(strings().badges.tier.communityNote);
    expect(note).not.toHaveClass("vh");
    expect(body).toHaveTextContent(strings().vocabulary.sensitivity.pii);
    expect(body).toHaveTextContent(strings().vocabulary.localization.localized);
  });

  it("shows the description in its own language", async () => {
    const { body } = await opened();
    expect(within(body).getByText("Explains permits.")).toHaveAttribute("lang", "es");
  });

  it("leaves lang off a description in no declared language", async () => {
    const { body } = await opened({ language: null });
    expect(within(body).getByText("Explains permits.")).not.toHaveAttribute("lang");
  });

  it("names the levels of government", async () => {
    const { body } = await opened();
    expect(body).toHaveTextContent(
      `${strings().vocabulary.scope.municipal} · ${strings().vocabulary.scope.regional}`);
  });

  it("links to the skill's page", async () => {
    const { body } = await opened();
    expect(within(body).getByRole("link", { name: strings().browse.skillCta }))
      .toHaveAttribute("href", "#/skill/ns/permit-explainer");
  });

  it("does not show allowed-tools: that belongs on the skill's page", async () => {
    const { li } = await opened({ allowed_tools: ["Read", "Grep", "Bash"] });
    expect(li).not.toHaveTextContent("Read, Grep, Bash");
  });
});

describe("a plugin row", () => {
  it("is the same row, linked to the plugin's page", () => {
    const { head } = row(<PluginRow level={3} plugin={makePlugin()} />);
    expect(within(head).getByRole("heading", { level: 3 })).toHaveTextContent("housing-dashboards");
    expect(within(head).getByRole("link", { name: "housing-dashboards" }))
      .toHaveAttribute("href", "#/plugin/ns/housing-dashboards");
    expect(head).toHaveTextContent(strings().vocabulary.category["planning-land-use"]);
    expect(within(head).getByText(strings().badges.tier.communityNote, { exact: false }))
      .toHaveClass("vh");
  });

  it("opens to how many skills and servers it has, and its description", async () => {
    const { toggle, body } = row(<PluginRow level={3} plugin={makePlugin({ languages: ["es"] })} />);
    await userEvent.setup().click(toggle);
    expect(body).toHaveTextContent(strings().plugins.card.skills(2));
    expect(body).toHaveTextContent(strings().plugins.card.servers(1));
    expect(within(body).getByText(/Housing dashboards and briefs/)).toHaveAttribute("lang", "es");
    expect(within(body).getByRole("link", { name: strings().plugins.card.cta }))
      .toHaveAttribute("href", "#/plugin/ns/housing-dashboards");
  });

  it("says so when it connects to no server", async () => {
    const { toggle, body } = row(<PluginRow level={3} plugin={makePlugin({ mcp_servers: [] })} />);
    await userEvent.setup().click(toggle);
    expect(body).toHaveTextContent(strings().plugins.card.noServers);
  });

  it("carries the Lab label on a Lab plugin", () => {
    const { head } = row(<PluginRow level={3} plugin={makePlugin({ namespace: "civic-skills" })} />);
    expect(within(head).getByText(strings().badges.lab)).toBeInTheDocument();
  });
});

describe("the row's layout", () => {
  it("is a list item whose open part is a Stack", () => {
    const { li, body } = row(<SkillRow level={3} skill={makeSkill()} />);
    expect(li).toHaveClass("row");
    expect(body).toHaveClass("l-stack");
  });

  it("puts the tier and the Lab label in a Cluster", () => {
    const { head } = row(<SkillRow level={3} skill={makeSkill({ namespace: "civic-skills" })} />);
    const lab = within(head).getByText(strings().badges.lab);
    expect(lab.parentElement).toHaveClass("l-cluster");
  });
});
