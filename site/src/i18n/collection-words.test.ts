/** #209, ADR 0008 decision 8: they are called Collections, never "Featured",
 *  "Curated" or "Recommended". ADR 0002 decision 4 rejected those words
 *  because each implies a standard nobody has defined, and a reader takes a
 *  "recommended" listing for a checked one.
 *
 *  Read from both tables' source with the comments taken out, so every string
 *  is covered, functions included, and a comment explaining the rule (like
 *  this one) does not trip it. */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_LOCALE, setLocale, strings } from "./strings";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The table's source, without its comments. A `//` is a comment only at the
 *  start of a line here, so a URL in a string survives. */
const prose = (file: string) =>
  readFileSync(join(HERE, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** The words, and their Spanish forms. "Recomendó" (somebody recommended
 *  this page to you) is a verb about a person, not a label on a listing, and
 *  is not matched. */
const BANNED: Record<string, RegExp> = {
  "en.ts": /\b(featured|curated|recommended)\b/i,
  "es.ts": /\b(destacad[oa]s?|curad[oa]s?|recomendad[oa]s?)\b/i,
};

describe("collections are called collections", () => {
  it.each(Object.entries(BANNED))("%s never says featured, curated or recommended", (file, words) => {
    const hits = prose(file).split("\n").filter((line) => words.test(line));
    expect(hits).toEqual([]);
  });

  it("is what the heading says, in English", () => {
    expect(strings().collections.heading).toBe("Collections");
  });

  it("is what the heading says, in Spanish", async () => {
    await setLocale("es");
    try {
      expect(strings().collections.heading).toBe("Colecciones");
    } finally {
      await setLocale(DEFAULT_LOCALE);
    }
  });
});
