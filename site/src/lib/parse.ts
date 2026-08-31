/** Reading an existing SKILL.md back into the form.
 *
 *  Somebody who already has a skill should not retype it. Pasting the file, or
 *  dropping the archive it lives in, fills the form — so the builder below is
 *  for people starting from nothing, and everyone else skips it.
 */

import { parse } from "yaml";
import { splitFrontmatter, checkYamlSafety } from "@civic-skill-exchange/validator";
import { EMPTY_DRAFT, type Draft } from "./submit";

const text = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

export interface ParsedSkill {
  draft: Draft;
  /** Anything that stopped the file being read. Empty when it parsed. */
  problems: string[];
}

export function draftFromSkillMd(source: string, author = ""): ParsedSkill {
  const { raw } = splitFrontmatter(source);
  if (raw === null) {
    return {
      draft: { ...EMPTY_DRAFT, author },
      problems: ["This does not start with a --- block, so there is nothing to read yet."],
    };
  }

  // The same alias and size rules CI applies. A pasted file is untrusted input
  // even though it never leaves the browser: a billion-laughs payload would
  // hang the submitter's own tab.
  const unsafe = checkYamlSafety(raw);
  if (unsafe.length) return { draft: { ...EMPTY_DRAFT, author }, problems: unsafe.map((f) => f.message) };

  let doc: unknown;
  try {
    doc = parse(raw, { merge: false });
  } catch (e) {
    return { draft: { ...EMPTY_DRAFT, author }, problems: [String(e)] };
  }
  if (!doc || typeof doc !== "object") {
    return { draft: { ...EMPTY_DRAFT, author }, problems: ["The --- block is empty."] };
  }

  const front = doc as Record<string, unknown>;
  const meta = (front.metadata ?? {}) as Record<string, unknown>;

  return {
    problems: [],
    draft: {
      ...EMPTY_DRAFT,
      author,
      name: text(front.name),
      description: text(front.description),
      license: text(front.license) || EMPTY_DRAFT.license,
      compatibility: text(front.compatibility),
      tools: Array.isArray(front["allowed-tools"])
        ? front["allowed-tools"].map(text).join(", ")
        : text(front["allowed-tools"]),
      category: text(meta["civic.category"]),
      jurisdiction: text(meta["civic.jurisdiction"]),
      localization: text(meta["civic.localization"]),
      dataSensitivity: text(meta["civic.data-sensitivity"]) || EMPTY_DRAFT.dataSensitivity,
      humanReview: text(meta["civic.human-review"]) || EMPTY_DRAFT.humanReview,
      useWhen: text(meta["civic.use-when"]),
      avoidWhen: text(meta["civic.avoid-when"]),
      maintainer: text(meta["civic.maintainer"]),
      contact: text(meta["civic.contact"]),
      affiliation: text(meta["civic.affiliation"]),
      deployment: text(meta["civic.deployment"]) || EMPTY_DRAFT.deployment,
      deployedAt: text(meta["civic.deployed-at"]),
      deployedIn: text(meta["civic.deployed-in"]),
      deployedSince: text(meta["civic.deployed-since"]),
      sourceRepo: text(meta["civic.source-repo"]),
      sourceCommit: text(meta["civic.source-commit"]),
    },
  };
}
