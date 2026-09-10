/** Inline markup inside a string, so a paragraph stays one string.
 *
 *  The site's prose is full of emphasis: half the paragraphs on the About page
 *  put a `<strong>` mid-sentence and several carry a link. Extracting those to
 *  a table without a renderer means either splitting each paragraph into three
 *  or four fragments, which nobody can translate, or putting JSX in the table,
 *  which nobody can translate either. So a paragraph is one string with four
 *  markers in it, and the owner writing the Spanish translates the sentence and
 *  leaves the markers where the sentence wants them:
 *
 *    **strong**            emphasis that carries meaning — a warning, a caveat
 *    *emphasis*            emphasis that carries tone
 *    `code`                an identifier: a path, a field name, a place code
 *    [label](name)         a link, whose URL the component supplies
 *
 *  URLs are deliberately not in the table. They are identifiers, they are the
 *  same in every language, and a table full of them is a table that goes stale
 *  in five places at once — so a string names its link and the component maps
 *  the name to an href.
 *
 *  Not markdown, and not a markdown library: four markers is the whole
 *  vocabulary, block structure stays in the component where the classNames are,
 *  and nothing here ever renders HTML from a string.
 */

import { Fragment, type AnchorHTMLAttributes, type ReactNode } from "react";

/** `**` before `*`, so the leftmost-first alternation cannot mistake the one
 *  for the other. Non-greedy bodies, and `[\s\S]` so a marker may span the line
 *  breaks a long string is wrapped over. */
const MARKER =
  /\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*|`([\s\S]+?)`|\[([\s\S]+?)\]\(([^)]+?)\)/;

/** An href, or the whole anchor's props where one needs more than that —
 *  `target`, `rel`, a `data-testid` a test hangs off. */
export type Link = string | AnchorHTMLAttributes<HTMLAnchorElement>;
export type Links = Record<string, Link>;

/** Thrown rather than swallowed while developing, so a marker whose link the
 *  component does not supply fails in the test suite instead of rendering a
 *  paragraph with a dead phrase in it. In production the label is rendered as
 *  plain text: a mistyped locale should cost a link, never the page. */
function anchor(
  name: string, links: Links | undefined,
): AnchorHTMLAttributes<HTMLAnchorElement> | undefined {
  const value = links?.[name];
  if (value === undefined) {
    if (import.meta.env.DEV) {
      throw new Error(`rich(): no link named "${name}" was supplied`);
    }
    return undefined;
  }
  return typeof value === "string" ? { href: value } : value;
}

export function rich(text: string, links?: Links): ReactNode {
  const parts: ReactNode[] = [];
  let rest = text;
  let key = 0;

  for (let match = MARKER.exec(rest); match; match = MARKER.exec(rest)) {
    const [whole, strong, em, code, label, name] = match;
    if (match.index > 0) parts.push(rest.slice(0, match.index));

    if (strong !== undefined) {
      parts.push(<strong key={key++}>{rich(strong, links)}</strong>);
    } else if (em !== undefined) {
      parts.push(<em key={key++}>{rich(em, links)}</em>);
    } else if (code !== undefined) {
      // No recursion: a code span holds an identifier, and an asterisk in one
      // is an asterisk.
      parts.push(<code key={key++}>{code}</code>);
    } else if (label !== undefined && name !== undefined) {
      const props = anchor(name, links);
      parts.push(props === undefined
        ? <Fragment key={key++}>{rich(label, links)}</Fragment>
        : <a key={key++} {...props}>{rich(label, links)}</a>);
    }

    rest = rest.slice(match.index + whole.length);
  }

  if (rest) parts.push(rest);
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
