import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SensitivityBadge, DeploymentBadge, TierBadge, LabBadge } from "./Badges";
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

/** ADR 0001, ruling 4: the badge renders from the ledger.
 *
 *  It used to hardcode "two reviewers signed off" on every Reviewed card, which
 *  became false the moment the tier meant one reviewer. A note derived from the
 *  attestation cannot drift from it — that is the whole point of the ruling, and
 *  these tests are what keeps a future edit from putting a literal back. */
describe("TierBadge names who attested, from the ledger", () => {
  const attestation = {
    date: "2026-08-30",
    expires: "2027-08-30",
    reviewers: ["AI Lab for Cities at Harvard"],
    notes: "Read-only.",
  };

  it("names the attesting party on a Reviewed listing", () => {
    render(<TierBadge tier="reviewed" reviewed={attestation} />);
    expect(screen.getByText(/AI Lab for Cities at Harvard read this commit/))
      .toBeInTheDocument();
  });

  it("never claims a count the ledger does not hold", () => {
    render(<TierBadge tier="reviewed" reviewed={attestation} />);
    expect(screen.queryByText(/two reviewers/i)).not.toBeInTheDocument();
  });

  it("names both when a second reviewer exists", () => {
    render(
      <TierBadge
        tier="reviewed"
        reviewed={{ ...attestation, reviewers: ["alice-gov", "bob-nonprofit"] }}
      />,
    );
    expect(screen.getByText(/alice-gov and bob-nonprofit read this commit/))
      .toBeInTheDocument();
  });

  it("falls back to the checklist rather than an empty claim", () => {
    render(<TierBadge tier="reviewed" reviewed={{ ...attestation, reviewers: [] }} />);
    expect(screen.getByText(/read against the published checklist/))
      .toBeInTheDocument();
  });

  it("leaves the Community note alone", () => {
    render(<TierBadge tier="community" />);
    expect(screen.getByText("automated checks only")).toBeInTheDocument();
  });
});

describe("SkillCard feeds the badge its attestation", () => {
  it("so a card says who read the commit, not how many did", () => {
    render(<SkillCard skill={makeSkill({
      tier: "reviewed",
      reviewed: {
        date: "2026-08-30", expires: "2027-08-30",
        reviewers: ["AI Lab for Cities at Harvard"], notes: "",
      },
    })} />);
    expect(screen.getByText(/AI Lab for Cities at Harvard read this commit/))
      .toBeInTheDocument();
  });
});

/** #51, from ADR 0001 ruling 2: a Lab-authored skill says so wherever it
 *  appears. #49 put the disclosure on the review claim, which is where the Lab
 *  vouches for itself — this is the other half, a standing marker that does not
 *  wait for a tier.
 *
 *  It states authorship and nothing else. The tier badge beside it renders the
 *  review claim from the ledger, and two chips making overlapping claims about
 *  the same thing is how one of them goes stale without anyone noticing. */
describe("LabBadge", () => {
  it("marks a skill in the reserved namespace", () => {
    render(<LabBadge namespace="civic-skills" />);
    expect(screen.getByText("Written by the AI Lab")).toBeInTheDocument();
  });

  it("says nothing about anybody else's skill", () => {
    const { container } = render(<LabBadge namespace="cityofx" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not care how the namespace was cased", () => {
    render(<LabBadge namespace="Civic-Skills" />);
    expect(screen.getByText("Written by the AI Lab")).toBeInTheDocument();
  });

  it("claims authorship and nothing about review", () => {
    render(<LabBadge namespace="civic-skills" />);
    expect(screen.queryByText(/review/i)).not.toBeInTheDocument();
  });
});

describe("the Lab badge stands at both tiers", () => {
  const lab = { namespace: "civic-skills" };

  it("appears on a Community card, where nothing else discloses it", () => {
    render(<SkillCard skill={makeSkill({ ...lab, tier: "community" })} />);
    expect(screen.getByText("Written by the AI Lab")).toBeInTheDocument();
  });

  it("appears on a Reviewed card, beside a tier badge that names the Lab too", () => {
    render(<SkillCard skill={makeSkill({
      ...lab, tier: "reviewed",
      reviewed: {
        date: "2026-08-30", expires: "2027-08-30",
        reviewers: ["AI Lab for Cities at Harvard"], notes: "",
      },
    })} />);
    // Two chips, two different facts: who wrote it, and who read it.
    expect(screen.getByText("Written by the AI Lab")).toBeInTheDocument();
    expect(screen.getByText(/AI Lab for Cities at Harvard read this commit/))
      .toBeInTheDocument();
  });

  it("stays off a card nobody at the Lab wrote", () => {
    render(<SkillCard skill={makeSkill({ namespace: "cityofx" })} />);
    expect(screen.queryByText(/Written by the AI Lab/)).not.toBeInTheDocument();
  });
});
