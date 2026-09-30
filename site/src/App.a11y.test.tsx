/** #6: axe over the whole document, not only isolated components.
 *
 *  Landmarks, heading order and region rules only mean anything against a full
 *  page — a component rendered on its own has no header, no main and no footer
 *  to be wrong about.
 *
 *  Run once per locale (#150). Accessibility is not a property of the English
 *  page: a translated string reaches an `aria-label`, a `lang`, a control's
 *  accessible name and the reading order, and a Spanish page with an unnamed
 *  control is as unusable as an English one.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { DEFAULT_LOCALE, locales, setLocale, strings } from "./i18n/strings";
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

afterEach(async () => {
  vi.unstubAllGlobals();
  window.location.hash = "";
  await setLocale(DEFAULT_LOCALE);
});

/** Waits for the index fetch to land, since the topper's counts and the whole
 *  catalogue only render after it. Keyed on the footer's test id rather than on
 *  its words: the words are what a locale changes. */
async function expectPageClean() {
  const host = document.body.appendChild(document.createElement("div"));
  const { container } = render(<App />, { container: host });
  await waitFor(() => expect(screen.getByTestId("footer-meta")).toBeInTheDocument());
  const violations = await findViolations(container);
  expect(violations, describeViolations(violations)).toEqual([]);
}

describe.each(locales())("the whole page has no axe violations — %s", (tag) => {
  beforeEach(async () => { await setLocale(tag); });

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

/** The marker qualifies the site identity, so it belongs on every page — not
 *  only the landing page. Somebody arriving on a skill detail page from a
 *  search result needs it as much as somebody arriving at the front (#123). */
describe("the Beta marker is on every page", () => {
  it.each(["#/", "#/about", "#/submit", "#/skill/ns/example"])(
    "%s carries it", async (hash) => {
      window.location.hash = hash;
      render(<App />);
      // Exact, not a regex: the About page's own contents list carries a
      // "What Beta means" link, which a loose match would also find. Read off
      // the table rather than written out, so it holds in every locale.
      const label = strings().badges.beta.label;
      expect(await screen.findByRole("link", { name: label })).toBeInTheDocument();
    });
});
