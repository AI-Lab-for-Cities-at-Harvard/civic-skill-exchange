/** Ruling 3 on #23: the browse page gets a themed band at each end — the
 *  system's signature move, and until now used only on About. The upper band
 *  carries the standing Community notice from ruling 2. */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TierBand, ContributeBand } from "./Bands";

const MIXED = { total: 10, reviewed: 2, community: 8 };

describe("TierBand", () => {
  it("carries its own theme rather than inheriting the page's", () => {
    const { container } = render(<TierBand counts={MIXED} />);
    expect(container.querySelector("[data-theme]")).toBeInTheDocument();
  });

  it("explains both tiers", () => {
    render(<TierBand counts={MIXED} />);
    // By heading, not by text: "Community" also appears in the standing notice
    // below, and a bare text match cannot tell the two apart.
    expect(screen.getByRole("heading", { name: "Community" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reviewed" })).toBeInTheDocument();
  });

  /** ADR 0001: the band explained Reviewed as two named people from different
   *  organizations. It is the first thing a reader meets above the catalogue,
   *  so it is the first place the registry would have lied. */
  it("says who actually reads a Reviewed commit", () => {
    render(<TierBand counts={MIXED} />);
    expect(screen.getByText(/AI Lab for Cities/)).toBeInTheDocument();
    expect(screen.queryByText(/different organizations/i)).not.toBeInTheDocument();
  });

  it("carries the standing notice, counted from the catalogue", () => {
    render(<TierBand counts={MIXED} />);
    expect(screen.getByText(/8 of the 10 skills here are Community listings\./))
      .toBeInTheDocument();
  });

  it("drops the standing notice when nothing is Community", () => {
    render(<TierBand counts={{ total: 3, reviewed: 3, community: 0 }} />);
    expect(screen.queryByText(/Community listing/)).not.toBeInTheDocument();
  });
});

describe("ContributeBand", () => {
  it("carries its own theme", () => {
    const { container } = render(<ContributeBand repo="https://example.test/repo" />);
    expect(container.querySelector("[data-theme]")).toBeInTheDocument();
  });

  it("points at the contributor guide and the security model", () => {
    render(<ContributeBand repo="https://example.test/repo" />);
    expect(screen.getByRole("link", { name: /contribut/i }))
      .toHaveAttribute("href", expect.stringContaining("CONTRIBUTING.md"));
    expect(screen.getByRole("link", { name: /security/i }))
      .toHaveAttribute("href", expect.stringContaining("SECURITY.md"));
  });
});
