/** The four steps that take a folder to GitHub, because a folder cannot be put
 *  in a link. Each one is a real URL the submitter can open, and the page never
 *  asks them to type a path. Shared by a multi-file skill and every plugin
 *  (#213), which differ only in the tree they upload into and what the
 *  corrected folder holds. */

import { rich } from "../i18n/rich";
import { useStrings } from "../i18n/strings";
import {
  checkFork, forkOwner, forkUrl, forkUploadUrl, hasNamespace, landingPath, namespaceOf,
  pullRequestText, pullRequestUrl, registryUploadUrl, uploadPath, usableFork,
  type ListingTree, type PullRequestInput,
} from "../lib/submit";
import { guideHref } from "../lib/route";
import { Field } from "./Field";

/** A step's GitHub word, in the guide's glossary (#259). In a new tab: leaving
 *  this page in the same one would unmount the form and lose what was typed. */
function GlossaryLink({ word, text }: { word: string; text: string }) {
  return (
    <p className="steps__more">
      <a href={guideHref(`glossary-${word}`)} target="_blank" rel="noreferrer">{text}</a>
    </p>
  );
}

export function UploadSteps(
  {
    repo, reserved, tree, draft, folderName, folderBody,
    forkInput, onForkInput, onDownload, canDownload, review,
  }: {
    repo: string;
    /** A namespace CODEOWNERS gates rather than a person. Its submitter has
     *  write access, so forking is both unnecessary and impossible to follow —
     *  the fork the page would point at does not exist. */
    reserved: boolean;
    tree: ListingTree;
    draft: { author: string; name: string };
    folderName: string;
    /** What the corrected folder holds, which is the one thing a skill and a
     *  plugin say differently. */
    folderBody: string;
    forkInput: string;
    onForkInput: (value: string) => void;
    onDownload: () => void;
    canDownload: boolean;
    /** What the pull request's title and description say (#300). Without it
     *  the link opens GitHub's bare form. */
    review?: PullRequestInput;
  },
) {
  const t = useStrings().submit;
  // Asked for, never derived. #81: the page guessed this and was wrong two ways
  // — the owner is not the namespace for a reserved one, and the name is
  // whatever the submitter typed into GitHub's fork dialog.
  const fork = checkFork(forkInput, repo, draft);
  // The registry pasted as the fork is no fork at all (S-8), so it counts as
  // not known yet rather than becoming a link.
  const usable = usableFork(forkInput, repo);
  // No username, no path: every one would read `{tree}//…` (#293, S-2).
  const named = hasNamespace(draft);
  const uploadHref = !named ? null : reserved
    ? registryUploadUrl(repo, draft, tree)
    : forkUploadUrl(usable, draft, tree);
  const prHref = reserved || !named ? null : pullRequestUrl(
    repo, usable, review ? pullRequestText(review) : undefined);

  return (
    <ol className="steps" data-testid="manual-steps">
      <li className="steps__item">
        <h3 className="steps__title">{t.send.folderTitle}</h3>
        <p className="steps__body">{rich(folderBody)}</p>
        <button
          className="btn btn--strong" onClick={onDownload}
          disabled={!canDownload} data-testid="download-folder"
        >
          {t.send.downloadFolder(folderName)}
        </button>
      </li>

      {!reserved && (
        <li className="steps__item">
          <h3 className="steps__title">{t.send.forkTitle}</h3>
          <p className="steps__body" data-testid="fork-step-body">{t.send.forkBody}</p>
          <GlossaryLink word="fork" text={t.send.forkMore} />
          <p className="cta-row">
            <a className="btn" href={forkUrl(repo)} data-testid="step-fork"
              target="_blank" rel="noreferrer">{t.send.forkCta}</a>
          </p>
          <Field
            id="fork" label={t.send.forkLabel} findings={[]} hint={t.send.forkHint}
          >
            <input
              id="fork" className="input" value={forkInput}
              placeholder={t.send.forkPlaceholder}
              onChange={(e) => onForkInput(e.target.value)}
            />
            {fork === "unparsed" && (
              <p className="field__finding" data-testid="fork-unparsed">
                {rich(t.send.forkUnparsed)}
              </p>
            )}
            {fork === "registry" && (
              <p className="field__finding" data-testid="fork-is-registry">
                {rich(t.send.forkIsRegistry)}
              </p>
            )}
            {/* Said, never filled in: an organization can hold the fork while a
                person opens the pull request, and a box the page filled is the
                page's guess (S-6). What must not happen is silence (S-1). */}
            {fork === "mismatch" && (
              <p className="field__finding" data-testid="fork-mismatch">
                {rich(t.send.forkMismatch(forkOwner(forkInput)!, namespaceOf(draft)))}
              </p>
            )}
          </Field>
        </li>
      )}

      <li className="steps__item">
        <h3 className="steps__title">{t.send.uploadTitle}</h3>
        {named ? (
          <p className="steps__body" data-testid="upload-step-body">
            {rich(t.send.uploadBody(
              folderName, reserved, uploadPath(draft, tree), landingPath(draft, tree),
            ))}
          </p>
        ) : (
          <p className="submit__note" data-testid="username-needed">
            {t.send.usernameNeeded}
          </p>
        )}
        <GlossaryLink word="commit" text={t.send.commitMore} />
        {!named ? null : uploadHref ? (
          <a className="btn" href={uploadHref}
            data-testid="step-upload" target="_blank" rel="noreferrer">
            {t.send.uploadCta}
          </a>
        ) : (
          <p className="submit__note" data-testid="upload-waiting">
            {t.send.uploadWaiting}
          </p>
        )}
      </li>

      {!reserved && (
        <li className="steps__item">
          <h3 className="steps__title">{t.send.pullRequestTitle}</h3>
          <p className="steps__body">{t.send.pullRequestBody}</p>
          <GlossaryLink word="pull-request" text={t.send.pullRequestMore} />
          {prHref && (
            <a className="btn" href={prHref}
              data-testid="step-pr" target="_blank" rel="noreferrer">
              {t.send.pullRequestCta}
            </a>
          )}
        </li>
      )}
    </ol>
  );
}
