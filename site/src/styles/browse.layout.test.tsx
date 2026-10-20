/** The browse page on the layout primitives (#319, ADR 0007 decision 3), with
 *  the compact rows of #208 (ADR 0008).
 *
 *  The facets, the results, a facet's options, the toggle bar and the pager
 *  are Stacks and Clusters (App.browse.test.tsx and Pager.test.tsx hold the
 *  markup). This holds the stylesheet: the cards and their grid are gone, the
 *  rules the primitives replace no longer space anything, the rows line up on
 *  one grid, every new control is at least 44px, and the page's left and right
 *  are logical properties.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const APP = readFileSync(join(__dirname, "app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const COMPONENTS = join(__dirname, "..", "components");

/** Every rule as selector and body, @media bodies included. */
const RULES = [...APP.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ selector: m[1]!.trim().replace(/^@media[^{]*\{\s*/, ""), body: m[2]! }));
const bodies = (selector: string) =>
  RULES.filter((r) => r.selector.split(/\s*,\s*/).includes(selector)).map((r) => r.body);

const SPACES = /(^|[;\s])(margin[\w-]*|padding[\w-]*|gap|row-gap|column-gap)\s*:/;
const PHYSICAL = /(^|[;\s])(left|right|(margin|padding|border)-(left|right))\s*:/;

describe("the cards are gone", () => {
  it("has no card or card-grid rule left", () => {
    const left = RULES.map((r) => r.selector)
      .filter((s) => /\.(card|grid)(?![\w-])|\.card__/.test(s));
    expect(left).toEqual([]);
  });

  it("has deleted SkillCard and PluginCard, which nothing uses", () => {
    expect(existsSync(join(COMPONENTS, "SkillCard.tsx"))).toBe(false);
    expect(existsSync(join(COMPONENTS, "PluginCard.tsx"))).toBe(false);
  });

  it("has no plugins section below the skills to space", () => {
    expect(bodies(".plugins")).toEqual([]);
  });
});

describe("what the primitives replace no longer spaces anything", () => {
  it("leaves the facets, the search and the count to their Stacks", () => {
    for (const sel of [".filters", ".facet__note", ".results__count"]) {
      expect(bodies(sel).length, sel).toBeGreaterThan(0);
      for (const b of bodies(sel)) expect(b, sel).not.toMatch(SPACES);
    }
    expect(bodies(".filters").join(";")).not.toMatch(/display\s*:/);
    expect(bodies(".facet__options")).toEqual([]);
  });
});

describe("the rows", () => {
  it("are one grid, each row and its head a subgrid of it", () => {
    expect(bodies(".rows").join(";")).toMatch(/display\s*:\s*grid/);
    expect(bodies(".row").join(";")).toMatch(/grid-template-columns\s*:\s*subgrid/);
    expect(bodies(".row__head").join(";")).toMatch(/grid-template-columns\s*:\s*subgrid/);
  });

  it("change shape at a phone, at 640px", () => {
    expect(APP).toMatch(/@media\s*\(max-width:\s*640px\)\s*\{[^@]*\.rows\s*\{[^}]*grid-template-columns/);
  });

  it("keep the tier's note on a closed row in the markup, out of sight", () => {
    const vh = bodies(".vh").join(";");
    expect(vh).toMatch(/position\s*:\s*absolute/);
    expect(vh).toMatch(/clip-path/);
    expect(vh).not.toMatch(/display\s*:\s*none|visibility\s*:\s*hidden/);
  });
});

describe("the plugins side's introduction", () => {
  // Design check: at body size and the column's full width it read as the
  // page's subject and ran past 110 characters a line. It is a caption.
  it("is set as a caption, at a readable measure", () => {
    const body = bodies(".browse__intro").join(";");
    expect(body).toMatch(/font-size\s*:\s*var\(--t-sm\)/);
    expect(body).toMatch(/max-width\s*:\s*66ch/);
  });
});

describe("every new control is at least 44px", () => {
  it.each([".row__toggle", ".toggle a", ".pager a"])("%s", (sel) => {
    expect(bodies(sel).join(";")).toMatch(/min-height\s*:\s*2\.75rem/);
  });

  it("and a page number is as wide as it is tall", () => {
    expect(bodies(".pager a").join(";")).toMatch(/min-width\s*:\s*2\.75rem/);
  });
});

describe("the page's left and right are logical", () => {
  it("in every browse rule", () => {
    const browse = RULES.filter((r) =>
      /\.(row|rows|pager|toggle|browse__bar|facet|filters|search|results|skip-link|layout)\b/.test(r.selector));
    expect(browse.length).toBeGreaterThan(10);
    const physical = browse.filter((r) => PHYSICAL.test(r.body)).map((r) => r.selector);
    expect(physical).toEqual([]);
  });

  it("including a facet option's padding, which is wider on one side", () => {
    const body = bodies(".facet__option").join(";");
    expect(body).toMatch(/padding-inline\s*:/);
    expect(body).not.toMatch(/(^|[;\s])padding\s*:[^;]*\S+\s+\S+\s+\S+\s+\S+/);
  });
});

describe("the phone's filters (#328)", () => {
  const LAYOUT = readFileSync(join(__dirname, "layout.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  /** Rule bodies for `selector` inside a media query whose text matches. */
  const inMedia = (query: RegExp, selector: string) =>
    [...APP.matchAll(/@media\s*([^{]*)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)]
      .filter((m) => query.test(m[1]!))
      .flatMap((m) => [...m[2]!.matchAll(/([^{}]+)\{([^{}]*)\}/g)])
      .filter((r) => r[1]!.split(/\s*,\s*/).map((x) => x.trim()).includes(selector))
      .map((r) => r[2]!);

  it("hides the button from 1024px up, and only there", () => {
    expect(inMedia(/min-width\s*:\s*1024px/, ".filters__toggle").join(";"))
      .toMatch(/display\s*:\s*none/);
    const outside = bodies(".filters__toggle").length - inMedia(/min-width\s*:\s*1024px/, ".filters__toggle").length;
    expect(outside).toBe(1);
    expect(APP.replace(/@media[^{]*\{[^{}]*\{[^{}]*\}\s*\}/g, "")).not.toMatch(/\.filters__toggle[^{]*\{[^}]*display\s*:\s*none/);
  });

  it("is at least 44px tall", () => {
    expect(bodies(".filters__toggle").join(";")).toMatch(/min-height\s*:\s*2\.75rem/);
  });

  it("lets the facets show whatever `hidden` says from 1024px up", () => {
    const m = LAYOUT.match(/@media\s*\(min-width:\s*1024px\)\s*\{\s*([^{}]*)\{([^{}]*)\}/);
    expect(m, "a min-width: 1024px rule in layout.css").not.toBeNull();
    expect(m![1]).toMatch(/\.filters__facets\[hidden\]/);
    expect(m![2]).toMatch(/display\s*:\s*flex/);
  });

  it("adds no spacing of its own to the facets panel", () => {
    for (const b of bodies(".filters__facets")) expect(b).not.toMatch(SPACES);
  });
});
