/** The About page is the layout primitives' third page (#320).
 *
 *  Its sections, contents box, tier cards, vocabulary tables and the rows in
 *  them are Stacks, Clusters and Grids, so the rules that used to space them
 *  are gone from app.css. What is left of those classes is type, colour and
 *  a box's own padding, with the left edges in logical properties so they hold
 *  in right-to-left. The gaps are the ones the old rules produced, measured in
 *  a real browser before and after (docs/DEVELOPMENT.md); this holds the
 *  structure that produces them.
 */

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, cleanup } from "@testing-library/react";
import { About } from "../components/About";
import { makeSkill } from "../test/fixtures";

afterEach(cleanup);

const APP = readFileSync(join(__dirname, "app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Declarations of every rule whose selector list includes `selector`. */
const bodies = (selector: string) =>
  [...APP.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter((m) => m[1]!.trim().split(/\s*,\s*/).includes(selector))
    .map((m) => m[2]!);

const SPACES = /(^|[;\s])(margin[\w-]*|padding[\w-]*|gap|row-gap|column-gap)\s*:/;
const LAYS_OUT = /(^|[;\s])(display\s*:\s*(grid|flex)|gap\s*:|flex-wrap\s*:|grid-template-columns\s*:)/;
const PHYSICAL = /(^|[;\s])(left|right|(margin|padding|border)-(left|right))\s*:/;

const page = () => render(
  <About skills={[makeSkill({ namespace: "civic-skills", name: "generalize-skill" }),
    makeSkill({ namespace: "civic-skills", name: "localize-skill" })]} />,
).container;

const stack = (el: Element | null | undefined, gap: string, what: string) => {
  expect(el, what).toBeTruthy();
  expect(el, what).toHaveClass("l-stack", `l-gap-${gap}`);
};
const cluster = (el: Element | null | undefined, gap: string, what: string) => {
  expect(el, what).toBeTruthy();
  expect(el, what).toHaveClass("l-cluster", `l-gap-${gap}`);
};
const grid = (el: Element | null | undefined, gap: string, min: string, what: string) => {
  expect(el, what).toBeTruthy();
  expect(el, what).toHaveClass("l-grid", `l-gap-${gap}`);
  expect((el as HTMLElement).style.getPropertyValue("--l-grid-min"), what).toBe(min);
};

describe("About's sections and contents box use the primitives", () => {
  it("makes every section a Stack of 16px (gap 4)", () => {
    const c = page();
    const sections = [...c.querySelectorAll("section.prose__block[id]")];
    expect(sections.length).toBe(8);
    for (const s of sections) stack(s, "4", `#${s.id}`);
  });

  it("makes the contents box a Stack, its groups a Grid, each group and list a Stack", () => {
    const c = page();
    const toc = c.querySelector("nav.toc");
    stack(toc, "3", "the contents box");
    grid(toc!.querySelector(".toc__groups"), "6", "14rem", "the groups");
    const groups = toc!.querySelectorAll(".toc__group");
    expect(groups.length).toBe(2);
    for (const g of groups) {
      stack(g, "2", "a group");
      stack(g.querySelector("ul"), "1", "a group's list");
    }
  });

  it("makes the tier cards a Grid of Stacks, the title and first paragraph closer", () => {
    const c = page();
    grid(c.querySelector(".tiers"), "4", "17rem", "the tiers");
    const cards = c.querySelectorAll(".tier-card");
    expect(cards.length).toBe(2);
    for (const card of cards) {
      stack(card, "4", "a tier card");
      const head = card.firstElementChild!;
      stack(head, "3", "a card's title and its first paragraph");
      expect(head.firstElementChild!.tagName).toBe("H3");
      expect(head.children.length).toBe(2);
    }
  });

  it("makes the localization flow a Cluster", () => {
    const c = page();
    cluster(c.querySelector(".flow"), "3", "the flow");
  });

  it("makes the by-hand steps and their buttons one Stack of 24px (gap 5)", () => {
    const c = page();
    const steps = c.querySelector("#submitting ol.steps")!;
    const group = steps.parentElement!;
    stack(group, "5", "the by-hand group");
    expect(group.firstElementChild!.tagName).toBe("P");
    expect(group.lastElementChild).toBe(group.querySelector("[data-testid=about-submit-cta]")!.parentElement);
    cluster(group.lastElementChild, "3", "the buttons");
    expect(c.querySelector("#submitting .cta-row")).toBeNull();
  });

  it("makes the check and beta lists Stacks of 12px (gap 3)", () => {
    const c = page();
    const lists = c.querySelectorAll("ul.plain-list");
    expect(lists.length).toBe(2);
    for (const l of lists) stack(l, "3", "a plain list");
  });

  it("makes the terms a Stack", () => {
    const c = page();
    stack(c.querySelector(".terms"), "4", "the terms");
  });
});

describe("the metadata section is parts in Stacks", () => {
  it("holds its introduction and each of its four parts as a Stack", () => {
    const c = page();
    const meta = c.querySelector("#metadata")!;
    const parts = [...meta.children].filter((e) => e.classList.contains("l-stack"));
    // The introduction (h2 and its two paragraphs) and the four h3 parts.
    expect(parts.length).toBe(5);
    expect(parts[0]!.querySelector("h2")).not.toBeNull();
    expect(meta.querySelectorAll(":scope > h3").length).toBe(0);
    expect(meta.querySelectorAll("h3").length).toBe(4);
    for (const p of parts) expect(p).toHaveClass("l-gap-4");
  });

  it("makes each description list a Stack of Stacks, a term and its meaning 4px apart", () => {
    const c = page();
    const lists = c.querySelectorAll("dl.fields");
    expect(lists.length).toBe(4);
    for (const dl of lists) {
      stack(dl, "4", "a field list");
      expect(dl.children.length).toBeGreaterThan(0);
      for (const row of dl.children) {
        stack(row, "1", "a field row");
        expect([...row.children].map((e) => e.tagName)).toEqual(["DT", "DD"]);
      }
    }
  });

  it("makes each vocabulary table a Grid of Stacks, its rows Clusters", () => {
    const c = page();
    const tables = c.querySelectorAll(".vocab-grid");
    expect(tables.length).toBe(3);
    for (const t of tables) grid(t, "4", "16.25rem", "a vocabulary table");
    for (const v of c.querySelectorAll(".vocab")) {
      stack(v, "2", "a vocabulary box");
      for (const li of v.querySelectorAll("li")) cluster(li, "2", "a vocabulary row");
    }
  });

  it("keeps a list and its table 24px apart (gap 5), as the old margins did", () => {
    const c = page();
    for (const t of c.querySelectorAll(".vocab-grid")) stack(t.parentElement, "5", "a list and its table");
  });
});

describe("what is left in app.css", () => {
  it("has no rule that spaces or lays out what the primitives now do", () => {
    const spaced = [".tiers", ".vocab-grid", ".toc__groups", ".plain-list li", ".fields dt:first-child",
      ".vocab__list li", ".vocab__title", ".toc__group-label", ".fields dt", ".tier-card__warn"];
    for (const sel of spaced) {
      for (const b of bodies(sel)) expect(b, sel).not.toMatch(SPACES);
    }
    for (const sel of [".tiers", ".vocab-grid", ".toc__groups", ".flow", ".vocab__list li", ".plain-list",
      ".fields"]) {
      for (const b of bodies(sel)) expect(b, sel).not.toMatch(LAYS_OUT);
    }
  });

  it("deletes the rules that only existed to space", () => {
    for (const sel of [".tiers", ".vocab-grid", ".toc__groups", ".plain-list li", ".fields dt:first-child"]) {
      expect(bodies(sel), sel).toEqual([]);
    }
  });

  it("keeps no margin on .fields, and a description is indented in logical properties", () => {
    expect(bodies(".fields")).toEqual([]);
    const dd = bodies(".fields dd").join(";");
    expect(dd).not.toMatch(/margin/);
    expect(dd).toMatch(/padding-inline-start\s*:/);
    expect(dd).toMatch(/border-inline-start\s*:/);
  });

  it("indents the plain list and marks the current contents link in logical properties", () => {
    for (const sel of [".plain-list", ".toc__link--current", ".fields dd"]) {
      for (const b of bodies(sel)) expect(b, sel).not.toMatch(PHYSICAL);
    }
    expect(bodies(".plain-list").join(";")).toMatch(/padding-inline-start\s*:/);
    const cur = bodies(".toc__link--current").join(";");
    expect(cur).toMatch(/margin-inline-start\s*:/);
    expect(cur).toMatch(/border-inline-start\s*:/);
  });
});
