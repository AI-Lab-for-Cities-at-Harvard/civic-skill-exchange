import { describe, it, expect } from "vitest";
import { checkFrontmatter, checkLocalization, checkProvenance, quarantineExtensions } from "./rules";
import type { Finding, Frontmatter, RuleContext } from "./types";

const CATEGORIES = ["budget-finance", "benefits-eligibility", "plain-language-accessibility"];

function ctx(over: Partial<RuleContext> = {}): RuleContext {
  return { categories: CATEGORIES, ...over };
}

function meta(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    "civic.category": "budget-finance",
    "civic.jurisdiction": "generic",
    "civic.data-sensitivity": "none",
    "civic.human-review": "none",
    "civic.maintainer": "Test Suite",
    "civic.contact": "test@example.com",
    "civic.affiliation": "individual",
    "civic.deployment": "none",
    ...over,
  };
}

function front(over: Partial<Frontmatter> = {}): Frontmatter {
  return {
    name: "example-skill",
    description:
      "An example skill used in the test suite, long enough to clear the minimum length.",
    license: "MIT",
    "allowed-tools": "Read, Grep",
    metadata: meta(),
    ...over,
  };
}

/** Findings are structured — `where` names the field, `message` explains.
 *  Assertions search both, since either half may carry the detail. */
const messages = (f: Finding[]) => f.map((x) => `${x.where}: ${x.message}`).join(" | ");

describe("checkFrontmatter — the happy path", () => {
  it("accepts a well-formed skill", () => {
    expect(checkFrontmatter(front(), ctx())).toEqual([]);
  });

  it("accepts a skill whose name matches its directory", () => {
    expect(checkFrontmatter(front(), ctx({ directoryName: "example-skill" }))).toEqual([]);
  });
});

describe("checkFrontmatter — required fields", () => {
  it.each(["name", "description", "license", "metadata"])("requires %s", (field) => {
    const f = front();
    delete f[field];
    expect(checkFrontmatter(f, ctx()).length).toBeGreaterThan(0);
  });

  it.each([
    "civic.category",
    "civic.jurisdiction",
    "civic.data-sensitivity",
    "civic.human-review",
    "civic.maintainer",
    "civic.contact",
    "civic.affiliation",
    "civic.deployment",
  ])("requires %s", (field) => {
    const m = meta();
    delete m[field];
    expect(checkFrontmatter(front({ metadata: m }), ctx()).length).toBeGreaterThan(0);
  });
});

describe("checkFrontmatter — name", () => {
  it("rejects uppercase", () => {
    expect(checkFrontmatter(front({ name: "Bad-Name" }), ctx()).length).toBeGreaterThan(0);
  });

  it("rejects spaces and underscores", () => {
    expect(checkFrontmatter(front({ name: "bad name" }), ctx()).length).toBeGreaterThan(0);
    expect(checkFrontmatter(front({ name: "bad_name" }), ctx()).length).toBeGreaterThan(0);
  });

  it("rejects a name over 64 characters", () => {
    expect(checkFrontmatter(front({ name: "a".repeat(65) }), ctx()).length).toBeGreaterThan(0);
  });

  it("reports a name that does not match its directory", () => {
    const f = checkFrontmatter(front({ name: "one-name" }), ctx({ directoryName: "another" }));
    expect(messages(f)).toMatch(/directory/);
  });

  it("skips the directory check when there is no directory, as in the browser", () => {
    expect(checkFrontmatter(front({ name: "one-name" }), ctx())).toEqual([]);
  });
});

describe("checkFrontmatter — description", () => {
  it("rejects a description under 40 characters", () => {
    expect(checkFrontmatter(front({ description: "Too short." }), ctx()).length).toBeGreaterThan(0);
  });

  it("rejects a description over 1024 characters", () => {
    expect(checkFrontmatter(front({ description: "a".repeat(1025) }), ctx()).length).toBeGreaterThan(0);
  });
});

describe("checkFrontmatter — vocabularies", () => {
  it("rejects a category outside the vocabulary", () => {
    const m = meta({ "civic.category": "not-a-category" });
    expect(messages(checkFrontmatter(front({ metadata: m }), ctx()))).toMatch(/vocabulary/);
  });

  it("accepts every category the context supplies", () => {
    for (const c of CATEGORIES) {
      const m = meta({ "civic.category": c });
      expect(checkFrontmatter(front({ metadata: m }), ctx())).toEqual([]);
    }
  });

  it("rejects an invalid data sensitivity", () => {
    const m = meta({ "civic.data-sensitivity": "maybe" });
    expect(checkFrontmatter(front({ metadata: m }), ctx()).length).toBeGreaterThan(0);
  });

  it("rejects an invalid jurisdiction", () => {
    const m = meta({ "civic.jurisdiction": "mars" });
    expect(checkFrontmatter(front({ metadata: m }), ctx()).length).toBeGreaterThan(0);
  });
});

describe("checkFrontmatter — namespace ownership", () => {
  it("rejects a namespace that is not the author's", () => {
    const f = checkFrontmatter(front(), ctx({ author: "mallory", namespace: "alice" }));
    expect(messages(f)).toMatch(/author/);
  });

  it("is case insensitive", () => {
    expect(checkFrontmatter(front(), ctx({ author: "Alice", namespace: "alice" }))).toEqual([]);
  });

  it("skips reserved namespaces, which CODEOWNERS gates instead", () => {
    const f = checkFrontmatter(front(), ctx({ author: "anyone", namespace: "civic-skills" }));
    expect(messages(f)).not.toMatch(/author/);
  });

  it("skips the check when no author is supplied, as in the browser", () => {
    expect(checkFrontmatter(front(), ctx({ namespace: "alice" }))).toEqual([]);
  });
});

describe("checkProvenance", () => {
  it("accepts a complete deployment claim", () => {
    expect(checkProvenance(meta({
      "civic.deployment": "organization",
      "civic.deployed-at": "City of Example",
      "civic.deployed-in": "US-MA / Boston",
      "civic.deployed-since": "2026-03",
    }))).toEqual([]);
  });

  it("requires a deployment claim to name the organization", () => {
    const f = checkProvenance(meta({ "civic.deployment": "organization" }));
    expect(messages(f)).toMatch(/civic\.deployed-at/);
  });

  it("requires a deployment claim to name the jurisdiction", () => {
    const f = checkProvenance(meta({
      "civic.deployment": "team", "civic.deployed-at": "Example Agency",
    }));
    expect(messages(f)).toMatch(/civic\.deployed-in/);
  });

  it("treats personal use as a claim that still has to name where", () => {
    expect(checkProvenance(meta({ "civic.deployment": "personal" })).length).toBeGreaterThan(0);
  });

  it("rejects deployment details alongside a claim of none", () => {
    const f = checkProvenance(meta({
      "civic.deployment": "none", "civic.deployed-at": "City of Example",
    }));
    expect(messages(f)).toMatch(/never been used/);
  });

  it("accepts never-deployed as an honest answer", () => {
    expect(checkProvenance(meta({ "civic.deployment": "none" }))).toEqual([]);
  });

  it("requires a country code in deployed-in", () => {
    const f = checkProvenance(meta({
      "civic.deployment": "team", "civic.deployed-at": "X Agency", "civic.deployed-in": "Boston",
    }));
    expect(messages(f)).toMatch(/deployed-in/);
  });

  it.each(["GB", "US-MA", "US-CA / San José", "CA-ON / Toronto"])(
    "accepts %s as a jurisdiction", (value) => {
      expect(checkProvenance(meta({
        "civic.deployment": "team", "civic.deployed-at": "X Agency", "civic.deployed-in": value,
      }))).toEqual([]);
    });

  it.each(["2025", "2026-03"])("accepts %s as a start date", (value) => {
    expect(checkProvenance(meta({
      "civic.deployment": "team", "civic.deployed-at": "X Agency",
      "civic.deployed-in": "US-MA", "civic.deployed-since": value,
    }))).toEqual([]);
  });

  it("rejects a free-text start date", () => {
    const f = checkProvenance(meta({
      "civic.deployment": "team", "civic.deployed-at": "X Agency",
      "civic.deployed-in": "US-MA", "civic.deployed-since": "last spring",
    }));
    expect(messages(f)).toMatch(/deployed-since/);
  });

  it("rejects month 13", () => {
    expect(checkProvenance(meta({
      "civic.deployment": "team", "civic.deployed-at": "X Agency",
      "civic.deployed-in": "US-MA", "civic.deployed-since": "2026-13",
    })).length).toBeGreaterThan(0);
  });
});

describe("checkLocalization", () => {
  it("treats the field as optional", () => {
    expect(checkLocalization(meta())).toEqual([]);
  });

  it.each(["generalized", "localized"])("accepts %s", (value) => {
    const m = meta({ "civic.localization": value, "civic.jurisdiction": "generic" });
    expect(checkLocalization(m)).toEqual([]);
  });

  it("rejects generalized alongside a named jurisdiction", () => {
    const m = meta({ "civic.localization": "generalized", "civic.jurisdiction": "us-state" });
    expect(messages(checkLocalization(m))).toMatch(/generalized/);
  });

  it.each(["generic", "intl"])("allows generalized with %s", (j) => {
    const m = meta({ "civic.localization": "generalized", "civic.jurisdiction": j });
    expect(checkLocalization(m)).toEqual([]);
  });

  it("allows localized with a named jurisdiction", () => {
    const m = meta({ "civic.localization": "localized", "civic.jurisdiction": "us-state" });
    expect(checkLocalization(m)).toEqual([]);
  });
});

describe("quarantineExtensions", () => {
  it("moves non-spec fields into metadata rather than rejecting them", () => {
    const { frontmatter, moved } = quarantineExtensions({
      name: "x", metadata: {}, shell: "bash", paths: "src/",
    });
    expect(moved).toEqual(["paths", "shell"]);
    expect(frontmatter.metadata?.["ext.shell"]).toBe("bash");
    expect(frontmatter.shell).toBeUndefined();
  });

  it("leaves a spec-only frontmatter untouched", () => {
    const { moved } = quarantineExtensions(front());
    expect(moved).toEqual([]);
  });
});
