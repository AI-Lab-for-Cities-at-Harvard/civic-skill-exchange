/** The browse page (#208, #319, ADR 0008): collapsible rows in numbered pages
 *  of 24, a Skills/Plugins toggle, and all of it in the URL.
 *
 *  Looked up through the string table rather than by English words, so each
 *  of these reads the same in any locale.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { DEFAULT_LOCALE, setLocale, strings } from "./i18n/strings";
import { makeIndex, makePlugin, makeSkill } from "./test/fixtures";
import type { Index } from "./lib/types";

const skills = (n: number) => Array.from({ length: n }, (_, i) => makeSkill({
  id: `ns/skill-${String(i + 1).padStart(2, "0")}`,
  name: `skill-${String(i + 1).padStart(2, "0")}`,
  category: i < 5 ? "hr" : "finance",
  description: i === 0 ? "Explains a permit." : "Something else.",
}));
const plugins = (n: number) => Array.from({ length: n }, (_, i) => makePlugin({
  id: `ns/plugin-${i + 1}`, name: `plugin-${i + 1}`,
  description: i === 0 ? "A permit kit." : "Housing tools.",
  categories: i === 0 ? ["hr"] : ["planning-land-use"],
}));
const catalogue = (s: number, p: number): Index => ({ ...makeIndex(skills(s)), plugins: plugins(p) });

let index: Index;
const scrollTo = vi.fn();
const scrollIntoView = vi.fn();

beforeEach(() => {
  index = catalogue(30, 3);
  scrollTo.mockClear();
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    /index\.json/.test(String(url))
      ? { ok: true, status: 200, json: async () => index }
      : { ok: false, status: 404, json: async () => ({}) }));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "#/");
  await setLocale(DEFAULT_LOCALE);
});

async function open(hash = "#/") {
  window.history.replaceState(null, "", hash);
  render(<App />);
  await screen.findByTestId("footer-meta");
}

const t = () => strings();
const count = () => document.querySelector(".results__count") as HTMLElement;
const rowNames = () => [...document.querySelectorAll("li.row .row__title a")].map((a) => a.textContent);
const toggle = () => screen.getByRole("navigation", { name: t().browse.show.label });
const sideLink = (side: "skills" | "plugins") =>
  within(toggle()).getByRole("link", { name: new RegExp(`^${t().browse.show[side]}\\b`) });
const pager = () => screen.getByRole("navigation", { name: t().browse.pager.label });

describe("the rows", () => {
  it("lists the skills as rows under a Skills heading, 24 to a page", async () => {
    await open();
    const section = screen.getByRole("region", { name: t().browse.show.skills });
    expect(within(section).getByRole("heading", { level: 2 })).toHaveTextContent(t().browse.show.skills);
    expect(within(section).getAllByRole("heading", { level: 3 })).toHaveLength(24);
    expect(rowNames()[0]).toBe("skill-01");
    expect(rowNames()).toHaveLength(24);
  });

  it("has no cards and no grid left", async () => {
    await open();
    expect(document.querySelector(".card, .grid")).toBeNull();
  });

  it("names the Lab on its rows and never as a section", async () => {
    index = { ...makeIndex([makeSkill({ namespace: "civic-skills", id: "civic-skills/x", name: "x" })]), plugins: [] };
    await open();
    expect(screen.getByText(t().badges.lab)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: new RegExp(t().badges.lab) })).toBeNull();
  });
});

describe("the count", () => {
  it("says which skills are shown when there is more than a page", async () => {
    await open();
    expect(count()).toHaveTextContent(t().results.range(1, 24, 30, 30));
  });

  it("says how many matched when everything fits on a page", async () => {
    index = catalogue(3, 1);
    await open();
    expect(count()).toHaveTextContent(t().results.all(3));
  });

  it("is the live region, and the whole results section is not", async () => {
    await open();
    expect(count()).toHaveAttribute("role", "status");
    expect(document.getElementById("results")).not.toHaveAttribute("aria-live");
  });
});

describe("numbered pages", () => {
  it("links each page to its own URL", async () => {
    await open();
    expect(within(pager()).getByRole("link", { name: `${t().browse.pager.page} 2` }))
      .toHaveAttribute("href", "#/?page=2");
    expect(within(pager()).getByRole("link", { name: `${t().browse.pager.page} 1` }))
      .toHaveAttribute("aria-current", "page");
  });

  it("opens on the page its URL names", async () => {
    await open("#/?page=2");
    expect(rowNames()).toEqual(["skill-25", "skill-26", "skill-27", "skill-28", "skill-29", "skill-30"]);
    expect(count()).toHaveTextContent(t().results.range(25, 30, 30, 30));
  });

  it("shows the last page for a page past the end", async () => {
    await open("#/?page=9");
    expect(rowNames()[0]).toBe("skill-25");
  });

  it("pushes a history entry, changes the rows in place and moves focus to the count", async () => {
    await open();
    const push = vi.spyOn(window.history, "pushState");
    await userEvent.setup().click(within(pager()).getByRole("link", { name: t().browse.pager.next }));
    expect(push).toHaveBeenCalledWith(null, "", "#/?page=2");
    expect(window.location.hash).toBe("#/?page=2");
    expect(rowNames()[0]).toBe("skill-25");
    await waitFor(() => expect(document.activeElement).toBe(count()));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("comes back to a page with Back", async () => {
    await open();
    await userEvent.setup().click(within(pager()).getByRole("link", { name: `${t().browse.pager.page} 2` }));
    act(() => {
      window.history.replaceState(null, "", "#/");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(rowNames()[0]).toBe("skill-01");
  });
});

describe("the filters in the URL", () => {
  it("reads them from the URL", async () => {
    await open("#/?category=hr");
    expect(rowNames()).toEqual(["skill-01", "skill-02", "skill-03", "skill-04", "skill-05"]);
    expect(count()).toHaveTextContent(t().results.some(5, 30));
  });

  it("drops a value that is not a vocabulary id, and shows the whole catalogue", async () => {
    await open("#/?category=nonsense&tier=gold");
    expect(count()).toHaveTextContent(t().results.range(1, 24, 30, 30));
  });

  it("replaces the history entry as the search is typed, and returns to page 1", async () => {
    await open("#/?page=2");
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    fireEvent.change(screen.getByLabelText(t().facets.search.label), { target: { value: "permit" } });
    expect(replace).toHaveBeenLastCalledWith(null, "", "#/?q=permit");
    expect(push).not.toHaveBeenCalled();
    expect(rowNames()).toEqual(["skill-01"]);
  });

  it("replaces the history entry when a facet is chosen", async () => {
    await open();
    const replace = vi.spyOn(window.history, "replaceState");
    const legend = screen.getByText(t().facets.category.legend);
    const facet = legend.closest("fieldset")!;
    await userEvent.setup().click(within(facet).getByLabelText(new RegExp(t().vocabulary.category.hr)));
    expect(replace).toHaveBeenLastCalledWith(null, "", "#/?category=hr");
  });

  it("clears them back to the bare #/", async () => {
    await open("#/?q=nothing-matches");
    await userEvent.setup().click(screen.getByRole("button", { name: t().facets.clear }));
    expect(window.location.hash).toBe("#/");
    expect(rowNames()).toHaveLength(24);
  });
});

describe("the Skills/Plugins toggle", () => {
  it("is two links with their counts, the side shown marked current", async () => {
    await open();
    expect(sideLink("skills")).toHaveAttribute("href", "#/");
    expect(sideLink("skills")).toHaveAttribute("aria-current", "true");
    expect(sideLink("skills")).toHaveTextContent("30");
    expect(sideLink("plugins")).toHaveAttribute("href", "#/?show=plugins");
    expect(sideLink("plugins")).not.toHaveAttribute("aria-current");
    expect(sideLink("plugins")).toHaveTextContent("3");
  });

  it("counts what the search and the filters leave", async () => {
    await open("#/?q=permit");
    expect(sideLink("skills")).toHaveTextContent("1");
    expect(sideLink("plugins")).toHaveTextContent("1");
    expect(sideLink("plugins")).toHaveAttribute("href", "#/?q=permit&show=plugins");
  });

  it("shows the plugins in place of the skills, and pushes a history entry", async () => {
    await open("#/?page=2");
    const push = vi.spyOn(window.history, "pushState");
    await userEvent.setup().click(sideLink("plugins"));
    expect(push).toHaveBeenCalledWith(null, "", "#/?show=plugins");
    const section = screen.getByRole("region", { name: t().plugins.heading });
    expect(within(section).getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(screen.queryByRole("region", { name: t().browse.show.skills })).toBeNull();
    expect(sideLink("plugins")).toHaveAttribute("aria-current", "true");
    expect(count()).toHaveTextContent(t().plugins.count.all(3));
  });

  it("does not jump to the top", async () => {
    await open();
    await userEvent.setup().click(sideLink("plugins"));
    await new Promise((r) => requestAnimationFrame(r));
    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("brings itself back into view when it has scrolled above the window", async () => {
    await open();
    const bar = toggle().closest(".browse__bar") as HTMLElement;
    vi.spyOn(bar, "getBoundingClientRect").mockReturnValue({ top: -400 } as DOMRect);
    await userEvent.setup().click(sideLink("plugins"));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(scrollIntoView.mock.contexts[0]).toBe(bar);
  });

  it("leaves a modified click to the browser", async () => {
    await open();
    const push = vi.spyOn(window.history, "pushState");
    expect(fireEvent.click(sideLink("plugins"), { metaKey: true })).toBe(true);
    expect(push).not.toHaveBeenCalled();
    // jsdom follows the link itself, a tick later; let it land here rather
    // than in the next test.
    await act(() => new Promise((r) => setTimeout(r, 0)));
  });

  it("follows the search and the facets on the plugins side", async () => {
    await open("#/?show=plugins&category=hr");
    const section = screen.getByRole("region", { name: t().plugins.heading });
    expect(within(section).getAllByRole("heading", { level: 3 }).map((h) => h.textContent))
      .toEqual(["plugin-1"]);
    expect(count()).toHaveTextContent(t().plugins.count.some(1, 3));
  });

  it("pages the plugins on their own once they pass 24", async () => {
    index = catalogue(3, 26);
    await open("#/?show=plugins&page=2");
    expect(count()).toHaveTextContent(t().plugins.count.range(25, 26, 26, 26));
    expect(within(pager()).getByRole("link", { name: `${t().browse.pager.page} 1` }))
      .toHaveAttribute("href", "#/?show=plugins");
  });

  it("is not there when the catalogue has no plugins", async () => {
    index = makeIndex(skills(3));
    await open("#/?show=plugins");
    expect(screen.queryByRole("navigation", { name: t().browse.show.label })).toBeNull();
    expect(rowNames()).toHaveLength(3);
  });
});

describe("the browse page is built on the primitives (#319)", () => {
  it("stacks the facets, the results and a facet's options", async () => {
    await open();
    expect(document.querySelector("aside.filters")).toHaveClass("l-stack");
    expect(document.getElementById("results")).toHaveClass("l-stack");
    for (const f of document.querySelectorAll("fieldset.facet .facet__options")) {
      expect(f).toHaveClass("l-stack");
    }
    expect(toggle().closest(".browse__bar")).toHaveClass("l-cluster");
  });
});
