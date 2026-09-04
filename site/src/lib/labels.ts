/** Display strings. Kept in one place so the vocabulary stays consistent
 *  between facets, cards, and detail views. */

export const CATEGORY_LABELS: Record<string, string> = {
  "constituent-services": "Constituent Services & Casework",
  "benefits-eligibility": "Benefits & Eligibility",
  "permitting-licensing": "Permitting & Licensing",
  "procurement-contracting": "Procurement & Contracting",
  "budget-finance": "Budget & Finance",
  "public-records-foia": "Public Records & FOIA",
  "open-data-publishing": "Open Data & Publishing",
  "policy-legislative": "Policy & Legislative Analysis",
  "grants-development": "Grants & Development",
  "emergency-public-safety": "Emergency Management & Public Safety",
  "plain-language-accessibility": "Plain Language & Accessibility",
  "language-access": "Translation & Language Access",
};

export const JURISDICTION_LABELS: Record<string, string> = {
  "us-local": "US — local",
  "us-state": "US — state",
  "us-federal": "US — federal",
  intl: "International",
  generic: "Jurisdiction-neutral",
};

export const SENSITIVITY_LABELS: Record<string, string> = {
  none: "No personal data",
  pii: "Personal data (PII)",
  protected: "Protected — statutory regime",
};

export const LOCALIZATION_LABELS: Record<string, string> = {
  generalized: "Generalized",
  localized: "Localized",
};

export const DEPLOYMENT_LABELS: Record<string, string> = {
  none: "Not used in production",
  personal: "Used personally",
  team: "Used by a team",
  organization: "Used organization-wide",
};

export const HUMAN_REVIEW_LABELS: Record<string, string> = {
  none: "No effect on rights or benefits",
  "advisory-only": "Informs a person, decides nothing",
  "decision-support": "Feeds a decision someone acts on",
};

export const AFFILIATION_LABELS: Record<string, string> = {
  government: "Government",
  nonprofit: "Nonprofit",
  vendor: "Vendor",
  academic: "Academic",
  individual: "Individual",
};

export const TIER_LABELS: Record<string, string> = {
  reviewed: "Reviewed",
  community: "Community",
};

/** The two questions no scanner can answer, and the words both intake routes
 *  ask them in.
 *
 *  Only the author knows what data their skill touches or whether its output
 *  reaches a person's rights, so these are asked rather than derived — and
 *  asking them differently in two places is how one skill acquires two
 *  different answers, so the wording lives here rather than inline in the form.
 *  Submit.test.tsx asserts the form renders what this holds.
 *
 *  These are the plain questions, not the display strings above:
 *  SENSITIVITY_LABELS renders a listing, this asks a submitter. */
export const JUDGMENT_QUESTIONS: Record<
  string, { question: string; options: [string, string][] }
> = {
  "civic.data-sensitivity": {
    question: "What data does it touch?",
    options: [
      ["none", "No personal data"],
      ["pii", "Personal details about identifiable people"],
      ["protected", "Health, benefits, immigration or criminal justice data"],
    ],
  },
  "civic.human-review": {
    question: "Does what it produces affect anyone's rights or benefits?",
    options: [
      ["none", "No — it does not affect anyone's rights or benefits"],
      ["advisory-only", "It informs a person, but decides nothing"],
      ["decision-support", "It feeds a decision someone acts on"],
    ],
  },
};

export function label(map: Record<string, string>, key: string | null): string {
  if (!key) return "—";
  return map[key] ?? key;
}
