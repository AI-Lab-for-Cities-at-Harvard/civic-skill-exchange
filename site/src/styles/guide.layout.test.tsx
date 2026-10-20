/** The guide is the layout primitives' third user (#321).
 *
 *  Its tasks, product sections, steps, commands, figures and glossary are
 *  Stacks and Clusters, so the rules that used to space them are gone from
 *  app.css, and `.download__cmd` (shared with the install box) keeps only its
 *  label and `code` drawing. The gaps are the ones the old rules produced,
 *  measured in a real browser before and after (see docs/DEVELOPMENT.md); this
 *  holds the structure that produces them.
 */

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, cleanup } from "@testing-library/react";
import { Guide } from "../components/Guide";
import { GLOSSARY, SCREENSHOTS } from "../lib/guide";

afterEach(cleanup);

const APP = readFileSync(join(__dirname, "app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Declarations of every rule whose whole selector is `selector`. */
const bodies = (selector: string) =>
  [...APP.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter((m) => m[1]!.trim().split(/\s*,\s*/).includes(selector))
    .map((m) => m[2]!);

const SPACES = /(^|[;\s])(margin[\w-]*|padding[\w-]*|gap|row-gap|column-gap)\s*:/;
const MARGIN = /(^|[;\s])margin[\w-]*\s*:/;
const LAYS_OUT = /(^|[;\s])(display\s*:\s*(grid|flex)|gap\s*:)/;

const stack = (el: Element | null, gap: string, what: string) => {
  expect(el, what).not.toBeNull();
  expect(el, what).toHaveClass("l-stack", `l-gap-${gap}`);
};

describe("the guide uses the primitives", () => {
  it("spaces a task as a Stack: its heading and lede, then each product", () => {
    const { container } = render(<Guide />);
    for (const id of ["install", "marketplace"]) {
      const task = container.querySelector(`#${id}`)!;
      // 32px (the subsection space) between the lede and a product, and
      // between products.
      stack(task, "6", `the ${id} task`);
      expect(task).toHaveClass("prose__block");
      const head = task.firstElementChild!;
      expect(head.tagName).toBe("HEADER");
      stack(head, "4", `the ${id} heading and lede`);
      expect(head.querySelector(":scope > h2")).not.toBeNull();
      expect(task.querySelectorAll(":scope > .guide__product").length).toBeGreaterThan(1);
    }
  });

  it("spaces a product as a heading over a Stack of its parts", () => {
    const { container } = render(<Guide />);
    const products = [...container.querySelectorAll(".guide__product")];
    expect(products.length).toBeGreaterThan(3);
    for (const p of products) {
      stack(p, "3", "a product");
      expect(p.tagName).toBe("SECTION");
      expect(p.firstElementChild!.tagName).toBe("H3");
      stack(p.children[1]!, "4", "a product's steps, commands, notes and figures");
    }
  });

  it("makes the steps a Stack, and each command a Stack like the install box's", () => {
    const { container } = render(<Guide />);
    const steps = [...container.querySelectorAll("ol.guide__steps")];
    expect(steps.length).toBeGreaterThan(0);
    for (const ol of steps) stack(ol, "2", "the steps");
    const cmds = [...container.querySelectorAll(".download__cmd")];
    expect(cmds.length).toBeGreaterThan(0);
    for (const c of cmds) stack(c, "2", "a command");
  });

  it("makes the figures a Stack of Stacks", () => {
    const { container } = render(<Guide />);
    const groups = [...container.querySelectorAll(".guide__shots")];
    expect(groups.length).toBe(Object.keys(SCREENSHOTS).length);
    for (const g of groups) {
      stack(g, "4", "the figures");
      expect(g.lastElementChild).toHaveClass("guide__captured");
    }
    const figures = [...container.querySelectorAll("figure.guide__shot")];
    expect(figures.length).toBeGreaterThan(0);
    for (const f of figures) stack(f, "2", "a figure and its caption");
  });

  it("makes the glossary a Stack of Stacks", () => {
    const { container } = render(<Guide />);
    stack(container.querySelector("dl.guide__glossary"), "4", "the glossary");
    const rows = container.querySelectorAll("dl.guide__glossary > div");
    expect(rows.length).toBe(GLOSSARY.length);
    for (const row of rows) stack(row, "1", "a term and its meaning");
  });

  it("sets the call to action in a Cluster", () => {
    const { container } = render(<Guide />);
    const cta = container.querySelector("#share .cta-row")!;
    expect(cta).toHaveClass("l-cluster", "l-gap-3");
  });
});

describe("a Stack of figures", () => {
  it("clears the indent a <figure> brings, as it does a <dd>'s", () => {
    // The browser gives every <figure> 40px either side. The old rule zeroed
    // it with `margin: 0`; the guide's screenshots are full width, so a figure
    // in a Stack starts and ends where the Stack does (measured at 375px: the
    // images were 247px wide, not 327, without this).
    const layout = readFileSync(join(__dirname, "layout.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(layout).toMatch(/\.l-stack\s*>\s*figure\s*\{[^}]*margin-inline\s*:\s*0/);
  });
});

describe("what is left of the guide's rules in app.css", () => {
  it("no longer spaces or lays out the steps, figures, glossary or commands", () => {
    for (const sel of [".guide__shots", ".guide__shot", ".guide__shot figcaption", ".guide__captured",
      ".guide__glossary dt", ".guide__glossary dd", ".download__cmd"]) {
      expect(bodies(sel).join(";"), sel).not.toMatch(SPACES);
      expect(bodies(sel).join(";"), sel).not.toMatch(LAYS_OUT);
    }
    for (const sel of [".guide__steps", ".guide__glossary"]) {
      expect(bodies(sel).join(";"), sel).not.toMatch(MARGIN);
      expect(bodies(sel).join(";"), sel).not.toMatch(LAYS_OUT);
    }
  });

  it("keeps what the install box still needs of .download__cmd", () => {
    expect(bodies(".download__cmd-label").length).toBeGreaterThan(0);
    expect(bodies(".download__cmd code").length).toBeGreaterThan(0);
  });

  it("leaves the product's top space to the section's Stack, not the rhythm block", () => {
    expect(bodies(".guide__product")).toEqual([]);
  });

  it("puts the guide's left edges in logical properties, for right-to-left", () => {
    expect(bodies(".guide__steps").join(";")).toMatch(/padding-inline-start/);
    expect(bodies(".guide__steps").join(";")).not.toMatch(/(^|[;\s])(left|right|[\w]+-(left|right))\s*:/);
    const current = bodies(".toc__link--current").join(";");
    expect(current).toMatch(/border-inline-start/);
    expect(current).toMatch(/margin-inline-start/);
    expect(current).toMatch(/padding-inline-start/);
    expect(current).not.toMatch(/(^|[;\s])(left|right|[\w]+-(left|right))\s*:/);
  });
});
