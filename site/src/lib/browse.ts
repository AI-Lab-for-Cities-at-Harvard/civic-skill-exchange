import type { MouseEvent } from "react";
import { LANGUAGE_PATTERN } from "@civic-skill-exchange/validator/rules";
import {
  CATEGORY_LABELS, LOCALIZATION_LABELS, SCOPE_LABELS, SENSITIVITY_LABELS, TIER_LABELS,
} from "./labels";
import { EMPTY_FILTERS, type Filters } from "./types";

/** The browse page's state, all of it in its URL (#208, ADR 0008 decision 4),
 *  so a filtered page, a page number and the plugins side can be linked to
 *  and returned to with Back. `#/?q=…&category=…&tier=…&page=2&show=plugins`.
 *  An absent key is its default, so the bare `#/` is the whole catalogue on
 *  page 1. */
export interface BrowseState {
  filters: Filters;
  page: number;
  show: "skills" | "plugins";
}

/** Numbered pages of 24 (ADR 0008 decision 3). */
export const PAGE_SIZE = 24;

/** A search longer than this is not a search. */
export const QUERY_MAX = 200;

const LANGUAGE = new RegExp(LANGUAGE_PATTERN);
const closed = (labels: Record<string, string>) => (v: string) => Object.hasOwn(labels, v);

/** Each filter, the name it has in the URL, and what counts as one of its
 *  values. The order is the order the URL is written in. A value from the URL
 *  that is not a vocabulary id is dropped rather than carried: it reaches the
 *  facets, and a facet that matches nothing is a page that says nothing. */
const PARAMS: [Exclude<keyof Filters, "q">, string, (v: string) => boolean][] = [
  ["category", "category", closed(CATEGORY_LABELS)],
  ["tier", "tier", closed(TIER_LABELS)],
  ["scope", "scope", closed(SCOPE_LABELS)],
  ["localization", "localization", closed(LOCALIZATION_LABELS)],
  // The one open vocabulary: a listing may be in any language, so a tag
  // rather than a list.
  ["language", "language", (v) => LANGUAGE.test(v)],
  ["dataSensitivity", "sensitivity", closed(SENSITIVITY_LABELS)],
];

export function parseBrowse(query: string | undefined): BrowseState {
  const p = new URLSearchParams(query ?? "");
  const filters: Filters = { ...EMPTY_FILTERS, q: (p.get("q") ?? "").slice(0, QUERY_MAX) };
  for (const [key, param, valid] of PARAMS) {
    const v = p.get(param);
    if (v !== null && valid(v)) filters[key] = v;
  }
  const raw = p.get("page") ?? "";
  const page = /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : 1;
  return { filters, page, show: p.get("show") === "plugins" ? "plugins" : "skills" };
}

export function browseHref({ filters, page, show }: BrowseState): string {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  for (const [key, param] of PARAMS) {
    const v = filters[key];
    if (v) p.set(param, v);
  }
  if (page > 1) p.set("page", String(page));
  if (show === "plugins") p.set("show", "plugins");
  const qs = p.toString();
  return qs ? `#/?${qs}` : "#/";
}

/** A link's click, handled in place by the page rather than by the browser,
 *  so the page does not jump to the top (#208). A modified click (a new tab,
 *  a new window) is the reader's and is left alone: the link's own URL is
 *  what makes it work. */
export const inPlace = (go: () => void) => (e: MouseEvent) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go();
};
