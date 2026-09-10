/** The standing Community notice.
 *
 * This replaced a paragraph repeated verbatim on every Community card — eight
 * identical warnings on a ten-card page, which is how a warning becomes
 * wallpaper. Said once, above the grid, it has to be accurate, so the lead
 * sentence is counted from the catalogue rather than written in advance.
 *
 * The consequence sentence never varies. It is the part that matters and it is
 * true regardless of the mix.
 *
 * The wording moved to `i18n/en.ts` (#149) — including the plural rules, which
 * are the language's business rather than this module's. What is left is the
 * decision about whether there is anything to say at all.
 */

import { strings } from "../i18n/strings";

export interface Counts {
  total: number;
  reviewed: number;
  community: number;
}

export interface Notice {
  /** Counted from the catalogue. */
  lead: string;
  /** Fixed. What a Community listing does and does not mean. */
  body: string;
}

export function communityNotice(counts: Counts): Notice | null {
  const { total, community } = counts;
  if (total <= 0 || community <= 0) return null;

  const notice = strings().notices.community;
  return { lead: notice.lead(community, total), body: notice.body };
}
