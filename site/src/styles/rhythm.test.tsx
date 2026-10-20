/** The space between a page's blocks is decided in one place (#287).
 *
 *  jsdom lays nothing out, so a test here cannot measure the gap above a
 *  heading. What it can hold is where that gap comes from. Every page drifted
 *  the same way: a section or a heading picked up its own margin in whichever
 *  part of app.css was nearest, and the guide's first heading ended up flush
 *  against the hero while the skill page put a second rule under its header.
 *
 *  So the rule enforced is about authorship, not pixels: only the rhythm block
 *  in app.css may give a section or a heading vertical margin or padding, and
 *  everything it uses is a token. A new page that needs different spacing has
 *  to change that block — where the next reader will see it — rather than
 *  adding a per-page value at the bottom of the file.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { About } from "../components/About";

const APP = readFileSync(join(__dirname, "app.css"), "utf8");
const TOKENS = readFileSync(join(__dirname, "tokens.css"), "utf8");
const SRC = join(__dirname, "..");

const START = "/* ---- rhythm";
const END = "/* ---- end of rhythm";

interface Rule { selector: string; body: string; at: number }

/** Every style rule in a stylesheet, with its offset, descending into @media.
 *  Comments are blanked rather than removed so offsets still line up. */
function rules(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (c) => " ".repeat(c.length));
  const out: Rule[] = [];
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
      if (selector.startsWith("@media") || selector.startsWith("@supports")) {
        walk(open + 1, j - 1);
      } else if (!selector.startsWith("@")) {
        out.push({ selector, body: text.slice(open + 1, j - 1), at: open });
      }
      i = j;
    }
  };
  walk(0, text.length);
  return out;
}

const ALL = rules(APP);
const start = APP.indexOf(START);
const end = APP.indexOf(END);
const inRhythm = (r: Rule) => r.at > start && r.at < end;

/** A section of a page, or a heading that opens one. Component titles —
 *  .card__title, .toc__title and the like — are part of their component and
 *  not on this list. */
const STRUCTURE =
  /(\.(h2|h3|prose__block|detail__section|detail__head|plugins|guide__product|band|band__heading|page|steps__title|disclosure__summary)(?![\w-]))|((^|[\s>+~,(])h[1-4](?![\w-]))/;
const VERTICAL = /(^|;)\s*(margin|padding)(-top|-bottom|-block|-block-start|-block-end)?\s*:/;

describe("the rhythm of a page", () => {
  it("has one block that decides it, and says so", () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  it("gives a section or heading vertical space nowhere but that block", () => {
    const offenders = ALL
      .filter((r) => !inRhythm(r))
      .filter((r) => r.selector.split(",").some((s) => STRUCTURE.test(s.trim())))
      .filter((r) => r.body.split(";").some((d) => VERTICAL.test(`;${d}`)))
      .map((r) => r.selector.replace(/\s+/g, " "));
    expect(offenders).toEqual([]);
  });

  it("spaces every kind of section from the same token", () => {
    const block = APP.slice(start, end);
    for (const cls of [".prose__block", ".detail__section", ".plugins", ".band", ".guide__product"]) {
      expect(block, `${cls} belongs to the rhythm block`).toContain(cls);
    }
    expect(block).toMatch(/var\(--space-section\)/);
    expect(TOKENS).toMatch(/--space-section\s*:/);
  });

  it("uses only tokens for vertical space inside that block", () => {
    const raw = ALL.filter(inRhythm).flatMap((r) =>
      r.body.split(";")
        .filter((d) => VERTICAL.test(`;${d}`))
        .map((d) => d.split(":").slice(1).join(":").trim())
        // 0, a token, or a calc of tokens. A bare length is a per-page value.
        .filter((v) => /(^|\s)-?\d*\.?\d+(px|rem|em)\b/.test(v.replace(/var\([^)]*\)/g, "")))
        .map((v) => `${r.selector.replace(/\s+/g, " ")} → ${v}`));
    expect(raw).toEqual([]);
  });

  it("refers to no token that tokens.css does not define", () => {
    // An undefined custom property is silently dropped, along with the whole
    // declaration — a gap that was meant to be there quietly becomes none.
    const defined = new Set([...TOKENS.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    const used = [...new Set([...APP.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]))];
    expect(used.filter((name) => !defined.has(name))).toEqual([]);
  });

  it("declares each component's layout once", () => {
    // Two rules for the same bare class that both lay it out are two
    // components sharing a name: the later one silently restyles the earlier
    // one's markup, which is how About's numbered steps lost their numbers.
    const LAYOUT = /(^|;)\s*(display|margin|padding|gap|list-style)\s*:/;
    const seen = new Map<string, number>();
    for (const r of ALL) {
      if (!/^\.[\w-]+$/.test(r.selector)) continue;
      if (!r.body.split(";").some((d) => LAYOUT.test(`;${d}`))) continue;
      seen.set(r.selector, (seen.get(r.selector) ?? 0) + 1);
    }
    expect([...seen].filter(([, n]) => n > 1).map(([s]) => s)).toEqual([]);
  });

  it("sets no inline spacing in a component", () => {
    // An inline style is the one place a stylesheet test cannot see.
    const dir = join(SRC, "components");
    const files = [
      ...readdirSync(dir).filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
        .map((f) => join(dir, f)),
      join(SRC, "App.tsx"),
    ];
    const offenders = files.filter((f) => /style=\{\{[^}]*(margin|padding)/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("the step component is used as a step component", () => {
  it("numbers About's by-hand steps with the same markup as the hand-off", () => {
    const { container } = render(<About skills={[]} />);
    const list = container.querySelector("#submitting ol.steps");
    expect(list).not.toBeNull();
    const items = [...list!.children];
    expect(items.length).toBeGreaterThan(0);
    for (const li of items) {
      expect(li).toHaveClass("steps__item");
      expect(li.querySelector("h3")).toHaveClass("steps__title");
    }
  });
});
