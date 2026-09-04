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
  jurisdiction: string | null;
  localization: Localization;
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
  jurisdiction: string | null;
  localization: string | null;
  dataSensitivity: string | null;
  tier: string | null;
}

export const EMPTY_FILTERS: Filters = {
  q: "",
  category: null,
  jurisdiction: null,
  localization: null,
  dataSensitivity: null,
  tier: null,
};
