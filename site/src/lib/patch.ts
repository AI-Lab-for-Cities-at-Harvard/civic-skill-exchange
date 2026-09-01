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
import { checkYamlSafety } from "@civic-skill-exchange/validator";

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

/** `civic.*` lives under `metadata:`; everything else is a top-level key. The
 *  dot is part of the key, not a path separator, so it is passed whole. */
const pathOf = (key: string): string[] =>
  key.startsWith("civic.") ? ["metadata", key] : [key];

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
      problems: ["This file does not start with a --- block, so there is nothing to amend."],
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
      problems: [`The --- block is not valid YAML: ${doc.errors[0]?.message}`],
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
 *  Line-level and deliberately crude. This is a "here is what changed" display,
 *  not a diff engine, and the frontmatter it compares is one key per line.
 */
export function addedFrontmatterLines(original: string, patched: string): string[] {
  const front = (text: string) => {
    const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
    return (m?.[1] ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  };
  const before = new Set(front(original));
  return front(patched).filter((line) => !before.has(line));
}
