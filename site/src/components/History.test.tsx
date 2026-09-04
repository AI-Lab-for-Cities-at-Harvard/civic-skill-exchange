/** When a skill arrived, when it last changed, and the version its author
 *  claims (#77).
 *
 *  The two are shown differently on purpose. History is derived from git and is
 *  stated flatly; a version is the author's claim and is labelled as one, the
 *  same footing `provenance` already sits on with "Self-reported by the
 *  submitter". Neither may read as a quality signal: thirty commits means
 *  churn, not care.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { History } from "./History";

const full = {
  first_seen: "2026-03-14T09:22:41+00:00",
  last_changed: "2026-08-30T16:04:12+00:00",
  commits: 4,
  pull_request: 61,
};

describe("History", () => {
  it("says when the skill arrived and when it last changed", () => {
    render(<History history={full} version={null} />);
    expect(screen.getByText(/March 2026/)).toBeInTheDocument();
    expect(screen.getByText(/August 2026/)).toBeInTheDocument();
  });

  it("shows a declared version as the author's claim, not the registry's", () => {
    const { container } = render(<History history={full} version="2.1" />);
    expect(screen.getByText("2.1")).toBeInTheDocument();
    expect(container.textContent).toMatch(/author|self-reported|their own/i);
  });

  it("says nothing about a version when the author declared none", () => {
    // The section heading names it either way; what must be absent is the term
    // and a value, which would imply the registry has one.
    render(<History history={full} version={null} />);
    expect(screen.queryByRole("term", { name: "Version" })).not.toBeInTheDocument();
    expect(screen.queryByText(/self-reported/i)).not.toBeInTheDocument();
  });

  it("renders nothing at all when git could not answer", () => {
    const { container } = render(<History version={null} history={{
      first_seen: null, last_changed: null, commits: null, pull_request: null,
    }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("still shows a version when there is no history", () => {
    render(<History version="1.0" history={{
      first_seen: null, last_changed: null, commits: null, pull_request: null,
    }} />);
    expect(screen.getByText("1.0")).toBeInTheDocument();
  });

  it("links the pull request that introduced it", () => {
    render(<History history={full} version={null} />);
    expect(screen.getByRole("link", { name: /#61/ })).toHaveAttribute(
      "href", expect.stringContaining("/pull/61"));
  });

  it("says the count is a count and nothing more", () => {
    const { container } = render(<History history={full} version={null} />);
    // A number on its own invites reading it as a quality score.
    expect(container.textContent).toMatch(/not a measure|says nothing about/i);
  });

  it("says a namespace move resets the dates, since it silently would", () => {
    const { container } = render(<History history={{ ...full, commits: 2 }} version={null} />);
    expect(container.textContent).toMatch(/moved|renamed|this path/i);
  });
});
