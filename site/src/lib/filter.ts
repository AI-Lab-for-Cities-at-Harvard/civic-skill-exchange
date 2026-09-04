import type { Filters, Skill } from "./types";

/** Fields a free-text query searches. Maintainer is included deliberately:
 *  "who else has built this" is a question adopters actually ask. */
const SEARCHABLE: (keyof Skill)[] = [
  "name", "id", "description", "maintainer", "category", "category_secondary",
  // The place is searchable but never a facet: it is unbounded, and a facet
  // that does not narrow is not a facet.
  "jurisdiction",
];

/** Both axes a skill sits on, deduplicated. The vocabulary mixes function
 *  inside the organization with public service delivered, and a skill often
 *  belongs to one of each (#102) — so browsing by category has to find it under
 *  either, or the second field is decoration.
 *
 *  Deduplicated because index.json is a published artifact: rules.ts rejects a
 *  secondary equal to the primary, but a facet must not double-count if one
 *  ever slips past. */
export function categoriesOf(skill: Skill): string[] {
  return pairOf(skill.category, skill.category_secondary);
}

/** The same for scope, which took the same primary-plus-optional-second shape
 *  in #67 and for the same reason: one value forced an answer the author did
 *  not mean. */
export function scopesOf(skill: Skill): string[] {
  return pairOf(skill.scope, skill.scope_secondary);
}

function pairOf(primary: string | null, secondary: string | null): string[] {
  const both = [primary, secondary]
    .filter((c): c is string => typeof c === "string" && c.length > 0);
  return [...new Set(both)];
}

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
      (!filters.category || categoriesOf(s).includes(filters.category)) &&
      (!filters.scope || scopesOf(s).includes(filters.scope)) &&
      (!filters.localization || s.localization === filters.localization) &&
      (!filters.dataSensitivity || s.data_sensitivity === filters.dataSensitivity) &&
      (!filters.tier || s.tier === filters.tier),
  );
}

/** Counts per category across both axes, so the facet agrees with what
 *  filtering by that category will return. A skill with two categories is
 *  counted under each, and never twice under one. */
export function categoryCounts(skills: Skill[]): Record<string, number> {
  return pairCounts(skills, categoriesOf);
}

export function scopeCounts(skills: Skill[]): Record<string, number> {
  return pairCounts(skills, scopesOf);
}

function pairCounts(
  skills: Skill[], of: (s: Skill) => string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const skill of skills) {
    for (const value of of(skill)) counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
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
