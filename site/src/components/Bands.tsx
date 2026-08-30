/** Full-bleed sections that carry their own palette.
 *
 * This is the design system's signature move — the theme belongs to the block,
 * not to the page — and until now the browse page used none of it, running one
 * flat field from the topper to the footer. Both bands are `data-theme` scoped,
 * so everything inside resolves against that palette without a single
 * hardcoded colour.
 */

import { communityNotice, type Counts } from "../lib/notice";

/** Above the results: what the two tiers mean, and the standing Community
 *  notice that replaced the paragraph once repeated on every card.
 *
 *  Themed `contrast` rather than `plain-dark`: this band exists to separate the
 *  topper from the catalogue, and a dark band on a dark page separates
 *  nothing. It inverts against whatever theme the reader chose. */
export function TierBand({ counts }: { counts: Counts }) {
  const notice = communityNotice(counts);

  return (
    <section className="band" data-theme="contrast" aria-labelledby="tiers-band-heading">
      <div className="canvas">
        <div className="band__inner span-full">
        <h2 className="h3 band__heading" id="tiers-band-heading">
          What a listing here does and does not mean
        </h2>

        <div className="band__cols">
          <div className="band__col">
            <h3 className="band__term">Community</h3>
            <p>
              Well-formed, and nothing mechanical is wrong with it. Merged once
              it passes structural, ownership and signature checks.
            </p>
          </div>
          <div className="band__col">
            <h3 className="band__term">Reviewed</h3>
            <p>
              Two named people from different organizations read every line of
              one specific commit and put their names on it. Pinned to a content
              hash, so any change drops it back to Community.
            </p>
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
  return (
    <section className="band" data-theme="crimson" aria-labelledby="contribute-band-heading">
      <div className="canvas">
        <div className="band__inner span-full">
        <h2 className="h3 band__heading" id="contribute-band-heading">
          Have one of these already?
        </h2>
        <p className="band__lede">
          A city that solves a problem once should be able to hand the solution
          to the next hundred cities. Submitting is a pull request, or a form if
          you would rather not work in git.
        </p>
        <p className="band__links">
          <a className="arrow-link" href={`${repo}/blob/main/CONTRIBUTING.md`}>
            Read the contributor guide <span aria-hidden="true">&rarr;</span>
          </a>
          <a className="arrow-link" href={`${repo}/blob/main/docs/SECURITY.md`}>
            What we check, and the security model <span aria-hidden="true">&rarr;</span>
          </a>
        </p>
        </div>
      </div>
    </section>
  );
}
