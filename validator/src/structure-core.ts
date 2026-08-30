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

/** Caps. A skill is instructions and small helpers; anything larger is a project. */
export const MAX_FILE_BYTES = 100 * 1024;
export const MAX_SKILL_BYTES = 1024 * 1024;
export const MAX_FRONTMATTER_BYTES = 16 * 1024;
export const MAX_FILES_PER_SKILL = 60;

/** Allowlist, not a denylist. A denylist of binary types is always incomplete. */
export const ALLOWED_SUFFIXES = new Set([
  ".md", ".txt", ".yml", ".yaml", ".json", ".toml", ".csv", ".tsv",
  ".py", ".sh", ".bash", ".js", ".mjs", ".ts", ".sql", ".jinja", ".j2",
  ".html", ".css", ".xml", ".ini", ".cfg",
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

export function checkStructureCore(entries: Entry[]): Finding[] {
  const findings: Finding[] = [];
  let total = 0;
  let files = 0;

  for (const entry of entries) {
    const rel = entry.path;

    if (entry.kind === "symlink") {
      findings.push(finding(rel, "symlinks are not permitted"));
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
