/** Handing the corrected skill folder back to the submitter.
 *
 *  GitHub's upload page takes a dragged folder and keeps its subdirectories, so
 *  this is the whole of the manual path: the submitter downloads what the page
 *  built, drags it in, and every file arrives where it belongs. Handing back a
 *  lone SKILL.md would be lighter for someone who still has the folder on disk,
 *  but it does not work for a skill read out of a repository, and it asks the
 *  submitter to find and replace a file.
 *
 *  Rooted at one directory named for the skill, which is the shape
 *  write_archive() publishes and the shape readSkillZip() reads — so the output
 *  of this can be dropped back on the page.
 */

import { zipSync } from "fflate";
import type { Entry } from "@civic-skill-exchange/validator";

/** The entries as read, with each path in `replacements` holding the amended
 *  text instead. Everything else is copied byte for byte — the page has no
 *  business rewriting a script. A replacement for a path the entries lack is
 *  added, so a patched file reaches the submitter even if the original was
 *  filtered out. */
export function buildFolderZip(
  entries: Entry[],
  directoryName: string,
  replacements: Record<string, string>,
): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries) {
    if (entry.kind !== "file") continue;
    const replaced = replacements[entry.path];
    files[`${directoryName}/${entry.path}`] =
      replaced === undefined ? entry.bytes : new TextEncoder().encode(replaced);
  }
  for (const [path, text] of Object.entries(replacements)) {
    files[`${directoryName}/${path}`] ??= new TextEncoder().encode(text);
  }
  return zipSync(files);
}

/** A skill: the same, with SKILL.md the one file amended. A plugin goes
 *  through buildFolderZip directly and gains no root SKILL.md (#213). */
export function buildSkillZip(
  entries: Entry[],
  directoryName: string,
  skillMd: string,
): Uint8Array {
  return buildFolderZip(entries, directoryName, { "SKILL.md": skillMd });
}
