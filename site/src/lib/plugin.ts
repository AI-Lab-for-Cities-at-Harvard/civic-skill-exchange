/** A plugin on the submission page (#213): the pure half.
 *
 *  A plugin is a folder with plugin.json at its root and one directory per
 *  skill under skills/ (ADR 0005). The page asks what describes the plugin
 *  once — description, license, version, and the registry's extension fields —
 *  and asks each skill only what its own SKILL.md leaves unanswered. The
 *  answers are written back into the submitter's files rather than into a
 *  replacement: plugin-level fields into plugin.json under the registry's
 *  extension, per-skill fields into that skill's SKILL.md, and neither into the
 *  other, which is the rule checkFrontmatter's `inPlugin` enforces.
 *
 *  The checks are the validator's own, run on the patched text, so what the
 *  page reports is what CI will (validator/src/plugin.ts reads the same files).
 */

import { parse } from "yaml";
import type { Entry, Finding, Frontmatter } from "@civic-skill-exchange/validator";
import { PLUGIN_LAYOUT, PLUGIN_MANIFEST, PLUGIN_MCP_CONFIG, PLUGIN_SCHEMA_ID, PLUGIN_SKILLS_DIRECTORY, REGISTRY_EXTENSION, checkMcpConfig, checkPluginManifest, checkPluginSkills, expectedPluginName, pluginSkillNames } from "@civic-skill-exchange/validator/plugin-core";
import { checkFrontmatter, quarantineExtensions } from "@civic-skill-exchange/validator/rules";
import { checkStructureCore, splitFrontmatter } from "@civic-skill-exchange/validator/structure-core";
import { checkYamlSafety } from "@civic-skill-exchange/validator/yaml-safety";
import { en } from "../i18n/en";
import { strings } from "../i18n/strings";
import { draftFromSkillMd } from "./parse";
import { patchSkillMd, type PatchedSkill } from "./patch";
import { slugify, toFields, type Draft } from "./submit";

const CATEGORIES = Object.keys(en.vocabulary.category);

const text = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

// --------------------------------------------------------------------------- //
// The folder

export interface PluginSource {
  entries: Entry[];
  directoryName: string;
  manifest: string;
  /** Null when the plugin connects to nothing. */
  mcp: string | null;
  skills: { name: string; skillMd: string }[];
}

const read = (entries: Entry[], path: string): string | null => {
  const entry = entries.find((e) => e.path === path);
  return entry?.kind === "file" ? new TextDecoder().decode(entry.bytes) : null;
};

export function readPluginSource(entries: Entry[], directoryName: string): PluginSource {
  return {
    entries,
    directoryName,
    manifest: read(entries, PLUGIN_MANIFEST) ?? "",
    mcp: read(entries, PLUGIN_MCP_CONFIG),
    skills: pluginSkillNames(entries).map((name) => ({
      name, skillMd: read(entries, skillMdPath(name)) ?? "",
    })),
  };
}

export const skillMdPath = (skill: string) => `${PLUGIN_SKILLS_DIRECTORY}/${skill}/SKILL.md`;

// --------------------------------------------------------------------------- //
// The plugin block

export interface PluginDraft {
  /** GitHub login: the namespace, as for a skill. */
  author: string;
  /** The plugin's directory under plugins/{namespace}/. */
  name: string;
  description: string;
  license: string;
  version: string;
  maintainer: string;
  affiliation: string;
  deployment: string;
  deployedAt: string;
  deployedIn: string;
  deployedSince: string;
  useWhen: string;
  avoidWhen: string;
  modelsTested: string;
}

export const EMPTY_PLUGIN_DRAFT: PluginDraft = {
  author: "", name: "", description: "", license: "", version: "",
  maintainer: "", affiliation: "", deployment: "",
  deployedAt: "", deployedIn: "", deployedSince: "", useWhen: "", avoidWhen: "",
  modelsTested: "",
};

/** The registry fields a plugin declares once, in plugin.json, by the draft key
 *  that holds each. The validator's PLUGIN_METADATA is the authority on which
 *  fields these are; plugin.test.ts holds the two together through the patch. */
export const EXTENSION_FIELDS = {
  maintainer: "civic.maintainer",
  affiliation: "civic.affiliation",
  deployment: "civic.deployment",
  deployedAt: "civic.deployed-at",
  deployedIn: "civic.deployed-in",
  deployedSince: "civic.deployed-since",
  useWhen: "civic.use-when",
  avoidWhen: "civic.avoid-when",
  modelsTested: "civic.models-tested",
} as const satisfies Partial<Record<keyof PluginDraft, string>>;

/** The manifest's own fields the form asks for. */
const MANIFEST_FIELDS = ["description", "license", "version"] as const;

/** Where a finding about each draft field is reported, which is also the id of
 *  the box that answers it — so a finding lands under its question. */
export const pluginFieldId = (key: keyof PluginDraft): string => {
  if (key in EXTENSION_FIELDS) {
    return `${PLUGIN_MANIFEST}#extensions.${REGISTRY_EXTENSION}.` +
      EXTENSION_FIELDS[key as keyof typeof EXTENSION_FIELDS];
  }
  return `${PLUGIN_MANIFEST}#${key}`;
};

export function pluginDraftFromManifest(
  manifest: string, directoryName: string, author: string,
): { draft: PluginDraft; problems: string[] } {
  let value: unknown;
  try {
    value = JSON.parse(manifest);
  } catch (e) {
    return {
      draft: { ...EMPTY_PLUGIN_DRAFT, author, name: slugify(directoryName) },
      problems: [strings().submit.problems.invalidPluginJson((e as Error).message)],
    };
  }
  const doc = isObject(value) ? value : {};
  const ext = isObject(doc.extensions) ? doc.extensions[REGISTRY_EXTENSION] : undefined;
  const civic = isObject(ext) ? ext : {};
  const draft: PluginDraft = {
    ...EMPTY_PLUGIN_DRAFT,
    author,
    name: slugify(directoryName) || slugify(text(doc.name)),
    description: text(doc.description),
    license: text(doc.license),
    version: text(doc.version),
  };
  for (const [key, field] of Object.entries(EXTENSION_FIELDS)) {
    draft[key as keyof typeof EXTENSION_FIELDS] = text(civic[field]);
  }
  return { draft, problems: [] };
}

const namespaceOf = (draft: { author: string }) => draft.author.trim().toLowerCase();

/** Lines worth showing as "added": the ones that carry a value, not braces. */
const valueLines = (json: string) =>
  json.split("\n").map((l) => l.trim()).filter((l) => /^"/.test(l));

/** A file the page wrote whole — plugin.json or mcp.json converted from a
 *  Claude Code export (#246) — is added line for line. */
export const newFileLines = valueLines;

export interface PatchedManifest {
  /** The submitter's plugin.json, amended. Unchanged when it could not be read. */
  text: string;
  /** The lines the patch introduced or changed, for the page to show. */
  added: string[];
  problems: string[];
}

/** Write the form's answers into plugin.json.
 *
 *  `$schema` and `name` are written by the page, never asked: the first is how
 *  Codex tells an Agent Plugins manifest from its own, and the second has
 *  exactly one right value, `{namespace}-{directory}` (ruling 5 on #213).
 *  Everything the registry has no opinion about — keywords, homepage, another
 *  key the checks will flag — is carried through in the submitter's order.
 *  A file with nothing to change comes back byte for byte. */
export function patchPluginJson(source: string, draft: PluginDraft): PatchedManifest {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (e) {
    return {
      text: source, added: [],
      problems: [strings().submit.problems.invalidPluginJson((e as Error).message)],
    };
  }
  if (!isObject(value)) {
    return {
      text: source, added: [],
      problems: [strings().submit.problems.invalidPluginJson("not an object")],
    };
  }

  const out: Record<string, unknown> = { $schema: PLUGIN_SCHEMA_ID };
  if (!("name" in value)) out.name = "";
  for (const [key, v] of Object.entries(value)) if (key !== "$schema") out[key] = v;

  const ns = namespaceOf(draft);
  const name = draft.name.trim();
  if (ns && name) out.name = expectedPluginName({ namespace: ns, directoryName: name });
  else if (out.name === "") delete out.name;

  const setOrDrop = (target: Record<string, unknown>, key: string, raw: string) => {
    const wanted = raw.trim();
    if (wanted) target[key] = wanted;
    else delete target[key];
  };
  for (const key of MANIFEST_FIELDS) setOrDrop(out, key, draft[key]);

  const extensions = isObject(out.extensions) ? { ...out.extensions } : {};
  const civic = isObject(extensions[REGISTRY_EXTENSION])
    ? { ...extensions[REGISTRY_EXTENSION] } : {};
  for (const [key, field] of Object.entries(EXTENSION_FIELDS)) {
    setOrDrop(civic, field, draft[key as keyof typeof EXTENSION_FIELDS]);
  }
  extensions[REGISTRY_EXTENSION] = civic;
  // Extensions last, where a reader expects the part no client reads.
  delete out.extensions;
  out.extensions = extensions;

  if (JSON.stringify(out) === JSON.stringify(value)) {
    return { text: source, added: [], problems: [] };
  }
  const textOut = `${JSON.stringify(out, null, 2)}\n`;
  const before = new Set(valueLines(JSON.stringify(value, null, 2)));
  return {
    text: textOut,
    added: valueLines(textOut).filter((l) => !before.has(l)),
    problems: [],
  };
}

// --------------------------------------------------------------------------- //
// Each skill

/** What a skill in a plugin answers for itself (ruling 3 on #213). Everything
 *  else the registry asks of it is the plugin's, in plugin.json. */
export const SKILL_QUESTIONS = [
  "civic.category", "civic.category-secondary", "civic.scope",
  "civic.scope-secondary", "civic.jurisdiction", "civic.localization",
  "civic.language", "civic.data-sensitivity", "civic.human-review",
] as const;

/** A skill's draft from its SKILL.md, with nothing presumed.
 *
 *  The skill form starts sensitivity and human review at "none", which a
 *  submitter writing from scratch sees and confirms. Here the form only shows
 *  the questions a file leaves open, so a default would answer them silently
 *  and the section would open closed and "complete" on a claim nobody made. */
export function skillDraftFromFile(skillMd: string): Draft {
  const { draft } = draftFromSkillMd(skillMd);
  const meta = metadataOf(skillMd);
  return {
    ...draft,
    dataSensitivity: text(meta["civic.data-sensitivity"]),
    humanReview: text(meta["civic.human-review"]),
  };
}

function metadataOf(skillMd: string): Record<string, unknown> {
  const front = frontmatterOf(skillMd);
  return front && isObject(front.metadata) ? front.metadata : {};
}

function frontmatterOf(skillMd: string): Frontmatter | null {
  const { raw } = splitFrontmatter(skillMd);
  if (raw === null || checkYamlSafety(raw).length > 0) return null;
  try {
    const doc = parse(raw, { merge: false }) as unknown;
    return isObject(doc) ? quarantineExtensions(doc as Frontmatter).frontmatter : null;
  } catch {
    return null;
  }
}

/** Only this skill's own answers, so nothing the plugin declares is written
 *  into its SKILL.md. */
export function patchPluginSkill(skillMd: string, draft: Draft): PatchedSkill {
  const all = toFields(draft);
  const fields = Object.fromEntries(SKILL_QUESTIONS.map((k) => [k, all[k] ?? ""]));
  return patchSkillMd(skillMd, fields);
}

/** The questions a skill's findings say are open, in the form's order. */
export function gapsOf(findings: Finding[]): string[] {
  const flagged = new Set(findings.map((f) => f.where));
  return SKILL_QUESTIONS.filter((k) => flagged.has(k));
}

// --------------------------------------------------------------------------- //
// The checks

export interface PluginCheck {
  /** Path and layout problems, which no field can fix. They block. */
  structural: Finding[];
  manifest: Finding[];
  mcp: Finding[];
  /** Per skill, by directory name, with `where` the skill's own field. */
  skills: Record<string, Finding[]>;
}

export function checkPlugin(
  source: PluginSource,
  current: {
    /** The patched plugin.json. */
    manifest: string;
    /** Patched SKILL.md text by skill name; a skill not here is read as is. */
    skills: Record<string, string>;
    namespace: string;
    author: string;
    directoryName: string;
  },
): PluginCheck {
  const namespace = current.namespace.trim().toLowerCase();
  const structural = [
    ...checkStructureCore(source.entries, PLUGIN_LAYOUT),
    ...checkPluginSkills(source.entries),
  ];
  // The name is `{namespace}-{directory}`, which cannot be right before the
  // namespace is typed — and the namespace box already says it is needed.
  const manifest = checkPluginManifest(current.manifest, {
    namespace, directoryName: current.directoryName,
  }).filter((f) => namespace || f.where !== `${PLUGIN_MANIFEST}#name`);
  const mcp = source.mcp === null ? [] : checkMcpConfig(source.mcp);

  const skills: Record<string, Finding[]> = {};
  for (const skill of source.skills) {
    const textNow = current.skills[skill.name] ?? skill.skillMd;
    const front = frontmatterOf(textNow);
    if (!front) {
      skills[skill.name] = [{
        where: "SKILL.md", message: strings().submit.problems.noFrontmatter,
      }];
      continue;
    }
    // A SKILL.md with no metadata block yet is asked the questions, not told
    // "metadata is required" — the answers are what create the block.
    skills[skill.name] = checkFrontmatter(
      { ...front, metadata: isObject(front.metadata) ? front.metadata : {} },
      {
        categories: CATEGORIES, directoryName: skill.name, inPlugin: true,
        namespace: namespace || undefined, author: current.author.trim() || undefined,
      },
    );
  }
  return { structural, manifest, mcp, skills };
}
