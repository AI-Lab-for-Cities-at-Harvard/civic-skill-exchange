/**
 * Turning a skill directory into entries, then applying the shared rules.
 *
 * This module is the only part of structural validation that needs Node. It
 * walks the tree, classifies each path, reads bytes, and hands the result to
 * structure-core.ts — which holds the rules and runs anywhere.
 *
 * The boundary is *entry-producing vs. pure*, not "structure vs. frontmatter".
 * Anything that can describe a skill as a list of entries — a checked-out
 * directory here, an archive opened somewhere else — gets the same answers from
 * the same code. A caller that assembles entries by other means must also run
 * checkPathSafety, which guards against paths a filesystem walk cannot produce.
 */

import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join, relative } from "node:path";
import { checkStructureCore, type Entry } from "./structure-core";
import type { Finding } from "./types";

export {
  MAX_FILE_BYTES, MAX_SKILL_BYTES, MAX_FRONTMATTER_BYTES, MAX_FILES_PER_SKILL,
  ALLOWED_SUFFIXES, splitFrontmatter, checkPathSafety, checkStructureCore,
  type Entry,
} from "./structure-core";
export { checkYamlSafety } from "./yaml-safety";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    out.push(join(dir, entry.name));
    if (entry.isDirectory() && !entry.isSymbolicLink()) walk(join(dir, entry.name), out);
  }
  return out;
}

/** Sorted, because the order findings appear in is the order somebody reads
 *  them in a pull request comment. */
export function readEntries(skillDir: string): Entry[] {
  return walk(skillDir).sort().map((path): Entry => {
    const rel = relative(skillDir, path);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) return { path: rel, kind: "symlink" };
    if (stat.isDirectory()) return { path: rel, kind: "dir" };
    return { path: rel, kind: "file", bytes: readFileSync(path) };
  });
}

export function checkStructure(skillDir: string): Finding[] {
  return checkStructureCore(readEntries(skillDir));
}
