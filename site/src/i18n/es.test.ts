/**
 * The Spanish table mirrors the English one exactly.
 *
 * `Strings` already makes a missing key a type error, and that is the first
 * line of defence. What a type cannot see is the rest of what makes two tables
 * a pair: the *order* the groups are written in, which is the only thing that
 * lets somebody work down a screen in one file and find the same screen in the
 * other; how many bullets a list has, since `review.questions` is nine
 * questions and a locale with eight would render eight; and the values inside a
 * `[value, label]` choice, which are enums the schema defines and must not be
 * translated even by accident.
 *
 * So the shape of both tables is walked and compared as one list. A single
 * assertion covers a missing key, an extra key, a moved group, a function that
 * dropped an argument and a list that lost an item — and names the path when it
 * fails, which is what somebody fixing it needs.
 */

import { describe, it, expect } from "vitest";
import { en } from "./en";
import { strings as es } from "./es";

/** Every addressable position in a table, in source order, with what is at it.
 *
 *  Deliberately structural: the *shape* is the contract between two locales,
 *  and the words are what differ. Nothing here compares a string's content. */
function shape(node: unknown, path: string[] = []): string[] {
  const at = path.join(".") || "(root)";
  if (typeof node === "function") return [`${at} = function/${node.length}`];
  if (Array.isArray(node)) {
    return [
      `${at} = array/${node.length}`,
      ...node.flatMap((item, i) => shape(item, [...path, String(i)])),
    ];
  }
  if (node !== null && typeof node === "object") {
    return [
      `${at} = object`,
      ...Object.entries(node).flatMap(([key, value]) => shape(value, [...path, key])),
    ];
  }
  return [`${at} = ${typeof node}`];
}

/** Every `[value, label]` pair in a table, as `path -> value`. A choice list is
 *  an array of two-string arrays; nothing else in the table has that shape. */
function choiceValues(node: unknown, path: string[] = []): string[] {
  if (Array.isArray(node)) {
    if (node.length === 2 && node.every((v) => typeof v === "string")) {
      return [`${path.join(".")} -> ${node[0]}`];
    }
    return node.flatMap((item, i) => choiceValues(item, [...path, String(i)]));
  }
  if (node !== null && typeof node === "object") {
    return Object.entries(node).flatMap(([key, value]) => choiceValues(value, [...path, key]));
  }
  return [];
}

describe("es.ts mirrors en.ts", () => {
  it("has the same keys, in the same order, with the same groups", () => {
    expect(shape(es)).toEqual(shape(en));
  });

  it("walks something, so a broken walk cannot pass silently", () => {
    expect(shape(en).length).toBeGreaterThan(400);
    expect(choiceValues(en).length).toBeGreaterThan(10);
  });

  it("translates no enum value in a choice list", () => {
    // The label beside it is prose and is expected to differ. The value is an
    // identifier the schema defines, and a translated one would write a
    // frontmatter file the validator rejects.
    expect(choiceValues(es)).toEqual(choiceValues(en));
  });
});
