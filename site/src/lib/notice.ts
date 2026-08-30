/** The standing Community notice.
 *
 * This replaced a paragraph repeated verbatim on every Community card — eight
 * identical warnings on a ten-card page, which is how a warning becomes
 * wallpaper. Said once, above the grid, it has to be accurate, so the lead
 * sentence is counted from the catalogue rather than written in advance.
 *
 * The consequence sentence never varies. It is the part that matters and it is
 * true regardless of the mix.
 */

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

const CONSEQUENCE =
  "That means automated checks passed — not that anybody read the code. " +
  "Automated checks can only ever reject. Read a skill and its scripts " +
  "before you run it.";

export function communityNotice(counts: Counts): Notice | null {
  const { total, community } = counts;
  if (total <= 0 || community <= 0) return null;

  const lead =
    community === total
      ? `Every skill here is a Community listing.`
      : `${community} of the ${total} skills here ${community === 1 ? "is a" : "are"} ` +
        `Community listing${community === 1 ? "" : "s"}.`;

  return { lead, body: CONSEQUENCE };
}
