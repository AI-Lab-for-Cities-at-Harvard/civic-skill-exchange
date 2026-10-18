/** A plugin on the submission page (#213).
 *
 *  The page reads the folder, asks the plugin-level questions once and each
 *  skill only what its SKILL.md is missing, and writes the answers back into
 *  the submitter's own files: plugin-level fields into plugin.json under the
 *  registry's extension, per-skill fields into that skill's SKILL.md, and
 *  neither into the other (ADR 0005).
 */

import { describe, it, expect } from "vitest";
import { strToU8, strFromU8 } from "fflate";
import {
  PLUGIN_SCHEMA_ID, REGISTRY_EXTENSION, type Entry,
} from "@civic-skill-exchange/validator";
import {
  EMPTY_PLUGIN_DRAFT, checkPlugin, gapsOf, patchPluginJson, patchPluginSkill,
  pluginDraftFromManifest, readPluginSource, skillDraftFromFile, type PluginDraft,
} from "./plugin";
import { buildFolderZip } from "./folder";
import { readSkillZip } from "./zip";

const file = (path: string, text: string): Entry =>
  ({ path, kind: "file", bytes: strToU8(text) });

const COMPLETE_SKILL = `---
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

const BARE_SKILL = `---
name: refresh-housing-dashboard
description: Refreshes an existing housing dashboard with the latest releases.
license: MIT
---

# Refresh
`;

const MANIFEST = `{
  "name": "housing-dashboards",
  "version": "0.3.4",
  "description": "Housing dashboards, refreshes and briefs for any U.S. city or county.",
  "license": "MIT",
  "keywords": ["housing"]
}
`;

const MCP = JSON.stringify({
  $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  mcpServers: { census: { type: "streamable-http", url: "https://census-mcp.responsive.city/mcp" } },
});

const ENTRIES: Entry[] = [
  file("plugin.json", MANIFEST),
  file("mcp.json", MCP),
  file("README.md", "# Housing\n"),
  file("skills/housing-brief/SKILL.md", COMPLETE_SKILL),
  file("skills/housing-brief/references/brief.md", "# Brief\n"),
  file("skills/refresh-housing-dashboard/SKILL.md", BARE_SKILL),
];

const ANSWERED: PluginDraft = {
  ...EMPTY_PLUGIN_DRAFT,
  author: "sgarcese",
  name: "housing-dashboards",
  description: "Housing dashboards, refreshes and briefs for any U.S. city or county.",
  license: "MIT",
  version: "0.3.4",
  maintainer: "Santiago Garcés",
  affiliation: "academic",
  deployment: "personal",
  useWhen: "A city wants a housing snapshot.",
};

describe("readPluginSource", () => {
  it("finds the manifest, the MCP config and each skill's SKILL.md", () => {
    const source = readPluginSource(ENTRIES, "housing-dashboards");
    expect(source.manifest).toBe(MANIFEST);
    expect(source.mcp).toBe(MCP);
    expect(source.skills.map((s) => s.name)).toEqual(["housing-brief", "refresh-housing-dashboard"]);
    expect(source.skills[1]!.skillMd).toBe(BARE_SKILL);
  });
});

describe("pluginDraftFromManifest", () => {
  it("fills the plugin block from plugin.json and its extension", () => {
    const manifest = JSON.stringify({
      name: "sgarcese-housing-dashboards", description: "d", license: "MIT", version: "1.0",
      extensions: { [REGISTRY_EXTENSION]: {
        "civic.maintainer": "S", "civic.affiliation": "academic", "civic.deployment": "personal",
        "civic.use-when": "u",
      } },
    });
    const { draft } = pluginDraftFromManifest(manifest, "housing-dashboards", "sgarcese");
    expect(draft).toMatchObject({
      author: "sgarcese", name: "housing-dashboards", description: "d", license: "MIT",
      version: "1.0", maintainer: "S", affiliation: "academic", deployment: "personal",
      useWhen: "u",
    });
  });

  it("names the plugin after its folder, or its manifest when there is no folder", () => {
    expect(pluginDraftFromManifest(MANIFEST, "My Housing", "").draft.name).toBe("my-housing");
    expect(pluginDraftFromManifest(MANIFEST, "", "").draft.name).toBe("housing-dashboards");
  });

  it("leaves deployment unanswered rather than claiming none", () => {
    expect(pluginDraftFromManifest(MANIFEST, "x", "").draft.deployment).toBe("");
  });

  it("says when plugin.json is not JSON", () => {
    expect(pluginDraftFromManifest("{nope", "x", "").problems).toHaveLength(1);
  });
});

describe("patchPluginJson", () => {
  it("writes $schema, the {namespace}-{name} name and the civic fields under the extension", () => {
    const { text, problems } = patchPluginJson(MANIFEST, ANSWERED);
    expect(problems).toEqual([]);
    const out = JSON.parse(text);
    expect(out.$schema).toBe(PLUGIN_SCHEMA_ID);
    expect(out.name).toBe("sgarcese-housing-dashboards");
    expect(out.extensions[REGISTRY_EXTENSION]).toEqual({
      "civic.maintainer": "Santiago Garcés",
      "civic.affiliation": "academic",
      "civic.deployment": "personal",
      "civic.use-when": "A city wants a housing snapshot.",
    });
  });

  it("keeps the submitter's key order, with $schema first and extensions last", () => {
    const keys = Object.keys(JSON.parse(patchPluginJson(MANIFEST, ANSWERED).text));
    expect(keys).toEqual([
      "$schema", "name", "version", "description", "license", "keywords", "extensions",
    ]);
  });

  it("keeps what the registry has no opinion about", () => {
    const out = JSON.parse(patchPluginJson(MANIFEST, ANSWERED).text);
    expect(out.keywords).toEqual(["housing"]);
  });

  it("removes a field cleared in the form", () => {
    const out = JSON.parse(patchPluginJson(MANIFEST, { ...ANSWERED, version: "" }).text);
    expect(out).not.toHaveProperty("version");
  });

  it("leaves the name alone until the namespace is known", () => {
    const out = JSON.parse(patchPluginJson(MANIFEST, { ...ANSWERED, author: "" }).text);
    expect(out.name).toBe("housing-dashboards");
  });

  it("returns a file with nothing to change byte for byte", () => {
    const done = patchPluginJson(MANIFEST, ANSWERED).text;
    expect(patchPluginJson(done, ANSWERED).text).toBe(done);
  });

  it("shows the lines it added", () => {
    const { added } = patchPluginJson(MANIFEST, ANSWERED);
    expect(added).toContain(`"$schema": "${PLUGIN_SCHEMA_ID}",`);
    expect(added).toContain('"name": "sgarcese-housing-dashboards",');
    expect(added).toContain('"civic.maintainer": "Santiago Garcés",');
    expect(added).not.toContain('"license": "MIT",');
  });

  it("refuses a file that is not JSON, unchanged", () => {
    const { text, problems } = patchPluginJson("{nope", ANSWERED);
    expect(text).toBe("{nope");
    expect(problems).toHaveLength(1);
  });
});

describe("a plugin's skills", () => {
  it("lists exactly the questions a skill's SKILL.md leaves unanswered", () => {
    const ctx = { namespace: "sgarcese", author: "sgarcese" };
    const bare = checkPlugin(readPluginSource(ENTRIES, "x"), {
      manifest: MANIFEST, skills: {}, ...ctx, directoryName: "x",
    }).skills["refresh-housing-dashboard"]!;
    expect(gapsOf(bare)).toEqual([
      "civic.category", "civic.scope", "civic.language",
      "civic.data-sensitivity", "civic.human-review",
    ]);
  });

  it("finds nothing to ask a complete skill", () => {
    const result = checkPlugin(readPluginSource(ENTRIES, "x"), {
      manifest: MANIFEST, skills: {}, namespace: "sgarcese", author: "sgarcese", directoryName: "x",
    });
    expect(result.skills["housing-brief"]).toEqual([]);
  });

  it("does not pre-answer sensitivity or human review for a skill that never said", () => {
    const draft = skillDraftFromFile(BARE_SKILL);
    expect(draft.dataSensitivity).toBe("");
    expect(draft.humanReview).toBe("");
  });

  it("writes only per-skill answers into SKILL.md, never the plugin's", () => {
    const draft = {
      ...skillDraftFromFile(BARE_SKILL),
      category: "policy", scope: "municipal", language: "en",
      dataSensitivity: "none", humanReview: "advisory-only",
      maintainer: "Santiago Garcés", deployment: "personal",
    };
    const { skillMd } = patchPluginSkill(BARE_SKILL, draft);
    expect(skillMd).toContain("civic.category: policy");
    expect(skillMd).toContain("civic.human-review: advisory-only");
    expect(skillMd).not.toContain("civic.maintainer");
    expect(skillMd).not.toContain("civic.deployment");
    expect(skillMd).toContain("# Refresh");
  });

  it("checks a skill's patched text, with the plugin-level fields left to plugin.json", () => {
    const patched = patchPluginSkill(BARE_SKILL, {
      ...skillDraftFromFile(BARE_SKILL),
      category: "policy", scope: "municipal", language: "en",
      dataSensitivity: "none", humanReview: "none",
    }).skillMd;
    const result = checkPlugin(readPluginSource(ENTRIES, "x"), {
      manifest: patchPluginJson(MANIFEST, ANSWERED).text,
      skills: { "refresh-housing-dashboard": patched },
      namespace: "sgarcese", author: "sgarcese", directoryName: "housing-dashboards",
    });
    expect(result.skills["refresh-housing-dashboard"]).toEqual([]);
    expect(result.manifest).toEqual([]);
  });
});

describe("checkPlugin", () => {
  it("runs the plugin layout, the manifest and the MCP config rules", () => {
    const entries = [...ENTRIES, file("hooks/hooks.json", "{}")];
    const result = checkPlugin(readPluginSource(entries, "x"), {
      manifest: MANIFEST, skills: {}, namespace: "sgarcese", author: "sgarcese",
      directoryName: "housing-dashboards",
    });
    expect(result.structural.map((f) => f.where)).toContain("hooks/hooks.json");
    expect(result.manifest.map((f) => f.where)).toContain("plugin.json#$schema");
    expect(result.mcp).toEqual([]);
  });

  it("flags an MCP server whose address is filled in from the environment", () => {
    const entries = ENTRIES.map((e) => e.path === "mcp.json"
      ? file("mcp.json", JSON.stringify({ mcpServers: { x: { type: "streamable-http", url: "${URL}" } } }))
      : e);
    const result = checkPlugin(readPluginSource(entries, "x"), {
      manifest: MANIFEST, skills: {}, namespace: "a", author: "a", directoryName: "x",
    });
    expect(result.mcp.length).toBeGreaterThan(0);
  });

  it("does not report the manifest name before the namespace is known", () => {
    const result = checkPlugin(readPluginSource(ENTRIES, "x"), {
      manifest: MANIFEST, skills: {}, namespace: "", author: "", directoryName: "x",
    });
    expect(result.manifest.map((f) => f.where)).not.toContain("plugin.json#name");
  });
});

describe("buildFolderZip for a plugin", () => {
  it("holds every file's bytes with the replacements, and gains no root SKILL.md", () => {
    const zip = buildFolderZip(ENTRIES, "housing-dashboards", {
      "plugin.json": "{\"patched\": true}\n",
      "skills/refresh-housing-dashboard/SKILL.md": "patched skill\n",
    });
    const read = readSkillZip(zip);
    expect(read.directoryName).toBe("housing-dashboards");
    const text = (p: string) => {
      const e = read.entries.find((x) => x.path === p);
      return e?.kind === "file" ? strFromU8(e.bytes) : undefined;
    };
    expect(text("plugin.json")).toBe("{\"patched\": true}\n");
    expect(text("skills/refresh-housing-dashboard/SKILL.md")).toBe("patched skill\n");
    expect(text("skills/housing-brief/references/brief.md")).toBe("# Brief\n");
    expect(text("SKILL.md")).toBeUndefined();
  });
});
