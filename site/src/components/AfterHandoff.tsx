/** What happens after the hand-off (#300, S-11).
 *
 *  The walkthrough ended at "Open the pull request" and left a newcomer facing
 *  GitHub's form with no title, no template and a banner saying one approving
 *  review is required. This says what follows, and who is asked: from
 *  .github/CODEOWNERS, which requests the maintainers team for `/plugins/` and
 *  the reserved namespace and nobody for a skill in the submitter's own folder.
 *  The Reviewed tier is a separate issue, opened after the merge. */

import { rich } from "../i18n/rich";
import { useStrings } from "../i18n/strings";
import { aboutHref } from "../lib/route";

export function AfterHandoff(
  { repo, kind, reserved, singleFile = false }: {
    repo: string;
    kind: "skill" | "plugin";
    /** The Lab's own namespace, which CODEOWNERS gates. */
    reserved: boolean;
    /** The one-file route hands off through GitHub's editor, which carries no
     *  title; the multi-file route opens the pull request pre-filled. */
    singleFile?: boolean;
  },
) {
  const n = useStrings().submit.send.next;
  const asked = kind === "plugin" || reserved;
  return (
    <section className="submit__next" data-testid="what-next">
      <h3 className="steps__title">{n.heading}</h3>
      <p className="steps__body">{n.checks}</p>
      <p className="steps__body" data-testid="review-who">
        {rich(asked ? (kind === "plugin" ? n.whoPlugin : n.whoReserved) : n.whoSkill)}
      </p>
      <p className="steps__body">{singleFile ? rich(n.singleFile) : n.english}</p>
      <p className="steps__body">
        {rich(n.reviewed, {
          request: {
            href: `https://github.com/${repo}/issues/new?template=review-request.yml`,
            target: "_blank", rel: "noreferrer", "data-testid": "review-request-link",
          },
          review: aboutHref("review"),
        })}
      </p>
    </section>
  );
}
