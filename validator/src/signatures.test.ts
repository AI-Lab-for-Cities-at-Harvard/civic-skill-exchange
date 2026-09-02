/**
 * The renderer's signature vocabulary is a copy of scan.py's, so it has to be
 * checked against the original.
 *
 * `report.ts` renders the signature name in bold rather than in a code span, so
 * unlike every other field it cannot be fenced. It is safe only because it comes
 * from a fixed set; anything else renders as `unrecognised-signature`. That
 * makes the list a second definition of something scan.py already defines, and a
 * second definition drifts — a new signature added there would arrive on pull
 * requests as `unrecognised-signature`, which reads like a scanner fault rather
 * than the finding it is.
 *
 * Reading the Python is blunt, and it is the same trade purity.test.ts makes:
 * the check fires every time, which is the only property a guardrail has.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { SIGNATURE_NAMES } from "./report";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The first element of each `(name, pattern, explanation)` tuple in one list. */
const namesIn = (list: "HARD" | "SOFT"): string[] => {
  const src = readFileSync(join(ROOT, "scripts", "scan.py"), "utf8");
  const start = src.indexOf(`${list}: list[Signature] = [`);
  expect(start, `${list} not found in scan.py — has the shape changed?`).toBeGreaterThan(-1);
  const block = src.slice(start, src.indexOf("\n]", start));
  return [...block.matchAll(/^ {8}"([a-z][a-z0-9-]*)",$/gm)].map((m) => m[1]!);
};

describe("the report's signature vocabulary matches the scanner's", () => {
  it("finds signatures to compare against", () => {
    // Guards the guard: a regex that matches nothing passes the test below.
    expect(namesIn("HARD").length).toBeGreaterThan(0);
    expect(namesIn("SOFT").length).toBeGreaterThan(0);
  });

  it("knows every signature scan.py can emit", () => {
    const missing = [...namesIn("HARD"), ...namesIn("SOFT")]
      .filter((name) => !SIGNATURE_NAMES.includes(name));
    expect(
      missing,
      "scan.py emits these and report.ts would render them as " +
        "unrecognised-signature; add them to SIGNATURE_NAMES",
    ).toEqual([]);
  });

  it("claims no signature the scanner cannot emit", () => {
    // The other direction matters less, but a name left behind after a rename
    // is how the list stops being a description of anything.
    const known = new Set([...namesIn("HARD"), ...namesIn("SOFT")]);
    expect(SIGNATURE_NAMES.filter((name) => !known.has(name))).toEqual([]);
  });
});
