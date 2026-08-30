/** The site imports the validator workspace directly — no duplicated logic.
 *  These tests exist to prove the wiring, not to re-test the rules. */

import { describe, it, expect } from "vitest";
import { checkFrontmatter } from "@civic-skill-exchange/validator/rules";

const CATEGORIES = ["budget-finance"];

const front = {
  name: "example-skill",
  description: "An example skill long enough to clear the minimum description length.",
  license: "MIT",
  metadata: {
    "civic.category": "budget-finance",
    "civic.jurisdiction": "generic",
    "civic.data-sensitivity": "none",
    "civic.human-review": "none",
    "civic.maintainer": "Test",
    "civic.contact": "t@example.com",
    "civic.affiliation": "individual",
    "civic.deployment": "none",
  },
};

describe("the shared validator is importable from the site", () => {
  it("accepts a valid skill", () => {
    expect(checkFrontmatter(front, { categories: CATEGORIES })).toEqual([]);
  });

  it("rejects an invalid one, with a field to attach the error to", () => {
    const findings = checkFrontmatter(
      { ...front, name: "Bad Name" }, { categories: CATEGORIES },
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.where).toBe("name");
  });

  it("skips the directory check in the browser, where there is no directory", () => {
    expect(checkFrontmatter(front, { categories: CATEGORIES })).toEqual([]);
  });
});
