/**
 * Rules for a plugin listing. Pure — no filesystem, no Node.
 *
 * A plugin is the second kind of listing (ADR 0005): a directory under
 * `plugins/{namespace}/{name}/` in the Agent Plugins 1.0.0 layout — a root
 * `plugin.json`, an optional root `mcp.json`, and one or more skills under
 * `skills/{skill}/SKILL.md`. It exists because a skill is one directory with
 * one SKILL.md, and some civic work is several skills sharing scripts and data
 * connectors; forcing that into `skills/` would have meant taking "one
 * directory is one skill" apart, and every check in this registry leans on it.
 *
 * The two files an author writes are the portable ones. Codex reads them
 * directly; Claude Code does not read either, so scripts/build_marketplace.py
 * derives `.claude-plugin/plugin.json` and `.mcp.json` from them, the same
 * bargain the generated manifests in a skill directory already make: the
 * registry writes them, and `--check-in-skills` fails a copy it did not write.
 *
 * The registry is stricter than the specification in three places, each for a
 * reason the specification leaves to clients:
 *
 *   - `extensions` holds the registry's namespace and nothing else. A
 *     client-specific namespace is where hooks and apps go — config honoured
 *     by code, with no model in the path, which is the class #151 keeps out of
 *     skills. The registry's own holds the plugin's exchange metadata, which
 *     no client reads (ruling 5 on #206).
 *   - Only `stdio` and `streamable-http` servers. `sse` is legacy in the
 *     specification and Codex refuses it, so a listing using it would install
 *     differently in the two clients the marketplace serves.
 *   - `description` and `license` are required. The catalogue shows the one and
 *     an adopter needs the other, and a skill already has to carry both.
 */

import type { Finding } from "./types";
import { checkPluginMetadata } from "./rules";
import { DOC_DIRECTORIES, isLoadableNestedSkill, rejectedPluginPath, type Entry,
  type StructureLayout } from "./structure-core";

const finding = (where: string, message: string): Finding => ({ where, message });

export const PLUGIN_MANIFEST = "plugin.json";
export const PLUGIN_MCP_CONFIG = "mcp.json";
export const PLUGIN_SKILLS_DIRECTORY = "skills";

export const PLUGIN_SCHEMA_ID = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
export const MCP_SCHEMA_ID = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";

/** The registry's reverse-domain namespace, backed by the Lab's GitHub Pages
 *  domain (ruling 6 on #206). Clients ignore a namespace they do not
 *  implement, which is what makes it the place for metadata only the exchange
 *  reads. */
export const REGISTRY_EXTENSION = "io.github.ai-lab-for-cities-at-harvard";

/** The manifest fields Agent Plugins 1.0.0 defines, less `extensions`. Held to
 *  schema/agent-plugins/1.0.0/plugin.schema.json by plugin.test.ts. */
export const PLUGIN_FIELDS = [
  "$schema", "name", "version", "description", "author", "homepage",
  "repository", "license", "keywords",
] as const;

/** The specification's name pattern, character for character. */
export const PLUGIN_NAME_PATTERN = "^(?!.*(?:--|\\.\\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$";
const PLUGIN_NAME_RE = new RegExp(PLUGIN_NAME_PATTERN);

export const MCP_TRANSPORTS = ["stdio", "streamable-http"] as const;

const SERVER_FIELDS: Record<(typeof MCP_TRANSPORTS)[number], readonly string[]> = {
  "stdio": ["type", "command", "args", "env", "cwd"],
  "streamable-http": ["type", "url", "headers"],
};

/** `cwd` as the specification's schema allows it. */
const CWD_RE = /^(?:\.\/|\$\{PLUGIN_ROOT\}(?:\/|$)|\$\{PLUGIN_DATA\}(?:\/|$))/;
const RESERVED_ENV = new Set(["PLUGIN_ROOT", "PLUGIN_DATA"]);

/** What the registry writes into a plugin directory. The same two rules as the
 *  generated manifest in a skill (#183, #193): allowed here only because the
 *  generator produces them, and `build_marketplace.py --check-in-skills` fails
 *  any copy it did not. */
export const GENERATED_IN_PLUGIN = [".claude-plugin/plugin.json", ".mcp.json"] as const;

/** Everything that may sit at the root of a plugin, by first path segment.
 *
 *  An allowlist, for the reason the suffix list is one: the plugin root is
 *  where a client looks for things to act on, and every client adds to that
 *  set over time — `hooks/`, `commands/`, `agents/`, `.lsp.json`, a
 *  reverse-domain extension directory. A denylist would be a list of what the
 *  clients did last year. */
const PLUGIN_ROOT = new Set([
  PLUGIN_MANIFEST, PLUGIN_MCP_CONFIG, PLUGIN_SKILLS_DIRECTORY, "README.md",
  ".claude-plugin", ".mcp.json",
]);

function rejectedInPlugin(rel: string, kind: Entry["kind"]): string | null {
  const parts = rel.split("/");
  const first = parts[0]!;

  // Reported as a misplaced skill instead, which says where it should go.
  if (rel === "SKILL.md") return null;
  if (!PLUGIN_ROOT.has(first)) {
    return `a plugin root holds ${PLUGIN_MANIFEST}, ${PLUGIN_MCP_CONFIG}, ` +
      `README.md and ${PLUGIN_SKILLS_DIRECTORY}/, and nothing else. A client ` +
      `acts on what it finds here — hooks, commands, agents, client-specific ` +
      `extension directories — with no model in the path, so anything the ` +
      `registry has not ruled on stays out. Scripts and data belong inside the ` +
      `skill that uses them.`;
  }
  if (first === ".claude-plugin" &&
      !(rel === ".claude-plugin" || rel === GENERATED_IN_PLUGIN[0])) {
    return `only ${GENERATED_IN_PLUGIN[0]} may appear here, and only because ` +
      `scripts/build_marketplace.py writes it from ${PLUGIN_MANIFEST}.`;
  }
  if (first === PLUGIN_SKILLS_DIRECTORY && parts.length === 2 && kind !== "dir") {
    return `${PLUGIN_SKILLS_DIRECTORY}/ holds one directory per skill — ` +
      `${PLUGIN_SKILLS_DIRECTORY}/{skill}/SKILL.md — and no files of its own.`;
  }
  if (first === PLUGIN_SKILLS_DIRECTORY && parts.length > 2) {
    // Below a skill, the skill's own rules: no hooks, no manifest, no client
    // settings. Clients do not load these from a skill inside a plugin, which
    // is the reason to refuse rather than allow them — an author who wrote
    // one expected it to do something, and it would silently do nothing.
    const inSkill = parts.slice(2).join("/");
    if (inSkill === ".mcp.json" || inSkill === PLUGIN_MCP_CONFIG) {
      return `MCP servers are declared once, in the plugin's own ` +
        `${PLUGIN_MCP_CONFIG}. No client reads one inside a skill.`;
    }
    // A skill directory in skills/ carries a generated manifest; one inside a
    // plugin does not, because the plugin is what installs. So here the
    // exception rejectedPluginPath makes for it does not apply.
    if (/^\.(?:claude|codex)-plugin(?:\/|$)/.test(inSkill)) {
      return `a skill inside a plugin has no manifest of its own — the ` +
        `plugin's ${PLUGIN_MANIFEST} is the one clients read.`;
    }
    return rejectedPluginPath(inSkill);
  }
  return null;
}

function misplacedInPlugin(rel: string): string | null {
  const parts = rel.split("/");
  if (parts.length === 3 && parts[0] === PLUGIN_SKILLS_DIRECTORY) return null;
  if (parts[0] === PLUGIN_SKILLS_DIRECTORY && parts.length > 3 &&
      !isLoadableNestedSkill(parts.slice(2).join("/"))) {
    return null;  // an example under references/ or assets/
  }
  return `${rel} is not where a plugin's skills live. Clients load ` +
    `${PLUGIN_SKILLS_DIRECTORY}/{skill}/SKILL.md, one level deep and no ` +
    `deeper, so this one would either be missed or loaded as something the ` +
    `catalogue does not list. Examples belong under a skill's ` +
    `${DOC_DIRECTORIES.join("/ or ")}/.`;
}

export const PLUGIN_LAYOUT: StructureLayout = {
  rejected: rejectedInPlugin,
  misplacedSkill: misplacedInPlugin,
  noun: "plugin",
};

/** The skill directory names a plugin's entries declare, sorted. */
export function pluginSkillNames(entries: Entry[]): string[] {
  return entries
    .filter((e) => e.kind === "file")
    .map((e) => e.path.split("/"))
    .filter((p) => p.length === 3 && p[0] === PLUGIN_SKILLS_DIRECTORY && p[2] === "SKILL.md")
    .map((p) => p[1]!)
    .sort();
}

/** Every `skills/{skill}/` directory with no SKILL.md in it. */
export function checkPluginSkills(entries: Entry[]): Finding[] {
  const declared = new Set(pluginSkillNames(entries));
  const dirs = entries
    .filter((e) => e.kind === "dir")
    .map((e) => e.path.split("/"))
    .filter((p) => p.length === 2 && p[0] === PLUGIN_SKILLS_DIRECTORY)
    .map((p) => p[1]!);

  const findings = dirs
    .filter((d) => !declared.has(d))
    .map((d) => finding(`${PLUGIN_SKILLS_DIRECTORY}/${d}`,
      `${PLUGIN_SKILLS_DIRECTORY}/${d}/ has no SKILL.md, so no client loads ` +
      `anything from it.`));
  if (declared.size === 0) {
    findings.push(finding(PLUGIN_SKILLS_DIRECTORY,
      `a plugin carries at least one skill, at ` +
      `${PLUGIN_SKILLS_DIRECTORY}/{skill}/SKILL.md. The registry lists plugins ` +
      `for what their skills do; MCP servers on their own are not a listing.`));
  }
  return findings;
}

// --------------------------------------------------------------------------- //
// plugin.json

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

function parseJson(text: string, where: string): { value?: unknown; findings: Finding[] } {
  try {
    return { value: JSON.parse(text) as unknown, findings: [] };
  } catch (err) {
    return { findings: [finding(where, `not valid JSON: ${(err as Error).message}`)] };
  }
}

export interface PluginContext {
  namespace: string;
  directoryName: string;
}

/** The marketplace name the manifest must carry: `{namespace}-{name}`, the
 *  same join build_marketplace.py's `plugin_name` makes for a skill.
 *
 *  Codex refuses to install a plugin whose manifest name differs from its
 *  marketplace entry, and for a plugin the manifest is the author's file rather
 *  than the generator's — so the name has to be right in the file itself. */
export const expectedPluginName = ({ namespace, directoryName }: PluginContext) =>
  `${namespace}-${directoryName}`;

export function checkPluginManifest(text: string, context: PluginContext): Finding[] {
  const where = PLUGIN_MANIFEST;
  const { value, findings } = parseJson(text, where);
  if (findings.length > 0) return findings;
  if (!isObject(value)) return [finding(where, `${where} must be a JSON object`)];

  const out: Finding[] = [];
  const at = (field: string) => `${where}#${field}`;

  if (value["$schema"] !== PLUGIN_SCHEMA_ID) {
    out.push(finding(at("$schema"),
      `$schema must be "${PLUGIN_SCHEMA_ID}". It is how Codex tells an Agent ` +
      `Plugins manifest from its own, and without it the plugin loads nothing.`));
  }

  const extensions = value["extensions"];
  const civic = isObject(extensions) ? extensions[REGISTRY_EXTENSION] : undefined;
  if (extensions !== undefined && !isObject(extensions)) {
    out.push(finding(at("extensions"), "extensions must be an object keyed by namespace"));
  }
  for (const namespace of isObject(extensions) ? Object.keys(extensions) : []) {
    if (namespace !== REGISTRY_EXTENSION) {
      out.push(finding(at(`extensions.${namespace}`),
        `'${namespace}' is refused. A client-specific namespace is where hooks ` +
        `and apps are declared — configuration a client runs with no model in ` +
        `the path — and the registry lists what every client loads the same ` +
        `way. Only ${REGISTRY_EXTENSION}, the registry's own, is allowed.`));
    }
  }
  if (!isObject(civic)) {
    out.push(finding(at(`extensions.${REGISTRY_EXTENSION}`),
      `the plugin's civic metadata is required here: who maintains it and ` +
      `where it has been used, declared once for all of its skills.`));
  } else {
    out.push(...checkPluginMetadata(civic).map((f) =>
      ({ ...f, where: at(`extensions.${REGISTRY_EXTENSION}.${f.where}`) })));
  }
  for (const key of Object.keys(value)) {
    if (key !== "extensions" && !(PLUGIN_FIELDS as readonly string[]).includes(key)) {
      out.push(finding(at(key),
        `'${key}' is not an Agent Plugins 1.0.0 manifest field. One of: ` +
        `${PLUGIN_FIELDS.join(", ")}`));
    }
  }

  const expected = expectedPluginName(context);
  const name = value["name"];
  if (typeof name !== "string" || name === "") {
    out.push(finding(at("name"), `name is required, and must be "${expected}"`));
  } else if (name.length > 64 || !PLUGIN_NAME_RE.test(name)) {
    out.push(finding(at("name"),
      `'${name}' is not a valid Agent Plugins name: 1–64 lowercase letters, ` +
      `digits, hyphens and dots, no leading, trailing or doubled separator`));
  } else if (name !== expected) {
    out.push(finding(at("name"),
      `name must be "${expected}" — {namespace}-{directory}, the plugin's name ` +
      `in the marketplace. Codex refuses to install a plugin whose manifest ` +
      `name differs from its marketplace entry.`));
  }

  const description = value["description"];
  if (typeof description !== "string" || description.trim().length < 40) {
    out.push(finding(at("description"),
      "description is required, at least 40 characters — it is what the " +
      "catalogue and both clients show"));
  } else if (description.length > 1024) {
    out.push(finding(at("description"), "description must be 1024 characters or fewer"));
  }

  if (typeof value["license"] !== "string" || value["license"].trim() === "") {
    out.push(finding(at("license"), "license is required — an SPDX identifier"));
  }

  for (const field of ["version", "homepage", "repository"] as const) {
    if (field in value && typeof value[field] !== "string") {
      out.push(finding(at(field), `${field} must be a string`));
    }
  }
  if ("keywords" in value &&
      !(Array.isArray(value["keywords"]) && value["keywords"].every((k) => typeof k === "string"))) {
    out.push(finding(at("keywords"), "keywords must be a list of strings"));
  }
  if ("author" in value) {
    const author = value["author"];
    if (!isObject(author) ||
        Object.entries(author).some(([k, v]) =>
          !["name", "email", "url"].includes(k) || typeof v !== "string")) {
      out.push(finding(at("author"),
        "author is an object with optional string name, email and url, and nothing else"));
    }
  }

  return out;
}

// --------------------------------------------------------------------------- //
// mcp.json

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Why this is not an endpoint the registry lists, or null.
 *
 *  The specification requires an absolute HTTPS URL, plain HTTP only to
 *  loopback, and expands nothing in it. The registry adds one reason of its
 *  own: a reviewer approves egress by reading the host (REVIEW.md), so an
 *  endpoint has to name one. A `${VAR}` URL names none, and Claude Code would
 *  expand it where Codex sends it literally — the same listing talking to two
 *  different places, neither of which anybody reviewed. */
export function rejectedMcpUrl(url: string): string | null {
  if (url.includes("${")) {
    return `'${url}' is filled in from the environment, so nobody reviewing ` +
      `this listing can see where it connects. Write the server's HTTPS URL.`;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `'${url}' is not an absolute URL`;
  }
  if (parsed.protocol === "https:") return null;
  if (parsed.protocol === "http:" && LOOPBACK.has(parsed.hostname)) return null;
  return `'${url}' must use https — plain http is allowed only to localhost`;
}

/** Why this stdio command is not one the specification allows, or null. */
function rejectedCommand(command: string): string | null {
  if (command.trim() !== command || /\s/.test(command)) {
    return `command is a single executable, with arguments in args — '${command}' ` +
      `would be run by a shell in one client and not found in another`;
  }
  if (command.startsWith("/") || /^[A-Za-z]:/.test(command)) {
    return `command must be a bare executable name or a ./ path inside the ` +
      `plugin, not an absolute path on the author's machine`;
  }
  if (command.includes("/") && (!command.startsWith("./") || command.split("/").includes(".."))) {
    return `command must be a bare executable name or a ./ path inside the plugin`;
  }
  return null;
}

export interface McpServerSummary {
  name: string;
  type: string;
  /** Hostname for a remote server, the command for a local one. */
  target: string;
}

export function checkMcpConfig(text: string): Finding[] {
  const where = PLUGIN_MCP_CONFIG;
  const { value, findings } = parseJson(text, where);
  if (findings.length > 0) return findings;
  if (!isObject(value)) return [finding(where, `${where} must be a JSON object`)];

  const out: Finding[] = [];
  if (value["$schema"] !== MCP_SCHEMA_ID) {
    out.push(finding(`${where}#$schema`, `$schema must be "${MCP_SCHEMA_ID}"`));
  }
  for (const key of Object.keys(value)) {
    if (key !== "$schema" && key !== "mcpServers") {
      out.push(finding(`${where}#${key}`,
        `'${key}' is not an Agent Plugins mcp.json field. The file holds $schema and mcpServers.`));
    }
  }
  const servers = value["mcpServers"];
  if (!isObject(servers)) {
    out.push(finding(`${where}#mcpServers`, "mcpServers is required, an object keyed by server name"));
    return out;
  }

  for (const [name, server] of Object.entries(servers)) {
    const at = (field?: string) => `${where}#${name}${field ? `.${field}` : ""}`;
    if (!isObject(server)) {
      out.push(finding(at(), "a server is an object"));
      continue;
    }
    const type = server["type"];
    if (!(MCP_TRANSPORTS as readonly unknown[]).includes(type)) {
      out.push(finding(at("type"),
        type === "sse"
          ? "sse is the specification's legacy transport and Codex does not load " +
            "it, so this server would be missing in one of the two clients. Use " +
            "streamable-http."
          : `type must be one of: ${MCP_TRANSPORTS.join(", ")}`));
      continue;
    }
    const transport = type as (typeof MCP_TRANSPORTS)[number];
    for (const key of Object.keys(server)) {
      if (!SERVER_FIELDS[transport].includes(key)) {
        out.push(finding(at(key),
          `'${key}' is not a field of a ${transport} server. One of: ` +
          `${SERVER_FIELDS[transport].join(", ")}`));
      }
    }

    if (transport === "streamable-http") {
      const url = server["url"];
      if (typeof url !== "string" || url === "") {
        out.push(finding(at("url"), "url is required"));
      } else {
        const why = rejectedMcpUrl(url);
        if (why) out.push(finding(at("url"), why));
      }
      const headers = server["headers"];
      if (headers !== undefined &&
          !(isObject(headers) && Object.values(headers).every((v) => typeof v === "string"))) {
        out.push(finding(at("headers"), "headers is an object of string values"));
      }
      continue;
    }

    const command = server["command"];
    if (typeof command !== "string" || command === "") {
      out.push(finding(at("command"), "command is required"));
    } else {
      const why = rejectedCommand(command);
      if (why) out.push(finding(at("command"), why));
    }
    const args = server["args"];
    if (args !== undefined && !(Array.isArray(args) && args.every((a) => typeof a === "string"))) {
      out.push(finding(at("args"), "args is a list of strings"));
    }
    const env = server["env"];
    if (env !== undefined) {
      if (!(isObject(env) && Object.values(env).every((v) => typeof v === "string"))) {
        out.push(finding(at("env"), "env is an object of string values"));
      } else {
        for (const key of Object.keys(env).filter((k) => RESERVED_ENV.has(k))) {
          out.push(finding(at(`env.${key}`),
            `${key} is set by the client, and a plugin may not override it`));
        }
      }
    }
    const cwd = server["cwd"];
    if (cwd !== undefined &&
        (typeof cwd !== "string" || !CWD_RE.test(cwd) || cwd.split("/").includes(".."))) {
      out.push(finding(at("cwd"),
        "cwd is ./path, ${PLUGIN_ROOT}/path or ${PLUGIN_DATA}/path, inside the plugin"));
    }
  }
  return out;
}

/** One line per server, for the catalogue and the review — what it is and
 *  where it goes. Empty when the file does not parse; checkMcpConfig says why. */
export function summarizeMcpServers(text: string): McpServerSummary[] {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return []; }
  const servers = isObject(value) && isObject(value["mcpServers"]) ? value["mcpServers"] : {};
  return Object.entries(servers).filter(([, s]) => isObject(s)).map(([name, s]) => {
    const server = s as Record<string, unknown>;
    const type = String(server["type"] ?? "");
    let target = String(server["command"] ?? server["url"] ?? "");
    if (typeof server["url"] === "string") {
      try { target = new URL(server["url"]).host; } catch { /* reported elsewhere */ }
    }
    return { name, type, target };
  });
}
