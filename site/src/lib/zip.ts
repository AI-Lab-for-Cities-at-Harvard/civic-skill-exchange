/** Reading a submitted skill archive, entirely in the browser.
 *
 *  No server receives the file. It is unpacked in memory and never written to
 *  disk, which is what takes zip-slip off the table: it is a
 *  path-traversal-on-write attack, and there is no write. The path checks below
 *  are still here for two other reasons — a malformed path must not reach
 *  checkStructureCore looking like a real file, and the submitter is better off
 *  told their archive is wrong than silently having entries dropped.
 *
 *  Decompression bombs are handled by refusing on the *declared* size, which
 *  fflate exposes before inflating. Actual sizes are re-checked afterwards,
 *  because a local header can lie.
 *
 *  The shape follows what scripts/build_index.py's write_archive() emits: one
 *  root directory named for the skill. Dropping a published zip back on the
 *  page is the round-trip.
 */

import { unzipSync } from "fflate";
import {
  MAX_FILE_BYTES, MAX_SKILL_BYTES, isRepositoryFurniture, type Entry,
} from "@civic-skill-exchange/validator";

export interface SkillArchive {
  entries: Entry[];
  /** The stripped root directory, when there was one. checkFrontmatter compares
   *  it against `name`, which is a check the form alone cannot make. */
  directoryName?: string;
  /** Raw SKILL.md text, for the frontmatter rules. Null when absent. */
  skillMd: string | null;
  /** Anything refused, in the submitter's terms. */
  problems: string[];
}

const unsafe = (path: string) =>
  path.startsWith("/") ||
  path.includes("\\") ||
  path.split("/").some((seg) => seg === ".." || seg === ".");

/** A single root directory, if every entry shares one. The published archive
 *  has one; a zip made by selecting the files inside a folder does not. */
function commonRoot(paths: string[]): string | undefined {
  const first = paths[0]?.split("/")[0];
  if (!first || paths.length === 0) return undefined;
  const allShare = paths.every((p) => p.startsWith(`${first}/`));
  return allShare ? first : undefined;
}

export function readSkillZip(bytes: Uint8Array): SkillArchive {
  const problems: string[] = [];
  let declaredTotal = 0;
  let overBudget = false;

  const unpacked = unzipSync(bytes, {
    filter: (file) => {
      if (file.name.endsWith("/")) return false; // directory records carry no bytes
      if (unsafe(file.name)) {
        problems.push(`${file.name} — path escapes the skill directory, so it was skipped.`);
        return false;
      }
      if (file.originalSize && file.originalSize > MAX_FILE_BYTES) {
        problems.push(
          `${file.name} — too large at ${Math.round(file.originalSize / 1024)} KB. ` +
          `The cap is ${MAX_FILE_BYTES / 1024} KB per file.`);
        return false;
      }
      declaredTotal += file.originalSize ?? 0;
      if (declaredTotal > MAX_SKILL_BYTES) {
        // Refused before inflating, which is the point — the declared size is
        // the only thing a bomb cannot lie its way past cheaply.
        if (!overBudget) {
          problems.push(
            `The archive declares more than ${MAX_SKILL_BYTES / (1024 * 1024)} MB ` +
            `uncompressed, which is over the cap for a whole skill.`);
          overBudget = true;
        }
        return false;
      }
      return true;
    },
  });

  const names = Object.keys(unpacked);
  const root = commonRoot(names);
  const strip = (p: string) => (root ? p.slice(root.length + 1) : p);

  const entries: Entry[] = [];
  let actualTotal = 0;
  for (const name of names) {
    const bytes = unpacked[name];
    if (!bytes) continue;
    actualTotal += bytes.length;
    if (bytes.length > MAX_FILE_BYTES || actualTotal > MAX_SKILL_BYTES) {
      // The local header understated the entry. Nothing was written anywhere,
      // but the archive is not what it claimed to be and should not be trusted.
      problems.push(`${name} — unpacked larger than the archive declared. Skipped.`);
      continue;
    }
    const path = strip(name);
    if (isRepositoryFurniture(path)) {
      // A zip downloaded straight from GitHub carries the repository's own
      // files. Same reasoning as the import path.
      problems.push(`${path} — belongs to the repository, not the skill. Left out.`);
      continue;
    }
    entries.push({ path, kind: "file", bytes });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));

  const skill = entries.find((e) => e.path === "SKILL.md");
  const skillMd = skill && skill.kind === "file"
    ? new TextDecoder().decode(skill.bytes)
    : null;
  if (!skillMd) {
    problems.push(
      "No SKILL.md at the root of the archive. A skill is a directory with " +
      "SKILL.md at its top level.");
  }

  return { entries, directoryName: root, skillMd, problems };
}
