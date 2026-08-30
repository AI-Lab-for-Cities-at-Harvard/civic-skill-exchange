/**
 * Filesystem and YAML-safety checks. Node only — the browser never imports this.
 *
 * Everything here needs a directory to look at, which is exactly why it cannot
 * run client-side. The submission form validates frontmatter with rules.ts and
 * says nothing about structure; CI runs both.
 */

import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { parseDocument, isAlias, visit } from "yaml";
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

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/;

const finding = (where: string, message: string): Finding => ({ where, message });

/** Frontmatter must open the file. A `---` further down is a horizontal rule. */
export function splitFrontmatter(text: string): { raw: string | null; body: string } {
  const m = FRONTMATTER_RE.exec(text);
  if (!m) return { raw: null, body: text };
  return { raw: m[1] ?? "", body: text.slice(m[0].length) };
}

/**
 * Reject frontmatter that is oversized or alias-bearing.
 *
 * YAML aliases are the billion-laughs vector. No skill has a legitimate use for
 * them in sixteen kilobytes of frontmatter, so they are rejected outright rather
 * than bounding their expansion.
 */
export function checkYamlSafety(raw: string): Finding[] {
  if (new TextEncoder().encode(raw).length > MAX_FRONTMATTER_BYTES) {
    return [finding("frontmatter", `frontmatter exceeds ${MAX_FRONTMATTER_BYTES} bytes`)];
  }

  const doc = parseDocument(raw, { merge: false });
  if (doc.errors.length > 0) {
    return [finding("frontmatter", `frontmatter is not valid YAML: ${doc.errors[0]?.message}`)];
  }
  if (doc.contents === null) {
    return [finding("frontmatter", "frontmatter is empty")];
  }

  let aliased = false;
  visit(doc, {
    Alias() {
      aliased = true;
      return visit.BREAK;
    },
  });
  if (aliased || (doc.contents !== null && isAlias(doc.contents))) {
    return [finding("frontmatter", "YAML anchors and aliases are not permitted in frontmatter")];
  }

  return [];
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    out.push(join(dir, entry.name));
    if (entry.isDirectory() && !entry.isSymbolicLink()) walk(join(dir, entry.name), out);
  }
  return out;
}

export function checkStructure(skillDir: string): Finding[] {
  const findings: Finding[] = [];
  let total = 0;
  let files = 0;

  for (const path of walk(skillDir).sort()) {
    const rel = relative(skillDir, path);
    const stat = lstatSync(path);

    if (stat.isSymbolicLink()) {
      findings.push(finding(rel, "symlinks are not permitted"));
      continue;
    }
    if (stat.isDirectory()) {
      if (rel.split("/").includes(".git")) {
        findings.push(finding(rel, "nested git repositories are not permitted"));
      }
      continue;
    }

    files += 1;
    total += stat.size;

    if (stat.size > MAX_FILE_BYTES) {
      findings.push(finding(rel, `${stat.size} bytes exceeds the ${MAX_FILE_BYTES}-byte file cap`));
    }

    const suffix = extname(path).toLowerCase();
    if (!ALLOWED_SUFFIXES.has(suffix)) {
      findings.push(finding(rel,
        `'${suffix || rel}' is not an allowed file type. Allowed: ` +
        `${[...ALLOWED_SUFFIXES].sort().join(", ")}`));
      continue;
    }

    // Node's utf8 decoder is lenient, so a strict decode is the only way to catch
    // a binary that happens to carry an allowed extension.
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path));
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
