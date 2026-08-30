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
  jurisdiction: string | null;
  localization: Localization;
  data_sensitivity: string | null;
  human_review: string | null;
  maintainer: string | null;
  provenance: Provenance;
  tier: Tier;
  reason: string;
  /** Present only on Reviewed listings — who attested, and to which commit. */
  reviewed?: { date: string; expires: string; reviewers: string[]; notes: string };
  /** Set when a Reviewed attestation no longer matches the current commit. */
  drift?: boolean;
  sha: string | null;
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
