/** The plugin submit page is on the layout primitives (#317).
 *
 *  Its spacing is the primitives': 24px between questions (gap 5), 16px
 *  between the parts of a section (gap 4), 8px between the skills' panels and
 *  the lines of a list (gap 2). The rules that used to produce it are gone from
 *  app.css. Measured gaps are checked in a real browser (docs/DEVELOPMENT.md);
 *  this holds the structure that produces them.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zipSync, strToU8 } from "fflate";
import { Submit } from "../components/Submit";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const APP = readFileSync(join(__dirname, "app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const ruleFor = (selector: string) =>
  [...APP.matchAll(/([^{}]*)\{([^}]*)\}/g)]
    .filter((m) => m[1]!.split(",").some((s) => s.trim() === selector));

const COMPLETE = `---
name: housing-brief
description: Writes a short housing conditions brief for a U.S. city or county.
license: MIT
metadata:
  civic.category: policy
  civic.scope: municipal
  civic.language: en
  civic.localization: generalized
  civic.data-sensitivity: none
  civic.human-review: advisory-only
---

# Housing brief
`;
const BARE = `---
name: refresh-housing-dashboard
description: Refreshes an existing housing dashboard with the latest releases.
license: MIT
---

# Refresh
`;
const MANIFEST = JSON.stringify({
  name: "housing-dashboards", version: "0.3.4", license: "MIT",
  description: "Housing dashboards, refreshes and briefs for any U.S. city or county.",
}, null, 2);
const CLAUDE_MANIFEST = JSON.stringify({ ...JSON.parse(MANIFEST), hooks: "./hooks/hooks.json" }, null, 2);
const CLAUDE_MCP = JSON.stringify({
  mcpServers: {
    census: { type: "http", url: "https://census-mcp.responsive.city/mcp" },
    hud: { type: "http", url: "${HOUSING_HUD_MCP_URL}" },
  },
}, null, 2);

function zip(name: string, entries: Record<string, string>): File {
  const bytes = zipSync(Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k, strToU8(v)])));
  return new File([bytes], name, { type: "application/zip" });
}

const PLUGIN = () => zip("housing-dashboards.zip", {
  "housing-dashboards/plugin.json": MANIFEST,
  "housing-dashboards/skills/housing-brief/SKILL.md": COMPLETE,
  "housing-dashboards/skills/refresh-housing-dashboard/SKILL.md": BARE,
});
/** A Claude Code export: the page says what it rearranged and asks for the
 *  address of a server it could not carry across. */
const EXPORT = () => zip("housing-dashboards-0.3.4.plugin", {
  ".claude-plugin/plugin.json": CLAUDE_MANIFEST,
  ".mcp.json": CLAUDE_MCP,
  ".codex-plugin/plugin.json": "{}",
  "skills/housing-brief/SKILL.md": COMPLETE,
  "skills/refresh-housing-dashboard/SKILL.md": BARE,
  "hooks/hooks.json": "{}",
});

async function pluginPage(file: File) {
  // Nothing here looks a username up, but if it ever did it must not go out.
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  render(<Submit repo="o/r" skills={[]} mode="new" />);
  await userEvent.setup().upload(screen.getByLabelText(/upload the skill folder/i), file);
  return screen.findByTestId("plugin-mode");
}

/** Whether `el` is a Stack of `gap`. */
const stack = (el: Element | null | undefined, gap: string) => {
  expect(el, `a Stack of gap ${gap}`).toBeTruthy();
  expect(el).toHaveClass("l-stack", `l-gap-${gap}`);
};

describe("the plugin form's sections are Stacks", () => {
  it("lay the four sections out at 16px between their parts", async () => {
    const page = await pluginPage(PLUGIN());
    const sections = [...page.querySelectorAll(":scope > section")];
    expect(sections).toHaveLength(4);
    for (const s of sections) {
      expect(s.tagName).toBe("SECTION");
      expect(s).toHaveClass("prose__block");
      stack(s, "4");
    }
  });

  it("put the questions in a Stack of 24px (gap 5), as the fields' own margin did", async () => {
    const page = await pluginPage(EXPORT());
    const fields = [...page.querySelectorAll(".field")].filter((f) => !f.closest(".steps"));
    expect(fields.length).toBeGreaterThan(8);
    for (const f of fields) {
      const label = f.querySelector("label")?.textContent ?? "";
      stack(f.parentElement, "5");
      expect(f.parentElement, label).not.toHaveClass("prose__block");
    }
  });
});

describe("the skills' panels", () => {
  it("are a Stack of 8px (gap 2) of disclosures, each with a Stack for its body", async () => {
    const page = await pluginPage(PLUGIN());
    const panels = [...page.querySelectorAll("details[data-testid^='skill-']")];
    expect(panels).toHaveLength(2);
    stack(panels[0]!.parentElement, "2");
    expect(panels[1]!.parentElement).toBe(panels[0]!.parentElement);
    for (const p of panels) {
      const body = p.querySelector(":scope > summary")!.nextElementSibling;
      stack(body, "5");
    }
  });

  it("show a complete skill's answers as rows in Clusters, with no margin of their own", async () => {
    const page = await pluginPage(PLUGIN());
    const answers = page.querySelector("dl[data-testid='skill-answers']")!;
    expect(answers.parentElement).toHaveClass("l-stack");
    const rows = [...answers.children];
    expect(rows.length).toBe(5);
    for (const row of rows) {
      expect(row.tagName).toBe("DIV");
      expect(row).toHaveClass("l-cluster", "l-gap-2", "l-align-start");
    }
  });
});

describe("the rest of the form", () => {
  it("keeps each list's lines apart with a Stack of 8px, not the items' own margin", async () => {
    const page = await pluginPage(EXPORT());
    const lists = [...page.querySelectorAll("ul.submit__findings")];
    expect(lists.length).toBeGreaterThan(1);
    for (const ul of lists) stack(ul, "2");
  });

  it("sets the conversion note, the findings and the address questions apart by 16px", async () => {
    const page = await pluginPage(EXPORT());
    stack(page.querySelector("[data-testid='conversion-findings']"), "4");
    const address = page.querySelector("[data-testid^='server-address-']")!;
    stack(address.parentElement, "5");
  });

  it("gives every disclosure's body a Stack, so a <pre> or a note brings no margin", async () => {
    const page = await pluginPage(PLUGIN());
    const bodies = [...page.querySelectorAll("details.disclosure")]
      .map((d) => d.querySelector(":scope > summary")!.nextElementSibling);
    expect(bodies.length).toBeGreaterThan(6);
    for (const b of bodies) expect(b, "a body").toHaveClass("l-stack");
  });

  it("groups the files the page shows as a Stack of 12px (gap 3)", async () => {
    const page = await pluginPage(PLUGIN());
    const first = page.querySelector("[data-testid='file-plugin.json']")!;
    stack(first.parentElement, "3");
  });
});

describe("what is left of the plugin form's CSS in app.css", () => {
  it("no longer spaces the answers: the rows are Clusters", () => {
    expect(ruleFor(".submit__answers div")).toHaveLength(0);
    expect(ruleFor(".submit__answers dd")).toHaveLength(0);
    const own = ruleFor(".submit__answers");
    expect(own.length).toBe(1);
    expect(own[0]![2]).not.toMatch(/margin|padding|gap/);
  });
});
