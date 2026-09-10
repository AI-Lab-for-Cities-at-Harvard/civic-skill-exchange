/** The Beta marker.
 *
 *  One switch: `RELEASE_STAGE`. The badge renders nothing once it changes, and
 *  Beta.test.tsx fails if `README.md` disagrees — leaving Beta should not be an
 *  archaeology exercise across components (#123).
 *
 *  WHAT THIS CLAIM IS ABOUT. The registry already carries three statements
 *  about what a *listing* means: a Community listing is not an endorsement, a
 *  pass is never a statement that a skill is safe, a Reviewed badge is a record
 *  and not a warranty. Beta is a different claim, about the *exchange* — its
 *  own vocabulary, fields and workflows are still moving. Saying anything here
 *  about whether skills are safe or tested would add a fourth disclaimer in the
 *  same voice as the three that matter, and dilute all of them.
 *
 *  So the badge is small, says only that the exchange is new, and links to the
 *  About page, where there is room to list what is actually in flux. A tooltip
 *  would not do: it is invisible on a touch device, and this is the first thing
 *  an early adopter should be able to read.
 *
 *  The wording is in `i18n/en.ts` with the rest of the site's strings (#149).
 *  The two constants stay exported: README.md is held to the summary by a test,
 *  and that check is about the English text, not about whatever locale a reader
 *  happens to have chosen.
 */

import { en } from "../i18n/en";
import { useStrings } from "../i18n/strings";
import { aboutHref } from "../lib/route";

/** The one lever. Set to "stable" to leave Beta. */
export const RELEASE_STAGE: "beta" | "stable" = "beta";

export const BETA_LABEL = en.badges.beta.label;

/** One sentence, shared with README.md and held to it by a test. */
export const BETA_SUMMARY = en.badges.beta.summary;

export function BetaBadge() {
  const { beta } = useStrings().badges;
  if (RELEASE_STAGE !== "beta") return null;
  return (
    <a className="beta" href={aboutHref("beta")} title={beta.summary}>
      {beta.label}
    </a>
  );
}
