/**
 * The file-type allowlist exists twice: ALLOWED_SUFFIXES here, and
 * SCANNABLE_SUFFIXES in scripts/scan.py. Neither can import the other, and the
 * failure mode of them drifting is silent and bad in one specific direction —
 * add an extension here alone and files of that type are stored but never
 * scanned. Nobody sees a finding, because there was never a scan.
 *
 * So the two lists are bound by a test, the way the schema is bound to rules.ts
 * and the category labels are bound to the vocabulary file.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { ALLOWED_SUFFIXES } from "./structure-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function scannableSuffixes(): string[] {
  const source = readFileSync(join(ROOT, "scripts", "scan.py"), "utf8");
  const block = /SCANNABLE_SUFFIXES\s*=\s*\{([\s\S]*?)\}/.exec(source);
  if (!block) throw new Error("SCANNABLE_SUFFIXES not found in scripts/scan.py");
  return [...block[1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
}

describe("the two file-type allowlists agree", () => {
  it("finds the Python list at all", () => {
    // Guards the test itself: a rename in scan.py must fail loudly here rather
    // than quietly turning this into an assertion about nothing.
    expect(scannableSuffixes().length).toBeGreaterThan(0);
  });

  it("stores exactly what it scans", () => {
    expect(scannableSuffixes().slice().sort()).toEqual([...ALLOWED_SUFFIXES].sort());
  });

  it("has no duplicates on either side", () => {
    const python = scannableSuffixes();
    expect(new Set(python).size).toBe(python.length);
  });

  it("lists only lowercase, dot-prefixed suffixes", () => {
    // checkStructureCore lowercases before lookup, so an uppercase entry here
    // would be unreachable.
    for (const suffix of [...ALLOWED_SUFFIXES, ...scannableSuffixes()]) {
      expect(suffix).toMatch(/^\.[a-z0-9]+$/);
    }
  });
});
