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

/** Directories under a skill that hold documentation rather than a loadable
 *  skill. The Agent Skills specification puts templates and reference material
 *  here, and no client loads a skill from either — which is the line between a
 *  second SKILL.md that is a hazard and one that is an example.
 *
 *  Exported because layout.ts draws the same line for changed paths, and two
 *  copies of a rule is how one of them goes stale. */
export const DOC_DIRECTORIES = ["references", "assets"] as const;

/** A SKILL.md below the skill root that a client would load.
 *
 *  One directory is one skill. That became load-bearing rather than
 *  conventional with #73, whose marketplace generator emits one plugin per
 *  directory on exactly that assumption: a nested SKILL.md indexed as an
 *  ordinary file, stayed invisible to search and the detail page, and installed
 *  as a plugin whose nested skill a client would pick up. The site and the
 *  client disagreeing about what a listing contains, with nothing saying so, is
 *  the wrong way to fail (#78). */
export function isLoadableNestedSkill(rel: string): boolean {
  if (rel === "SKILL.md" || !rel.endsWith("/SKILL.md")) return false;
  const first = rel.split("/")[0]!;
  return !DOC_DIRECTORIES.includes(first as never);
}

/** Plugin-level files a client acts on, which a skill may not ship (#151).
 *
 *  `build_marketplace.py` makes the skill directory the Claude plugin root, so
 *  anything here is honoured on `/plugin install` — and honoured by code, not
 *  by a model. `hooks/hooks.json` is the sharp end: it runs shell commands at
 *  session start with nothing between the install and the command, which is the
 *  class SECURITY.md §3 says an LLM cannot gate. Every one of these carries an
 *  allowlisted suffix, so before this rule they passed L0 unremarked.
 *
 *  Keyed on the first path segment, because the plugin root is the skill
 *  directory: a copy under `references/` or `assets/` is documentation and no
 *  client loads it, the same line `isLoadableNestedSkill` already draws.
 *
 *  `.mcp.json` is deliberately absent. An MCP server can be genuinely useful to
 *  a skill, so the ruling on #151 keeps it and treats it as executed instead:
 *  `build_index.py` publishes it beside `scripts/`, and `scan.py` reads the
 *  commands it launches.
 */
const PLUGIN_DIRECTORIES = new Map<string, string>([
  ["hooks", "plugin hooks run shell commands at session start with no model in " +
    "the path, so nothing downstream can refuse them — the skill directory is " +
    "the plugin root, and a client would run these on install. A skill may not " +
    "ship hooks."],
  [".claude-plugin", "the registry generates this directory from the listing " +
    "itself, so an author's copy would shadow it and describe the plugin as " +
    "something other than what the catalogue shows. Only " +
    ".claude-plugin/plugin.json may appear here, and only because " +
    "scripts/build_marketplace.py writes it: " +
    "`build_marketplace.py --check` fails any pull request whose copy " +
    "differs from what the generator produces, so inline hooks or MCP " +
    "servers cannot be smuggled through it."],
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
]);

/** The one path under `.claude-plugin/` a skill directory may carry (#183).
 *
 *  `scripts/build_marketplace.py` writes this file into every listed skill, so
 *  refusing it would fail the whole registry. It is safe to allow for the
 *  reason the rest of the directory is not: the generator produces it, and
 *  `build_marketplace.py --check` compares the committed copy against what the
 *  generator produces. That step is blocking — validate.yml runs it on every
 *  pull request that touches `skills/`, and nothing repairs a stale copy after
 *  a merge (#170). So a manifest carrying inline `hooks` or `mcpServers` fails
 *  the pull request rather than reaching a client: an author cannot smuggle
 *  anything through a file whose exact bytes are derived from their SKILL.md.
 *
 *  Anything else under `.claude-plugin/` is still refused. The directory is
 *  where a client looks for the plugin's own manifest, and #151's reason — an
 *  author's copy shadowing the registry's — holds for every path in it but
 *  this one. */
const CLAUDE_PLUGIN_DIRECTORY = ".claude-plugin";
export const GENERATED_PLUGIN_MANIFEST = `${CLAUDE_PLUGIN_DIRECTORY}/plugin.json`;

/** Why this path is refused, or null. `where` carries the path itself. */
export function rejectedPluginPath(rel: string): string | null {
  const first = rel.split("/")[0]!;
  // The directory entry itself passes too: the walk emits it alongside the
  // generated manifest, and reporting it would fail every listing.
  if (first === CLAUDE_PLUGIN_DIRECTORY &&
      (rel === CLAUDE_PLUGIN_DIRECTORY || rel === GENERATED_PLUGIN_MANIFEST)) {
    return null;
  }
  return PLUGIN_DIRECTORIES.get(first)
    ?? (rel === first ? PLUGIN_FILES.get(first) ?? null : null);
}

export function checkStructureCore(entries: Entry[]): Finding[] {
  const findings: Finding[] = [];
  const reportedDirectories = new Set<string>();
  let total = 0;
  let files = 0;

  for (const entry of entries) {
    const rel = entry.path;

    const plugin = rejectedPluginPath(rel);
    if (plugin) {
      // Once per directory rather than once per file inside it: the finding
      // lands in a pull request comment, and three lines for one mistake is
      // how a comment stops being read. Entries arrive sorted, so the
      // directory precedes its contents — and a caller that passes no
      // directory entries at all still gets the file reported.
      const first = rel.split("/")[0]!;
      if (entry.kind === "dir" && rel === first) reportedDirectories.add(rel);
      if (!(rel !== first && reportedDirectories.has(first))) {
        findings.push(finding(rel, plugin));
      }
      continue;
    }

    if (entry.kind === "symlink") {
      findings.push(finding(rel, "symlinks are not permitted"));
      continue;
    }
    if (entry.kind === "file" && isLoadableNestedSkill(rel)) {
      findings.push(finding(rel,
        `${rel} is a second SKILL.md, and one directory is one skill. A client ` +
        `installing this would load it as a skill of its own, while the ` +
        `registry indexes it as an ordinary file — so the catalogue and the ` +
        `agent would disagree about what this listing contains. Split it into ` +
        `its own directory under skills/, or move it to ` +
        `${DOC_DIRECTORIES.join("/ or ")}/ if it is an example rather than a skill.`));
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
      `skill directory is ${total} bytes, over the ${MAX_SKILL_BYTES}-byte cap`));
  }
  if (files > MAX_FILES_PER_SKILL) {
    findings.push(finding(".", `skill has ${files} files, over the ${MAX_FILES_PER_SKILL}-file cap`));
  }

  return findings;
}
