/** #6: axe over the whole document, not only isolated components.
 *
 *  Landmarks, heading order and region rules only mean anything against a full
 *  page — a component rendered on its own has no header, no main and no footer
 *  to be wrong about.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { findViolations, describeViolations } from "./test/axe";
import { makeIndex, makeSkill } from "./test/fixtures";

const INDEX = makeIndex([
  makeSkill(),
  makeSkill({ id: "ns/other", name: "other", tier: "reviewed",
    reviewed: { date: "2026-08-30", expires: "2027-08-30",
                reviewers: ["AI Lab for Cities at Harvard"], notes: "" } }),
]);

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    /index\.json/.test(String(url))
      ? { ok: true, status: 200, json: async () => INDEX }
      : { ok: false, status: 404, json: async () => ({}) }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = "";
});

/** Waits for the index fetch to land, since the topper's counts and the whole
 *  catalogue only render after it. Keyed on the footer line, which every route
 *  shows and nothing else duplicates. */
async function expectPageClean() {
  const host = document.body.appendChild(document.createElement("div"));
  const { container } = render(<App />, { container: host });
  await waitFor(() => expect(screen.getByText(/Catalog generated/)).toBeInTheDocument());
  const violations = await findViolations(container);
  expect(violations, describeViolations(violations)).toEqual([]);
}

describe("the whole page has no axe violations", () => {
  it("browsing the catalog", async () => {
    await expectPageClean();
  });

  it("the about page", async () => {
    window.location.hash = "#/about";
    await expectPageClean();
  });

  it("the submission page", async () => {
    window.location.hash = "#/submit";
    await expectPageClean();
  });
});
