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
import type { Entry } from "@civic-skill-exchange/validator";
import { MAX_FILE_BYTES, MAX_SKILL_BYTES, isRepositoryFurniture } from "@civic-skill-exchange/validator/structure-core";
import { strings } from "../i18n/strings";

export interface SkillArchive {
  entries: Entry[];
  /** A root plugin.json: the folder is a plugin, not a skill (#213, ruling 1). */
  plugin: boolean;
  /** A Claude Code package — `.claude-plugin/plugin.json` and no root
   *  plugin.json. Not a listing the exchange reads yet, and worth telling the
   *  submitter apart from "no SKILL.md". */
  clientPackage: boolean;
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

/** Finder's resource-fork shadows. A zip made with macOS's Compress carries a
 *  `__MACOSX/` copy of every file, which would otherwise hide the wrapper
 *  folder and arrive as `._SKILL.md` files the checks refuse. */
const isFinderJunk = (path: string) =>
  path.startsWith("__MACOSX/") || path.split("/").pop() === ".DS_Store";

/** What marks a plugin: the validator's PLUGIN_MANIFEST, spelled out here
 *  because importing it pulls the whole of plugin-core into the entry chunk,
 *  and the plugin form that needs the rest loads separately (#213). zip.test.ts
 *  holds the two equal. */
export const PLUGIN_ROOT_MANIFEST = "plugin.json";

/** What the registry writes into a plugin for each client (ADR 0005), and what
 *  Codex reads instead of plugin.json. A copy in the submitter's folder is
 *  theirs, not the generator's, and #231's check would refuse it. */
export const CLIENT_FILES = /^(?:\.claude-plugin\/|\.codex-plugin\/|\.mcp\.json$)/;

/** A single root directory, if every entry shares one. The published archive
 *  has one; a zip made by selecting the files inside a folder does not. */
function commonRoot(paths: string[]): string | undefined {
  const first = paths[0]?.split("/")[0];
  if (!first || paths.length === 0) return undefined;
  const allShare = paths.every((p) => p.startsWith(`${first}/`));
  return allShare ? first : undefined;
}

export function readSkillZip(bytes: Uint8Array): SkillArchive {
  // What a submitter is told was left out, in their language (#149).
  const say = strings().submit.problems;
  const problems: string[] = [];
  let declaredTotal = 0;
  let overBudget = false;

  const unpacked = unzipSync(bytes, {
    filter: (file) => {
      if (file.name.endsWith("/")) return false; // directory records carry no bytes
      if (unsafe(file.name)) {
        problems.push(say.pathEscape(file.name));
        return false;
      }
      if (file.originalSize && file.originalSize > MAX_FILE_BYTES) {
        problems.push(say.fileTooBig(
          file.name,
          Math.round(file.originalSize / 1024),
          MAX_FILE_BYTES / 1024,
        ));
        return false;
      }
      declaredTotal += file.originalSize ?? 0;
      if (declaredTotal > MAX_SKILL_BYTES) {
        // Refused before inflating, which is the point — the declared size is
        // the only thing a bomb cannot lie its way past cheaply.
        if (!overBudget) {
          problems.push(say.archiveTooBig(MAX_SKILL_BYTES / (1024 * 1024)));
          overBudget = true;
        }
        return false;
      }
      return true;
    },
  });

  const names = Object.keys(unpacked).filter((n) => !isFinderJunk(n));
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

  const plugin = entries.some((e) => e.path === PLUGIN_ROOT_MANIFEST);
  // Only without a SKILL.md: every skill the registry lists carries a
  // generated .claude-plugin/plugin.json, and dropping one back is a skill.
  const clientPackage = !plugin &&
    !entries.some((e) => e.path === "SKILL.md") &&
    entries.some((e) => e.path === ".claude-plugin/plugin.json");
  const kept = plugin
    ? entries.filter((e) => {
      if (!CLIENT_FILES.test(e.path)) return true;
      problems.push(say.clientFileLeftOut(e.path));
      return false;
    })
    : entries;

  const skill = kept.find((e) => e.path === "SKILL.md");
  const skillMd = skill && skill.kind === "file"
    ? new TextDecoder().decode(skill.bytes)
    : null;
  if (!skillMd && !plugin && !clientPackage) problems.push(say.noSkillMdInZip);

  return { entries: kept, plugin, clientPackage, directoryName: root, skillMd, problems };
}
