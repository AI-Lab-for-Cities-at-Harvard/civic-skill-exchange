/**
 * Nothing in the table is dead.
 *
 * A string table accretes. A paragraph is rewritten, the old key is left
 * behind, and the next locale translates it — so the cost of the stale entry is
 * paid by the person least able to spot it. This walks `en` and asks, of every
 * entry, whether anything under `src/` reads it.
 *
 * It reads property accesses and quoted strings out of the source rather than
 * type-checking, because most of the ways these are read cannot be seen by a
 * type: `a.toc.sections[id]` takes its key from a route slug, and the
 * vocabularies are keyed by values the schema defines. So it is a coarse check
 * with one job — an entry nothing anywhere mentions — and it will not catch an
 * entry that shares its last segment with a live one. Test files do not count:
 * a key only a test reads is a key nothing renders.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { en } from "./en";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TABLE = join(SRC, "i18n", "en.ts");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return [];
    return path === TABLE ? [] : [path];
  });
}

/** Every property name read, and every quoted string written, anywhere the site
 *  actually renders from. */
const mentioned: Set<string> = (() => {
  const found = new Set<string>();
  for (const path of sources(SRC)) {
    const text = readFileSync(path, "utf8");
    for (const [, name] of text.matchAll(/\.([A-Za-z_$][\w$]*)/g)) found.add(name!);
    for (const [, value] of text.matchAll(/["']([^"'\n]+)["']/g)) found.add(value!);
  }
  return found;
})();

/** Maps whose keys are values the schema defines, read with a variable rather
 *  than a literal. What their keys must be is settled elsewhere — the
 *  categories against `registry/categories.yml` in labels.test.ts, the rest by
 *  the schema — so this checks that the map is read at all, not each key. */
const KEYED_BY_SCHEMA = new Set([
  "vocabulary.category", "vocabulary.scope", "vocabulary.language",
  "vocabulary.sensitivity", "vocabulary.localization", "vocabulary.deployment",
  "vocabulary.humanReview", "vocabulary.affiliation", "vocabulary.tier",
  "detail.humanReview", "submit.form.fieldNames",
]);

/** Each addressable entry, as a dotted path. Arrays are one entry: a list of
 *  bullets is read as a list. */
function entries(node: unknown, path: string[] = []): string[] {
  const here = path.join(".");
  if (
    node === null || typeof node !== "object" || Array.isArray(node) ||
    KEYED_BY_SCHEMA.has(here)
  ) {
    return path.length ? [here] : [];
  }
  return Object.entries(node).flatMap(([key, value]) => entries(value, [...path, key]));
}

describe("every entry in the table is read by something that renders", () => {
  const paths = entries(en);

  it("finds entries to check, so a broken walk cannot pass silently", () => {
    expect(paths.length).toBeGreaterThan(250);
  });

  it.each(paths)("%s", (path) => {
    const last = path.split(".").at(-1)!;
    expect(mentioned.has(last), `nothing under src/ reads ${path}`).toBe(true);
  });
});
