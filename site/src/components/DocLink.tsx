/** A link into a document that is not translated.
 *
 *  ADR 0004 decision 4 puts the site in every locale it ships and leaves
 *  `docs/` in English: the "docs describe what is" rule doubles its drift
 *  surface per language, and the line was drawn at the site. So a Spanish
 *  reader following a Spanish link arrives at an English document, and the only
 *  fair place to tell them is before the click.
 *
 *  The note is one string in the table — the owner words it — and the English
 *  table's answer is the empty string, which renders nothing. An English reader
 *  does not need to be told that an English document is in English, and a
 *  component asking `locale() === "en"` would be writing that decision into
 *  markup where the next locale cannot see it.
 */

import type { ReactNode } from "react";
import { useStrings } from "../i18n/strings";

export function DocLink(
  { href, testId, arrow = true, className = "arrow-link", children }: {
    href: string;
    testId?: string;
    /** The trailing → most of these carry. Off for the ones styled as buttons. */
    arrow?: boolean;
    className?: string;
    children: ReactNode;
  },
) {
  const note = useStrings().chrome.docsInEnglish;
  return (
    <a className={className} href={href} data-testid={testId}>
      {children}
      {note && <span className="doc-link__note"> ({note})</span>}
      {arrow && <> <span aria-hidden="true">→</span></>}
    </a>
  );
}
