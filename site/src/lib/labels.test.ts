/**
 * CATEGORY_LABELS duplicates the label strings in registry/categories.yml, which
 * is the documented source of truth for the vocabulary. The duplication is
 * deliberate — the site renders synchronously and does not fetch the vocabulary
 * before painting a facet — but an unchecked duplicate is just drift waiting to
 * happen, so these tests make disagreement a build failure.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { parse } from "yaml";
import { CATEGORY_LABELS } from "./labels";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const vocabulary = (
  parse(readFileSync(join(ROOT, "registry", "categories.yml"), "utf8")) as {
    categories: { id: string; label: string }[];
  }
).categories;

describe("category labels agree with the vocabulary file", () => {
  it("covers every id, and invents none", () => {
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual(vocabulary.map((c) => c.id).sort());
  });

  it.each(vocabulary.map((c) => [c.id, c.label]))("%s renders the vocabulary's label", (id, label) => {
    expect(CATEGORY_LABELS[id]).toBe(label);
  });
});

describe("category labels are title case", () => {
  /** Words that stay lowercase mid-phrase in title case, plus the ampersand. */
  const MINOR = new Set(["a", "an", "and", "the", "or", "for", "of", "in", "on", "to", "&"]);

  it.each(vocabulary.map((c) => [c.id, c.label]))("%s capitalizes every significant word", (_id, label) => {
    const words = label.split(/\s+/);
    for (const [i, word] of words.entries()) {
      if (MINOR.has(word.toLowerCase()) && i > 0) continue;
      // Already-uppercase words (FOIA) and any word starting with a capital pass.
      expect(word[0]).toBe(word[0]?.toUpperCase());
    }
  });

  it("keeps ids in kebab-case — the vocabulary is machine-facing and must not move", () => {
    for (const c of vocabulary) expect(c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
