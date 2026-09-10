/**
 * ADR 0004 decision 5: a locale costs the English visitor nothing.
 *
 * Which is a claim about bytes, so it is checked in bytes. The build is run into
 * a temporary directory — its own process, because Vite reads NODE_ENV and
 * vitest has set it to `test`, which would otherwise measure an unminified
 * development bundle — and `scripts/size.mjs` compares the entry chunk against
 * `size-baseline.json`.
 *
 * The same script runs at the end of `npm run build`, so CI's Site job enforces
 * this whether or not the tests are what fails. One implementation, two callers:
 * a second copy of the comparison is how a gate comes to disagree with itself.
 *
 * The baseline and how to re-record it are documented in `scripts/size.mjs`.
 */

import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function run(command: string, args: string[]): string {
  return execFileSync(command, args, {
    cwd: SITE,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

describe("the English entry chunk stays within its recorded baseline", () => {
  it("builds and measures", () => {
    const out = mkdtempSync(join(tmpdir(), "civic-site-size-"));
    try {
      run("npx", ["vite", "build", "--outDir", out, "--emptyOutDir"]);
      // Exits non-zero past the margin, and execFileSync throws on that.
      expect(run("node", ["scripts/size.mjs", "--dist", out])).toMatch(/^size: index-/);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 180_000);

  it("records a margin small enough to notice a locale in the wrong chunk", () => {
    const baseline = JSON.parse(readFileSync(join(SITE, "size-baseline.json"), "utf8"));
    expect(baseline.bytes).toBeGreaterThan(0);
    expect(baseline.marginPercent).toBeLessThanOrEqual(3);
  });
});
