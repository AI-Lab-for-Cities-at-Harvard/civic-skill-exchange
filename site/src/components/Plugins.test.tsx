/** Plugins on the site (ADR 0005, #206).
 *
 * The owner's rulings on #206 decide the shape: plugins get their own section
 * below the skills grid, never cards among the skills; a plugin's skills are
 * described on its own page and are not listed as skills of their own; and the
 * servers it talks to are named where somebody deciding to install it will
 * read them.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import App from "../App";
import { makeIndex, makePlugin, makeSkill } from "../test/fixtures";
import { findViolations, describeViolations } from "../test/axe";
import { parseRoute, pluginHref } from "../lib/route";
import { PluginCard } from "./PluginCard";
import { PluginDetail } from "./PluginDetail";
import { DEFAULT_LOCALE, setLocale } from "../i18n/strings";
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

describe("search and counts on the browse page (#299)", () => {
  const two = (): Index => ({
    ...makeIndex([
      makeSkill({ id: "ns/a", name: "plain-language-notice", description: "Rewrites notices." }),
      makeSkill({ id: "ns/b", name: "permit-explainer", description: "Explains permits." }),
    ]),
    plugins: [
      makePlugin(),
      makePlugin({ id: "ns/notice-kit", name: "notice-kit",
        description: "Tools for plain notices.", keywords: ["notices"] }),
    ],
  });
  const search = (q: string) =>
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: q } });
  const pluginSection = () => screen.getByRole("region", { name: /plugins/i });

  it("narrows the plugins to those matching every word of the search", async () => {
    serve({ "index.json": two() });
    render(<App />);
    await screen.findByRole("region", { name: /plugins/i });
    search("plain notices");
    expect(within(pluginSection()).getByRole("link", { name: "notice-kit" })).toBeInTheDocument();
    expect(within(pluginSection()).queryByRole("link", { name: "housing-dashboards" })).toBeNull();
  });

  it("says no plugin matches, with a way to clear, the way the skill grid does", async () => {
    serve({ "index.json": two() });
    render(<App />);
    await screen.findByRole("region", { name: /plugins/i });
    search("housingzzqq");
    expect(within(pluginSection()).getByText(/no plugins match these filters/i))
      .toBeInTheDocument();
    expect(within(pluginSection()).queryAllByRole("article")).toHaveLength(0);
    fireEvent.click(within(pluginSection()).getByRole("button", { name: /clear them/i }));
    expect(within(pluginSection()).getAllByRole("article")).toHaveLength(2);
  });

  it("applies a facet to plugins by the fields they have", async () => {
    const idx = two();
    idx.skills = [...idx.skills, makeSkill({ id: "ns/c", name: "vetted", tier: "reviewed" })];
    idx.plugins![1] = { ...idx.plugins![1], tier: "reviewed" };
    serve({ "index.json": idx });
    render(<App />);
    await screen.findByRole("region", { name: /plugins/i });
    fireEvent.click(screen.getByRole("radio", { name: /^Reviewed/ }));
    expect(within(pluginSection()).getByRole("link", { name: "notice-kit" })).toBeInTheDocument();
    expect(within(pluginSection()).queryByRole("link", { name: "housing-dashboards" })).toBeNull();
  });

  it("says exactly what each count counts", async () => {
    serve({ "index.json": two() });
    render(<App />);
    await screen.findByRole("region", { name: /plugins/i });
    const hero = () => document.querySelector(".topper__stats");
    const grid = () => document.querySelector(".results__count");
    // The hero and the grid count skills, and say so; plugins are counted
    // in their own words beside the skills, never folded into them.
    expect(hero()).toHaveTextContent("2 skills·2 plugins·0 reviewed·2 community");
    expect(grid()).toHaveTextContent(/^2 skills$/);
    expect(within(pluginSection()).getByText("2 plugins")).toBeInTheDocument();
    search("dashboards");
    expect(grid()).toHaveTextContent(/^0 of 2 skills$/);
    expect(within(pluginSection()).getByText("1 of 2 plugins")).toBeInTheDocument();
    // The hero is the catalogue's size, not the search's.
    expect(hero()).toHaveTextContent("2 skills·2 plugins");
  });

  it("leaves the hero without a plugin count when there are no plugins", async () => {
    serve({ "index.json": makeIndex([makeSkill()]) });
    render(<App />);
    await screen.findByText(/1 skill/i);
    expect(document.querySelector(".topper__stats")).not.toHaveTextContent(/plugin/i);
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

  it("names Latin American Spanish among its languages rather than es-419 (#252)", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail({ languages: ["en", "es-419"] }) });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    const facts = await screen.findByRole("region", { name: /at a glance/i });
    expect(facts).toHaveTextContent("English · Spanish (Latin America)");
  });

  it("links to the guide's marketplace section (#259)", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail() });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    expect(await screen.findByRole("link", { name: /step by step/i }))
      .toHaveAttribute("href", "#/guide/marketplace");
  });

  it("gives Claude Code's --sparse command and Codex's install line (#259)", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail() });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    expect(await screen.findByText(
      "/plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange " +
      "--sparse .claude-plugin skills plugins")).toBeInTheDocument();
    expect(screen.getByText("codex plugin add ns-housing-dashboards@civic-skill-exchange"))
      .toBeInTheDocument();
  });

  it("says which models the author and the reviewer tried it with (#267)", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail({
      tier: "reviewed", reason: "attestation matches current content",
      reviewed: { date: "2026-10-18", expires: "2027-10-18",
        reviewers: ["AI Lab for Cities at Harvard"], notes: "" },
      models_tested: ["Claude Sonnet 5"],
      verified_models: ["Claude Opus 5.5", "ChatGPT 5.6-Terra"],
    }) });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    expect(await screen.findByTestId("models-tested")).toHaveTextContent("Claude Sonnet 5");
    expect(screen.getByTestId("verified-models"))
      .toHaveTextContent("Claude Opus 5.5, ChatGPT 5.6-Terra");
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
      "codex plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange " +
      "--sparse .agents --sparse skills --sparse plugins"))
      .toBeInTheDocument();
  });

  /* #230: a maintainer reviews every plugin before it merges (ruling 1 on
     #211), so a Community plugin was reviewed — it is the Reviewed-tier
     attestation it lacks. The skill wording, copied here, said otherwise. */
  describe("says what a Community plugin has and has not had", () => {
    afterEach(async () => { await setLocale(DEFAULT_LOCALE); });

    it("in English", async () => {
      serve({ "plugins/ns/housing-dashboards.json": detail() });
      render(<PluginDetail namespace="ns" name="housing-dashboards" />);
      const box = await screen.findByRole("region", { name: /use this plugin/i });
      expect(box.textContent).toMatch(/A maintainer reviewed this plugin before listing it\./);
      expect(box.textContent).toMatch(/not been attested to the Reviewed tier/);
      expect(box.textContent).not.toMatch(/nobody has reviewed/i);
    });

    it("in Spanish", async () => {
      await setLocale("es");
      serve({ "plugins/ns/housing-dashboards.json": detail() });
      render(<PluginDetail namespace="ns" name="housing-dashboards" />);
      const box = await screen.findByRole("region", { name: /use este plugin/i });
      expect(box.textContent).toMatch(/Un mantenedor revisó este plugin antes de publicarlo\./);
      expect(box.textContent).not.toMatch(/Nadie ha revisado/);
    });
  });

  it("says the fit guidance was written about the plugin, not a skill", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail({
      use_when: "A city wants its housing picture in one place.",
    }) });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    const fit = await screen.findByRole("region", { name: /when to use this/i });
    expect(fit.textContent).toMatch(/Written by whoever submitted the plugin/);
    expect(fit.textContent).not.toMatch(/submitted the skill/);
  });

  it("tags the files that run", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail() });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    const row = (await screen.findByText("mcp.json", { selector: ".tree__path" })).closest("li");
    expect(row?.textContent).toContain("executed");
  });

  it("shows the plugin's own fit guidance and provenance, declared once for it", async () => {
    serve({ "plugins/ns/housing-dashboards.json": detail({
      use_when: "A city wants its housing picture in one place.",
      avoid_when: "Not for individual case decisions.",
      provenance: {
        self_reported: true, affiliation: "government", deployment: "organization",
        deployed_at: "City of Example", deployed_in: "US-IN / South Bend",
        deployed_since: "2026",
      },
    }) });
    render(<PluginDetail namespace="ns" name="housing-dashboards" />);
    const fit = await screen.findByRole("region", { name: /when to use this/i });
    expect(fit.textContent).toMatch(/housing picture in one place/);
    expect(fit.textContent).toMatch(/individual case decisions/);
    const provenance = screen.getByRole("region", { name: /where it has been used/i });
    expect(provenance.textContent).toMatch(/City of Example/);
    expect(provenance.textContent).toMatch(/US-IN \/ South Bend/);
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
