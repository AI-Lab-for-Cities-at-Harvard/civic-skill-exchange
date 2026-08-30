import { describe, it, expect } from "vitest";
import { applyFilters, facetCounts, matchesQuery } from "./filter";
import { EMPTY_FILTERS, type Skill } from "./types";

function skill(over: Partial<Skill> = {}): Skill {
  return {
    id: "ns/example", name: "example", namespace: "ns",
    description: "An example skill for tests.",
    license: "MIT", compatibility: null, allowed_tools: ["Read"],
    category: "budget-finance", jurisdiction: "generic", localization: null,
    data_sensitivity: "none", human_review: "none",
    use_when: null, avoid_when: null, maintainer: "Test",
    provenance: {
      self_reported: true, affiliation: "individual", deployment: "none",
      deployed_at: null, deployed_in: null, deployed_since: null,
    },
    tier: "community", reason: "no review attestation", sha: "abc",
    has_scripts: false, script_files: [],
    path: "skills/ns/example", download: "https://example.test",
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
    skill({ id: "b/2", category: "budget-finance", tier: "community", localization: "localized", jurisdiction: "us-state" }),
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
    skill({ id: "c/3", category: "budget-finance" }),
  ];

  it("counts values for a field", () => {
    expect(facetCounts(skills, "category")).toEqual({
      "benefits-eligibility": 2,
      "budget-finance": 1,
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
