import { describe, it, expect } from "vitest";
import {
  checkFrontmatter,
  checkLocalization,
  checkProvenance,
  quarantineExtensions,
  checkSource,
} from "./rules";
import type { Finding, Frontmatter, RuleContext } from "./types";

const CATEGORIES = ["finance", "benefits-eligibility", "communications"];

function ctx(over: Partial<RuleContext> = {}): RuleContext {
  return { categories: CATEGORIES, ...over };
}

function meta(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    "civic.category": "finance",
    "civic.jurisdiction": "generic",
    "civic.data-sensitivity": "none",
    "civic.human-review": "none",
    "civic.maintainer": "Test Suite",
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

  /* `civic.deployed-at` is "the organization where it was used". Personal use
     means there is no organization, so requiring it demanded a field whose own
     definition did not apply — and a required field that does not apply gets
     filled with something, which corrupts the data it exists to collect. */
  it("asks nothing further of somebody who only uses it themselves", () => {
    expect(checkProvenance(meta({ "civic.deployment": "personal" }))).toEqual([]);
  });

  it("still lets personal use name a place, for anyone who wants to", () => {
    const f = checkProvenance(meta({
      "civic.deployment": "personal", "civic.deployed-in": "US-MA / Boston",
    }));
    expect(f).toEqual([]);
  });

  it("still checks the shape of what personal use does say", () => {
    const f = checkProvenance(meta({
      "civic.deployment": "personal", "civic.deployed-in": "Boston, obviously",
    }));
    expect(messages(f)).toMatch(/not in the expected form/);
  });

  it("keeps requiring an organization from a claim that names one", () => {
    for (const deployment of ["team", "organization"]) {
      const f = checkProvenance(meta({ "civic.deployment": deployment }));
      expect(messages(f), deployment).toMatch(/civic\.deployed-at/);
    }
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

describe("checkFrontmatter — fit", () => {
  const LIMIT = 500;

  it("accepts a skill that declares neither", () => {
    expect(checkFrontmatter(front(), ctx())).toEqual([]);
  });

  it("accepts both within the limit", () => {
    const m = meta({
      "civic.use-when": "A resident asks why their permit is stuck.",
      "civic.avoid-when": "Notices already filled with a specific person's data.",
    });
    expect(checkFrontmatter(front({ metadata: m }), ctx())).toEqual([]);
  });

  it.each(["civic.use-when", "civic.avoid-when"])("accepts %s at exactly the limit", (field) => {
    const m = meta({ [field]: "a".repeat(LIMIT) });
    expect(checkFrontmatter(front({ metadata: m }), ctx())).toEqual([]);
  });

  it.each(["civic.use-when", "civic.avoid-when"])("rejects %s over the limit", (field) => {
    const m = meta({ [field]: "a".repeat(LIMIT + 1) });
    const findings = checkFrontmatter(front({ metadata: m }), ctx());
    expect(findings.map((f) => f.where)).toContain(field);
    expect(messages(findings)).toMatch(/500 characters/);
  });

  it("does not invent a cross-field rule between the two", () => {
    // use-when alone is fine. avoid-when is the one worth pushing for, but the
    // prompt for it belongs in the submission form, not in a blocking check.
    const m = meta({ "civic.use-when": "Only this one is set." });
    expect(checkFrontmatter(front({ metadata: m }), ctx())).toEqual([]);
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

/** Where an imported skill came from (#63, and the half of #62 it answers).
 *
 *  The registry holds the content — that is what keeps the SHA pin, the weekly
 *  re-scan and the download working. These two fields say where the copy came
 *  from, so a reader can go and look upstream, without the listing depending on
 *  that repository still existing.
 *
 *  Both optional. A skill written here has no upstream, and a hand-written one
 *  should never be pushed toward inventing a value.
 */
describe("checkSource", () => {
  it("accepts a skill with no upstream at all", () => {
    expect(checkSource({})).toEqual([]);
  });

  it("accepts owner/repo with a full commit SHA", () => {
    expect(checkSource({
      "civic.source-repo": "sgarcese/Civic-Analytics-Agent-Workflow-Claude-Skill",
      "civic.source-commit": "a".repeat(40),
    })).toEqual([]);
  });

  it("rejects a repo that is not owner/name", () => {
    for (const bad of [
      "https://github.com/a/b",   // a URL, not a slug
      "justanowner",
      "a/b/c",
      "a b/c",
    ]) {
      expect(checkSource({ "civic.source-repo": bad })).toHaveLength(1);
    }
  });

  it("rejects a short or non-hex commit", () => {
    // With a repo present, so this isolates the commit's own format.
    for (const bad of ["a".repeat(7), "z".repeat(40), "A".repeat(40)]) {
      expect(checkSource({
        "civic.source-repo": "owner/name", "civic.source-commit": bad,
      })).toHaveLength(1);
    }
  });

  it("will not take a commit without the repository it came from", () => {
    // A bare SHA points at nothing anyone can resolve.
    const findings = checkSource({ "civic.source-commit": "a".repeat(40) });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.where).toBe("civic.source-commit");
  });

  it("allows a repository without a commit", () => {
    // Worth less, and still worth recording — it names where to look.
    expect(checkSource({ "civic.source-repo": "owner/name" })).toEqual([]);
  });
});

/** A skill can sit in two places in one vocabulary (#102). Two explicit fields
 *  rather than an ordered list: the cap is structural, there is no parsing, and
 *  which one is primary is never in question — the marketplace manifests need
 *  exactly one value and take civic.category.
 *
 *  Both are validated against the same vocabulary, because a second category
 *  that nothing browses by is worse than none. */
describe("a secondary category", () => {
  it("is optional — a skill that sits in one place says so by omission", () => {
    expect(checkFrontmatter(front(), ctx())).toEqual([]);
  });

  it("is accepted when it is in the vocabulary", () => {
    const f = front({ metadata: meta({ "civic.category-secondary": "benefits-eligibility" }) });
    expect(checkFrontmatter(f, ctx())).toEqual([]);
  });

  it("is rejected when it is not, with the vocabulary named", () => {
    const f = front({ metadata: meta({ "civic.category-secondary": "moon-permits" }) });
    const findings = checkFrontmatter(f, ctx());
    expect(findings).toHaveLength(1);
    expect(findings[0]?.where).toBe("civic.category-secondary");
    expect(findings[0]?.message).toContain("benefits-eligibility");
  });

  it("cannot repeat the primary, which claims nothing and doubles a facet", () => {
    const f = front({ metadata: meta({ "civic.category-secondary": "finance" }) });
    const findings = checkFrontmatter(f, ctx());
    expect(findings).toHaveLength(1);
    expect(findings[0]?.where).toBe("civic.category-secondary");
    expect(findings[0]?.message).toMatch(/same as|already/i);
  });
});

/** civic.contact is gone (#95).
 *
 *  The namespace *is* a GitHub account and L1 proves the submitter owns it, so a
 *  separately typed address was a second, less reliable copy of something the
 *  registry already held — and the only field the index deliberately withheld,
 *  which meant it was collected, stored, and never shown.
 *
 *  What a reviewer needs is a route that reaches the maintainer, and an issue or
 *  a mention on the namespace's account cannot bounce or go stale independently
 *  of the account. A route that avoids GitHub is the one thing lost, and
 *  docs/SECURITY.md carries the registry's own reporting address for that.
 */
describe("a skill with no contact address", () => {
  it("validates", () => {
    const f = front({ metadata: meta({ "civic.contact": undefined }) });
    delete (f.metadata as Record<string, unknown>)["civic.contact"];
    expect(checkFrontmatter(f, ctx())).toEqual([]);
  });

  it("is not asked for it", () => {
    const f = front({ metadata: meta({ "civic.contact": undefined }) });
    delete (f.metadata as Record<string, unknown>)["civic.contact"];
    const findings = checkFrontmatter(f, ctx());
    expect(findings.map((x) => x.where)).not.toContain("civic.contact");
  });

  it("keeps one that is already there, rather than rejecting the listing", () => {
    // An unknown civic.* key is quarantined, not rejected — a listing carrying
    // the old field stays valid while it is migrated.
    const f = front({ metadata: meta({ "civic.contact": "old@example.gov" }) });
    expect(checkFrontmatter(f, ctx())).toEqual([]);
  });
});
