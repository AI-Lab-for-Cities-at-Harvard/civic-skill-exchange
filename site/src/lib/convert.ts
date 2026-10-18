/** A plugin exported from Claude Code, rearranged for the exchange (#246).
 *
 *  Claude Code lays a plugin out for itself: `.claude-plugin/plugin.json`, and
 *  `.mcp.json` if it connects to anything. The exchange lists the Agent
 *  Plugins layout, a root `plugin.json` and `mcp.json`, and generates the
 *  Claude Code files from those after merge (ADR 0005). Someone who exported a
 *  plugin cannot be expected to do that rearranging by hand, so the page does.
 *
 *  What converts cleanly is converted: the fields Agent Plugins defines are
 *  kept, `$schema` is added, and an `http` server becomes `streamable-http`,
 *  which is the same transport under the specification's name. What does not
 *  is left out and reported, never written through — a `${VAR}` the exchange
 *  cannot resolve, `${CLAUDE_PLUGIN_ROOT}`, an `sse` server, a Claude Code
 *  setting with no Agent Plugins equivalent, a file outside `skills/`. The
 *  plugin form's own checks then run on the result as on any plugin.
 *
 *  Pure, and imported only by the plugin form, so it loads with that chunk.
 */

import type { Entry, Finding } from "@civic-skill-exchange/validator";
import {
  MCP_SCHEMA_ID, MCP_TRANSPORTS, PLUGIN_FIELDS, PLUGIN_MANIFEST, PLUGIN_MCP_CONFIG,
  PLUGIN_SCHEMA_ID, PLUGIN_SKILLS_DIRECTORY, checkMcpConfig,
} from "@civic-skill-exchange/validator/plugin-core";
import { strings } from "../i18n/strings";
import { CLIENT_FILES } from "./zip";

/** Where Claude Code keeps what the exchange needs. */
export const CLAUDE_MANIFEST = ".claude-plugin/plugin.json";
export const CLAUDE_MCP_CONFIG = ".mcp.json";

/** The fields a server of each transport may carry. The validator's
 *  SERVER_FIELDS, which it does not export; convert.test.ts holds the two
 *  equal through checkMcpConfig. */
export const CARRIED_SERVER_FIELDS: Record<(typeof MCP_TRANSPORTS)[number], readonly string[]> = {
  "stdio": ["type", "command", "args", "env", "cwd"],
  "streamable-http": ["type", "url", "headers"],
};

/** What may stay at the root besides the two files written here. */
const CARRIED_ROOT = new Set([PLUGIN_SKILLS_DIRECTORY, "README.md"]);

export interface Conversion {
  /** The folder as the plugin form reads it: the client files and anything
   *  the layout does not carry left out, plugin.json and mcp.json written in. */
  entries: Entry[];
  /** The new plugin.json. */
  manifest: string;
  /** The new mcp.json; null when none was written — the plugin connects to
   *  nothing, or already had a root mcp.json of its own. */
  mcp: string | null;
  /** The client files, named with the reader's own message. */
  leftOut: string[];
  /** Everything not carried across, each with why, in the submitter's terms.
   *  `where` is the Claude Code file and field it was in. */
  findings: Finding[];
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const FROM_ENVIRONMENT = /\$\{[^}]*\}/;
const PLUGIN_ROOT_VAR = "${CLAUDE_PLUGIN_ROOT}";

const read = (entries: Entry[], path: string): string | null => {
  const entry = entries.find((e) => e.path === path);
  return entry?.kind === "file" ? new TextDecoder().decode(entry.bytes) : null;
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

function parse(text: string, file: string, findings: Finding[]): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (e) {
    findings.push({
      where: file,
      message: strings().submit.plugin.conversion.notJson(file, (e as Error).message),
    });
    return undefined;
  }
}

/** The first `${…}` in a string, or in any string a list holds. */
function variableIn(value: unknown): string | null {
  const values = Array.isArray(value) ? value : [value];
  for (const v of values) {
    const match = typeof v === "string" ? FROM_ENVIRONMENT.exec(v) : null;
    if (match) return match[0];
  }
  return null;
}

// --------------------------------------------------------------------------- //
// plugin.json

/** The manifest, and any servers declared in it rather than in `.mcp.json`. */
function convertManifest(
  entries: Entry[], findings: Finding[],
): { manifest: string; servers: Record<string, unknown> | null } {
  const say = strings().submit.plugin.conversion;
  const at = (field: string) => `${CLAUDE_MANIFEST}#${field}`;
  const out: Record<string, unknown> = { $schema: PLUGIN_SCHEMA_ID };
  let servers: Record<string, unknown> | null = null;

  const value = parse(read(entries, CLAUDE_MANIFEST) ?? "{}", CLAUDE_MANIFEST, findings);
  for (const [key, v] of Object.entries(isObject(value) ? value : {})) {
    if (key === "$schema") continue;  // Claude Code's, if anything; replaced
    if (key === "mcpServers") {
      // Inline servers are converted with the rest. A path is read only when
      // it names the file Claude Code reads by default; anything else is a
      // second server file the layout has no place for.
      if (isObject(v)) servers = v;
      else if (!(typeof v === "string" && v.replace(/^\.\//, "") === CLAUDE_MCP_CONFIG)) {
        findings.push({ where: at(key), message: say.mcpServersField });
      }
      continue;
    }
    if (key === "skills") {
      findings.push({ where: at(key), message: say.skillsField });
      continue;
    }
    if (key !== "extensions" && !(PLUGIN_FIELDS as readonly string[]).includes(key)) {
      findings.push({ where: at(key), message: say.field(key) });
      continue;
    }
    const variable = variableIn(v);
    if (variable) {
      findings.push({ where: at(key), message: say.fromEnvironment(key, variable) });
      continue;
    }
    out[key] = v;
  }
  return { manifest: json(out), servers };
}

// --------------------------------------------------------------------------- //
// mcp.json

/** Claude Code's transport under the specification's name, or the raw value
 *  when there is none. A server with a command and no type is stdio to Claude
 *  Code, so it is stdio here. */
function transportOf(server: Record<string, unknown>): unknown {
  const type = server["type"];
  if (type === "http") return "streamable-http";
  if (type === undefined && "command" in server) return "stdio";
  return type;
}

/** One server, converted, or null when it is left out. */
function convertServer(
  name: string, server: unknown, findings: Finding[],
): Record<string, unknown> | null {
  const say = strings().submit.plugin.conversion;
  const at = (field: string) => `${CLAUDE_MCP_CONFIG}#${name}.${field}`;
  if (!isObject(server)) {
    findings.push(...checkMcpConfig(JSON.stringify({
      $schema: MCP_SCHEMA_ID, mcpServers: { [name]: server },
    })).map((f) => ({ ...f, where: `${CLAUDE_MCP_CONFIG}#${name}` })));
    return null;
  }

  const type = transportOf(server);
  if (!(MCP_TRANSPORTS as readonly unknown[]).includes(type)) {
    // sse, or a type nobody defines: the validator's own words, unmapped.
    const refused = checkMcpConfig(JSON.stringify({
      $schema: MCP_SCHEMA_ID, mcpServers: { [name]: { type } },
    })).find((f) => f.where === `${PLUGIN_MCP_CONFIG}#${name}.type`);
    if (refused) findings.push({ where: at("type"), message: refused.message });
    return null;
  }
  const transport = type as (typeof MCP_TRANSPORTS)[number];

  // Where the server is, or what it runs. A variable here leaves nothing to
  // list, so the whole server stays out.
  for (const field of transport === "stdio" ? ["command", "args", "cwd"] : ["url"]) {
    const variable = variableIn(server[field]);
    if (!variable) continue;
    findings.push({
      where: at(field),
      message: transport === "streamable-http"
        ? say.serverUrl(name, String(server[field]))
        : variable === PLUGIN_ROOT_VAR
          ? say.serverPluginRoot(name, field)
          : say.serverCommand(name, field, variable),
    });
    return null;
  }

  const out: Record<string, unknown> = { type: transport };
  for (const [key, v] of Object.entries(server)) {
    if (key === "type") {
      continue;
    } else if (!CARRIED_SERVER_FIELDS[transport].includes(key)) {
      findings.push({ where: at(key), message: say.serverField(name, key) });
    } else if ((key === "headers" || key === "env") && isObject(v)) {
      // One header or setting filled in from the environment is left out on
      // its own; the server still has an address worth listing.
      const kept: Record<string, unknown> = {};
      for (const [k, value] of Object.entries(v)) {
        const variable = variableIn(value);
        if (!variable) {
          kept[k] = value;
          continue;
        }
        findings.push({
          where: at(`${key}.${k}`),
          message: key === "headers"
            ? say.serverHeader(name, k, String(value))
            : say.serverEnv(name, k, variable),
        });
      }
      if (Object.keys(kept).length > 0) out[key] = kept;
    } else {
      out[key] = v;
    }
  }
  return out;
}

function convertMcp(
  entries: Entry[], inline: Record<string, unknown> | null, findings: Finding[],
): string | null {
  const text = read(entries, CLAUDE_MCP_CONFIG);
  const value = text === null ? undefined : parse(text, CLAUDE_MCP_CONFIG, findings);
  // The servers sit under mcpServers, or, in the shorter form some plugins
  // write, at the top of the file. Either way each one is checked below, so a
  // shape guessed wrong is reported rather than lost.
  const fromFile = !isObject(value) ? {}
    : "mcpServers" in value ? (isObject(value["mcpServers"]) ? value["mcpServers"] : {})
      : value;
  const all = { ...(inline ?? {}), ...fromFile };

  const servers: Record<string, unknown> = {};
  for (const [name, server] of Object.entries(all)) {
    const converted = convertServer(name, server, findings);
    if (converted) servers[name] = converted;
  }
  if (Object.keys(servers).length === 0) return null;
  return json({ $schema: MCP_SCHEMA_ID, mcpServers: servers });
}

// --------------------------------------------------------------------------- //
// The folder

export function convertClaudeCode(entries: Entry[]): Conversion {
  const say = strings().submit;
  const findings: Finding[] = [];
  const leftOut: string[] = [];

  const { manifest, servers } = convertManifest(entries, findings);
  // A root mcp.json the author already wrote is theirs, and wins.
  const hasMcp = entries.some((e) => e.path === PLUGIN_MCP_CONFIG);
  const mcp = hasMcp ? null : convertMcp(entries, servers, findings);

  const kept: Entry[] = [];
  const outside = new Set<string>();
  for (const entry of [...entries].sort((a, b) => a.path.localeCompare(b.path))) {
    if (CLIENT_FILES.test(entry.path)) {
      leftOut.push(say.problems.clientFileLeftOut(entry.path));
      continue;
    }
    const parts = entry.path.split("/");
    if (entry.path === PLUGIN_MCP_CONFIG || CARRIED_ROOT.has(parts[0]!)) {
      kept.push(entry);
      continue;
    }
    // Once per top-level folder: commands/ with forty files is one thing left out.
    if (entry.kind === "file") outside.add(parts.length > 1 ? `${parts[0]}/` : entry.path);
  }
  for (const path of [...outside].sort()) {
    findings.push({ where: path, message: say.plugin.conversion.fileOutside(path) });
  }

  const written: Entry[] = [
    { path: PLUGIN_MANIFEST, kind: "file", bytes: new TextEncoder().encode(manifest) },
    ...(mcp === null ? [] : [
      { path: PLUGIN_MCP_CONFIG, kind: "file" as const, bytes: new TextEncoder().encode(mcp) },
    ]),
  ];
  return {
    entries: [...written, ...kept].sort((a, b) => a.path.localeCompare(b.path)),
    manifest,
    mcp,
    leftOut,
    findings,
  };
}
