/**
 * Renders a skill body to HTML.
 *
 * Skill bodies are markdown written by untrusted submitters and rendered onto
 * our origin, so anything that gets through here is stored XSS on a site aimed
 * at government users. Two defences, both in this file:
 *
 * 1. Raw HTML never survives. The renderer's html hooks return empty string, so
 *    <script>, <iframe>, and event-handler attributes are dropped rather than
 *    sanitised — there is no allowlist to get wrong.
 * 2. Link and image URLs are protocol-allowlisted. marked escapes attribute
 *    values but will happily emit href="javascript:...", which is enough on its
 *    own.
 *
 * This deliberately avoids DOMPurify: dropping HTML outright is a smaller and
 * more auditable guarantee than sanitising it, and it needs no DOM, so the
 * payload tests run in plain Node.
 */

import { Marked } from "marked";

/** Everything else — javascript:, data:, vbscript:, file: — is dropped. */
const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];

/** Browsers strip control characters and whitespace from a scheme before
 *  parsing, so "java\u0009script:" resolves to javascript:. Collapse them first
 *  or the protocol check reads the wrong string — matching control characters
 *  is the point, hence the disable below. */
// eslint-disable-next-line no-control-regex
const SCHEME_NOISE = /[\u0000-\u0020]/g;

/** Relative URLs are fine and common: skills link to their own references/. */
export function isSafeUrl(href: string): boolean {
  const collapsed = href.replace(SCHEME_NOISE, "");
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(collapsed)) return true; // relative
  try {
    return SAFE_PROTOCOLS.includes(new URL(collapsed).protocol);
  } catch {
    return false;
  }
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const marked = new Marked({ gfm: true, breaks: false });

marked.use({
  renderer: {
    // Raw HTML, block and inline, is discarded rather than sanitised.
    html: () => "",
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      if (!isSafeUrl(href)) return text;
      const t = title ? ` title="${escapeAttr(title)}"` : "";
      return `<a href="${escapeAttr(href)}"${t} rel="noopener noreferrer">${text}</a>`;
    },
    image({ href, title, text }) {
      if (!isSafeUrl(href)) return escapeAttr(text);
      const t = title ? ` title="${escapeAttr(title)}"` : "";
      return `<img src="${escapeAttr(href)}" alt="${escapeAttr(text)}"${t} loading="lazy">`;
    },
  },
});

export function renderMarkdown(source: string): string {
  return marked.parse(source, { async: false });
}
