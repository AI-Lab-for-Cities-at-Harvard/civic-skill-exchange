import { describe, it, expect } from "vitest";
import {
  applyFilters, applyPluginFilters, categoryCounts, facetCounts, matchesPluginQuery,
  matchesQuery,
} from "./filter";
import { makePlugin } from "../test/fixtures";
import { EMPTY_FILTERS, type Filters, type Plugin, type Skill } from "./types";

function skill(over: Partial<Skill> = {}): Skill {
  return {
    id: "ns/example", name: "example", namespace: "ns",
    description: "An example skill for tests.",
    license: "MIT", compatibility: null, allowed_tools: ["Read"],
    category: "finance", category_secondary: null, version: null,
    history: { first_seen: null, last_changed: null, commits: null, pull_request: null },
    scope: "any", scope_secondary: null,
    jurisdiction: null, localization: null,
    language: "en", languages_tested: null, verified_languages: null,
    data_sensitivity: "none", human_review: "none",
    use_when: null, avoid_when: null, maintainer: "Test", source: null,
    provenance: {
      self_reported: true, affiliation: "individual", deployment: "none",
      deployed_at: null, deployed_in: null, deployed_since: null,
    },
    tier: "community", reason: "no review attestation", sha: "abc",
    has_scripts: false, script_files: [],
    path: "skills/ns/example", skill_path: "skills/ns/example/skills/example",
    download: "https://example.test",
    ...over,
  };
}

describe("matchesQuery", () => {
  it("matches on name", () => {
    expect(matchesQuery(skill({ name: "permit-explainer" }), "permit")).toBe(true);
  });

  it("matches on description", () => {
    expect(matchesQuery(skill({ description: "Explains building permits." }), "building")).toBe(true);
  });

  it("matches on maintainer, so you can find a peer agency's work", () => {
    expect(matchesQuery(skill({ maintainer: "City of Boston" }), "boston")).toBe(true);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(matchesQuery(skill({ name: "permit-explainer" }), "  PERMIT ")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesQuery(skill(), "zoning")).toBe(false);
  });

  it("treats an empty query as matching everything", () => {
    expect(matchesQuery(skill(), "")).toBe(true);
  });
});

describe("applyFilters", () => {
  const skills = [
    skill({ id: "a/1", category: "benefits-eligibility", tier: "reviewed", localization: "generalized" }),
    skill({ id: "b/2", category: "finance", tier: "community", localization: "localized", jurisdiction: "us-state" }),
    skill({ id: "c/3", category: "benefits-eligibility", tier: "community", data_sensitivity: "pii" }),
  ];

  it("returns everything when no filter is set", () => {
    expect(applyFilters(skills, EMPTY_FILTERS)).toHaveLength(3);
  });

  it("filters by category", () => {
    const r = applyFilters(skills, { ...EMPTY_FILTERS, category: "benefits-eligibility" });
    expect(r.map((s) => s.id)).toEqual(["a/1", "c/3"]);
  });

  it("filters by tier", () => {
    expect(applyFilters(skills, { ...EMPTY_FILTERS, tier: "reviewed" }).map((s) => s.id)).toEqual(["a/1"]);
  });

  it("filters by localization", () => {
    expect(applyFilters(skills, { ...EMPTY_FILTERS, localization: "generalized" }).map((s) => s.id)).toEqual(["a/1"]);
  });

  it("filters by data sensitivity", () => {
    expect(applyFilters(skills, { ...EMPTY_FILTERS, dataSensitivity: "pii" }).map((s) => s.id)).toEqual(["c/3"]);
  });

  it("combines filters with AND", () => {
    const r = applyFilters(skills, {
      ...EMPTY_FILTERS, category: "benefits-eligibility", tier: "community",
    });
    expect(r.map((s) => s.id)).toEqual(["c/3"]);
  });

  it("returns empty rather than throwing when nothing matches", () => {
    expect(applyFilters(skills, { ...EMPTY_FILTERS, category: "language-access" })).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const before = [...skills];
    applyFilters(skills, { ...EMPTY_FILTERS, tier: "reviewed" });
    expect(skills).toEqual(before);
  });
});

describe("facetCounts", () => {
  const skills = [
    skill({ id: "a/1", category: "benefits-eligibility" }),
    skill({ id: "b/2", category: "benefits-eligibility" }),
    skill({ id: "c/3", category: "finance" }),
  ];

  it("counts values for a field", () => {
    expect(facetCounts(skills, "category")).toEqual({
      "benefits-eligibility": 2,
      "finance": 1,
    });
  });

  it("skips nulls rather than counting an empty bucket", () => {
    const counts = facetCounts([skill({ localization: null }), skill({ localization: "generalized" })], "localization");
    expect(counts).toEqual({ generalized: 1 });
  });

  it("returns an empty object for an empty list", () => {
    expect(facetCounts([], "category")).toEqual({});
  });
});

/** A skill can name a second category on the other axis (#102). Browsing has to
 *  honour it or the field is decoration: a Communications skill that is also
 *  Constituent Services must appear under both, and be counted under both. */
describe("the second category is browsable, not decorative", () => {
  const listings = [
    skill({ id: "a/1", category: "communications", category_secondary: "constituent-services" }),
    skill({ id: "b/2", category: "finance", category_secondary: null }),
    skill({ id: "c/3", category: "constituent-services", category_secondary: null }),
  ];

  it("finds a skill under its secondary category", () => {
    const found = applyFilters(listings, { ...EMPTY_FILTERS, category: "constituent-services" });
    expect(found.map((s) => s.id)).toEqual(["a/1", "c/3"]);
  });

  it("still finds it under its primary", () => {
    const found = applyFilters(listings, { ...EMPTY_FILTERS, category: "communications" });
    expect(found.map((s) => s.id)).toEqual(["a/1"]);
  });

  it("counts a skill under both of its categories", () => {
    expect(categoryCounts(listings)).toEqual({
      communications: 1, "constituent-services": 2, finance: 1,
    });
  });

  it("does not count a skill twice under one category", () => {
    // rules.ts rejects a secondary equal to the primary, but the index is a
    // published artifact and this must not double-count if one slips through.
    const odd = [skill({ id: "d/4", category: "finance", category_secondary: "finance" })];
    expect(categoryCounts(odd)).toEqual({ finance: 1 });
  });
});

/** The language a listing is written in is a facet (#145). Single-valued —
 *  a listing is written in one language — so it needs none of the pair
 *  machinery category and scope have. */
describe("the language facet", () => {
  const listings = [
    skill({ id: "a/1", language: "en" }),
    skill({ id: "b/2", language: "es" }),
    skill({ id: "c/3", language: "es" }),
  ];

  it("narrows the catalogue to one language", () => {
    const found = applyFilters(listings, { ...EMPTY_FILTERS, language: "es" });
    expect(found.map((s) => s.id)).toEqual(["b/2", "c/3"]);
  });

  it("returns everything when no language is chosen", () => {
    expect(applyFilters(listings, EMPTY_FILTERS)).toHaveLength(3);
  });

  it("counts listings per language", () => {
    expect(facetCounts(listings, "language")).toEqual({ en: 1, es: 2 });
  });

  it("does not confuse the written language with the tested ones", () => {
    // languages_tested is the author's claim and never a facet: a skill
    // written in English that its author tried in Spanish is an English
    // listing, and browsing must not say otherwise.
    const tested = [skill({ id: "a/1", language: "en", languages_tested: ["en", "es"] })];
    expect(applyFilters(tested, { ...EMPTY_FILTERS, language: "es" })).toEqual([]);
  });
});

describe("matchesQuery, by separate words (#299)", () => {
  const s = skill({
    name: "plain-language-notice-rewriter",
    description: "Rewrites a legal notice in plain words a resident can read.",
    maintainer: "City of Boston",
  });

  it("finds a listing whose words are in the text but not as one phrase", () => {
    expect(matchesQuery(s, "plain language notice")).toBe(true);
    expect(matchesQuery(s, "notice plain")).toBe(true);
  });

  it("requires every word to match", () => {
    expect(matchesQuery(s, "plain housingzzqq")).toBe(false);
  });

  it("lets different words match different fields", () => {
    expect(matchesQuery(s, "boston rewrites")).toBe(true);
  });

  it("ignores case and the whitespace between and around words", () => {
    expect(matchesQuery(s, "  PLAIN \t Notice \n")).toBe(true);
  });

  it("still matches a phrase that is in the text", () => {
    expect(matchesQuery(s, "legal notice")).toBe(true);
  });

  it("matches everything for an empty or whitespace-only query", () => {
    expect(matchesQuery(s, "")).toBe(true);
    expect(matchesQuery(s, " \t\n ")).toBe(true);
  });
});

describe("plugin filtering (#299)", () => {
  const pl = (over: Partial<Plugin> = {}) => makePlugin(over);
  const run = (p: Plugin, over: Partial<Filters>) =>
    applyPluginFilters([p], { ...EMPTY_FILTERS, ...over }).length;

  it("matches a plugin by separate words across its name, description and skills", () => {
    const p = pl();
    expect(matchesPluginQuery(p, "housing dashboards")).toBe(true);
    expect(matchesPluginQuery(p, "briefs county")).toBe(true);
    expect(matchesPluginQuery(p, "housing-brief")).toBe(true);
    expect(matchesPluginQuery(p, "test suite")).toBe(true);
    expect(matchesPluginQuery(p, "housingzzqq")).toBe(false);
    expect(matchesPluginQuery(p, "housing housingzzqq")).toBe(false);
    expect(matchesPluginQuery(p, "  ")).toBe(true);
  });

  it("applies the filters a plugin has a value for", () => {
    const p = pl({ categories: ["finance", "legal"], languages: ["en", "es"],
      data_sensitivity: "none", tier: "community" });
    expect(run(p, { category: "legal" })).toBe(1);
    expect(run(p, { category: "housing" })).toBe(0);
    expect(run(p, { language: "es" })).toBe(1);
    expect(run(p, { language: "fr" })).toBe(0);
    expect(run(p, { dataSensitivity: "none" })).toBe(1);
    expect(run(p, { dataSensitivity: "protected" })).toBe(0);
    expect(run(p, { tier: "community" })).toBe(1);
    expect(run(p, { tier: "reviewed" })).toBe(0);
  });

  it("applies scope and localization through the plugin's skills: any one is enough", () => {
    const base = makePlugin();
    const p = pl({ skills: [
      { ...base.skills[0]!, scope: "municipal", localization: "localized" },
      { ...base.skills[1]!, scope: "regional", localization: null },
    ] });
    expect(run(p, { scope: "regional" })).toBe(1);
    expect(run(p, { scope: "national" })).toBe(0);
    expect(run(p, { localization: "localized" })).toBe(1);
    expect(run(p, { localization: "generalized" })).toBe(0);
  });
});
