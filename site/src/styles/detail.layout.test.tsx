/** The skill and plugin pages are the layout primitives' second user (#318).
 *
 *  Their sections, asides and the install box are Stacks and Clusters, so the
 *  rules that used to space them are gone from app.css, and what is left of
 *  those components is their own padding, type and drawing, with the left
 *  edges in logical properties so they hold in right-to-left. The gaps are the
 *  ones the old rules produced, measured in a real browser before and after
 *  (see docs/DEVELOPMENT.md); this holds the structure that produces them.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, cleanup } from "@testing-library/react";
import { SkillDetail } from "../components/SkillDetail";
import { PluginDetail } from "../components/PluginDetail";
import { DownloadBox } from "../components/DownloadBox";
import { makeSkill, makePlugin } from "../test/fixtures";
import type { SkillDetail as SDetail, PluginDetail as PDetail } from "../lib/types";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const APP = readFileSync(join(__dirname, "app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Declarations of every rule whose whole selector is `selector`. */
const bodies = (selector: string) =>
  [...APP.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter((m) => m[1]!.trim().split(/\s*,\s*/).includes(selector))
    .map((m) => m[2]!);

const SPACES = /(^|[;\s])(margin[\w-]*|padding[\w-]*|gap|row-gap|column-gap)\s*:/;
const LAYS_OUT = /(^|[;\s])(display\s*:\s*(grid|flex)|gap\s*:|justify-self\s*:|align-items\s*:|flex-wrap\s*:)/;

const skill = (over: Partial<SDetail> = {}): SDetail => ({
  ...makeSkill({
    use_when: "Drafting a notice.", avoid_when: "Final legal text.",
    version: "1.0.0", languages_tested: ["en"], models_tested: ["claude"],
    history: { first_seen: "2026-01-01", last_changed: "2026-02-01", commits: 3, pull_request: 12 },
    ...over,
  }),
  files: [{ path: "SKILL.md", size: 4096, executed: false }],
  archive: { path: "data/skills/ns/example-skill.zip", size: 5697 },
});

const plugin = (): PDetail => ({
  ...makePlugin({ use_when: "Housing briefs.", avoid_when: "Legal advice." }),
  files: [{ path: "plugin.json", size: 300, executed: false }],
  archive: { path: "data/plugins/ns/housing-dashboards.zip", size: 9000 },
}) as PDetail;

const serve = (payload: unknown) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));

async function skillPage(over: Partial<SDetail> = {}) {
  serve(skill(over));
  const { container } = render(<SkillDetail namespace="ns" name="example-skill" />);
  await screen.findByRole("heading", { level: 1 });
  return container;
}
async function pluginPage() {
  serve(plugin());
  const { container } = render(<PluginDetail namespace="ns" name="housing-dashboards" />);
  await screen.findByRole("heading", { level: 1 });
  return container;
}

const stack = (el: Element | null, gap: string, what: string) => {
  expect(el, what).not.toBeNull();
  expect(el, what).toHaveClass("l-stack", `l-gap-${gap}`);
};
const cluster = (el: Element | null, gap: string, what: string) => {
  expect(el, what).not.toBeNull();
  expect(el, what).toHaveClass("l-cluster", `l-gap-${gap}`);
};

/** What both pages share, whichever the payload. */
function expectDetailLayout(c: HTMLElement) {
  const page = c.querySelector(".detail");
  // Crumbs, header and the grid: 36px (the section space) before the grid,
  // 16px between the crumbs and the header.
  stack(page, "md", "the page");
  const top = page!.firstElementChild!;
  stack(top, "4", "the crumbs and the header");
  cluster(c.querySelector(".crumbs"), "2", "the breadcrumb");
  expect(c.querySelector(".crumbs")).toHaveClass("l-align-baseline");

  const head = c.querySelector(".detail__head");
  expect(head!.tagName).toBe("HEADER");
  stack(head, "3", "the header");
  const badges = head!.firstElementChild!;
  cluster(badges, "2", "the badges");
  expect(badges).not.toHaveClass("card__badges");

  for (const s of c.querySelectorAll(".detail__section")) stack(s, "4", "a section");
  expect(c.querySelectorAll(".detail__section").length).toBeGreaterThan(1);

  for (const fit of c.querySelectorAll("dl.fit")) {
    stack(fit, "4", "the fit list");
    for (const item of fit.children) stack(item, "2", "a fit item");
  }

  const side = c.querySelector(".detail__side");
  expect(side!.tagName).toBe("ASIDE");
  stack(side, "5", "the aside");

  const boxes = [...c.querySelectorAll(".facts")];
  expect(boxes.length).toBe(3);
  for (const box of boxes) {
    stack(box, "3", "a facts box");
    stack(box.querySelector("dl"), "3", "a facts list");
    for (const row of box.querySelectorAll("dl > div")) stack(row, "1", "a facts row");
  }
}

describe("the skill page uses the primitives", () => {
  it("spaces its page, header, sections, aside and facts with Stack and Cluster", async () => {
    const c = await skillPage();
    expectDetailLayout(c);
    cluster(c.querySelector("ul.tools"), "2", "the allowed tools");
  });

  it("keeps the note under the history flush with the same gap as every other note", async () => {
    const c = await skillPage();
    const history = c.querySelector("[aria-labelledby=history-heading]")!;
    stack(history, "3", "history");
    // The note is a child of the box, a gap below the list, not a margin.
    expect(history.lastElementChild).toHaveClass("facts__note");
  });
});

describe("the plugin page uses the primitives", () => {
  it("spaces its page, header, sections, aside and facts with Stack and Cluster", async () => {
    expectDetailLayout(await pluginPage());
  });
});

describe("the install box", () => {
  function expectBox(box: Element, cmds: number) {
    // 16 between the groups; each group's own gap is the measured one.
    stack(box, "4", "the box");
    const [lead, rest] = [box.children[0]!, box.children[1]!];
    stack(lead, "5", "the opening group");
    stack(lead.children[0]!, "4", "the status and the archive");
    stack(lead.children[0]!.children[0]!, "3", "the heading and the status");
    expect(rest).toHaveClass("l-stack");
    const commands = [...box.querySelectorAll(".download__cmd")];
    expect(commands.length).toBe(cmds);
    for (const cmd of commands) {
      stack(cmd, "2", "a command");
      const btn = cmd.querySelector(".btn")!;
      expect(btn.parentElement, "a button keeps its own width in a Cluster").toHaveClass("l-cluster");
    }
    stack(commands[0]!.parentElement, "4", "the commands");
  }

  it("is Stacks of the measured gaps on a skill", () => {
    const { container } = render(<DownloadBox skill={skill()} />);
    expectBox(container.querySelector(".download")!, 8);
    const archive = screen.getByTestId("download-archive");
    stack(archive, "2", "the archive");
    expect(archive.querySelector(".btn")!.parentElement).toHaveClass("l-cluster");
  });

  it("is the same on a plugin", async () => {
    const c = await pluginPage();
    expectBox(c.querySelector(".download")!, 6);
  });
});

describe("a Stack in a description list", () => {
  it("clears the indent a <dd> brings, as it clears a child's margins", () => {
    // The browser indents every <dd> 40px. The old rules zeroed it with
    // `margin: 0`; a Stack clears only the block margins (a child may centre
    // itself), so the indent is the Stack's to clear, not each list's.
    const layout = readFileSync(join(__dirname, "layout.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(layout).toMatch(/\.l-stack\s*>\s*dd\s*\{[^}]*margin-inline-start\s*:\s*0/);
  });
});

describe("what is left of the detail rules in app.css", () => {
  it("no longer spaces the header: the Stack does", () => {
    for (const sel of [".detail__title", ".detail__desc", ".detail__maintainer"]) {
      expect(bodies(sel).length, sel).toBeGreaterThan(0);
      for (const b of bodies(sel)) expect(b, sel).not.toMatch(SPACES);
    }
    expect(bodies(".crumbs").join(";")).not.toMatch(SPACES);
    expect(bodies(".crumbs").join(";")).not.toMatch(LAYS_OUT);
    expect(bodies(".detail__head").join(";")).not.toMatch(/margin/);
  });

  it("no longer lays out the aside, the tools, the fit list or the facts", () => {
    for (const sel of [".detail__side", ".tools", ".fit", ".facts dl", ".facts dl > div"]) {
      for (const b of bodies(sel)) expect(b, sel).not.toMatch(/(^|[;\s])(display\s*:|gap\s*:)/);
    }
    for (const sel of [".fit", ".fit dd", ".tree", ".facts dd", ".facts__note", ".facts dl"]) {
      for (const b of bodies(sel)) expect(b, sel).not.toMatch(/(^|[;\s])margin[\w-]*\s*:/);
    }
    for (const sel of [".fit__item", ".card__badges"]) {
      // .card__badges is still the cards' (SkillCard, PluginCard); .fit__item
      // keeps its padding and its edge, and loses the grid.
      if (sel === ".fit__item") for (const b of bodies(sel)) expect(b).not.toMatch(LAYS_OUT);
    }
  });

  it("no longer lays out the install box: the Stacks do", () => {
    for (const sel of [".download__warn", ".download__ok", ".download__archive", ".download__note", ".download__get"]) {
      for (const b of bodies(sel)) expect(b, sel).not.toMatch(/(^|[;\s])(margin[\w-]*|display|gap|justify-self)\s*:/);
    }
    expect(bodies(".download__cmd .btn")).toEqual([]);
  });

  it("puts the left edges in logical properties, for right-to-left", () => {
    for (const sel of [".fit__item", ".fit__item--avoid", ".tree__item--exec"]) {
      const body = bodies(sel).join(";");
      expect(body, sel).not.toMatch(/(^|[;\s])(border-left|left|right)[\w-]*\s*:/);
      expect(body, sel).toMatch(/border-inline-start/);
    }
  });
});
