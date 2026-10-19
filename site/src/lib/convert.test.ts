/** Converting a Claude Code plugin export on the submission page (#246).
 *
 *  Claude Code exports `.claude-plugin/plugin.json` and `.mcp.json`. The page
 *  writes the Agent Plugins `plugin.json` and `mcp.json` from them, leaves the
 *  client files out, and reports what it could not carry across rather than
 *  writing it through.
 */

import { describe, it, expect } from "vitest";
import { strToU8, strFromU8 } from "fflate";
import type { Entry } from "@civic-skill-exchange/validator";
import {
  MCP_SCHEMA_ID, PLUGIN_FIELDS, PLUGIN_SCHEMA_ID, checkMcpConfig, checkPluginManifest,
} from "@civic-skill-exchange/validator/plugin-core";
import { CARRIED_SERVER_FIELDS, convertClaudeCode } from "./convert";
import { checkPlugin, readPluginSource } from "./plugin";
import { strings } from "../i18n/strings";

const file = (path: string, text: string): Entry =>
  ({ path, kind: "file", bytes: strToU8(text) });

const text = (entries: Entry[], path: string) => {
  const e = entries.find((x) => x.path === path);
  return e?.kind === "file" ? strFromU8(e.bytes) : undefined;
};

const SKILL = `---
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

/** The three client files of `housing-dashboards-0.3.4.plugin`, exported from
 *  Claude Code, byte for byte. */
const EXPORT_MANIFEST = `{
  "name": "housing-dashboards",
  "version": "0.3.4",
  "description": "Housing dashboards, refreshes and briefs for any U.S. city or county (a state works too, with fewer comparisons) from Census ACS, BLS and HUD open data: demand and tenure, construction costs and labor, and federally assisted housing, compared with the surrounding region, state and nation.",
  "license": "MIT",
  "author": {
    "name": "Santiago Garcés"
  },
  "keywords": [
    "housing",
    "civic data",
    "ACS",
    "BLS",
    "HUD",
    "LIHTC",
    "dashboard",
    "local government"
  ]
}
`;

const EXPORT_MCP = `{
  "mcpServers": {
    "census": {
      "type": "http",
      "url": "https://census-mcp.responsive.city/mcp"
    },
    "bls": {
      "type": "http",
      "url": "https://bls-mcp.responsive.city/mcp"
    },
    "hud": {
      "type": "http",
      "url": "https://hud.responsive.city/mcp"
    },
    "hud-user": {
      "type": "http",
      "url": "https://hud-user.responsive.city/mcp"
    },
    "geo": {
      "type": "http",
      "url": "https://geo-mcp.responsive.city/mcp"
    }
  }
}
`;

const EXPORT_CODEX = `{
  "name": "housing-dashboards",
  "version": "0.3.4",
  "license": "MIT",
  "skills": "./skills/",
  "mcpServers": "./.mcp.json",
  "interface": { "displayName": "Housing Dashboards" }
}
`;

const exported = (extra: Entry[] = []): Entry[] => [
  file(".claude-plugin/plugin.json", EXPORT_MANIFEST),
  file(".mcp.json", EXPORT_MCP),
  file(".codex-plugin/plugin.json", EXPORT_CODEX),
  file("README.md", "# Housing dashboards\n"),
  file("skills/housing-brief/SKILL.md", SKILL),
  file("skills/housing-brief/references/brief-structure.md", "# Structure\n"),
  ...extra,
];

const withManifest = (manifest: Record<string, unknown>, extra: Entry[] = []) =>
  convertClaudeCode([
    file(".claude-plugin/plugin.json", JSON.stringify(manifest)),
    file("skills/housing-brief/SKILL.md", SKILL),
    ...extra,
  ]);

const withServers = (servers: Record<string, unknown>) =>
  convertClaudeCode([
    file(".claude-plugin/plugin.json", EXPORT_MANIFEST),
    file(".mcp.json", JSON.stringify({ mcpServers: servers })),
    file("skills/housing-brief/SKILL.md", SKILL),
  ]);

const servers = (mcp: string | null) =>
  (JSON.parse(mcp ?? "{}") as { mcpServers?: Record<string, Record<string, unknown>> })
    .mcpServers ?? {};

const where = (c: { findings: { where: string }[] }) => c.findings.map((f) => f.where);

describe("convertClaudeCode — the manifest", () => {
  it("writes plugin.json at the top, $schema first", () => {
    const out = convertClaudeCode(exported());
    expect(Object.keys(JSON.parse(out.manifest))[0]).toBe("$schema");
    expect(JSON.parse(out.manifest).$schema).toBe(PLUGIN_SCHEMA_ID);
    expect(text(out.entries, "plugin.json")).toBe(out.manifest);
  });

  it("keeps every field Agent Plugins defines, in the author's order", () => {
    const out = convertClaudeCode(exported());
    const doc = JSON.parse(out.manifest);
    expect(Object.keys(doc)).toEqual([
      "$schema", "name", "version", "description", "license", "author", "keywords",
    ]);
    expect(doc.author).toEqual({ name: "Santiago Garcés" });
    expect(doc.keywords).toContain("LIHTC");
    expect(out.findings).toEqual([]);
  });

  it("keeps homepage and repository too, which the manifest check accepts", () => {
    const out = withManifest({
      name: "h", homepage: "https://example.org", repository: "https://github.com/a/b",
    });
    const doc = JSON.parse(out.manifest);
    expect(doc.homepage).toBe("https://example.org");
    expect(doc.repository).toBe("https://github.com/a/b");
    for (const key of Object.keys(doc)) expect(PLUGIN_FIELDS).toContain(key);
  });

  it("drops the fields Agent Plugins has no place for, each named with its reason", () => {
    const out = withManifest({
      name: "h", hooks: "./hooks/hooks.json", commands: ["./commands/a.md"],
      agents: "./agents/", outputStyles: "./styles/", lspServers: {}, userConfig: {},
    });
    const doc = JSON.parse(out.manifest);
    for (const key of ["hooks", "commands", "agents", "outputStyles", "lspServers", "userConfig"]) {
      expect(doc).not.toHaveProperty(key);
      const finding = out.findings.find((f) => f.where === `.claude-plugin/plugin.json#${key}`);
      expect(finding, key).toBeDefined();
      expect(finding!.message.length).toBeGreaterThan(20);
    }
  });

  it("drops a custom skills path, because the exchange reads skills/ only", () => {
    const out = withManifest({ name: "h", skills: "./my-skills/" });
    expect(JSON.parse(out.manifest)).not.toHaveProperty("skills");
    expect(where(out)).toContain(".claude-plugin/plugin.json#skills");
  });

  it("leaves no field the validator would refuse as unknown", () => {
    const out = withManifest({ name: "h", hooks: {}, whatever: 1 });
    const unknown = checkPluginManifest(out.manifest, { namespace: "a", directoryName: "h" })
      .filter((f) => /not an Agent Plugins 1\.0\.0 manifest field/.test(f.message));
    expect(unknown).toEqual([]);
  });

  it("never writes a ${…} value through", () => {
    const out = withManifest({ name: "h", homepage: "${HOMEPAGE}" });
    expect(out.manifest).not.toContain("${");
    expect(where(out)).toContain(".claude-plugin/plugin.json#homepage");
  });

  it("says when the Claude Code manifest is not JSON, and still writes $schema", () => {
    const out = convertClaudeCode([
      file(".claude-plugin/plugin.json", "{ nope"),
      file("skills/housing-brief/SKILL.md", SKILL),
    ]);
    expect(JSON.parse(out.manifest)).toEqual({ $schema: PLUGIN_SCHEMA_ID });
    expect(where(out)).toContain(".claude-plugin/plugin.json");
  });
});

describe("convertClaudeCode — the server file", () => {
  it("writes mcp.json with $schema, mapping http to streamable-http", () => {
    const out = convertClaudeCode(exported());
    const doc = JSON.parse(out.mcp!);
    expect(Object.keys(doc)).toEqual(["$schema", "mcpServers"]);
    expect(doc.$schema).toBe(MCP_SCHEMA_ID);
    expect(Object.keys(doc.mcpServers)).toEqual(["census", "bls", "hud", "hud-user", "geo"]);
    expect(doc.mcpServers.census).toEqual({
      type: "streamable-http", url: "https://census-mcp.responsive.city/mcp",
    });
    expect(text(out.entries, "mcp.json")).toBe(out.mcp);
    expect(checkMcpConfig(out.mcp!)).toEqual([]);
  });

  it("leaves a stdio server as it is", () => {
    const out = withServers({
      local: { type: "stdio", command: "npx", args: ["-y", "some-server"], env: { MODE: "x" } },
    });
    expect(servers(out.mcp).local).toEqual(
      { type: "stdio", command: "npx", args: ["-y", "some-server"], env: { MODE: "x" } });
    expect(out.findings).toEqual([]);
  });

  it("reads a server with no type and a command as stdio, which is what Claude Code does", () => {
    const out = withServers({ local: { command: "uvx", args: ["a-server"] } });
    expect(servers(out.mcp).local).toEqual({ type: "stdio", command: "uvx", args: ["a-server"] });
  });

  it("drops a server field Agent Plugins does not define, and names it", () => {
    const out = withServers({
      census: { type: "http", url: "https://census.example/mcp", timeout: 5000 },
    });
    expect(servers(out.mcp).census).toEqual(
      { type: "streamable-http", url: "https://census.example/mcp" });
    expect(where(out)).toContain(".mcp.json#census.timeout");
  });

  it("reads servers declared inside .claude-plugin/plugin.json", () => {
    const out = withManifest({
      name: "h", mcpServers: { geo: { type: "http", url: "https://geo.example/mcp" } },
    });
    expect(JSON.parse(out.manifest)).not.toHaveProperty("mcpServers");
    expect(servers(out.mcp).geo).toEqual({ type: "streamable-http", url: "https://geo.example/mcp" });
  });

  it("reads a .mcp.json that lists its servers at the top, without mcpServers", () => {
    const out = convertClaudeCode([
      file(".claude-plugin/plugin.json", EXPORT_MANIFEST),
      file(".mcp.json", JSON.stringify({ geo: { type: "http", url: "https://geo.example/mcp" } })),
      file("skills/housing-brief/SKILL.md", SKILL),
    ]);
    expect(servers(out.mcp).geo).toEqual({ type: "streamable-http", url: "https://geo.example/mcp" });
  });

  it("writes no mcp.json for a plugin that connects to nothing", () => {
    const out = withManifest({ name: "h" });
    expect(out.mcp).toBeNull();
    expect(text(out.entries, "mcp.json")).toBeUndefined();
  });
});

describe("convertClaudeCode — what it must catch, not convert silently", () => {
  it("reports a ${VAR} URL, naming the server, and does not write it", () => {
    const out = withServers({
      census: { type: "http", url: "${HOUSING_CENSUS_MCP_URL}" },
      geo: { type: "http", url: "https://geo.example/mcp" },
    });
    expect(out.mcp).not.toContain("${");
    expect(servers(out.mcp)).not.toHaveProperty("census");
    expect(servers(out.mcp)).toHaveProperty("geo");
    const finding = out.findings.find((f) => f.where === ".mcp.json#census.url");
    expect(finding?.message).toContain("census");
    expect(finding?.message).toContain("${HOUSING_CENSUS_MCP_URL}");
  });

  it("reports a ${VAR} header, naming the server, and does not write it", () => {
    const out = withServers({
      census: {
        type: "http", url: "https://census.example/mcp",
        headers: { Authorization: "Bearer ${CENSUS_TOKEN}", Accept: "application/json" },
      },
    });
    expect(out.mcp).not.toContain("${");
    expect(servers(out.mcp).census!.headers).toEqual({ Accept: "application/json" });
    const finding = out.findings.find((f) => f.where === ".mcp.json#census.headers.Authorization");
    expect(finding?.message).toContain("census");
  });

  it("reports ${CLAUDE_PLUGIN_ROOT} in a stdio command, and does not write the server", () => {
    const out = withServers({
      local: { type: "stdio", command: "${CLAUDE_PLUGIN_ROOT}/servers/run.sh" },
    });
    expect(out.mcp ?? "").not.toContain("${");
    expect(servers(out.mcp)).not.toHaveProperty("local");
    const finding = out.findings.find((f) => f.where === ".mcp.json#local.command");
    expect(finding?.message).toContain("local");
    expect(finding?.message).toContain("${CLAUDE_PLUGIN_ROOT}");
  });

  it("reports ${CLAUDE_PLUGIN_ROOT} in a stdio argument, and does not write the server", () => {
    const out = withServers({
      local: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.js"] },
    });
    expect(out.mcp ?? "").not.toContain("${");
    expect(servers(out.mcp)).not.toHaveProperty("local");
    expect(where(out)).toContain(".mcp.json#local.args");
  });

  it("reports a ${VAR} in a stdio env value, and does not write it", () => {
    const out = withServers({
      local: { type: "stdio", command: "npx", env: { KEY: "${API_KEY}", MODE: "x" } },
    });
    expect(out.mcp).not.toContain("${");
    expect(servers(out.mcp).local!.env).toEqual({ MODE: "x" });
    expect(where(out)).toContain(".mcp.json#local.env.KEY");
  });

  it("reports an sse server with the validator's own message, and does not map it", () => {
    const out = withServers({ legacy: { type: "sse", url: "https://a.example/sse" } });
    expect(servers(out.mcp)).not.toHaveProperty("legacy");
    const validator = checkMcpConfig(JSON.stringify({
      $schema: MCP_SCHEMA_ID, mcpServers: { legacy: { type: "sse", url: "https://a.example/sse" } },
    })).find((f) => f.where === "mcp.json#legacy.type")!;
    const finding = out.findings.find((f) => f.where === ".mcp.json#legacy.type");
    expect(finding?.message).toBe(validator.message);
  });

  it("reports files outside skills/ that the layout does not carry, once per folder", () => {
    const out = convertClaudeCode(exported([
      file("hooks/hooks.json", "{}"),
      file("commands/brief.md", "# a"),
      file("commands/refresh.md", "# b"),
      file("agents/reviewer.md", "# c"),
      file("settings.json", "{}"),
    ]));
    for (const path of ["hooks/", "commands/", "agents/", "settings.json"]) {
      expect(where(out)).toContain(path);
    }
    expect(where(out).filter((w) => w === "commands/")).toHaveLength(1);
    const paths = out.entries.map((e) => e.path);
    expect(paths.some((p) => /^(hooks|commands|agents)\/|^settings\.json$/.test(p))).toBe(false);
    expect(paths).toContain("README.md");
    expect(paths).toContain("skills/housing-brief/references/brief-structure.md");
  });

  it("leaves the client files out with the reader's own message", () => {
    const out = convertClaudeCode(exported());
    const say = strings().submit.problems;
    expect(out.leftOut).toEqual([
      say.clientFileLeftOut(".claude-plugin/plugin.json"),
      say.clientFileLeftOut(".codex-plugin/plugin.json"),
      say.clientFileLeftOut(".mcp.json"),
    ]);
    expect(out.entries.map((e) => e.path).filter((p) => p.startsWith("."))).toEqual([]);
  });
});

describe("convertClaudeCode — an address pasted for a server left out (#250)", () => {
  const SERVERS = {
    census: { type: "http", url: "${HOUSING_CENSUS_MCP_URL}", headers: { Accept: "application/json" } },
    geo: { type: "http", url: "https://geo.example/mcp" },
    legacy: { type: "sse", url: "${LEGACY_URL}" },
    local: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.js"] },
  };
  const files = [
    file(".claude-plugin/plugin.json", EXPORT_MANIFEST),
    file(".mcp.json", JSON.stringify({ mcpServers: SERVERS })),
    file("skills/housing-brief/SKILL.md", SKILL),
  ];
  const convert = (addresses?: Record<string, string>) => convertClaudeCode(files, addresses);

  /** What the validator says about this address as a server's url. */
  const validator = (url: string) => checkMcpConfig(JSON.stringify({
    $schema: MCP_SCHEMA_ID, mcpServers: { census: { type: "streamable-http", url } },
  })).find((f) => f.where === "mcp.json#census.url")?.message;

  it("asks only for a remote server left out because its address is a placeholder", () => {
    expect(convert().addressable).toEqual(["census"]);
    expect(convert().refused).toEqual({});
  });

  it("puts the server back as streamable-http with a valid https address", () => {
    const out = convert({ census: "https://census.example.org/mcp" });
    expect(servers(out.mcp).census).toEqual({
      type: "streamable-http", url: "https://census.example.org/mcp",
      headers: { Accept: "application/json" },
    });
    expect(where(out)).not.toContain(".mcp.json#census.url");
    expect(text(out.entries, "mcp.json")).toBe(out.mcp);
    expect(checkMcpConfig(out.mcp!)).toEqual([]);
    expect(out.refused).toEqual({});
    // Still asked, so the field does not vanish once it is answered.
    expect(out.addressable).toEqual(["census"]);
  });

  it("reads the address without the spaces a paste brings along", () => {
    const out = convert({ census: "  https://census.example.org/mcp\n" });
    expect(servers(out.mcp).census!.url).toBe("https://census.example.org/mcp");
  });

  it("refuses http, a placeholder or a non-URL with the validator's message, and leaves the server out", () => {
    for (const address of [
      "http://census.example.org/mcp", "${CENSUS_URL}", "census.example.org/mcp",
      "ftp://census.example.org/mcp",
    ]) {
      const out = convert({ census: address });
      expect(validator(address), address).toBeDefined();
      expect(out.refused, address).toEqual({ census: validator(address) });
      expect(servers(out.mcp), address).not.toHaveProperty("census");
      expect(where(out), address).toContain(".mcp.json#census.url");
    }
  });

  it("leaves everything as it was when the field is empty", () => {
    expect(convert({ census: "" })).toEqual(convert());
    expect(convert({ census: "   " })).toEqual(convert());
    expect(convert({})).toEqual(convert());
  });

  it("takes no address for an sse server, a local one, or one already carried across", () => {
    const out = convert({
      legacy: "https://legacy.example/mcp", local: "https://local.example/mcp",
      geo: "https://elsewhere.example/mcp",
    });
    expect(servers(out.mcp)).not.toHaveProperty("legacy");
    expect(servers(out.mcp)).not.toHaveProperty("local");
    expect(servers(out.mcp).geo!.url).toBe("https://geo.example/mcp");
    expect(out.refused).toEqual({});
  });

  it("asks for a placeholder server declared inside .claude-plugin/plugin.json too", () => {
    const out = withManifest({
      name: "h", mcpServers: { geo: { type: "http", url: "${GEO_URL}" } },
    });
    expect(out.addressable).toEqual(["geo"]);
  });
});

describe("convertClaudeCode — the housing-dashboards export", () => {
  it("comes out a plugin with no structural finding and a clean mcp.json", () => {
    const out = convertClaudeCode(exported());
    const source = readPluginSource(out.entries, "housing-dashboards");
    const check = checkPlugin(source, {
      manifest: source.manifest, skills: {}, namespace: "sgarcese", author: "sgarcese",
      directoryName: "housing-dashboards",
    });
    expect(check.structural).toEqual([]);
    expect(check.mcp).toEqual([]);
    // What is left is what the form asks: the name it writes, and the civic metadata.
    expect(check.manifest.map((f) => f.where).sort()).toEqual([
      "plugin.json#extensions.io.github.ai-lab-for-cities-at-harvard",
      "plugin.json#name",
    ]);
  });
});

describe("CARRIED_SERVER_FIELDS", () => {
  it("is what the validator accepts for each transport", () => {
    const value = (field: string) =>
      field === "args" ? ["a"] : field === "env" || field === "headers" ? { A: "b" }
        : field === "cwd" ? "./x" : field === "url" ? "https://a.example/mcp" : "npx";
    for (const [type, fields] of Object.entries(CARRIED_SERVER_FIELDS)) {
      const server = Object.fromEntries(fields.map((f) => [f, f === "type" ? type : value(f)]));
      expect(checkMcpConfig(JSON.stringify({ $schema: MCP_SCHEMA_ID, mcpServers: { s: server } })),
        type).toEqual([]);
      const extra = checkMcpConfig(JSON.stringify({
        $schema: MCP_SCHEMA_ID, mcpServers: { s: { ...server, more: "x" } },
      }));
      expect(extra.map((f) => f.where), type).toEqual(["mcp.json#s.more"]);
    }
  });
});
