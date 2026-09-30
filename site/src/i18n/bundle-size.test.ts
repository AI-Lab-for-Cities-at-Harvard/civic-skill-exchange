/**
 * ADR 0004 decision 5: a locale costs the English visitor nothing.
 *
 * Which is a claim about bytes, so it is checked in bytes, and about *which*
 * bytes, so the built output is read as well as measured. The build is run once
 * into a temporary directory — its own process, because Vite reads NODE_ENV and
 * vitest has set it to `test`, which would otherwise measure an unminified
 * development bundle.
 *
 * Two things then have to be true of it:
 *
 *   1. `scripts/size.mjs` finds the entry chunk within `size-baseline.json`.
 *      The same script runs at the end of `npm run build`, so CI's Site job
 *      enforces this whether or not the tests are what fails. One
 *      implementation, two callers: a second copy of the comparison is how a
 *      gate comes to disagree with itself.
 *
 *   2. Spanish is in a chunk of its own and not in the entry chunk. The size
 *      gate would eventually catch a locale imported at the top of the module
 *      graph, but only once it grew past a 3% margin, and it could not say
 *      *which* locale. This reads the strings.
 *
 * The baseline and how to re-record it are documented in `scripts/size.mjs`.
 * It is not re-recorded to absorb a locale — that is the failure it exists to
 * report.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { strings as es } from "./es";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function run(command: string, args: string[]): string {
  return execFileSync(command, args, {
    cwd: SITE,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** One production build, shared by everything below. */
let dist: string;
let chunks: { name: string; text: string }[];

beforeAll(() => {
  dist = mkdtempSync(join(tmpdir(), "civic-site-size-"));
  run("npx", ["vite", "build", "--outDir", dist, "--emptyOutDir"]);
  chunks = readdirSync(join(dist, "assets"))
    .filter((name) => name.endsWith(".js"))
    .map((name) => ({ name, text: readFileSync(join(dist, "assets", name), "utf8") }));
}, 180_000);

afterAll(() => {
  rmSync(dist, { recursive: true, force: true });
});

const entry = () => chunks.find((c) => /^index-.*\.js$/.test(c.name))!;
const others = () => chunks.filter((c) => c !== entry());

describe("the English entry chunk stays within its recorded baseline", () => {
  it("measures the build", () => {
    // Exits non-zero past the margin, and execFileSync throws on that.
    expect(run("node", ["scripts/size.mjs", "--dist", dist])).toMatch(/^size: index-/);
  });

  it("records a margin small enough to notice a locale in the wrong chunk", () => {
    const baseline = JSON.parse(readFileSync(join(SITE, "size-baseline.json"), "utf8"));
    expect(baseline.bytes).toBeGreaterThan(0);
    expect(baseline.marginPercent).toBeLessThanOrEqual(3);
  });
});

describe("Spanish is bytes an English visitor never fetches", () => {
  /** Long, distinctive sentences from the Spanish table. Read out of the table
   *  rather than written here, so this keeps working when the table is
   *  translated: whatever the sentences become, they are what to look for.
   *  Three of them, because one that a translator happens to give an apostrophe
   *  would be escaped differently in the bundle than in memory. */
  const spanish = [es.chrome.title, es.chrome.lede, es.about.whatThisIs.lede];

  it("builds something to look at", () => {
    expect(entry()).toBeTruthy();
    expect(others().length).toBeGreaterThan(0);
    expect(spanish.every((s) => s.length > 40)).toBe(true);
  });

  it("gives the Spanish table a chunk of its own", () => {
    // Named after the module it came from, which is how a dynamic import is
    // chunked. The content check below is the load-bearing one; this says the
    // chunk is the locale rather than something else that happened to split.
    expect(others().map((c) => c.name)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^es-[\w-]+\.js$/)]),
    );
  });

  it("keeps Spanish strings out of the entry chunk", () => {
    for (const sentence of spanish) {
      expect(entry().text.includes(sentence), sentence.slice(0, 40)).toBe(false);
    }
    // The placeholder marker, while the table still carries it: an entry chunk
    // with "[es] " in it is a locale in the wrong chunk, whatever else is true.
    expect(entry().text).not.toContain("[es] ");
  });

  it("puts them in exactly one chunk, which is the Spanish one", () => {
    const carrying = others().filter((c) => spanish.some((s) => c.text.includes(s)));
    expect(carrying.map((c) => c.name).sort()).toEqual([
      expect.stringMatching(/^es-[\w-]+\.js$/),
    ]);
  });
});
