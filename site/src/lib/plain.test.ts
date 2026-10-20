/** Every finding the submission page can show, read as a submitter reads it
 *  (#295, S-3). The validator writes for a reviewer reading a diff — it names
 *  `civic.*` keys and quotes YAML values — and the page has to say the same
 *  thing in its own terms.
 *
 *  The corpus below is built from drafts, run through the same rules the page
 *  runs, so a rule added to the validator is scanned the moment a draft
 *  triggers it. A test that listed messages would go stale the day one changed.
 */

import { describe, it, expect } from "vitest";
import { checkFrontmatter, SCOPES, SENSITIVITIES, HUMAN_REVIEW, AFFILIATIONS,
  DEPLOYMENTS, LOCALIZATIONS } from "@civic-skill-exchange/validator/rules";
import { EMPTY_DRAFT, toFrontmatter, type Draft } from "./submit";
import { plainMessage, fieldKey } from "./plain";
import { en } from "../i18n/en";
import { strings as es } from "../i18n/es";

const GOOD: Draft = {
  ...EMPTY_DRAFT,
  author: "cityofx", name: "permit-status-explainer",
  description: "Explains why a building permit is stuck, in plain language.",
  license: "MIT", category: "policy", scope: "municipal", language: "en",
  dataSensitivity: "none", humanReview: "advisory-only", maintainer: "Test Suite",
  affiliation: "individual", deployment: "personal",
};

/** One draft per rule the form can trip, each changing little from a good one. */
const BAD: Partial<Draft>[] = [
  {}, // a good draft, which must say nothing at all
  ...Object.keys(GOOD).filter((k) => GOOD[k as keyof Draft] !== "")
    .map((k) => ({ [k]: "" })), // each answer missing in turn
  { deployment: "team" }, { deployment: "organization" },
  { deployment: "none", deployedAt: "City of X" },
  { deployment: "none", deployedIn: "US-MA" },
  { localization: "generalized", jurisdiction: "US-VT" },
  { scope: "any", jurisdiction: "US-VT" },
  { jurisdiction: "nowhere in particular" },
  { scopeSecondary: "municipal" },
  { scope: "any", scopeSecondary: "state" },
  { scope: "municipal", scopeSecondary: "state" },
  { categorySecondary: "policy" }, { categorySecondary: "bogus" }, { category: "bogus" },
  { dataSensitivity: "bogus" }, { humanReview: "bogus" }, { affiliation: "bogus" },
  { deployment: "bogus" }, { localization: "bogus" }, { scope: "bogus" },
  { language: "English" }, { languagesTested: "es" }, { languagesTested: "en;es" },
  { modelsTested: ",," }, { useWhen: "x".repeat(500) }, { avoidWhen: "x".repeat(500) },
  { version: "v1" }, { deployedIn: "x" }, { deployedSince: "last year" },
  { tools: "Bash" }, { name: "Bad Name" }, { description: "too short" },
  { sourceRepo: "https://example.org/x" }, { sourceCommit: "abc" },
  { deployment: "team", deployedAt: "City of X", deployedIn: "nope", deployedSince: "x" },
];

const CATEGORIES = Object.keys(en.vocabulary.category);

function everyFinding() {
  const out: { where: string; message: string }[] = [];
  for (const over of BAD) {
    const draft = { ...GOOD, ...over };
    out.push(...checkFrontmatter(toFrontmatter(draft), {
      categories: CATEGORIES, namespace: draft.author || undefined,
      author: draft.author || undefined,
    }));
  }
  return out;
}

const VALUES = [...SCOPES, ...SENSITIVITIES, ...HUMAN_REVIEW, ...AFFILIATIONS,
  ...DEPLOYMENTS, ...LOCALIZATIONS];

describe.each([["English", en], ["Spanish", es]])("plain findings — %s", (_, table) => {
  const findings = everyFinding();

  it("scans a corpus that actually reaches the rules", () => {
    expect(findings.length).toBeGreaterThan(40);
    // Enough kinds of rule that a rewrite which only handled "is required" fails.
    expect(new Set(findings.map((x) => x.message.replace(/'[^']*'/g, "")
      .replace(/\S*civic\.\S*/g, ""))).size).toBeGreaterThan(20);
  });

  it("names no civic.* key and quotes no YAML value", () => {
    for (const x of findings) {
      const text = plainMessage(x, fieldKey(x.where, table.submit.form.fieldNames),
        table.submit.form);
      expect(text, `${x.where}: ${x.message}`).not.toMatch(/civic\./);
      // `key: value`, as written in a file.
      expect(text, `${x.where}: ${x.message}`).not.toMatch(/[\w-]+: ['"\w-]/);
      for (const v of VALUES) {
        expect(text, `${x.where}: ${x.message}`).not.toContain(`'${v}'`);
      }
      expect(text.trim()).not.toBe("");
    }
  });

  it("keeps the plain wording a submitter was already given for a missing answer", () => {
    const required = findings.find((x) => x.where === "civic.category"
      && /is required/.test(x.message))!;
    expect(plainMessage(required, "civic.category", table.submit.form))
      .toContain(table.submit.form.fieldNames["civic.category"]);
  });
});

describe("fieldKey", () => {
  const names = en.submit.form.fieldNames;
  it("reads the key off a plugin finding's path", () => {
    expect(fieldKey("plugin.json#extensions.registry.civic.maintainer", names))
      .toBe("civic.maintainer");
  });
  it("leaves a plain key alone", () => {
    expect(fieldKey("description", names)).toBe("description");
  });
});
