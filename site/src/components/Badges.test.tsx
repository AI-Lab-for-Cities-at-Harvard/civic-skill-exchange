import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SensitivityBadge, DeploymentBadge } from "./Badges";
import { SkillCard } from "./SkillCard";
import { makeSkill } from "../test/fixtures";

/** Data sensitivity moved from a meta row to a badge (#23, ruling 1). It badges
 *  the exception, not the default: 'none' is the common case and a chip on
 *  every card saying "no personal data" is chrome, not information. */
describe("SensitivityBadge", () => {
  it("says nothing when the skill touches no personal data", () => {
    const { container } = render(<SensitivityBadge value="none" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says nothing when the field is absent", () => {
    const { container } = render(<SensitivityBadge value={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("marks PII", () => {
    render(<SensitivityBadge value="pii" />);
    expect(screen.getByText(/personal data \(PII\)/i)).toBeInTheDocument();
  });

  it("marks a statutory regime, and warns rather than informs", () => {
    render(<SensitivityBadge value="protected" />);
    const badge = screen.getByText(/statutory regime/i);
    expect(badge.className).toMatch(/badge--warn/);
  });
});

describe("SkillCard carries the sensitivity badge", () => {
  it("shows it for a protected skill", () => {
    render(<SkillCard skill={makeSkill({ data_sensitivity: "protected" })} />);
    expect(screen.getByText(/statutory regime/i)).toBeInTheDocument();
  });

  it("stays clean for an ordinary one", () => {
    render(<SkillCard skill={makeSkill({ data_sensitivity: "none" })} />);
    expect(screen.queryByText(/personal data/i)).not.toBeInTheDocument();
  });
});

/** The card gives the deployment scope; the organization is a click away. A
 *  full claim — scope plus a department name — was most of a card's badge row. */
describe("DeploymentBadge", () => {
  const used = {
    self_reported: true, affiliation: "government", deployment: "organization" as const,
    deployed_at: "City of Boston, Department of Innovation and Technology",
    deployed_in: "US-MA / Boston", deployed_since: null,
  };

  it("gives scope alone on a card", () => {
    render(<DeploymentBadge provenance={used} />);
    expect(screen.getByText(/Used organization-wide/)).toBeInTheDocument();
    expect(screen.queryByText(/Department of Innovation/)).not.toBeInTheDocument();
  });

  it("names the organization on the detail page", () => {
    render(<DeploymentBadge provenance={used} detail />);
    expect(screen.getByText(/Department of Innovation/)).toBeInTheDocument();
  });

  it("still reaches the organization from a card, via the title", () => {
    render(<DeploymentBadge provenance={used} />);
    expect(screen.getByText(/Used organization-wide/))
      .toHaveAttribute("title", expect.stringContaining("City of Boston"));
  });

  it("says nothing when the skill has never been deployed", () => {
    const { container } = render(
      <DeploymentBadge provenance={{ ...used, deployment: "none", deployed_at: null }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
