/** #337: the size gate measures what an English visitor downloads before they
 *  click anything — the entry and every chunk index.html preloads — not only
 *  the file Vite happens to name index-*.js. A shared chunk Rollup splits out
 *  of the entry is still fetched at startup, and the gate must still see it.
 *
 *  Run against a synthetic dist/ with its own baseline, so the arithmetic is
 *  checked without a build. */

import { describe, it, expect, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const made: string[] = [];
afterEach(() => { for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true }); });

/** A dist/ whose index.html loads `entry` as its module script and preloads
 *  `preloads`; `lazy` chunks exist but nothing loads them at startup. */
function dist({ entry, preloads = {}, lazy = {}, baseline }: {
  entry: number; preloads?: Record<string, number>; lazy?: Record<string, number>; baseline: number;
}) {
  const root = mkdtempSync(join(tmpdir(), "size-gate-"));
  made.push(root);
  mkdirSync(join(root, "assets"));
  const file = (name: string, bytes: number) => writeFileSync(join(root, "assets", name), "x".repeat(bytes));
  file("index-abc.js", entry);
  for (const [n, b] of Object.entries({ ...preloads, ...lazy })) file(n, b);
  const links = Object.keys(preloads)
    .map((n) => `<link rel="modulepreload" crossorigin href="/civic-skill-exchange/assets/${n}">`).join("\n");
  writeFileSync(join(root, "index.html"),
    `<!doctype html><html><head>\n<script type="module" crossorigin src="/civic-skill-exchange/assets/index-abc.js"></script>\n${links}\n</head></html>`);
  const base = join(root, "baseline.json");
  writeFileSync(base, JSON.stringify({ bytes: baseline, marginPercent: 3 }));
  return { root, base };
}

const gate = (d: { root: string; base: string }) =>
  spawnSync("node", ["scripts/size.mjs", "--dist", d.root, "--baseline", d.base],
    { cwd: SITE, encoding: "utf8" });

describe("the size gate measures everything loaded at startup", () => {
  it("adds every preloaded chunk to the entry", () => {
    const r = gate(dist({ entry: 60_000, preloads: { "route-def.js": 40_000 }, baseline: 100_000 }));
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/100000 B/);
    expect(r.stdout).toMatch(/index-abc\.js/);
    expect(r.stdout).toMatch(/route-def\.js/);
  });

  it("fails when a preloaded chunk takes the total past the margin, though the entry alone is under", () => {
    const r = gate(dist({ entry: 60_000, preloads: { "route-def.js": 50_000 }, baseline: 100_000 }));
    expect(r.status).toBe(1);
  });

  it("leaves out chunks nothing loads until a page is opened", () => {
    const r = gate(dist({ entry: 100_000, lazy: { "Submit-xyz.js": 500_000 }, baseline: 100_000 }));
    expect(r.status).toBe(0);
    expect(r.stdout).not.toMatch(/Submit-xyz/);
  });
});
