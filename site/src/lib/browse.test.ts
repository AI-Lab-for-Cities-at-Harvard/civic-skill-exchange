/** The browse page's state in its URL (#208, ADR 0008 decision 4). */

import { describe, it, expect } from "vitest";
import { browseHref, parseBrowse, PAGE_SIZE, QUERY_MAX, type BrowseState } from "./browse";
import { parseRoute } from "./route";
import { EMPTY_FILTERS } from "./types";

const ALL: BrowseState = { filters: EMPTY_FILTERS, page: 1, show: "skills" };

describe("parseBrowse", () => {
  it("reads nothing as the whole catalogue on page 1", () => {
    expect(parseBrowse(undefined)).toEqual(ALL);
    expect(parseBrowse("")).toEqual(ALL);
  });

  it("reads every filter, the page and the section", () => {
    const s = parseBrowse(
      "q=plain+notice&category=hr&tier=reviewed&scope=municipal&localization=localized" +
      "&language=es-419&sensitivity=pii&page=2&show=plugins");
    expect(s).toEqual({
      filters: {
        q: "plain notice", category: "hr", tier: "reviewed", scope: "municipal",
        localization: "localized", language: "es-419", dataSensitivity: "pii",
      },
      page: 2,
      show: "plugins",
    });
  });

  it("drops a value that is not a vocabulary id", () => {
    const s = parseBrowse(
      "category=not-a-category&tier=gold&scope=galactic&localization=x" +
      "&language=<script>&sensitivity=secret");
    expect(s.filters).toEqual(EMPTY_FILTERS);
  });

  it("keeps a filter that is valid beside one that is not", () => {
    expect(parseBrowse("category=hr&tier=gold").filters)
      .toEqual({ ...EMPTY_FILTERS, category: "hr" });
  });

  it("caps the search", () => {
    const long = "a".repeat(QUERY_MAX + 50);
    expect(parseBrowse(`q=${long}`).filters.q).toHaveLength(QUERY_MAX);
  });

  it("keeps the search as typed, spaces and all", () => {
    expect(parseBrowse("q=permit%20").filters.q).toBe("permit ");
  });

  it("reads a page that is not a positive whole number as page 1", () => {
    for (const p of ["0", "-3", "two", "1.5x", ""]) {
      expect(parseBrowse(`page=${p}`).page, p).toBe(1);
    }
  });

  it("reads any section but plugins as skills", () => {
    expect(parseBrowse("show=everything").show).toBe("skills");
  });
});

describe("browseHref", () => {
  it("is the bare #/ for the whole catalogue on page 1", () => {
    expect(browseHref(ALL)).toBe("#/");
  });

  it("writes the filters, the page and the section in a stable order", () => {
    expect(browseHref({
      filters: { ...EMPTY_FILTERS, q: "permit", category: "hr", tier: "reviewed" },
      page: 2, show: "plugins",
    })).toBe("#/?q=permit&category=hr&tier=reviewed&page=2&show=plugins");
  });

  it("round-trips through the router", () => {
    const state: BrowseState = {
      filters: { ...EMPTY_FILTERS, q: "plain notice & more", language: "es", dataSensitivity: "protected" },
      page: 3, show: "skills",
    };
    const route = parseRoute(browseHref(state));
    expect(route.page).toBe("browse");
    expect(parseBrowse(route.page === "browse" ? route.query : undefined)).toEqual(state);
  });
});

describe("the page size", () => {
  it("is 24, as ruled", () => {
    expect(PAGE_SIZE).toBe(24);
  });
});

describe("the browse route", () => {
  it("carries the query of the browse page", () => {
    expect(parseRoute("#/?category=hr&page=2")).toEqual({ page: "browse", query: "category=hr&page=2" });
  });

  it("carries no query for the bare page or an unknown route", () => {
    expect(parseRoute("#/")).toEqual({ page: "browse" });
    expect(parseRoute("#/nope?category=hr")).toEqual({ page: "browse" });
  });
});
