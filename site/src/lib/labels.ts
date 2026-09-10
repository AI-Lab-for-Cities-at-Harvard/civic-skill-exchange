/** The closed vocabularies, and the two questions the form asks.
 *
 *  These moved into `i18n/en.ts` with the rest of the site's strings (#149).
 *  What is left here is the re-export, so that the twenty-odd import sites did
 *  not all have to change with them, and `label`, which is the one piece of
 *  behaviour: fall back to the raw value for a key the vocabulary has no name
 *  for, so a `pt-BR` listing reads `pt-BR` rather than an empty cell.
 *
 *  These constants are the **English** maps. That is deliberate and it is what
 *  callers want them for: `Object.keys(CATEGORY_LABELS)` is the canonical value
 *  list, which does not vary by locale. Anything that renders a label to a
 *  reader reads it off `useStrings().vocabulary` instead, so it follows the
 *  locale the reader chose.
 */

import { en } from "../i18n/en";
import { strings } from "../i18n/strings";

export const CATEGORY_LABELS: Record<string, string> = en.vocabulary.category;
export const SCOPE_LABELS: Record<string, string> = en.vocabulary.scope;
export const LANGUAGE_LABELS: Record<string, string> = en.vocabulary.language;
export const SENSITIVITY_LABELS: Record<string, string> = en.vocabulary.sensitivity;
export const LOCALIZATION_LABELS: Record<string, string> = en.vocabulary.localization;
export const DEPLOYMENT_LABELS: Record<string, string> = en.vocabulary.deployment;
export const HUMAN_REVIEW_LABELS: Record<string, string> = en.vocabulary.humanReview;
export const AFFILIATION_LABELS: Record<string, string> = en.vocabulary.affiliation;
export const TIER_LABELS: Record<string, string> = en.vocabulary.tier;

export const JUDGMENT_QUESTIONS = en.questions;

export function label(map: Record<string, string>, key: string | null): string {
  if (!key) return strings().vocabulary.missing;
  return map[key] ?? key;
}
