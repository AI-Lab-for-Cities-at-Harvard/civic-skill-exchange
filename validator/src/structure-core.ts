/**
 * Structural checks over a list of entries. Pure — no filesystem, no Node.
 *
 * The same rules have to hold wherever a skill comes from: a checked-out
 * directory in CI, or an entry list assembled somewhere with no filesystem at
 * all. Keeping them here means one implementation rather than one per caller,
 * which is the same reasoning that keeps rules.ts shared.
 *
 * Entries are kind-tagged rather than raw bytes because the symlink and nested
 * git rules are classification, not filesystem access — a caller that knows an
 * entry is a symlink can say so, and then this module can enforce every rule
 * instead of most of them.
 *
 * Order matters. Callers must pass entries sorted by path, and every finding is
 * emitted in that one pass, because the sequence ends up in a pull request
 * comment that people read top to bottom.
 */

import type { Finding } from "./types";

/**
 * Caps. A skill is instructions and small helpers; anything larger is a project.
 *
 * Derived from measurement, not intuition. Against the twenty skills in
 * anthropics/skills, the original numbers refused seven — and the three
 * document skills each broke three caps at once, so relaxing any single one
 * would have changed nothing. These accept seventeen. The three still refused
 * carry fonts, a PDF and a gzip, and fail on type rather than size.
 */
export const MAX_FILE_BYTES = 256 * 1024;   // no skill in the corpus exceeds this
export const MAX_SKILL_BYTES = 2 * 1024 * 1024;
export const MAX_FRONTMATTER_BYTES = 16 * 1024;

/**
 * Not our ceiling. GitHub's multi-file upload interface hard-fails above a
 * hundred files, so any submission path that goes through it inherits this
 * limit — a higher cap here would be a promise the submission flow cannot keep.
 */
export const MAX_FILES_PER_SKILL = 100;

/**
 * Allowlist, not a denylist. A denylist of binary types is always incomplete.
 *
 * Every entry is text a reviewer can read and a diff can show. That is what
 * makes "somebody read every line" a claim the Reviewed tier can actually make,
 * and it is why no image, archive or document format appears here.
 */
/** Repository furniture, not skill content.
 *
 *  A skill copied out of its own repository arrives with the repository's own
 *  files beside it — `LICENSE`, `.gitignore`, `.gitattributes`. They have no
 *  extension, so the allowlist below rejects them, which is correct for a skill
 *  directory and useless as an answer to somebody importing a repository: every
 *  repository has them, and none of them belong in the skill.
 *
 *  A submission path can use this to leave them behind and say so. It is not a
 *  second allowlist — anything with a disallowed *extension* still fails.
 */
export function isRepositoryFurniture(path: string): boolean {
  return extname(path) === "";
}

export const ALLOWED_SUFFIXES = new Set([
  ".md", ".txt", ".yml", ".yaml", ".json", ".toml", ".csv", ".tsv",
  ".py", ".sh", ".bash", ".js", ".mjs", ".ts", ".sql", ".jinja", ".j2",
  ".html", ".css", ".xml", ".xsd", ".ini", ".cfg",
]);

export type Entry =
  | { path: string; kind: "dir" }
  | { path: string; kind: "symlink" }
  | { path: string; kind: "file"; bytes: Uint8Array };

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;

const finding = (where: string, message: string): Finding => ({ where, message });

/** Frontmatter must open the file. A `---` further down is a horizontal rule. */
export function splitFrontmatter(text: string): { raw: string | null; body: string } {
  const m = FRONTMATTER_RE.exec(text);
  if (!m) return { raw: null, body: text };
  return { raw: m[1] ?? "", body: text.slice(m[0].length) };
}

/**
 * Node's `extname`, reimplemented so this module needs no Node.
 *
 * The edge case that matters is the dotfile: `extname(".gitignore")` is `""`,
 * not `".gitignore"`, which is why such a file is reported by path rather than
 * by suffix. Held to Node's own behaviour by tests.
 */
export function extname(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? "" : base.slice(dot);
}

/**
 * Paths a filesystem walk cannot produce, and any other source can.
 *
 * `relative()` over a directory tree structurally cannot yield a `..` segment,
 * an absolute path, or a NUL. An entry list assembled from somewhere else is a
 * string an author chose, so it gets checked before it is used — including for
 * duplicates, which silently collapse in any map-shaped container and would
 * under-report both the file count and the byte total.
 */
export function checkPathSafety(entries: Entry[]): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const path = entry.path;
    if (path === "" || path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
      findings.push(finding(path || ".", "entry path must be relative to the skill directory"));
      continue;
    }
    if (path.includes("\\") || path.includes("\0")) {
      findings.push(finding(path, "entry path contains an illegal character"));
      continue;
    }
    if (path.split("/").includes("..")) {
      findings.push(finding(path, "entry path escapes the skill directory"));
      continue;
    }
    if (seen.has(path)) {
      findings.push(finding(path, "duplicate entry path"));
      continue;
    }
    seen.add(path);
  }

  return findings;
}

/** What an example SKILL.md is renamed to, so nothing loads it. */
export const EXAMPLE_SKILL_FILE = "SKILL.example.md";

/** A SKILL.md anywhere below the skill's own, relative to the skill directory.
 *
 *  One directory is one skill. That became load-bearing with #73, whose
 *  marketplace generator emits one plugin per directory: a nested SKILL.md was
 *  indexed as an ordinary file and installed as a skill a client would pick up
 *  (#78). #78 exempted `references/` and `assets/`, where the Agent Skills
 *  specification puts templates. ADR 0006 (decision 4) takes that back: Codex
 *  loads every SKILL.md under a plugin's `skills/`, at any depth, so an example
 *  there became a second Codex skill. Every one is refused now, and an example
 *  is renamed `SKILL.example.md`. */
export function isLoadableNestedSkill(rel: string): boolean {
  return rel !== "SKILL.md" && rel.endsWith("/SKILL.md");
}

/** Why a SKILL.md below a skill's own is refused. `rel` is the full path, so
 *  the author doesn't have to hunt for it. Shared by every layout, and by
 *  layout.ts for changed paths, so the advice is the same wherever it is met. */
export function deepSkillMessage(rel: string): string {
  return `${rel} is a SKILL.md below the skill's own. Codex loads every ` +
    `SKILL.md it finds under a plugin's skills/, however deep, so a client ` +
    `would load this as a second skill while the registry lists one. If it is ` +
    `an example or a template, rename it ${EXAMPLE_SKILL_FILE}. If it is a ` +
    `skill of its own, give it its own listing, or submit them together as a ` +
    `plugin under plugins/.`;
}

/** Plugin-level files a client acts on, which a skill may not ship (#151).
 *
 *  `hooks/hooks.json` is the sharp end: it runs shell commands at session
 *  start with nothing between the install and the command, which is the class
 *  SECURITY.md §3 says an LLM cannot gate. Every one of these carries an
 *  allowlisted suffix, so before this rule they passed L0 unremarked.
 *
 *  They are refused in a skill's own folder: the folder an author brings to
 *  the submission page, and `skills/{name}/` inside a listing, where it lands
 *  (ADR 0006). No client reads them there, and an author who wrote one
 *  expected it to do something. Keyed on the first path segment of that
 *  folder, so a copy under `references/` or `assets/` is documentation, which
 *  no client loads. (A SKILL.md is the exception, since Codex does load one
 *  there: `isLoadableNestedSkill` refuses it wherever it sits.)
 *
 *  A plugin's skills get the same rules (plugin-core.ts), after their own
 *  messages for a server config and a manifest.
 */
const MANIFEST_COPY = "the registry generates a single skill's manifests at " +
  "the listing root, beside skills/{name}/, from its SKILL.md. A copy in the " +
  "skill's own folder is one no client reads. Remove it.";

const SERVER_CONFIG = "a single skill's listing holds no server config: no " +
  "client reads one inside the skill's own folder, and the listing root holds " +
  "only generated files. A skill with an MCP server is a plugin (ADR 0006): " +
  "submit it under plugins/, with the server in its mcp.json.";

const PLUGIN_DIRECTORIES = new Map<string, string>([
  ["hooks", "plugin hooks run shell commands at session start with no model in " +
    "the path, so nothing downstream can refuse them. A skill may not ship " +
    "hooks."],
  [".claude-plugin", MANIFEST_COPY],
  [".codex-plugin", MANIFEST_COPY],
]);

const PLUGIN_FILES = new Map<string, string>([
  ["settings.json", "this is a client configuration file, not skill content. " +
    "Installing a skill must not change the host's settings — permissions and " +
    "hooks among them — as a side effect."],
  ["settings.local.json", "this is a client configuration file, not skill " +
    "content. Installing a skill must not change the host's settings — " +
    "permissions and hooks among them — as a side effect."],
  [".lsp.json", "this declares language servers a client launches, so it is a " +
    "command that runs with no model in the path rather than content anybody " +
    "reads."],
  [".mcp.json", SERVER_CONFIG],
  ["mcp.json", SERVER_CONFIG],
]);

/** Why this path, relative to a skill's own folder, is refused, or null.
 *  `where` carries the path itself. */
export function rejectedPluginPath(rel: string): string | null {
  const first = rel.split("/")[0]!;
  return PLUGIN_DIRECTORIES.get(first)
    ?? (rel === first ? PLUGIN_FILES.get(first) ?? null : null);
}

/** What differs between the kinds of listing, and nothing else.
 *
 *  A skill and a plugin share every cap, the suffix allowlist, the UTF-8 rule
 *  and the symlink and nested-git rules — those are about what a reviewer can
 *  read, which does not depend on how many skills the directory holds. What
 *  differs is which paths a client acts on: the plugin-level files it honours,
 *  and where a SKILL.md is a skill rather than a hazard. plugin-core.ts
 *  supplies the plugin's answers; the default is the skill's. */
export interface StructureLayout {
  /** Why this path is refused, or null. */
  rejected(rel: string, kind: Entry["kind"]): string | null;
  /** Why this SKILL.md is refused, or null when the layout expects it. */
  misplacedSkill(rel: string): string | null;
  /** "skill" or "plugin", for the size and count findings. */
  noun: string;
}

/** A skill's own folder: what an author brings to the submission page, and
 *  `skills/{name}/` inside a listing, which singleSkillLayout delegates to
 *  (ADR 0006). One set of rules, so the page refuses what CI will. */
export const SKILL_LAYOUT: StructureLayout = {
  rejected: (rel) => rejectedPluginPath(rel),
  misplacedSkill: (rel) => isLoadableNestedSkill(rel) ? deepSkillMessage(rel) : null,
  noun: "skill",
};

/** The directory a single skill keeps its files in (ADR 0006). */
export const NESTED_SKILLS_DIRECTORY = "skills";

/** The two manifests the registry writes at a single skill's listing root. */
export const GENERATED_SKILL_MANIFESTS = [
  ".codex-plugin/plugin.json", ".claude-plugin/plugin.json",
] as const;

/** A single skill's listing, `skills/{namespace}/{name}/` (ADR 0006): it holds
 *  the generated `.codex-plugin/` and `.claude-plugin/` and `skills/{name}/`,
 *  and nothing else; `skills/{name}/` gets SKILL_LAYOUT. The caps are
 *  checkStructureCore's, over every entry, so they cover the whole listing.
 *
 *  A SKILL.md at the listing root is the flat layout the move retired. No
 *  client loads it, so it is refused with the path it belongs at. */
export function singleSkillLayout(namespace: string, name: string): StructureLayout {
  const inner = `${NESTED_SKILLS_DIRECTORY}/${name}`;
  const generatedDirs = GENERATED_SKILL_MANIFESTS.map((m) => m.split("/")[0]!);

  const rejected = (rel: string, kind: Entry["kind"]): string | null => {
    const parts = rel.split("/");
    const first = parts[0]!;

    if (generatedDirs.includes(first)) {
      if (rel === first || (GENERATED_SKILL_MANIFESTS as readonly string[]).includes(rel)) {
        return null;
      }
      return `only ${first}/plugin.json may appear here, and only because ` +
        `scripts/build_marketplace.py writes it. \`build_marketplace.py --check\` ` +
        `fails any copy it did not write.`;
    }
    if (first === NESTED_SKILLS_DIRECTORY) {
      if (parts.length === 1) return null;
      if (parts[1] !== name || (parts.length === 2 && kind !== "dir")) {
        return `${NESTED_SKILLS_DIRECTORY}/ holds one directory, named after the ` +
          `listing: ${inner}/. Move what is in ${rel} there, or, if this listing ` +
          `has several skills, submit it as a plugin under plugins/.`;
      }
      return parts.length === 2 ? null : SKILL_LAYOUT.rejected(parts.slice(2).join("/"), kind);
    }
    if (rel === "SKILL.md") {
      return `a single skill's files go one level down, in ${inner}/ (ADR 0006), ` +
        `so its SKILL.md belongs at skills/${namespace}/${name}/${inner}/SKILL.md. ` +
        `Move it there with everything else you wrote: no client loads a ` +
        `SKILL.md at the listing root, which holds only the manifests the ` +
        `registry generates.`;
    }
    if (rel === ".mcp.json" || rel === "mcp.json") {
      return `a single skill's listing root holds only generated files, and a ` +
        `skill with an MCP server is a plugin (ADR 0006). Submit it under ` +
        `plugins/, with the server in its mcp.json.`;
    }
    return `a single skill's listing root holds only the generated ` +
      `${generatedDirs.join("/ and ")}/ and ${inner}/. Everything the author ` +
      `writes goes in ${inner}/: move this to ${inner}/${rel}.`;
  };

  const misplacedSkill = (rel: string): string | null => {
    if (!rel.startsWith(`${inner}/`)) return null;  // refused by `rejected`
    // Asked of the inner rules, but reported against the listing's own path.
    return SKILL_LAYOUT.misplacedSkill(rel.slice(inner.length + 1)) === null
      ? null : deepSkillMessage(rel);
  };

  return { rejected, misplacedSkill, noun: "skill" };
}

export function checkStructureCore(
  entries: Entry[], layout: StructureLayout = SKILL_LAYOUT,
): Finding[] {
  const findings: Finding[] = [];
  const reportedDirectories: string[] = [];
  let total = 0;
  let files = 0;

  for (const entry of entries) {
    const rel = entry.path;

    const refused = layout.rejected(rel, entry.kind);
    if (refused) {
      // Once per directory rather than once per file inside it: the finding
      // lands in a pull request comment, and three lines for one mistake is
      // how a comment stops being read. Entries arrive sorted, so the
      // directory precedes its contents — and a caller that passes no
      // directory entries at all still gets the file reported.
      const inside = reportedDirectories.some((dir) => rel.startsWith(`${dir}/`));
      if (entry.kind === "dir" && !inside) reportedDirectories.push(rel);
      if (!inside) findings.push(finding(rel, refused));
      continue;
    }

    if (entry.kind === "symlink") {
      findings.push(finding(rel, "symlinks are not permitted"));
      continue;
    }
    const misplaced = entry.kind === "file" && rel.split("/").pop() === "SKILL.md"
      ? layout.misplacedSkill(rel) : null;
    if (misplaced) {
      findings.push(finding(rel, misplaced));
      continue;
    }
    if (entry.kind === "dir") {
      if (rel.split("/").includes(".git")) {
        findings.push(finding(rel, "nested git repositories are not permitted"));
      }
      continue;
    }

    files += 1;
    total += entry.bytes.length;

    if (entry.bytes.length > MAX_FILE_BYTES) {
      findings.push(finding(rel,
        `${entry.bytes.length} bytes exceeds the ${MAX_FILE_BYTES}-byte file cap`));
    }

    const suffix = extname(rel).toLowerCase();
    if (!ALLOWED_SUFFIXES.has(suffix)) {
      findings.push(finding(rel,
        `'${suffix || rel}' is not an allowed file type. Allowed: ` +
        `${[...ALLOWED_SUFFIXES].sort().join(", ")}`));
      continue;
    }

    // A lenient decoder will happily turn arbitrary bytes into replacement
    // characters, so a strict decode is the only way to catch a binary that
    // happens to carry an allowed extension.
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(entry.bytes);
    } catch {
      findings.push(finding(rel, "not valid UTF-8 text (binaries are not permitted)"));
    }
  }

  if (total > MAX_SKILL_BYTES) {
    findings.push(finding(".",
      `${layout.noun} directory is ${total} bytes, over the ${MAX_SKILL_BYTES}-byte cap`));
  }
  if (files > MAX_FILES_PER_SKILL) {
    findings.push(finding(".",
      `${layout.noun} has ${files} files, over the ${MAX_FILES_PER_SKILL}-file cap`));
  }

  return findings;
}
