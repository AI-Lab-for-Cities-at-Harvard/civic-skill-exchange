import { EMPTY_FILTERS, type Filters } from "./types";

export const PAGE_SIZE = 0;
export const QUERY_MAX = 200;

export interface BrowseState {
  filters: Filters;
  page: number;
  show: "skills" | "plugins";
}

export function parseBrowse(_query: string | undefined): BrowseState {
  return { filters: EMPTY_FILTERS, page: 0, show: "skills" };
}

export function browseHref(_state: BrowseState): string {
  return "";
}
