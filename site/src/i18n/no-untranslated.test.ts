/**
 * The Spanish table is not translated yet, and this is the gate that says so.
 *
 * #150 delivers the plumbing: a second locale module, a switcher, locale-aware
 * dates and numbers, and a Spanish table with every entry in place. What it
 * deliberately does not deliver is the Spanish, which the owner writes. So
 * every value in `es.ts` starts as the English text behind the marker `[es] `,
 * and this test fails while any of them remains.
 *
 * It is EXPECTED TO BE RED until the translation lands, and the pull request
 * that adds the plumbing is a draft for that reason. Do not exempt entries to
 * make it green: an exemption list is how a locale ships half-translated, which
 * is worse than shipping English — a reader who sees Spanish trusts the page to
 * be in Spanish.
 *
 * The marker is checked against the file's own text rather than against the
 * imported table, because a function's marked English only appears once the
 * function is called with the right arguments, and there is no set of arguments
 * that fits all of them.
 *
 * Entries with no marker are entries with nothing to translate: `footer.date`
 * and `history.when` are `Intl` calls that take their language from the locale
 * tag, and the `email` group is addressed to a maintainer who reads English.
 * Both say so where they are written.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The marker, spelled once. `es.ts` documents it, `DEVELOPMENT.md` documents
 *  it, and a translator greps for it. */
const MARKER = "[es] ";

const SOURCE = readFileSync(join(HERE, "es.ts"), "utf8").split("\n");

/** Every line still carrying the marker, as `es.ts:LINE key — text`.
 *
 *  The nearest preceding `key:` is reported rather than a dotted path: what
 *  somebody translating wants is the line to open, and a long paragraph is
 *  wrapped over several lines whose first is the one with the key on it. */
function untranslated(): string[] {
  const found: string[] = [];
  let key = "(none)";
  for (const [i, line] of SOURCE.entries()) {
    const declares = /^\s*("?[\w.$-]+"?)\s*:/.exec(line);
    if (declares) key = declares[1]!.replace(/"/g, "");
    if (!line.includes(MARKER)) continue;
    const text = line
      .slice(line.indexOf(MARKER) + MARKER.length)
      .replace(/["`]\s*[+,]?\s*$/, "")
      .trim()
      .slice(0, 60);
    found.push(`es.ts:${i + 1} ${key} — ${text}`);
  }
  return found;
}

describe("the Spanish table holds Spanish", () => {
  it("reads the table it is checking, so a moved file cannot pass silently", () => {
    expect(SOURCE.length).toBeGreaterThan(500);
    expect(SOURCE.join("\n")).toContain("export const strings");
  });

  it("has no value left as marked English", () => {
    const remaining = untranslated();
    expect(
      remaining,
      `${remaining.length} entries in es.ts are still the English text behind ` +
      `${MARKER.trim()}:\n${remaining.join("\n")}`,
    ).toEqual([]);
  });
});
