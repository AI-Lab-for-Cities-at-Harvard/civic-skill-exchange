/** Skill fixtures for component tests.
 *
 * Built here rather than read from site/public/data: a test that depends on the
 * real catalogue breaks the moment somebody adds a skill, and the real catalogue
 * currently holds exactly one — too thin to exercise a grid, a facet count, or
 * the mix of tiers the browse page has to render.
 */

import type { Index, Skill } from "../lib/types";

export function makeSkill(over: Partial<Skill> = {}): Skill {
  return {
    id: "ns/example-skill",
    name: "example-skill",
    namespace: "ns",
    description: "An example skill used in the component tests.",
    license: "MIT",
    compatibility: null,
    allowed_tools: ["Read", "Grep"],
    category: "finance",
    jurisdiction: "generic",
    localization: null,
    data_sensitivity: "none",
    human_review: "none",
    use_when: null,
    avoid_when: null,
    maintainer: "Test Suite",
    source: null,
    provenance: {
      self_reported: true, affiliation: "individual", deployment: "none",
      deployed_at: null, deployed_in: null, deployed_since: null,
    },
    tier: "community",
    reason: "no review attestation",
    sha: "a".repeat(40),
    has_scripts: false,
    script_files: [],
    path: "skills/ns/example-skill",
    download: "https://example.test",
    ...over,
  };
}

export function makeIndex(skills: Skill[]): Index {
  const reviewed = skills.filter((s) => s.tier === "reviewed").length;
  return {
    generated: "2026-08-30T00:00:00Z",
    repo: "https://example.test/repo",
    counts: { total: skills.length, reviewed, community: skills.length - reviewed },
    disclaimer: "Inclusion in this registry does not constitute endorsement.",
    skills,
  };
}
