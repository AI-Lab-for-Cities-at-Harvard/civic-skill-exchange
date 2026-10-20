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
import { makeIndex, makePlugin, makeSkill } from "./test/fixtures";
import { waitForLazyPage } from "./test/lazy";

/** Enough skills for a second page of 24 (#208), a Lab listing, and plugins
 *  for the toggle's other side. */
const INDEX = {
  ...makeIndex([
    makeSkill(),
    makeSkill({ id: "ns/other", name: "other", tier: "reviewed",
      reviewed: { date: "2026-08-30", expires: "2027-08-30",
                  reviewers: ["AI Lab for Cities at Harvard"], notes: "" } }),
    makeSkill({ id: "civic-skills/lab", name: "lab", namespace: "civic-skills" }),
    ...Array.from({ length: 24 }, (_, i) =>
      makeSkill({ id: `ns/more-${i}`, name: `more-${i}`, data_sensitivity: "pii" })),
  ]),
  plugins: [makePlugin(), makePlugin({ id: "ns/kit", name: "kit" })],
};

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
async function expectPageClean(ready?: () => Element | null) {
  const host = document.body.appendChild(document.createElement("div"));
  const { container } = render(<App />, { container: host });
  await waitFor(() => expect(screen.getByTestId("footer-meta")).toBeInTheDocument());
  // A page loaded on demand is checked once it has arrived, not its fallback.
  await waitForLazyPage(ready);
  const violations = await findViolations(container);
  expect(violations, describeViolations(violations)).toEqual([]);
}

describe.each(locales())("the whole page has no axe violations — %s", (tag) => {
  beforeEach(async () => { await setLocale(tag); });

  it("browsing the catalog", async () => {
    await expectPageClean();
  });

  /* #208: each state of the browse page, in either theme. jsdom has no
     layout, so contrast is contrast.test.ts's; the theme still changes which
     markup and attributes are on the page. */
  describe.each(["light", "dark"])("the browse page's states — %s", (theme) => {
    beforeEach(() => { localStorage.setItem("theme", theme); });
    afterEach(() => { localStorage.removeItem("theme"); });

    it("page 2", async () => {
      window.history.replaceState(null, "", "#/?page=2");
      await expectPageClean(() => document.querySelector(".pager [aria-current=page]"));
    });

    it("the plugins side", async () => {
      window.history.replaceState(null, "", "#/?show=plugins");
      await expectPageClean(() => document.querySelector("#results li.row"));
    });

    it("a row opened", async () => {
      await expectPageClean(() => {
        const button = document.querySelector<HTMLButtonElement>("li.row button[aria-expanded=false]");
        button?.click();
        return document.querySelector("li.row button[aria-expanded=true]");
      });
    });

    it("the phone's filters opened, with two set (#328)", async () => {
      window.history.replaceState(null, "", "#/?category=hr&tier=reviewed");
      await expectPageClean(() => {
        const button = document.querySelector<HTMLButtonElement>("button[aria-controls=facets][aria-expanded=false]");
        button?.click();
        return document.querySelector("button[aria-controls=facets][aria-expanded=true]");
      });
    });

    it("the phone's filters closed (#328)", async () => {
      await expectPageClean(() => document.querySelector("button[aria-controls=facets][aria-expanded=false]"));
    });

    it("a filter that matches nothing", async () => {
      window.history.replaceState(null, "", "#/?q=nothing-matches-this");
      await expectPageClean();
    });
  });

  it("the about page", async () => {
    window.location.hash = "#/about";
    await expectPageClean();
  });

  it("the submission page", async () => {
    window.location.hash = "#/submit";
    await expectPageClean();
  });

  it("the guide", async () => {
    window.location.hash = "#/guide";
    // Its own chunk: wait for the page itself, not just its fallback clearing.
    await expectPageClean(() => document.getElementById("glossary"));
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
