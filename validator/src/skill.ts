/** Validating one skill directory: read it, then apply both layers. */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { parse } from "yaml";
import { checkFrontmatter, quarantineExtensions, RESERVED_NAMESPACES } from "./rules";
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
 *  generator produces.
 *
 *  The pattern is the exact path the generator writes: one file, at the root of
 *  a `skills/{namespace}/{name}/` directory. It used to match
 *  `.codex-plugin/plugin.json` at any depth, which exempted hand-written files
 *  the generator never touches — and an exemption here stops the ownership
 *  check seeing a path at all, so "near enough" is a hole rather than a
 *  convenience. `discover.test.ts` reads `scripts/build_marketplace.py` and
 *  checks this still describes what it writes, so the shape is asked for rather
 *  than kept as a second copy of the generator's list. */
const GENERATED_IN_SKILL = /^skills\/[^/]+\/[^/]+\/\.codex-plugin\/plugin\.json$/;

/** Whether a repository-relative path is one the manifest generator owns. */
export function isGeneratedInSkill(path: string): boolean {
  return GENERATED_IN_SKILL.test(path);
}

/** Map a list of changed paths to the distinct skill directories they touch. */
export function discoverChanged(root: string, changedFile: string): string[] {
  const dirs = new Set<string>();
  for (const line of readFileSync(changedFile, "utf8").split("\n")) {
    const path = line.trim();
    if (isGeneratedInSkill(path)) continue;
    const parts = path.split("/");
    if (parts.length >= 3 && parts[0] === "skills") {
      const candidate = join(root, parts[0], parts[1]!, parts[2]!);
      if (existsSync(candidate)) dirs.add(candidate);
    }
  }
  return [...dirs].sort();
}

export interface ChangedOwnership {
  /** The account that opened the pull request, never the fork's owner. */
  author?: string;
  /** Resolved by the workflow, not here — see `.github/workflows/validate.yml`. */
  maintainer?: boolean;
}

/** L1 over the changed-path list: every path under `skills/` belongs to the
 *  pull request author's namespace.
 *
 *  `discoverChanged` can only report directories that still exist, so this is
 *  the only place a *deletion* is visible. A pull request that removed somebody
 *  else's skill used to validate as "no skill directories" and exit 0, and a
 *  move out of another namespace looked like an ordinary addition on the side
 *  the diff kept (#154). Both are path facts, which is what docs/SECURITY.md
 *  has always claimed L1 checks.
 *
 *  Maintainers are exempt, because the exchange has to be able to delist and
 *  migrate a listing. Whether an account is one is not knowable from a skill
 *  directory, so it arrives as an input: the workflow resolves it against the
 *  CODEOWNER-gated maintainers list and passes `--maintainer`. Keeping that
 *  decision out of here also keeps an access-control list out of a module the
 *  submission page runs in the browser. */
export function checkChangedOwnership(
  paths: string[], { author, maintainer = false }: ChangedOwnership,
): Finding[] {
  // No author is the local case — `npm run check` passes none, and inventing a
  // failure there would make the local run disagree with CI.
  if (maintainer || !author) return [];

  const findings: Finding[] = [];

  for (const line of paths) {
    const path = line.trim();
    if (path === "" || !path.startsWith("skills/")) continue;
    if (isGeneratedInSkill(path)) continue;

    const parts = path.split("/");
    if (parts.length < 3 || parts[1] === "") {
      findings.push(finding(path,
        `'${path}' is directly under skills/, which belongs to no namespace. ` +
        `Everything a pull request adds there goes in skills/${author}/`));
      continue;
    }

    const namespace = parts[1]!;
    // Exact-case on the namespace (#155): the directory is the one canonical
    // spelling, and an uppercase character in it is rejected by
    // checkNamespaceCase. Only the login is folded, because GitHub treats
    // logins case-insensitively and people type them as they like.
    if (RESERVED_NAMESPACES.has(namespace)) continue;
    if (namespace === author.toLowerCase()) continue;

    findings.push(finding(path,
      `namespace '${namespace}' does not match the pull request author ` +
      `'${author}'. A pull request may only add, change, move or delete files ` +
      `under skills/${author}/ — removing or migrating another namespace's ` +
      `skill is a maintainer operation.`));
  }

  return findings;
}
