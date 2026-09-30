/** Full-bleed sections that carry their own palette.
 *
 * This is the design system's signature move — the theme belongs to the block,
 * not to the page — and until now the browse page used none of it, running one
 * flat field from the topper to the footer. Both bands are `data-theme` scoped,
 * so everything inside resolves against that palette without a single
 * hardcoded colour.
 */

import { useStrings } from "../i18n/strings";
import { communityNotice, type Counts } from "../lib/notice";
import { DocLink } from "./DocLink";

/** Above the results: what the two tiers mean, and the standing Community
 *  notice that replaced the paragraph once repeated on every card.
 *
 *  Themed `contrast` rather than `plain-dark`: this band exists to separate the
 *  topper from the catalogue, and a dark band on a dark page separates
 *  nothing. It inverts against whatever theme the reader chose. */
export function TierBand({ counts }: { counts: Counts }) {
  const s = useStrings().bands.tiers;
  const notice = communityNotice(counts);

  return (
    <section className="band" data-theme="contrast" aria-labelledby="tiers-band-heading">
      <div className="canvas">
        <div className="band__inner span-full">
        <h2 className="h3 band__heading" id="tiers-band-heading">{s.heading}</h2>

        <div className="band__cols">
          <div className="band__col">
            <h3 className="band__term">{s.communityTerm}</h3>
            <p>{s.community}</p>
          </div>
          <div className="band__col">
            <h3 className="band__term">{s.reviewedTerm}</h3>
            <p>{s.reviewed}</p>
          </div>
        </div>

        {notice && (
          <p className="band__notice">
            <strong>{notice.lead}</strong> {notice.body}
          </p>
        )}
        </div>
      </div>
    </section>
  );
}

/** Below the results, for the reader who got to the end of the catalogue and
 *  wants to add to it — or to know what we checked before they run anything. */
export function ContributeBand({ repo }: { repo: string }) {
  const s = useStrings().bands.contribute;
  return (
    <section className="band" data-theme="crimson" aria-labelledby="contribute-band-heading">
      <div className="canvas">
        <div className="band__inner span-full">
        <h2 className="h3 band__heading" id="contribute-band-heading">{s.heading}</h2>
        <p className="band__lede">{s.lede}</p>
        <p className="band__links">
          <DocLink href={`${repo}/blob/main/CONTRIBUTING.md`}>{s.guide}</DocLink>
          <DocLink href={`${repo}/blob/main/docs/SECURITY.md`}>{s.security}</DocLink>
        </p>
        </div>
      </div>
    </section>
  );
}
