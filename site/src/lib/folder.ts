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

/** The entries as read, with SKILL.md replaced by the amended text. Everything
 *  else is copied byte for byte — the page has no business rewriting a script. */
export function buildSkillZip(
  entries: Entry[],
  directoryName: string,
  skillMd: string,
): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries) {
    if (entry.kind !== "file") continue;
    files[`${directoryName}/${entry.path}`] =
      entry.path === "SKILL.md" ? new TextEncoder().encode(skillMd) : entry.bytes;
  }
  // A skill read from a repository whose SKILL.md was filtered out still gets
  // one, because the patched text is what the submitter is being handed.
  files[`${directoryName}/SKILL.md`] ??= new TextEncoder().encode(skillMd);
  return zipSync(files);
}
