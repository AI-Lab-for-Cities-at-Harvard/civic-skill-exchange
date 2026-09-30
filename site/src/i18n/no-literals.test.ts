/**
 * The regression guard for #149: no user-facing prose written inline in a
 * component.
 *
 * Once every string lives in `en.ts`, the only thing keeping it there is a
 * check that fails when the next paragraph is typed straight into the JSX.
 * `eslint-plugin-react`'s `jsx-no-literals` is the usual tool, but the site's
 * eslint config carries no react plugin, and this needs no new dependency of
 * its own weight: `@typescript-eslint/typescript-estree` is already in the tree
 * behind `typescript-eslint` and parses TSX into an ESTree with real `JSXText`
 * nodes, so the guard reads syntax rather than guessing with a regex. (The
 * bundled `typescript` is 7.x, whose package no longer exposes the classic
 * `createSourceFile` compiler API.)
 *
 * Two things are flagged:
 *
 *   1. JSX text with letters in it.
 *   2. A string literal given to an attribute a person reads — `aria-label`,
 *      `title`, `alt`, `placeholder`, and the prose props the site's own
 *      components take (`label`, `legend`, `hint`, `note`, `summary`).
 *
 * Allowed through: whitespace, punctuation, dashes and arrows, which are layout
 * rather than language; and anything inside `<code>`, because a code span holds
 * an identifier — a path, a frontmatter key, a jurisdiction code — and
 * identifiers do not translate (ADR 0004).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { parse } from "@typescript-eslint/typescript-estree";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Every surface that renders prose. App.tsx is in here as the chrome. */
const FILES = [
  "App.tsx",
  "components/About.tsx",
  "components/Badges.tsx",
  "components/Bands.tsx",
  "components/Beta.tsx",
  "components/DocLink.tsx",
  "components/DownloadBox.tsx",
  "components/Facets.tsx",
  "components/History.tsx",
  "components/SkillCard.tsx",
  "components/SkillDetail.tsx",
  "components/Submit.tsx",
];

/** Attributes and props whose value is read by a person, not by a machine. */
const PROSE_ATTRIBUTES = new Set([
  "aria-label", "title", "alt", "placeholder",
  "label", "legend", "hint", "note", "summary",
]);

/** Entities first: `&rarr;` is four letters and no language. */
function hasWords(raw: string): boolean {
  return /\p{L}/u.test(raw.replace(/&[a-zA-Z]+;|&#\d+;/g, ""));
}

type Node = { type?: string; loc?: { start: { line: number } } } & Record<string, unknown>;

const isNode = (v: unknown): v is Node =>
  typeof v === "object" && v !== null && typeof (v as Node).type === "string";

function nameOf(node: unknown): string {
  return isNode(node) && typeof node.name === "string" ? node.name : "";
}

/** Every prose literal in one file, as `path:line text`. */
export function literals(file: string): string[] {
  const tree = parse(readFileSync(join(SRC, file), "utf8"), { jsx: true, loc: true });
  const found: string[] = [];
  const line = (node: Node) => node.loc?.start.line ?? 0;

  const walk = (value: unknown, inCode: boolean) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item, inCode);
      return;
    }
    if (!isNode(value)) return;

    if (value.type === "JSXText" && !inCode && hasWords(String(value.raw ?? ""))) {
      found.push(`${file}:${line(value)} ${JSON.stringify(String(value.value).trim())}`);
    }
    if (value.type === "JSXAttribute") {
      const attr = nameOf(value.name);
      const literal = value.value as Node | null;
      if (
        PROSE_ATTRIBUTES.has(attr) &&
        isNode(literal) && literal.type === "Literal" &&
        typeof literal.value === "string" && hasWords(literal.value)
      ) {
        found.push(`${file}:${line(value)} ${attr}=${JSON.stringify(literal.value)}`);
      }
    }

    const code = inCode ||
      (value.type === "JSXElement" &&
        nameOf((value.openingElement as Node | undefined)?.name) === "code");

    for (const [key, child] of Object.entries(value)) {
      if (key === "parent" || key === "loc" || key === "range") continue;
      walk(child, code);
    }
  };

  walk(tree as unknown, false);
  return found;
}

describe("no user-facing prose is written inline in a component", () => {
  it.each(FILES)("%s renders only strings from the table", (file) => {
    expect(literals(file)).toEqual([]);
  });
});
