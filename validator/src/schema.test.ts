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
  AFFILIATIONS, DEPLOYMENTS, HUMAN_REVIEW, JURISDICTIONS,
  FIT_MAX_LENGTH, LOCALIZATIONS, SENSITIVITIES, SPEC_FIELDS,
} from "./rules";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

interface Schema {
  required: string[];
  properties: {
    metadata: {
      required: string[];
      properties: Record<string, { enum?: string[]; maxLength?: number; pattern?: string }>;
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
