/** The phone's filters (#328, ADR 0008 decision 6): below 1024px the facets
 *  start closed behind a Filters button that says how many are set.
 *
 *  jsdom lays nothing out, so this holds the markup (the button, the panel, its
 *  `hidden`) and the strings; the stylesheet's half, that `hidden` is overridden
 *  at 1024px and wider, is in styles/browse.layout.test.tsx, and both were
 *  checked in a real browser at 375px and 1280px.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { DEFAULT_LOCALE, locales, setLocale, strings } from "./i18n/strings";
import { makeIndex, makeSkill } from "./test/fixtures";

const INDEX = {
  ...makeIndex([
    makeSkill({ id: "ns/a", name: "a", category: "hr" }),
    makeSkill({ id: "ns/b", name: "b", category: "finance" }),
  ]),
  plugins: [],
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    /index\.json/.test(String(url))
      ? { ok: true, status: 200, json: async () => INDEX }
      : { ok: false, status: 404, json: async () => ({}) }));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "#/");
  await setLocale(DEFAULT_LOCALE);
});

async function open(hash = "#/") {
  window.history.replaceState(null, "", hash);
  render(<App />);
  await screen.findByTestId("footer-meta");
}

const t = () => strings();
const button = (n = 0) => screen.getByRole("button", { name: t().facets.toggle(n) });
const panel = () => document.getElementById("facets") as HTMLElement;

describe.each(locales())("the Filters button — %s", (tag) => {
  beforeEach(async () => { await setLocale(tag); });

  it("starts closed, controlling the facets", async () => {
    await open();
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(button()).toHaveAttribute("aria-controls", "facets");
    expect(panel()).toHaveAttribute("hidden");
    expect(panel()).toHaveClass("l-stack");
    expect(panel().querySelectorAll("fieldset.facet").length).toBeGreaterThan(0);
  });

  it("opens and closes, and focus stays on the button", async () => {
    await open();
    const user = userEvent.setup();
    await user.click(button());
    expect(button()).toHaveAttribute("aria-expanded", "true");
    expect(panel()).not.toHaveAttribute("hidden");
    expect(button()).toHaveFocus();
    await user.click(button());
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(panel()).toHaveAttribute("hidden");
    expect(button()).toHaveFocus();
  });

  it("does not close when a facet is chosen", async () => {
    await open();
    const user = userEvent.setup();
    await user.click(button());
    await user.click(screen.getByLabelText(new RegExp(t().vocabulary.category.hr)));
    expect(window.location.hash).toBe("#/?category=hr");
    expect(panel()).not.toHaveAttribute("hidden");
  });

  it("keeps the search above the button, outside the panel", async () => {
    await open();
    const search = screen.getByLabelText(t().facets.search.label);
    expect(panel().contains(search)).toBe(false);
    expect(search.compareDocumentPosition(button()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says how many facets are set, and the search is not one", async () => {
    await open("#/?q=permit&category=hr&tier=reviewed");
    expect(button(2)).toBeInTheDocument();
  });

  it("says only the word when none is set", async () => {
    await open("#/?q=permit");
    expect(button(0)).toBeInTheDocument();
  });
});

describe("the strings", () => {
  it("read as the issue words", async () => {
    await setLocale("en");
    expect(strings().facets.toggle(0)).toBe("Filters");
    expect(strings().facets.toggle(2)).toBe("Filters (2 on)");
    await setLocale("es");
    expect(strings().facets.toggle(0)).toBe("Filtros");
    expect(strings().facets.toggle(2)).toBe("Filtros (2 activos)");
  });
});
