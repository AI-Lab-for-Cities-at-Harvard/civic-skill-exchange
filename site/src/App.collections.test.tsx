/** Collections in the app (#209, ADR 0008 decisions 7 to 10).
 *
 *  Tiles at the top of the browse page, on the unfiltered first page of the
 *  skills only, and a page per collection at #/collection/{slug}, loaded on
 *  demand. A collection is not a review: its page says so in a notice, and
 *  every row keeps its own tier.
 *
 *  Looked up through the string table, so each reads the same in any locale.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { DEFAULT_LOCALE, locales, setLocale, strings } from "./i18n/strings";
import { makeCollection, makeIndex, makePlugin, makeSkill } from "./test/fixtures";
import { waitForLazyPage } from "./test/lazy";
import type { Index } from "./lib/types";

const REVIEWED = {
  date: "2026-08-30", expires: "2027-08-30",
  reviewers: ["AI Lab for Cities at Harvard"], notes: "",
};

const many = Array.from({ length: 30 }, (_, i) => makeSkill({
  id: `ns/more-${String(i).padStart(2, "0")}`, name: `more-${String(i).padStart(2, "0")}`,
}));
const SKILLS = [
  makeSkill(),
  makeSkill({ id: "ns/checked", name: "checked", tier: "reviewed", reviewed: REVIEWED,
    category: "hr" }),
  ...many,
];
const PERMITS = makeCollection({
  listings: [
    { kind: "plugin", id: "ns/housing-dashboards" },
    { kind: "skill", id: "ns/checked" },
    { kind: "skill", id: "ns/example-skill" },
  ],
});
const WRITING = makeCollection({
  slug: "writing-for-residents", title: "Writing for residents",
  title_es: "Escribir para los residentes", note: "Plain language.", note_es: "Lenguaje claro.",
  listings: [{ kind: "skill", id: "ns/more-01" }],
});
const QUIET = makeCollection({
  slug: "one-department", title: "One department", title_es: "Un departamento",
  featured: false, listings: [{ kind: "skill", id: "ns/more-02" }],
});

const catalogue = (over: Partial<Index> = {}): Index => ({
  ...makeIndex(SKILLS), plugins: [makePlugin()], collections: [PERMITS, WRITING, QUIET], ...over,
});

let index: Index;

beforeEach(() => {
  index = catalogue();
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    /index\.json/.test(String(url))
      ? { ok: true, status: 200, json: async () => index }
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
const tilesSection = () => screen.queryByRole("region", { name: t().collections.heading });
/** The page's own h1; the site's name in the header is the other. */
const pageTitle = () => document.querySelector("h1.detail__title") as HTMLElement;
const tileNames = () => [...document.querySelectorAll(".tile h3")].map((h) => h.textContent);

describe("the tiles on the browse page", () => {
  it("show the featured collections above the results, in the file's order", async () => {
    await open();
    expect(tilesSection()).not.toBeNull();
    expect(tileNames()).toEqual(["A permit, start to finish", "Writing for residents"]);
    const results = document.getElementById("results")!;
    expect(results.firstElementChild).toBe(tilesSection());
  });

  it("are not shown once a search is typed", async () => {
    await open("#/?q=permit");
    expect(tilesSection()).toBeNull();
  });

  it("are not shown once a facet is chosen", async () => {
    await open("#/?category=hr");
    expect(tilesSection()).toBeNull();
  });

  it("go when the reader starts typing, and come back when the search is cleared", async () => {
    const user = userEvent.setup();
    await open();
    const search = screen.getByRole("searchbox", { name: t().facets.search.label });
    await user.type(search, "x");
    expect(tilesSection()).toBeNull();
    await user.clear(search);
    expect(tilesSection()).not.toBeNull();
  });

  it("are not shown on page 2 and later", async () => {
    await open("#/?page=2");
    expect(tilesSection()).toBeNull();
  });

  it("are not shown on the plugins side", async () => {
    await open("#/?show=plugins");
    expect(tilesSection()).toBeNull();
  });

  it("are not there at all when no collection is featured", async () => {
    index = catalogue({ collections: [QUIET] });
    await open();
    expect(tilesSection()).toBeNull();
    expect(document.querySelector(".tile")).toBeNull();
  });

  it("are not there for an index built before collections existed", async () => {
    index = catalogue({ collections: undefined });
    await open();
    expect(tilesSection()).toBeNull();
  });

  it("leave the rows' headings at h3, under the Skills heading", async () => {
    await open();
    const skills = screen.getByRole("region", { name: t().browse.show.skills });
    expect(within(skills).getAllByRole("heading", { level: 3 })).toHaveLength(24);
  });
});

describe("a collection's page", () => {
  it("is reached from its tile with the keyboard", async () => {
    const user = userEvent.setup();
    await open();
    const link = screen.getByRole("link", { name: "A permit, start to finish" });
    link.focus();
    await user.keyboard("{Enter}");
    await waitForLazyPage(() => document.querySelector("h1.detail__title"));
    expect(window.location.hash).toBe("#/collection/permits-start-to-finish");
    expect(pageTitle()).toHaveTextContent("A permit, start to finish");
  });

  it("shows the title, the note and the notice that membership is not a review", async () => {
    await open("#/collection/permits-start-to-finish");
    await waitForLazyPage(() => document.querySelector("h1.detail__title"));
    expect(pageTitle()).toHaveTextContent(PERMITS.title);
    expect(screen.getByText(PERMITS.note)).toBeInTheDocument();
    const notice = screen.getByText(t().collections.caveat);
    expect(notice).toHaveClass("notice");
  });

  it("lists skills and plugins together, in the collection's order, as the browse page's rows", async () => {
    await open("#/collection/permits-start-to-finish");
    await waitForLazyPage(() => document.querySelector("li.row"));
    const names = [...document.querySelectorAll("li.row .row__title a")].map((a) => a.textContent);
    expect(names).toEqual(["housing-dashboards", "checked", "example-skill"]);
    expect(document.querySelector("li.row .row__title a"))
      .toHaveAttribute("href", "#/plugin/ns/housing-dashboards");
  });

  it("marks the plugin's row as a plugin, and no skill's", async () => {
    await open("#/collection/permits-start-to-finish");
    await waitForLazyPage(() => document.querySelector("li.row"));
    const rows = [...document.querySelectorAll<HTMLElement>("li.row")];
    expect(rows[0]).toHaveTextContent(t().plugins.row.kind(2));
    expect(rows[1]).not.toHaveTextContent(t().plugins.row.kind(2).split(" ")[0]!);
  });

  it("keeps every row's own tier", async () => {
    await open("#/collection/permits-start-to-finish");
    await waitForLazyPage(() => document.querySelector("li.row"));
    const rows = [...document.querySelectorAll<HTMLElement>("li.row")];
    expect(rows[0]).toHaveTextContent(t().vocabulary.tier.community);
    expect(rows[1]).toHaveTextContent(t().vocabulary.tier.reviewed);
    expect(rows[2]).toHaveTextContent(t().vocabulary.tier.community);
  });

  it("heads each row one level below the page's h1", async () => {
    await open("#/collection/permits-start-to-finish");
    await waitForLazyPage(() => document.querySelector("li.row"));
    const list = document.querySelector("ul.rows") as HTMLElement;
    expect(within(list).getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(within(list).queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  it("says how many listings are in it", async () => {
    await open("#/collection/permits-start-to-finish");
    await waitForLazyPage(() => document.querySelector("li.row"));
    expect(screen.getByText(t().collections.count(3))).toBeInTheDocument();
  });

  it("opens a row's details with the keyboard", async () => {
    const user = userEvent.setup();
    await open("#/collection/permits-start-to-finish");
    await waitForLazyPage(() => document.querySelector("li.row"));
    const toggle = document.querySelector<HTMLButtonElement>("li.row button[aria-expanded]")!;
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("is reachable for a collection that is not featured, at its own URL", async () => {
    await open("#/collection/one-department");
    await waitForLazyPage(() => document.querySelector("h1.detail__title"));
    expect(pageTitle()).toHaveTextContent("One department");
  });

  it("does not show the browse page's tiles or facets", async () => {
    await open("#/collection/permits-start-to-finish");
    await waitForLazyPage(() => document.querySelector("li.row"));
    expect(tilesSection()).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});

describe("an address with no collection at it", () => {
  it.each(["#/collection/nobody-made-this", "#/collection/Not_A_Slug"])(
    "%s says so plainly, with a link back to the catalogue", async (hash) => {
      await open(hash);
      await waitForLazyPage(() => document.querySelector(".page .notice"));
      const notice = screen.getByText(t().collections.missing);
      expect(notice).toHaveClass("notice");
      expect(notice).not.toHaveClass("notice--error");
      expect(screen.getByRole("link", { name: new RegExp(t().errors.backToCatalog) }))
        .toHaveAttribute("href", "#/");
    });
});

describe.each(locales())("a collection's page — %s", (tag) => {
  // The app opens in the language saved last, so the choice is saved too.
  beforeEach(async () => {
    localStorage.setItem("locale", tag);
    await setLocale(tag);
  });
  afterEach(() => { localStorage.removeItem("locale"); });

  it("is written in the reader's language", async () => {
    await open("#/collection/writing-for-residents");
    await waitForLazyPage(() => document.querySelector("h1.detail__title"));
    expect(pageTitle())
      .toHaveTextContent(tag === "es" ? WRITING.title_es : WRITING.title);
    expect(screen.getByText(tag === "es" ? WRITING.note_es : WRITING.note)).toBeInTheDocument();
  });
});
