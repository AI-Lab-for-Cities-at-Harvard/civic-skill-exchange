/** The Beta marker (#123).
 *
 *  It says the *exchange* is new — the vocabulary may still change, fields may
 *  be added or dropped, a workflow may behave inconsistently. It deliberately
 *  says nothing about the skills, because the registry already carries three
 *  disclaimers about what a listing means and a fourth in the same voice would
 *  dilute all of them.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { BetaBadge, BETA_LABEL, BETA_SUMMARY, RELEASE_STAGE } from "./Beta";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

describe("the Beta badge", () => {
  it("renders while the release stage says so", () => {
    render(<BetaBadge />);
    expect(screen.getByText(BETA_LABEL)).toBeInTheDocument();
  });

  it("points at what is unstable rather than explaining it in the header", () => {
    render(<BetaBadge />);
    expect(screen.getByRole("link", { name: BETA_LABEL }))
      .toHaveAttribute("href", "#/about/beta");
  });

  it("carries no tier styling, so it cannot read as a claim about a skill", () => {
    const { container } = render(<BetaBadge />);
    const cls = container.querySelector(".beta")?.className ?? "";
    expect(cls).not.toMatch(/badge--ok|badge--warn/);
  });

  it("says nothing about whether skills are safe or reviewed", () => {
    const text = `${BETA_LABEL} ${BETA_SUMMARY}`.toLowerCase();
    for (const word of ["safe", "unsafe", "reviewed", "untested", "endorse"]) {
      expect(text).not.toContain(word);
    }
  });

  it("says what is unstable about the exchange", () => {
    expect(BETA_SUMMARY.toLowerCase()).toMatch(/chang|flux|settl|move/);
  });
});

describe("leaving Beta is one edit, and the test says what else to touch", () => {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");

  it("keeps the README in step with the release stage", () => {
    if (RELEASE_STAGE === "beta") {
      expect(readme).toContain(BETA_LABEL);
    } else {
      expect(readme).not.toContain(BETA_LABEL);
    }
  });

  it("states it near the top, where somebody deciding whether to adopt reads", () => {
    if (RELEASE_STAGE !== "beta") return;
    const position = readme.indexOf(BETA_LABEL);
    expect(position).toBeGreaterThan(-1);
    expect(readme.slice(0, position).split("\n").length).toBeLessThanOrEqual(8);
  });

  it("renders nothing at all once the stage changes", () => {
    // The component is the switch. Nothing else decides whether to show it.
    const source = readFileSync(join(ROOT, "site", "src", "components", "Beta.tsx"), "utf8");
    expect(source).toMatch(/RELEASE_STAGE !== "beta"[\s\S]{0,40}return null/);
  });
});
