/** Ruling 1 on #23: the tease trims to badges, title, description and a single
 *  meta line. Tools move to the detail page, which shows them with the
 *  no-prompt warning they need. Ruling 2: the per-card disclaimer paragraph is
 *  replaced by one standing notice above the grid. */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkillCard } from "./SkillCard";
import { makeSkill } from "../test/fixtures";

describe("SkillCard", () => {
  it("names the skill, and links it", () => {
    render(<SkillCard skill={makeSkill({ name: "permit-status-explainer", namespace: "cityofboston" })} />);
    const link = screen.getByRole("link", { name: /permit-status-explainer/ });
    expect(link).toHaveAttribute("href", "#/skill/cityofboston/permit-status-explainer");
    expect(screen.getByText("cityofboston")).toBeInTheDocument();
  });

  it("carries the tier badge", () => {
    render(<SkillCard skill={makeSkill({ tier: "community" })} />);
    expect(screen.getByText(/community/i)).toBeInTheDocument();
  });

  it("puts category and jurisdiction on one meta line", () => {
    render(<SkillCard skill={makeSkill({ category: "budget-finance", jurisdiction: "us-local" })} />);
    const meta = screen.getByTestId("card-meta");
    expect(meta).toHaveTextContent("Budget & Finance");
    expect(meta).toHaveTextContent("US — local");
  });

  it("does not show allowed-tools — that belongs on the detail page", () => {
    render(<SkillCard skill={makeSkill({ allowed_tools: ["Read", "Grep", "Bash"] })} />);
    expect(screen.queryByText(/^Tools$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Read, Grep, Bash/)).not.toBeInTheDocument();
  });

  it("does not repeat the Community disclaimer — one standing notice says it", () => {
    render(<SkillCard skill={makeSkill({ tier: "community" })} />);
    expect(screen.queryByText(/read the skill and its scripts before you run it/i))
      .not.toBeInTheDocument();
  });

  it("offers the system's arrow-link affordance into the skill", () => {
    render(<SkillCard skill={makeSkill({ namespace: "ns", name: "example-skill" })} />);
    const cta = screen.getByTestId("card-cta");
    expect(cta).toHaveClass("arrow-link");
    expect(cta).toHaveAttribute("href", "#/skill/ns/example-skill");
  });
});
