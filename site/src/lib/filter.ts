import type { Filters, Skill } from "./types";

/** Fields a free-text query searches. Maintainer is included deliberately:
 *  "who else has built this" is a question adopters actually ask. */
const SEARCHABLE: (keyof Skill)[] = ["name", "id", "description", "maintainer", "category"];

export function matchesQuery(skill: Skill, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return SEARCHABLE.some((field) => {
    const value = skill[field];
    return typeof value === "string" && value.toLowerCase().includes(q);
  });
}

export function applyFilters(skills: Skill[], filters: Filters): Skill[] {
  return skills.filter(
    (s) =>
      matchesQuery(s, filters.q) &&
      (!filters.category || s.category === filters.category) &&
      (!filters.jurisdiction || s.jurisdiction === filters.jurisdiction) &&
      (!filters.localization || s.localization === filters.localization) &&
      (!filters.dataSensitivity || s.data_sensitivity === filters.dataSensitivity) &&
      (!filters.tier || s.tier === filters.tier),
  );
}

/** Counts per value for one field. Nulls are skipped rather than bucketed —
 *  "not declared" is not a facet anyone wants to filter on. */
export function facetCounts(skills: Skill[], field: keyof Skill): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const skill of skills) {
    const value = skill[field];
    if (typeof value !== "string" || !value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}
