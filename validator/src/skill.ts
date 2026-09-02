/** Validating one skill directory: read it, then apply both layers. */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { parse } from "yaml";
import { checkFrontmatter, quarantineExtensions } from "./rules";
import { checkStructure, checkYamlSafety, splitFrontmatter } from "./structure";
import type { Finding, Frontmatter } from "./types";

export interface SkillResult {
  findings: Finding[];
  notes: string[];
}

const finding = (where: string, message: string): Finding => ({ where, message });

/** The category vocabulary, from the one file that defines it. */
export function loadCategories(root: string): string[] {
  const raw = readFileSync(join(root, "registry", "categories.yml"), "utf8");
  const doc = parse(raw) as { categories?: { id: string }[] };
  return (doc.categories ?? []).map((c) => c.id);
}

export function validateSkill(
  skillDir: string, categories: string[], author?: string,
): SkillResult {
  const findings: Finding[] = [];
  const notes: string[] = [];

  const name = basename(skillDir);
  const namespace = basename(dirname(skillDir));

  findings.push(...checkStructure(skillDir));

  const skillMd = join(skillDir, "SKILL.md");
  if (!existsSync(skillMd)) {
    findings.push(finding("SKILL.md", "SKILL.md is missing"));
    return { findings, notes };
  }

  const { raw, body } = splitFrontmatter(readFileSync(skillMd, "utf8"));
  if (raw === null) {
    findings.push(finding("SKILL.md", "SKILL.md has no YAML frontmatter block"));
    return { findings, notes };
  }

  const yamlFindings = checkYamlSafety(raw);
  if (yamlFindings.length > 0) return { findings: [...findings, ...yamlFindings], notes };

  const parsed = parse(raw) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    findings.push(finding("frontmatter", "frontmatter must be a mapping"));
    return { findings, notes };
  }

  const { frontmatter, moved } = quarantineExtensions(parsed as Frontmatter);
  if (moved.length > 0) notes.push(`moved non-spec fields into metadata: ${moved.join(", ")}`);

  findings.push(...checkFrontmatter(frontmatter, {
    categories, directoryName: name, author, namespace,
  }));

  if (body.trim() === "") {
    findings.push(finding("SKILL.md", "SKILL.md has frontmatter but no body"));
  }

  return { findings, notes };
}

/** Every skill directory under skills/{namespace}/{name}/. */
export function discoverAll(root: string): string[] {
  const skillsDir = join(root, "skills");
  if (!existsSync(skillsDir)) return [];
  const out: string[] = [];
  for (const ns of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!ns.isDirectory()) continue;
    for (const s of readdirSync(join(skillsDir, ns.name), { withFileTypes: true })) {
      if (s.isDirectory()) out.push(join(skillsDir, ns.name, s.name));
    }
  }
  return out.sort();
}

/** Map a list of changed paths to the distinct skill directories they touch. */
/** Files the registry generates into a skill directory rather than the author
 *  writing them.
 *
 *  `.codex-plugin/plugin.json` is produced by scripts/build_marketplace.py for
 *  every listed skill, so any pull request that regenerates the manifests
 *  touches every namespace at once. Treating that as "this pull request changed
 *  somebody's skill" makes L1's ownership check fire on maintenance work: a
 *  maintainer regenerating manifests fails because another person's namespace
 *  appears in the diff.
 *
 *  Exempting them does not weaken the rule the check exists for. The rule stops
 *  somebody writing *a skill* into a namespace they do not own; these files are
 *  registry-owned, regenerated on every merge, and any tampering is caught by
 *  `build_marketplace.py --check`, which compares them against what the
 *  generator produces. */
const GENERATED_IN_SKILL = /(^|\/)\.codex-plugin\/plugin\.json$/;

export function discoverChanged(root: string, changedFile: string): string[] {
  const dirs = new Set<string>();
  for (const line of readFileSync(changedFile, "utf8").split("\n")) {
    const path = line.trim();
    if (GENERATED_IN_SKILL.test(path)) continue;
    const parts = path.split("/");
    if (parts.length >= 3 && parts[0] === "skills") {
      const candidate = join(root, parts[0], parts[1]!, parts[2]!);
      if (existsSync(candidate)) dirs.add(candidate);
    }
  }
  return [...dirs].sort();
}
