/** Plugins on the site (ADR 0005, #206).
 *
 * The owner's rulings on #206 decide the shape: plugins get their own section
 * below the skills grid, never cards among the skills; a plugin's skills are
 * described on its own page and are not listed as skills of their own; and the
 * servers it talks to are named where somebody deciding to install it will
 * read them.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import App from "../App";
import { makeIndex, makePlugin, makeSkill } from "../test/fixtures";
import { findViolations, describeViolations } from "../test/axe";
import { parseRoute, pluginHref } from "../lib/route";
import { PluginCard } from "./PluginCard";
import { PluginDetail } from "./PluginDetail";
import type { Index, PluginDetail as Detail } from "../lib/types";

const detail = (over: Partial<Detail> = {}): Detail => ({
  ...makePlugin(),
  files: [
    { path: "plugin.json", size: 300, executed: false },
    { path: "mcp.json", size: 200, executed: true },
    { path: "skills/housing-brief/SKILL.md", size: 2000, executed: false },
  ],
  archive: { path: "data/plugins/ns/housing-dashboards.zip", size: 9000 },
  ...over,
});

const serve = (routes: Record<string, unknown>) =>
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const hit = Object.entries(routes).find(([pattern]) => String(url).includes(pattern));
    return hit
      ? { ok: true, status: 200, json: async () => hit[1] }
      : { ok: false, status: 404, json: async () => ({}) };
  }));

beforeEach(() => {
  Element.prototype.scrollIntoView ??= () => {};
  vi.stubGlobal("scrollTo", () => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = "";
});

describe("routing", () => {
  it("parses a plugin route", () => {
    expect(parseRoute("#/plugin/ns/housing-dashboards"))
      .toEqual({ page: "plugin", namespace: "ns", name: "housing-dashboards" });
  });

  it("falls back to browse for an incomplete plugin route", () => {
    expect(parseRoute("#/plugin/ns")).toEqual({ page: "browse" });
  });

  it("builds an encoded plugin link", () => {
    expect(pluginHref("ns", "a/b")).toBe("#/plugin/ns/a%2Fb");
  });
});

describe("the browse page", () => {
  const withPlugin = (): Index => ({
    ...makeIndex([makeSkill()]),
    plugins: [makePlugin()],
  });

  it("shows plugins in their own section, after the skills", async () => {
    serve({ "index.json": withPlugin() });
    render(<App />);
    const section = await screen.findByRole("region", { name: /plugins/i });
    expect(within(section).getByRole("link", { name: "housing-dashboards" }))
      .toHaveAttribute("href", "#/plugin/ns/housing-dashboards");
    // The skills grid still counts skills only.
    expect(screen.getByText(/1 skill/i)).toBeInTheDocument();
  });

  it("does not list a plugin's skills as skills of their own", async () => {
    serve({ "index.json": withPlugin() });
    render(<App />);
    await screen.findByRole("region", { name: /plugins/i });
    expect(screen.queryByRole("link", { name: "housing-brief" })).toBeNull();
  });

  it("has no plugins section when there are none, or the index predates them", async () => {
    serve({ "index.json": makeIndex([makeSkill()]) });
    render(<App />);
    await screen.findByText(/1 skill/i);
    expect(screen.queryByRole("region", { name: /plugins/i })).toBeNull();
  });
});

describe("the plugin card", () => {
  it("says how many skills and servers it carries", () => {
    render(<PluginCard plugin={makePlugin()} />);
    expect(screen.getByTestId("plugin-card-meta").textContent)
      .toMatch(/2 skills.*1 MCP server/);
  });

  it("marks the description with its language", () => {
    render(<PluginCard plugin={makePlugin({ languages: ["es"] })} />);
    expect(screen.getByText(/Housing dashboards and briefs/)).toHaveAttribute("lang", "es");
  });
});

describe("the plugin page", () => {
  it("lists every skill it installs, with what each does", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail() });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    const skills = await screen.findByRole("region", { name: /skills in this plugin/i });
    expect(within(skills).getByText("build-housing-dashboard")).toBeInTheDocument();
    expect(within(skills).getByText(/The housing-brief skill/)).toBeInTheDocument();
  });

  it("names every MCP server and where it connects", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail() });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    const servers = await screen.findByRole("region", { name: /mcp servers/i });
    expect(within(servers).getByText("housing-census")).toBeInTheDocument();
    expect(within(servers).getByText("census.example.org")).toBeInTheDocument();
  });

  it("says so when the plugin connects to no server", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail({ mcp_servers: [] }) });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    const servers = await screen.findByRole("region", { name: /mcp servers/i });
    expect(servers.textContent).toMatch(/no MCP server/i);
  });

  it("gives the install commands for the plugin's marketplace name", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail() });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    expect(await screen.findByText(
      "/plugin install ns-housing-dashboards@civic-skill-exchange")).toBeInTheDocument();
    expect(screen.getByText(
      "codex plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange"))
      .toBeInTheDocument();
  });

  it("warns that a community plugin is unreviewed, beside the commands", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail() });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    const box = await screen.findByRole("region", { name: /use this plugin/i });
    expect(box.textContent).toMatch(/nobody has reviewed this plugin/i);
  });

  it("tags the files that run", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail() });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    const row = (await screen.findByText("mcp.json", { selector: ".tree__path" })).closest("li");
    expect(row?.textContent).toContain("executed");
  });

  it("says plainly when there is no such plugin", async () => {
    serve({});
    render(<PluginDetail namespace="ns" name="missing" />);
    expect(await screen.findByText(/no plugin called ns\/missing/i)).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail() });
    const { container } = render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    await screen.findByRole("region", { name: /mcp servers/i });
    const violations = await findViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
