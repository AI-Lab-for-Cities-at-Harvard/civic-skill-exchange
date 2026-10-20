/** Writing the registry's fields into a SKILL.md somebody else wrote.
 *
 *  The submission page used to build a replacement file out of form values,
 *  which is how a skill's body and every file beside it came to be dropped on
 *  the way to GitHub. #24 had already said what to do instead — "take their
 *  existing SKILL.md and have the tool write the civic.* block into it,
 *  preserving whatever is already there" — and this is that.
 *
 *  Editing rather than re-emitting is also the only way to keep what the
 *  registry has no opinion about: comments, key order, and whether someone
 *  wrote a description as a quoted scalar or a folded block. `parseDocument`
 *  keeps all of it across a round trip, which a parse-and-rebuild cannot.
 *
 *  A file with nothing to change comes back identical, by returning the
 *  original string rather than a re-emitted copy of it.
 */

import { parseDocument, isMap } from "yaml";
import { checkYamlSafety } from "@civic-skill-exchange/validator/yaml-safety";
import { strings } from "../i18n/strings";
import { inMetadata } from "./submit";

/** The same rule as the validator's `splitFrontmatter` — frontmatter opens the
 *  file, and a `---` further down is a horizontal rule — but it consumes
 *  exactly one line ending after the closing fence.
 *
 *  The validator's version ends `---\s*(?:\n|$)`, and `\s*` spans newlines, so
 *  it swallows the blank line that conventionally follows frontmatter. That is
 *  harmless when the body is only being read. Here the body is written back
 *  out, and a swallowed blank line is a diff the submitter did not make. */
const FENCE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export interface PatchedSkill {
  /** The submitter's file, amended. Unchanged when something stopped the edit. */
  skillMd: string;
  /** Registry fields the file already carried, so the form can stop asking for
   *  them. `civic.*` keys are reported by their full name. */
  present: string[];
  /** Anything that stopped the edit, in the submitter's terms. */
  problems: string[];
}

/** `civic.*` and `version` live under `metadata:`; everything else is a
 *  top-level key. The dot is part of the key, not a path separator, so it is
 *  passed whole. A legacy top-level `version` is never read or written here. */
const pathOf = (key: string): string[] =>
  inMetadata(key) ? ["metadata", key] : [key];

function keysIn(doc: ReturnType<typeof parseDocument>): string[] {
  const out: string[] = [];
  const root = doc.contents;
  if (!isMap(root)) return out;
  for (const item of root.items) {
    const key = String(item.key);
    out.push(key);
    if (key === "metadata" && isMap(item.value)) {
      for (const meta of item.value.items) out.push(String(meta.key));
    }
  }
  return out;
}

export function patchSkillMd(
  source: string,
  fields: Record<string, string>,
): PatchedSkill {
  const fence = FENCE.exec(source);
  const raw = fence?.[1] ?? null;
  const body = fence ? source.slice(fence[0].length) : source;
  if (raw === null) {
    return {
      skillMd: source, present: [],
      problems: [strings().submit.problems.noFrontmatterToAmend],
    };
  }

  // The same gate the paste box applies. A submitted file is untrusted input
  // even though it never leaves the browser — a billion-laughs payload would
  // hang the submitter's own tab.
  const unsafe = checkYamlSafety(raw);
  if (unsafe.length) return { skillMd: source, present: [], problems: unsafe.map((f) => f.message) };

  const doc = parseDocument(raw, { merge: false });
  if (doc.errors.length > 0) {
    return {
      skillMd: source, present: [],
      problems: [strings().submit.problems.invalidYaml(doc.errors[0]?.message ?? "")],
    };
  }

  const present = keysIn(doc);

  let changed = false;
  for (const [key, value] of Object.entries(fields)) {
    const path = pathOf(key);
    const wanted = value.trim();
    const current = doc.getIn(path);
    const currentText = current == null ? "" : String(current);
    if (wanted === currentText) continue;
    if (wanted === "") {
      // Cleared in the form means removed from the file. An empty string is a
      // value, and the schema treats present-but-blank differently from absent.
      if (current != null) { doc.deleteIn(path); changed = true; }
      continue;
    }
    doc.setIn(path, wanted);
    changed = true;
  }

  if (!changed) return { skillMd: source, present, problems: [] };

  // Clearing the last civic.* field should not leave `metadata:` behind with
  // nothing under it.
  const meta = doc.get("metadata");
  if (isMap(meta) && meta.items.length === 0) doc.delete("metadata");

  // lineWidth 0 disables folding. Without it a long description that arrived on
  // one line comes back wrapped, which is a diff the submitter did not make.
  const emitted = doc.toString({ lineWidth: 0 });
  return { skillMd: `---\n${emitted}---\n${body}`, present, problems: [] };
}

/** The frontmatter lines the patch introduced or changed.
 *
 *  #82: the corrected SKILL.md lives only inside the download, so a submitter
 *  who drags their original folder loses everything they typed — silently. The
 *  page knows both texts, so it can show what the download is *for* rather than
 *  asserting that it matters.
 *
 *  Counts what changed in meaning (#302, S-14). A description re-folded onto
 *  one line, or a value that lost its quotes, is a different line and the same
 *  value, and listing it made "what we added" bigger than what was added. So
 *  the frontmatter is cut into one chunk per key (and per key under
 *  `metadata:`), a chunk counts only if its parsed value differs, and within a
 *  changed chunk the lines are the ones the original did not already have.
 *
 *  Crude on purpose. This is a "here is what changed" display, not a diff
 *  engine; if either side cannot be parsed it falls back to comparing lines.
 */
export function addedFrontmatterLines(original: string, patched: string): string[] {
  const front = (text: string) => FENCE.exec(text)?.[1] ?? "";
  const before = new Set(front(original).split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  const fresh = (chunk: string[]) =>
    chunk.map((l) => l.trim()).filter((l) => l && !before.has(l));

  const was = valuesOf(front(original));
  const now = valuesOf(front(patched));
  if (!was || !now) return fresh(front(patched).split(/\r?\n/));

  const out: string[] = [];
  for (const { path, lines } of chunksOf(front(patched))) {
    if (path in was && JSON.stringify(was[path]) === JSON.stringify(now[path])) continue;
    out.push(...fresh(lines));
  }
  return out;
}

/** Parsed value at each key path: `name`, `metadata` (its map, whole) and
 *  `metadata/civic.scope`. Null when the text is not valid YAML. */
function valuesOf(raw: string): Record<string, unknown> | null {
  const doc = parseDocument(raw, { merge: false });
  if (doc.errors.length > 0) return null;
  const root: unknown = doc.toJS();
  if (root === null) return {};
  if (typeof root !== "object" || Array.isArray(root)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(root as Record<string, unknown>)) {
    out[k] = v;
    if (k === "metadata" && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [mk, mv] of Object.entries(v as Record<string, unknown>)) {
        out[`metadata/${mk}`] = mv;
      }
    }
  }
  return out;
}

const unquote = (key: string) => key.replace(/^["']|["']$/g, "");

/** The text cut at each key: a line that starts in column 0 opens a chunk, and
 *  so does each child of `metadata:` at its first child's indent. `metadata:`
 *  itself is the chunk named `metadata` and holds only its own line. */
function chunksOf(raw: string): { path: string; lines: string[] }[] {
  const out: { path: string; lines: string[] }[] = [];
  let top = "";
  let childIndent: number | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const key = /^([^\s#-][^:]*?):(?:\s|$)/.exec(line)?.[1];
    if (key !== undefined) {
      top = unquote(key);
      childIndent = null;
      out.push({ path: top, lines: [line] });
      continue;
    }
    if (top === "metadata") {
      const m = /^(\s+)([^\s#-][^:]*?):(?:\s|$)/.exec(line);
      if (m && (childIndent === null || m[1]!.length === childIndent)) {
        childIndent = m[1]!.length;
        out.push({ path: `metadata/${unquote(m[2]!)}`, lines: [line] });
        continue;
      }
    }
    out.at(-1)?.lines.push(line);
  }
  return out;
}
