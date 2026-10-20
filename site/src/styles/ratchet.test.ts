/** A ratchet on app.css (#316, ADR 0007 decision 6.4).
 *
 *  The hand-written stylesheet is being migrated, a page at a time, to the
 *  layout primitives and to logical properties. This counts what is left to
 *  migrate and fails if the count goes UP: a new margin, padding or gap in
 *  app.css, or a new physical left/right, is a decision to make in a
 *  primitive or a logical property instead.
 *
 *  When a migration removes rules the count goes down, and this test fails the
 *  other way too (a stale record hides the next regression). Lower the number
 *  below to what the failure message reports, in the same commit. See
 *  docs/DEVELOPMENT.md, "Layout primitives and the spacing ratchet".
 *
 *  What is counted, so the number can be re-derived:
 *  - spacing: style rules (including inside @media / @supports) with at least
 *    one margin*, padding*, gap, row-gap or column-gap declaration. A rule is
 *    one count however many such declarations it has.
 *  - physical: declarations of left, right, margin-left/right,
 *    padding-left/right or border-left/right (the shorthand only; the -width,
 *    -style and -color longhands follow it and are not counted twice).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The recorded counts. Lower them with a migration; never raise them. */
const RECORDED = { spacingRules: 115, physicalSides: 4 };

const APP = readFileSync(join(__dirname, "app.css"), "utf8");

function rules(css: string): { selector: string; body: string }[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (c) => " ".repeat(c.length));
  const out: { selector: string; body: string }[] = [];
  const walk = (from: number, to: number) => {
    let i = from;
    while (i < to) {
      const open = text.indexOf("{", i);
      if (open === -1 || open >= to) return;
      const selector = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < to && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      if (/^@(media|supports|layer)/.test(selector)) walk(open + 1, j - 1);
      else if (!selector.startsWith("@")) out.push({ selector, body: text.slice(open + 1, j - 1) });
      i = j;
    }
  };
  walk(0, text.length);
  return out;
}

const properties = (body: string) =>
  body.split(";").map((d) => d.trim()).filter((d) => d.includes(":"))
    .map((d) => d.slice(0, d.indexOf(":")).trim());

const SPACING = /^(margin|padding)(-[a-z-]+)?$|^(gap|row-gap|column-gap)$/;
const PHYSICAL = /^(left|right|(margin|padding|border)-(left|right))$/;

const ALL = rules(APP);
const spacingRules = ALL.filter((r) => properties(r.body).some((p) => SPACING.test(p)));
const physicalSides = ALL.flatMap((r) => properties(r.body).filter((p) => PHYSICAL.test(p)));

const how = (what: string, now: number, recorded: number) =>
  `${what}: app.css has ${now}, recorded ${recorded}. ` +
  (now > recorded
    ? "It went up. Use a layout primitive or a logical property instead."
    : `It went down. Set RECORDED to ${now} in ratchet.test.ts.`);

describe("the spacing ratchet on app.css", () => {
  it("counts rules that set spacing, and they only go down", () => {
    expect(spacingRules.length, how("spacing rules", spacingRules.length, RECORDED.spacingRules))
      .toBe(RECORDED.spacingRules);
  });

  it("counts physical left/right declarations, and they only go down", () => {
    expect(physicalSides.length, how("physical sides", physicalSides.length, RECORDED.physicalSides))
      .toBe(RECORDED.physicalSides);
  });
});
