export type Tier = "reviewed" | "community";
export type Localization = "generalized" | "localized" | null;

export interface Provenance {
  self_reported: boolean;
  affiliation: string | null;
  deployment: "none" | "personal" | "team" | "organization" | null;
  deployed_at: string | null;
  deployed_in: string | null;
  deployed_since: string | null;
}

export interface Skill {
  id: string;
  name: string;
  namespace: string;
  description: string;
  license: string | null;
  compatibility: string | null;
  allowed_tools: string[];
  category: string | null;
  /** The other axis, when the author named one. See #102. */
  category_secondary: string | null;
  /** What kind of government body. Closed vocabulary; this is what the site
   *  facets on. */
  scope: string | null;
  scope_secondary: string | null;
  /** The specific place, ISO-shaped, when the skill is tied to one. Unbounded,
   *  so it is shown and never faceted. */
  jurisdiction: string | null;
  localization: Localization;
  /** The language the SKILL.md is written in, as one BCP 47 tag. Declared,
   *  required, and what the language facet reads. Null only for a listing that
   *  predates the field. */
  language: string | null;
  /** The author's claim about which languages they exercised the skill in.
   *  Nothing verifies it — the reviewer's verified list lives on the
   *  attestation — so the page renders it as a claim and says so. Null when the
   *  author claimed nothing, which is not the same as an empty list. */
  languages_tested: string[] | null;
  data_sensitivity: string | null;
  human_review: string | null;
  /** When the skill fits, and when it does not. Plain text — rendered as text,
   *  never as markdown. Null when the author did not answer. */
  use_when: string | null;
  avoid_when: string | null;
  maintainer: string | null;
  /** Where an imported copy came from. Null when the skill was written here.
   *  Provenance, not a link — nothing resolves it, and the listing survives the
   *  upstream being deleted. */
  source: { repo: string; commit: string | null } | null;
  provenance: Provenance;
  tier: Tier;
  reason: string;
  /** Present only on Reviewed listings — who attested, and to which commit. */
  reviewed?: { date: string; expires: string; reviewers: string[]; notes: string };
  /** Set when a Reviewed attestation no longer matches the current commit. */
  drift?: boolean;
  /** The languages a reviewer actually verified, from `languages:` on the
   *  attestation in registry/reviewed.yml — never from frontmatter. Present
   *  only under the same condition as `tier: "reviewed"`: a stale, expired, or
   *  unresolvable attestation yields null here too, never a stale claim.
   *  Null also when a current attestation simply names no languages. Distinct
   *  from `languages_tested`, which is the author's self-reported claim — the
   *  two are never merged. ADR 0004. */
  verified_languages: string[] | null;
  sha: string | null;
  /** The author's own claim about their version. See #77. */
  version: string | null;
  /** Derived from git, never declared. Null wherever git could not answer. */
  history: {
    first_seen: string | null;
    last_changed: string | null;
    commits: number | null;
    pull_request: number | null;
  };
  has_scripts: boolean;
  script_files: string[];
  path: string;
  download: string;
}

export interface SkillFile {
  path: string;
  size: number;
  /** Under scripts/ — run by the agent, not read by the model. */
  executed: boolean;
}

/** Structure only. The skill body and file contents are deliberately not
 *  published — rendering submitter-authored content on our origin would be a
 *  stored XSS surface, and describing a skill does not require it. */
export interface SkillDetail extends Skill {
  files: SkillFile[];
  /** The downloadable archive, written by the index build. Optional so the page
   *  degrades to the command-line paths rather than rendering a broken link if
   *  it is ever absent. */
  archive?: { path: string; size: number };
}

export interface Index {
  generated: string;
  repo: string;
  counts: { total: number; reviewed: number; community: number };
  disclaimer: string;
  skills: Skill[];
}

export interface Filters {
  q: string;
  category: string | null;
  scope: string | null;
  localization: string | null;
  language: string | null;
  dataSensitivity: string | null;
  tier: string | null;
}

export const EMPTY_FILTERS: Filters = {
  q: "",
  category: null,
  scope: null,
  localization: null,
  language: null,
  dataSensitivity: null,
  tier: null,
};
