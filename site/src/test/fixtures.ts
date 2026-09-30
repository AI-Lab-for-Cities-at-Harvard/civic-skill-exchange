/** Skill fixtures for component tests.
 *
 * Built here rather than read from site/public/data: a test that depends on the
 * real catalogue breaks the moment somebody adds a skill, and the real catalogue
 * currently holds exactly one — too thin to exercise a grid, a facet count, or
 * the mix of tiers the browse page has to render.
 */

import type { Index, Plugin, Skill } from "../lib/types";

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
    category_secondary: null,
    version: null,
    history: { first_seen: null, last_changed: null, commits: null, pull_request: null },
    scope: "any",
    scope_secondary: null,
    jurisdiction: null,
    localization: null,
    language: "en",
    languages_tested: null,
    verified_languages: null,
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

export function makePlugin(over: Partial<Plugin> = {}): Plugin {
  const skill = (name: string) => ({
    name,
    description: `The ${name} skill, part of the example plugin.`,
    allowed_tools: ["Read"],
    category: "planning-land-use", category_secondary: null, scope: "municipal",
    jurisdiction: null, localization: null, language: "en",
    data_sensitivity: "none", human_review: "advisory-only",
    use_when: null, avoid_when: null,
  });
  return {
    kind: "plugin",
    id: "ns/housing-dashboards",
    name: "housing-dashboards",
    namespace: "ns",
    description: "Housing dashboards and briefs for any U.S. city or county.",
    license: "MIT",
    version: "0.2.0",
    maintainer: "Test Suite",
    keywords: ["housing"],
    categories: ["planning-land-use"],
    languages: ["en"],
    data_sensitivity: "none",
    skills: [skill("build-housing-dashboard"), skill("housing-brief")],
    mcp_servers: [
      { name: "housing-census", type: "streamable-http", target: "census.example.org" },
    ],
    use_when: null,
    avoid_when: null,
    provenance: {
      self_reported: true, affiliation: "individual", deployment: "none",
      deployed_at: null, deployed_in: null, deployed_since: null,
    },
    tier: "community",
    reason: "no review attestation",
    verified_languages: null,
    sha: "b".repeat(40),
    history: { first_seen: null, last_changed: null, commits: null, pull_request: null },
    has_scripts: true,
    script_files: ["mcp.json"],
    path: "plugins/ns/housing-dashboards",
    download: "https://example.test/plugin",
    ...over,
  };
}
