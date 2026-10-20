import type { Filters, Plugin, Skill } from "./types";

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

/** A query is its words, not one phrase: it matches when every
 *  whitespace-separated word is found, case-insensitively, in some searched
 *  field. Different words may be found in different fields, so
 *  "plain language notice" finds a skill that says those words apart (#299).
 *  An empty or whitespace-only query has no words and matches everything. */
function matchesWords(fields: (string | null | undefined)[], query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields
    .filter((f): f is string => typeof f === "string")
    .map((f) => f.toLowerCase());
  return words.every((w) => haystack.some((f) => f.includes(w)));
}

export function matchesQuery(skill: Skill, query: string): boolean {
  return matchesWords(SEARCHABLE.map((field) => skill[field] as string | null), query);
}

/** What a free-text query searches in a plugin: its own words, and the names
 *  and descriptions of the skills it installs, since those are what a reader
 *  searching for a task would type. */
export function matchesPluginQuery(plugin: Plugin, query: string): boolean {
  return matchesWords([
    plugin.name, plugin.id, plugin.description, plugin.maintainer,
    ...plugin.keywords, ...plugin.categories,
    ...plugin.skills.flatMap((s) => [s.name, s.description, s.jurisdiction]),
  ], query);
}

/** The same filters as skills, by the fields a plugin has. Category, language,
 *  sensitivity and tier are the plugin's own (the union, and the most
 *  sensitive, of its skills'). Scope and localization are declared only per
 *  skill, so a plugin matches when any one of its skills does — the same
 *  reading categories already have, so choosing a facet never hides a plugin
 *  that installs something matching it. */
export function applyPluginFilters(plugins: Plugin[], filters: Filters): Plugin[] {
  return plugins.filter(
    (p) =>
      matchesPluginQuery(p, filters.q) &&
      (!filters.category || p.categories.includes(filters.category)) &&
      (!filters.scope || p.skills.some((s) => s.scope === filters.scope)) &&
      (!filters.localization ||
        p.skills.some((s) => s.localization === filters.localization)) &&
      (!filters.language || p.languages.includes(filters.language)) &&
      (!filters.dataSensitivity || p.data_sensitivity === filters.dataSensitivity) &&
      (!filters.tier || p.tier === filters.tier),
  );
}

export function applyFilters(skills: Skill[], filters: Filters): Skill[] {
  return skills.filter(
    (s) =>
      matchesQuery(s, filters.q) &&
      (!filters.category || categoriesOf(s).includes(filters.category)) &&
      (!filters.scope || scopesOf(s).includes(filters.scope)) &&
      (!filters.localization || s.localization === filters.localization) &&
      // Single-valued: a listing is written in one language, so this needs
      // none of the pair machinery category and scope have. languages_tested
      // is the author's claim and is deliberately not faceted — a skill
      // written in English is an English listing whatever its author tried.
      (!filters.language || s.language === filters.language) &&
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
