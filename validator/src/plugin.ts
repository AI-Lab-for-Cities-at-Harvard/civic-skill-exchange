/** Validating one plugin directory: read it, then apply both layers.
 *
 *  The plugin's counterpart to skill.ts. The rules themselves are in
 *  plugin-core.ts, which runs anywhere; this reads the directory. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { checkSkillFile, type SkillResult } from "./skill";
import { checkStructureCore } from "./structure-core";
import { readEntries } from "./structure";
import {
  PLUGIN_LAYOUT, PLUGIN_MANIFEST, PLUGIN_MCP_CONFIG, PLUGIN_SKILLS_DIRECTORY,
  checkMcpConfig, checkPluginManifest, checkPluginSkills, pluginSkillNames,
} from "./plugin-core";
import type { Finding } from "./types";

const finding = (where: string, message: string): Finding => ({ where, message });

export function validatePlugin(
  pluginDir: string, categories: string[], author?: string,
): SkillResult {
  const findings: Finding[] = [];
  const notes: string[] = [];
  const namespace = basename(dirname(pluginDir));
  const directoryName = basename(pluginDir);

  const entries = readEntries(pluginDir);
  findings.push(...checkStructureCore(entries, PLUGIN_LAYOUT));
  findings.push(...checkPluginSkills(entries));
  // Namespace case and ownership are checked per skill, by checkFrontmatter,
  // and a plugin with no skills already fails checkPluginSkills.

  const manifest = join(pluginDir, PLUGIN_MANIFEST);
  if (!existsSync(manifest)) {
    findings.push(finding(PLUGIN_MANIFEST,
      `${PLUGIN_MANIFEST} is missing. A plugin is a directory with an Agent ` +
      `Plugins manifest at its root.`));
  } else {
    findings.push(...checkPluginManifest(readFileSync(manifest, "utf8"),
      { namespace, directoryName }));
  }

  const mcp = join(pluginDir, PLUGIN_MCP_CONFIG);
  if (existsSync(mcp)) findings.push(...checkMcpConfig(readFileSync(mcp, "utf8")));

  // Each skill gets the full frontmatter rules, reported under its own path so
  // a finding says which of the plugin's skills it is about.
  for (const skill of pluginSkillNames(entries)) {
    const rel = `${PLUGIN_SKILLS_DIRECTORY}/${skill}`;
    const result = checkSkillFile(join(pluginDir, rel), namespace, categories, author);
    findings.push(...result.findings.map((f) => ({ ...f, where: `${rel}: ${f.where}` })));
    notes.push(...result.notes.map((n) => `${rel}: ${n}`));
  }

  return { findings, notes };
}

/** Every plugin directory under plugins/{namespace}/{name}/. */
export function discoverAllPlugins(root: string): string[] {
  const pluginsDir = join(root, "plugins");
  if (!existsSync(pluginsDir)) return [];
  const out: string[] = [];
  for (const ns of readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!ns.isDirectory()) continue;
    for (const p of readdirSync(join(pluginsDir, ns.name), { withFileTypes: true })) {
      if (p.isDirectory()) out.push(join(pluginsDir, ns.name, p.name));
    }
  }
  return out.sort();
}
