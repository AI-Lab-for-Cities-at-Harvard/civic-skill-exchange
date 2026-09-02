/**
 * The two questions no scanner can answer: what data a skill touches, and
 * whether its output affects anyone's rights or benefits. Nothing derives them
 * — only the author knows — so both intake routes have to ask them, and asking
 * them differently is how the same skill gets two different answers.
 *
 * The submission form asks them. So does
 * skills/civic-skills/submit-a-skill, which runs inside a coding agent and
 * cannot import this module (#10). Its SKILL.md therefore carries the words,
 * and this test makes any disagreement a build failure — the same arrangement
 * as labels.test.ts and the category vocabulary.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { JUDGMENT_QUESTIONS } from "./labels";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Line wrapping is the skill file's own business; the words are not. */
const skillMd = readFileSync(
  join(ROOT, "skills", "civic-skills", "submit-a-skill", "SKILL.md"), "utf8",
).replace(/\s+/g, " ");

const entries = Object.entries(JUDGMENT_QUESTIONS);

describe("the judgment questions are asked in the same words everywhere", () => {
  it("covers both fields and no others", () => {
    expect(entries.map(([key]) => key)).toEqual([
      "civic.data-sensitivity", "civic.human-review",
    ]);
  });

  it.each(entries)("%s asks the form's question in the skill too", (_key, field) => {
    expect(skillMd).toContain(field.question);
  });

  it.each(entries.flatMap(([key, field]) =>
    field.options.map(([value, label]) => [`${key}: ${value}`, label] as const),
  ))("%s offers the form's wording in the skill too", (_id, label) => {
    expect(skillMd).toContain(label);
  });
});
