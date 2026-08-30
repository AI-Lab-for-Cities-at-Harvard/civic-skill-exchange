/** Display strings. Kept in one place so the vocabulary stays consistent
 *  between facets, cards, and detail views. */

export const CATEGORY_LABELS: Record<string, string> = {
  "constituent-services": "Constituent services & casework",
  "benefits-eligibility": "Benefits & eligibility",
  "permitting-licensing": "Permitting & licensing",
  "procurement-contracting": "Procurement & contracting",
  "budget-finance": "Budget & finance",
  "public-records-foia": "Public records & FOIA",
  "open-data-publishing": "Open data & publishing",
  "policy-legislative": "Policy & legislative analysis",
  "grants-development": "Grants & development",
  "emergency-public-safety": "Emergency management & public safety",
  "plain-language-accessibility": "Plain language & accessibility",
  "language-access": "Translation & language access",
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

export const TIER_LABELS: Record<string, string> = {
  reviewed: "Reviewed",
  community: "Community",
};

export function label(map: Record<string, string>, key: string | null): string {
  if (!key) return "—";
  return map[key] ?? key;
}
