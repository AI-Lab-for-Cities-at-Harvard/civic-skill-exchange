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

export function label(map: Record<string, string>, key: string | null): string {
  if (!key) return "—";
  return map[key] ?? key;
}
