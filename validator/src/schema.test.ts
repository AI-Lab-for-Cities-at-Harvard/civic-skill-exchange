/**
 * schema/skill.schema.json is no longer executed by anything — rules.ts is the
 * implementation. But the schema is still the document a contributor reads, and
 * a schema that quietly disagrees with the code is worse than no schema.
 *
 * These tests make that drift a build failure.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { parse } from "yaml";
import {
  AFFILIATIONS, DEPLOYED_IN_PATTERN, DEPLOYED_SINCE_PATTERN, DEPLOYMENT_DETAILS,
  DEPLOYMENTS, GENERALIZED_OK_JURISDICTIONS, HUMAN_REVIEW, JURISDICTIONS,
  FIT_MAX_LENGTH, LOCALIZATIONS, ORGANIZATIONAL_DEPLOYMENTS,
  SECONDARY_CATEGORY, SENSITIVITIES,
  SPEC_FIELDS,
} from "./rules";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

interface Conditional {
  if: { properties: Record<string, { enum?: string[]; const?: string }>; required?: string[] };
  then: {
    required?: string[];
    not?: { anyOf: { required: string[] }[] };
    properties?: Record<string, { enum?: string[] }>;
  };
}

interface Schema {
  required: string[];
  properties: {
    metadata: {
      required: string[];
      allOf?: Conditional[];
      properties: Record<string, {
        enum?: string[]; maxLength?: number; pattern?: string;
        "x-vocabulary"?: string;
      }>;
    };
  } & Record<string, unknown>;
}

const schema = JSON.parse(
  readFileSync(join(ROOT, "schema", "skill.schema.json"), "utf8"),
) as Schema;

const metaProps = schema.properties.metadata.properties;

describe("the published schema agrees with rules.ts", () => {
  it.each([
    ["civic.jurisdiction", JURISDICTIONS],
    ["civic.data-sensitivity", SENSITIVITIES],
    ["civic.human-review", HUMAN_REVIEW],
    ["civic.affiliation", AFFILIATIONS],
    ["civic.deployment", DEPLOYMENTS],
    ["civic.localization", LOCALIZATIONS],
  ])("%s has the same values in both", (field, values) => {
    expect(metaProps[field]?.enum?.slice().sort()).toEqual([...values].sort());
  });

  it("requires the same civic.* metadata", () => {
    const required = [
      "civic.category", "civic.jurisdiction", "civic.data-sensitivity",
      "civic.human-review", "civic.maintainer", "civic.contact",
      "civic.affiliation", "civic.deployment",
    ];
    expect(schema.properties.metadata.required.slice().sort()).toEqual(required.sort());
  });

  it("declares only the six Agent Skills spec fields", () => {
    expect(Object.keys(schema.properties).sort()).toEqual([...SPEC_FIELDS].sort());
  });

  it.each(["civic.use-when", "civic.avoid-when"])(
    "%s is declared, optional, and capped at the same length as rules.ts", (field) => {
      expect(metaProps[field]).toBeDefined();
      expect(metaProps[field]?.maxLength).toBe(FIT_MAX_LENGTH);
      expect(schema.properties.metadata.required).not.toContain(field);
    });

  it("leaves civic.category to the vocabulary file rather than hardcoding it", () => {
    // One source of truth: registry/categories.yml. A frozen enum here would
    // drift the moment a category is added.
    expect(metaProps["civic.category"]?.enum).toBeUndefined();
  });
});

/**
 * The schema is read by a program, not only by a person.
 *
 * skills/civic-skills/submit-a-skill fetches this file and asks it what a
 * submission needs, because a skill running on somebody else's machine cannot
 * import rules.ts and must not carry a second copy of it (#10). Anything the
 * schema states only in an English `description` is invisible to it — so the
 * deployment rules are stated as JSON Schema conditionals, and the one
 * vocabulary that lives outside this file says where to go and get it.
 */
describe("the schema states its conditional rules machine-readably", () => {
  const conditionals = schema.properties.metadata.allOf ?? [];

  it("declares the organizational-deployment rule", () => {
    const rule = conditionals.find(
      (c) => c.if.properties["civic.deployment"]?.enum !== undefined,
    );
    expect(rule?.if.properties["civic.deployment"]?.enum?.slice().sort())
      .toEqual([...ORGANIZATIONAL_DEPLOYMENTS].sort());
    expect(rule?.then.required?.slice().sort()).toEqual([...DEPLOYMENT_DETAILS].sort());
  });

  it("declares the never-deployed rule as a prohibition on the same fields", () => {
    const rule = conditionals.find(
      (c) => c.if.properties["civic.deployment"]?.const === "none",
    );
    const forbidden = rule?.then.not?.anyOf.flatMap((entry) => entry.required) ?? [];
    expect(forbidden.slice().sort()).toEqual([...DEPLOYMENT_DETAILS].sort());
  });

  it("declares the localization contradiction", () => {
    const rule = conditionals.find(
      (c) => c.if.properties["civic.localization"]?.const === "generalized",
    );
    expect(rule?.then.properties?.["civic.jurisdiction"]?.enum?.slice().sort())
      .toEqual([...GENERALIZED_OK_JURISDICTIONS].sort());
  });

  it("declares that a source commit needs a source repository", () => {
    const rule = conditionals.find((c) => c.if.required?.includes("civic.source-commit"));
    expect(rule?.then.required).toEqual(["civic.source-repo"]);
  });

  it("carries the deployment patterns rules.ts enforces, not only prose", () => {
    const inPattern = metaProps["civic.deployed-in"]?.pattern;
    const sincePattern = metaProps["civic.deployed-since"]?.pattern;
    expect(inPattern).toBe(DEPLOYED_IN_PATTERN);
    expect(sincePattern).toBe(DEPLOYED_SINCE_PATTERN);
  });

  it("marks civic.category as coming from a vocabulary rather than an enum", () => {
    // Read by a program that has no way to guess which field is the one whose
    // values live in registry/categories.yml.
    expect(metaProps["civic.category"]?.["x-vocabulary"]).toBe("categories");
  });
});

describe("the category vocabulary is well formed", () => {
  const doc = parse(
    readFileSync(join(ROOT, "registry", "categories.yml"), "utf8"),
  ) as { categories: { id: string; label: string }[] };

  it("gives every category an id and a label", () => {
    for (const c of doc.categories) {
      expect(c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate ids", () => {
    const ids = doc.categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/** The published schema and rules.ts have to agree about the source fields, or
 *  a submission passes one and fails the other. */
describe("the source fields", () => {
  it("are both optional", () => {
    for (const field of ["civic.source-repo", "civic.source-commit"]) {
      expect(schema.properties.metadata.required).not.toContain(field);
      expect(metaProps[field]).toBeDefined();
    }
  });

  it("carry the same patterns rules.ts enforces", () => {
    const repo = metaProps["civic.source-repo"]?.pattern;
    const commit = metaProps["civic.source-commit"]?.pattern;
    expect(new RegExp(repo!).test("owner/name")).toBe(true);
    expect(new RegExp(repo!).test("https://github.com/owner/name")).toBe(false);
    expect(new RegExp(commit!).test("a".repeat(40))).toBe(true);
    expect(new RegExp(commit!).test("a".repeat(7))).toBe(false);
  });
});

/** The optional second category (#102). The schema is read by a program as well
 *  as a person, so the field has to be declared and has to point at the
 *  vocabulary rather than freezing an enum. */
describe("the secondary category", () => {
  it("is declared and optional", () => {
    expect(metaProps[SECONDARY_CATEGORY]).toBeDefined();
    expect(schema.properties.metadata.required).not.toContain(SECONDARY_CATEGORY);
  });

  it("reads its values from the same vocabulary as the primary", () => {
    expect(metaProps[SECONDARY_CATEGORY]?.["x-vocabulary"]).toBe("categories");
    expect(metaProps[SECONDARY_CATEGORY]?.enum).toBeUndefined();
  });

  it("is capped like the primary, so neither can carry a sentence", () => {
    expect(metaProps[SECONDARY_CATEGORY]?.maxLength)
      .toBe(metaProps["civic.category"]?.maxLength);
  });
});
