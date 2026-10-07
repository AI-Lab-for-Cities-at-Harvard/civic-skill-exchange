/** A plugin listing (ADR 0005): the Agent Plugins layout under plugins/, with
 *  the registry's own rules on top. The fixture is shaped like the first real
 *  one — several skills sharing scripts, and remote MCP servers. */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePlugin, discoverAllPlugins } from "./plugin";
import {
  MCP_SCHEMA_ID, MCP_TRANSPORTS, PLUGIN_FIELDS, PLUGIN_NAME_PATTERN, PLUGIN_SCHEMA_ID,
  REGISTRY_EXTENSION,
  checkMcpConfig, checkPluginManifest, rejectedMcpUrl, summarizeMcpServers,
} from "./plugin-core";
import { checkChangedLayout } from "./layout";
import { checkChangedOwnership, discoverChanged, isGeneratedInSkill, isPluginDir } from "./skill";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CATEGORIES = ["data-analysis", "housing"];

const frontmatter = (name: string) => `---
name: ${name}
description: A housing dashboard skill that turns federal open data into something a city can use.
license: MIT
metadata:
  civic.category: data-analysis
  civic.scope: municipal
  civic.language: en
  civic.data-sensitivity: none
  civic.human-review: advisory-only
---

# ${name}

Body.
`;

const MANIFEST = {
  $schema: PLUGIN_SCHEMA_ID,
  name: "testuser-housing-dashboards",
  version: "0.2.0",
  description: "Housing dashboards, refreshes and briefs for any U.S. city or county.",
  author: { name: "Test User" },
  license: "MIT",
  keywords: ["housing"],
  extensions: {
    "io.github.ai-lab-for-cities-at-harvard": {
      "civic.maintainer": "Test User",
      "civic.affiliation": "individual",
      "civic.deployment": "none",
      "civic.use-when": "A city wants one place to see its housing need and supply.",
    },
  },
};

const MCP = {
  $schema: MCP_SCHEMA_ID,
  mcpServers: {
    "housing-census": { type: "streamable-http", url: "https://census.example.org/mcp" },
  },
};

let dir: string;
let plugin: string;

const write = (rel: string, content: string | object) => {
  const path = join(plugin, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content, null, 2));
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cse-plugin-"));
  plugin = join(dir, "plugins", "testuser", "housing-dashboards");
  write("plugin.json", MANIFEST);
  write("mcp.json", MCP);
  write("README.md", "# housing-dashboards\n");
  for (const skill of ["build-housing-dashboard", "housing-brief"]) {
    write(`skills/${skill}/SKILL.md`, frontmatter(skill));
  }
  write("skills/build-housing-dashboard/scripts/render.py", "print('ok')\n");
  write("skills/build-housing-dashboard/assets/app.js", "export {};\n");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const messages = (f: { where: string; message: string }[]) =>
  f.map((x) => `${x.where}: ${x.message}`).join(" | ");
const validate = (author?: string) => validatePlugin(plugin, CATEGORIES, author);

describe("validatePlugin", () => {
  it("accepts a well-formed plugin", () => {
    expect(validate("testuser").findings).toEqual([]);
  });

  it("accepts one with no MCP servers at all", () => {
    rmSync(join(plugin, "mcp.json"));
    expect(validate().findings).toEqual([]);
  });

  it("accepts the files the generator writes beside it", () => {
    write(".claude-plugin/plugin.json", { name: "testuser-housing-dashboards" });
    write(".mcp.json", { mcpServers: {} });
    expect(validate().findings).toEqual([]);
  });

  it("runs every skill's frontmatter through the skill rules, under its own path", () => {
    write("skills/housing-brief/SKILL.md", frontmatter("housing-brief").replace(
      "civic.category: data-analysis", "civic.category: not-a-category"));
    expect(messages(validate().findings))
      .toMatch(/skills\/housing-brief: civic\.category: 'not-a-category'/);
  });

  it("checks a skill's name against its own directory", () => {
    write("skills/housing-brief/SKILL.md", frontmatter("housing-memo"));
    expect(messages(validate().findings)).toMatch(/does not match the directory 'housing-brief'/);
  });

  it("does not ask a plugin's skills for what the plugin declares once", () => {
    expect(messages(validate().findings)).not.toMatch(/maintainer|affiliation|deployment/);
  });

  it("refuses a plugin-level field repeated in a skill, where the two could disagree", () => {
    write("skills/housing-brief/SKILL.md", frontmatter("housing-brief").replace(
      "civic.human-review: advisory-only",
      "civic.human-review: advisory-only\n  civic.maintainer: Someone Else"));
    expect(messages(validate().findings))
      .toMatch(/skills\/housing-brief: civic\.maintainer: .*declared once, in plugin\.json/);
  });

  it("checks each skill's namespace against the author", () => {
    expect(messages(validate("someone-else").findings))
      .toMatch(/namespace 'testuser' does not match the pull request author/);
  });

  it("needs a manifest", () => {
    rmSync(join(plugin, "plugin.json"));
    expect(messages(validate().findings)).toMatch(/plugin\.json is missing/);
  });

  it("needs at least one skill", () => {
    rmSync(join(plugin, "skills"), { recursive: true });
    expect(messages(validate().findings)).toMatch(/at least one skill/);
  });

  it("refuses a skill directory with no SKILL.md", () => {
    write("skills/empty/notes.md", "nothing");
    expect(messages(validate().findings)).toMatch(/skills\/empty\/ has no SKILL\.md/);
  });

  it("refuses a SKILL.md at the plugin root", () => {
    write("SKILL.md", frontmatter("housing-dashboards"));
    expect(messages(validate().findings)).toMatch(/not where a plugin's skills live/);
  });

  it("refuses a skill nested a level too deep, but not an example under references/", () => {
    write("skills/housing-brief/extra/SKILL.md", frontmatter("extra"));
    write("skills/housing-brief/references/SKILL.md", "an example");
    const found = messages(validate().findings);
    expect(found).toMatch(/skills\/housing-brief\/extra\/SKILL\.md is not where/);
    expect(found).not.toMatch(/references\/SKILL\.md/);
  });

  it.each([
    ["hooks/hooks.json", "{}"],
    ["commands/deploy.md", "x"],
    ["agents/helper.md", "x"],
    [".lsp.json", "{}"],
    ["com.openai/apps.json", "{}"],
    ["scripts/shared.py", "x"],
  ])("refuses %s at the plugin root", (rel, content) => {
    write(rel, content);
    expect(messages(validate().findings)).toMatch(/a plugin root holds plugin\.json/);
  });

  it("reports a refused directory once, not once per file", () => {
    write("hooks/a.json", "{}");
    write("hooks/b.json", "{}");
    expect(validate().findings.filter((f) => f.where.startsWith("hooks"))).toHaveLength(1);
  });

  it("refuses a hand-written file beside the generated Claude manifest", () => {
    write(".claude-plugin/marketplace.json", "{}");
    expect(messages(validate().findings)).toMatch(/only \.claude-plugin\/plugin\.json/);
  });

  it("refuses plugin-level files inside one of its skills", () => {
    write("skills/housing-brief/hooks/hooks.json", "{}");
    write("skills/housing-brief/.mcp.json", "{}");
    write("skills/housing-brief/.claude-plugin/plugin.json", "{}");
    const found = messages(validate().findings);
    expect(found).toMatch(/skills\/housing-brief\/hooks: plugin hooks/);
    expect(found).toMatch(/declared once, in the plugin's own mcp\.json/);
    expect(found).toMatch(/no manifest of its own/);
  });

  it("refuses a loose file directly under skills/", () => {
    write("skills/notes.md", "x");
    expect(messages(validate().findings)).toMatch(/no files of its own/);
  });

  it("applies the same file-type allowlist as a skill", () => {
    write("skills/housing-brief/assets/logo.png", "x");
    expect(messages(validate().findings)).toMatch(/not an allowed file type/);
  });

  it("speaks of the plugin, not a skill, in the size findings", () => {
    for (let i = 0; i < 101; i += 1) write(`skills/housing-brief/references/${i}.md`, "x");
    expect(messages(validate().findings)).toMatch(/plugin has \d+ files, over/);
  });
});

describe("checkPluginManifest", () => {
  const context = { namespace: "testuser", directoryName: "housing-dashboards" };
  const check = (manifest: object) =>
    messages(checkPluginManifest(JSON.stringify(manifest), context));

  it("accepts the fixture", () => {
    expect(check(MANIFEST)).toBe("");
  });

  it("needs the Agent Plugins $schema, which is how Codex recognizes the file", () => {
    const { $schema: _, ...rest } = MANIFEST;
    expect(check(rest)).toMatch(/\$schema must be/);
  });

  it("needs the name to be the marketplace name", () => {
    expect(check({ ...MANIFEST, name: "housing-dashboards" }))
      .toMatch(/name must be "testuser-housing-dashboards"/);
  });

  it("refuses a name the specification does not allow", () => {
    expect(check({ ...MANIFEST, name: "Housing--Dashboards" }))
      .toMatch(/not a valid Agent Plugins name/);
  });

  it("refuses any extension but the registry's, since that is where hooks and apps go", () => {
    expect(check({ ...MANIFEST, extensions: {
      ...MANIFEST.extensions, "com.openai": { hooks: "./hooks.json" } } }))
      .toMatch(/'com\.openai' is refused/);
  });

  it("uses the namespace the owner ruled on", () => {
    expect(REGISTRY_EXTENSION).toBe("io.github.ai-lab-for-cities-at-harvard");
  });

  const civic = (meta: Record<string, unknown>) =>
    check({ ...MANIFEST, extensions: { [REGISTRY_EXTENSION]: meta } });

  it("needs the plugin-level metadata in the registry's extension", () => {
    const { extensions: _, ...bare } = MANIFEST;
    expect(check(bare)).toMatch(/civic metadata is required/);
    const found = civic({});
    for (const field of ["civic.maintainer", "civic.affiliation", "civic.deployment"]) {
      expect(found).toContain(`${field} is required`);
    }
  });

  it("holds the plugin-level fields to the skill rules", () => {
    expect(civic({ ...MANIFEST.extensions[REGISTRY_EXTENSION], "civic.affiliation": "club" }))
      .toMatch(/'club' is not one of/);
    expect(civic({ ...MANIFEST.extensions[REGISTRY_EXTENSION], "civic.deployment": "organization" }))
      .toMatch(/civic\.deployed-at is required/);
    expect(civic({ ...MANIFEST.extensions[REGISTRY_EXTENSION], "civic.use-when": "x".repeat(501) }))
      .toMatch(/500 characters or fewer/);
  });

  it("refuses a field in the extension that belongs to each skill", () => {
    expect(civic({ ...MANIFEST.extensions[REGISTRY_EXTENSION], "civic.category": "housing" }))
      .toMatch(/'civic\.category' is declared by each skill/);
  });

  it("refuses a field the specification does not define", () => {
    expect(check({ ...MANIFEST, mcpServers: {} })).toMatch(/'mcpServers' is not an Agent Plugins/);
  });

  it("needs a description and a license", () => {
    const found = check({ ...MANIFEST, description: "short", license: "" });
    expect(found).toMatch(/description is required/);
    expect(found).toMatch(/license is required/);
  });

  it("checks the shape of author and keywords", () => {
    const found = check({ ...MANIFEST, author: { name: "x", phone: "1" }, keywords: "housing" });
    expect(found).toMatch(/author is an object/);
    expect(found).toMatch(/keywords must be a list/);
  });

  it("reports JSON that does not parse", () => {
    expect(messages(checkPluginManifest("{", context))).toMatch(/not valid JSON/);
  });
});

describe("checkMcpConfig", () => {
  const check = (servers: object, extra: object = {}) =>
    messages(checkMcpConfig(JSON.stringify({ $schema: MCP_SCHEMA_ID, mcpServers: servers, ...extra })));

  it("accepts a remote server with a literal HTTPS URL", () => {
    expect(check(MCP.mcpServers)).toBe("");
  });

  it("accepts a local server the plugin ships", () => {
    expect(check({ local: {
      type: "stdio", command: "./bin/server", args: ["--root", "${PLUGIN_ROOT}"],
      env: { MODE: "read-only" }, cwd: "${PLUGIN_DATA}/cache",
    } })).toBe("");
  });

  it("refuses a URL filled in from the environment, which nobody can review", () => {
    expect(check({ s: { type: "streamable-http", url: "${HOUSING_CENSUS_MCP_URL}" } }))
      .toMatch(/filled in from the environment/);
  });

  it("refuses plain http to anywhere but loopback", () => {
    expect(check({ s: { type: "streamable-http", url: "http://example.org/mcp" } }))
      .toMatch(/must use https/);
    expect(check({ s: { type: "streamable-http", url: "http://localhost:8080/mcp" } })).toBe("");
  });

  it("refuses sse, which Codex does not load", () => {
    expect(check({ s: { type: "sse", url: "https://example.org/sse" } }))
      .toMatch(/Codex does not load/);
  });

  it("refuses Claude's own spelling of the transport, which is not the specification's", () => {
    expect(check({ s: { type: "http", url: "https://example.org/mcp" } }))
      .toMatch(/type must be one of: stdio, streamable-http/);
  });

  it("refuses a field that belongs to the other transport", () => {
    expect(check({ s: { type: "streamable-http", url: "https://example.org/mcp", command: "x" } }))
      .toMatch(/'command' is not a field of a streamable-http server/);
  });

  it.each([
    ["npx -y some-server", /single executable/],
    ["/usr/local/bin/server", /absolute path/],
    ["../outside/server", /bare executable name or a \.\/ path/],
    ["bin/server", /bare executable name or a \.\/ path/],
  ])("refuses the stdio command %s", (command, why) => {
    expect(check({ s: { type: "stdio", command } })).toMatch(why);
  });

  it("refuses overriding the variables the client sets", () => {
    expect(check({ s: { type: "stdio", command: "node", env: { PLUGIN_ROOT: "/tmp" } } }))
      .toMatch(/set by the client/);
  });

  it("refuses a cwd that leaves the plugin", () => {
    expect(check({ s: { type: "stdio", command: "node", cwd: "./../.." } })).toMatch(/cwd is/);
  });

  it("needs its own $schema and nothing beside mcpServers", () => {
    const found = messages(checkMcpConfig(JSON.stringify({ mcpServers: {}, servers: {} })));
    expect(found).toMatch(/\$schema must be/);
    expect(found).toMatch(/'servers' is not an Agent Plugins mcp\.json field/);
  });
});

describe("rejectedMcpUrl and summarizeMcpServers", () => {
  it("names the host a remote server talks to, and the command a local one runs", () => {
    expect(summarizeMcpServers(JSON.stringify({ mcpServers: {
      census: { type: "streamable-http", url: "https://census.example.org/mcp" },
      local: { type: "stdio", command: "./bin/server" },
    } }))).toEqual([
      { name: "census", type: "streamable-http", target: "census.example.org" },
      { name: "local", type: "stdio", target: "./bin/server" },
    ]);
  });

  it("accepts https anywhere", () => {
    expect(rejectedMcpUrl("https://api.example.gov/mcp")).toBeNull();
  });
});

describe("plugins in the changed-path checks", () => {
  it("treats a plugin's skill as correctly placed", () => {
    expect(checkChangedLayout([
      "plugins/testuser/housing-dashboards/skills/housing-brief/SKILL.md",
      "plugins/testuser/housing-dashboards/skills/housing-brief/references/SKILL.md",
    ])).toEqual([]);
  });

  it("still reports a SKILL.md at a plugin's root", () => {
    expect(checkChangedLayout(["plugins/testuser/housing-dashboards/SKILL.md"])).toHaveLength(1);
  });

  it("holds plugins/ to the same namespace ownership as skills/", () => {
    expect(checkChangedOwnership(
      ["plugins/testuser/housing-dashboards/plugin.json"], { author: "testuser" })).toEqual([]);
    expect(messages(checkChangedOwnership(
      ["plugins/testuser/housing-dashboards/plugin.json"], { author: "mallory" })))
      .toMatch(/under plugins\/mallory\//);
    expect(messages(checkChangedOwnership(["plugins/stray.json"], { author: "mallory" })))
      .toMatch(/directly under plugins\//);
  });

  it("exempts exactly the files the generator writes into a plugin", () => {
    expect(isGeneratedInSkill("plugins/a/b/.claude-plugin/plugin.json")).toBe(true);
    expect(isGeneratedInSkill("plugins/a/b/.mcp.json")).toBe(true);
    expect(isGeneratedInSkill("plugins/a/b/mcp.json")).toBe(false);
    expect(isGeneratedInSkill("plugins/a/b/skills/c/.mcp.json")).toBe(false);
    expect(isGeneratedInSkill("plugins/a/b/.codex-plugin/plugin.json")).toBe(false);
  });

  it("knows a plugin by its own path, wherever the checkout is", () => {
    // A target outside the repository — `cli.ts /elsewhere/plugins/a/b` — was
    // read as a skill because the path was compared against the repo root.
    expect(isPluginDir(REPO, plugin)).toBe(true);
    expect(isPluginDir(REPO, join(dir, "skills", "testuser", "x"))).toBe(false);
  });

  it("discovers changed plugins alongside changed skills", () => {
    const changed = join(dir, "changed.txt");
    writeFileSync(changed, [
      "plugins/testuser/housing-dashboards/skills/housing-brief/SKILL.md",
      "plugins/testuser/housing-dashboards/.mcp.json",
    ].join("\n"));
    expect(discoverChanged(dir, changed)).toEqual([plugin]);
    expect(discoverAllPlugins(dir)).toEqual([plugin]);
  });
});

/* The rules above restate parts of the Agent Plugins schemas. These hold them
   to the vendored copies, so a spec revision that changes one fails here rather
   than drifting quietly — the same bargain schema.test.ts makes. */
describe("the rules agree with the vendored Agent Plugins schemas", () => {
  const schema = (file: string) => JSON.parse(readFileSync(
    join(REPO, "schema", "agent-plugins", "1.0.0", file), "utf8")) as {
    $id: string; properties: Record<string, { pattern?: string }>;
    $defs?: Record<string, { properties?: { type?: { const?: string } } }>;
  };

  it("uses the schemas' own ids", () => {
    expect(schema("plugin.schema.json").$id).toBe(PLUGIN_SCHEMA_ID);
    expect(schema("mcp.schema.json").$id).toBe(MCP_SCHEMA_ID);
  });

  it("allows every manifest field the schema does, except extensions", () => {
    expect(Object.keys(schema("plugin.schema.json").properties).sort())
      .toEqual([...PLUGIN_FIELDS, "extensions"].sort());
  });

  it("uses the schema's name pattern", () => {
    expect(schema("plugin.schema.json").properties["name"]!.pattern).toBe(PLUGIN_NAME_PATTERN);
  });

  it("allows transports the schema defines, and no others", () => {
    const defined = Object.values(schema("mcp.schema.json").$defs ?? {})
      .map((d) => d.properties?.type?.const).filter(Boolean);
    for (const t of MCP_TRANSPORTS) expect(defined).toContain(t);
  });
});
