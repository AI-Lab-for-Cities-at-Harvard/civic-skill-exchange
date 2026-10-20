/**
 * What an English visitor downloads at startup, held to a recorded size.
 *
 * "At startup" is what dist/index.html loads before anything is clicked: its
 * module script and every chunk it preloads (#337). Rollup can split modules
 * the entry shares with a lazy page into a chunk of their own, and index.html
 * then preloads it; measuring index-*.js alone would stop seeing those bytes.
 * Chunks only a lazy page imports are left out — that is what lazy is for.
 *
 * ADR 0004 decision 5: a locale costs the English visitor nothing. The only way
 * that stays true is a number somebody has to look at — a locale accidentally
 * imported at the top of the module graph is invisible in a diff and obvious in
 * a 200 kB entry chunk.
 *
 * Run after `vite build`, and wired into `npm run build` so CI's Site job
 * enforces it rather than a human remembering to look.
 *
 *   node scripts/size.mjs                    # check dist/ against the baseline
 *   node scripts/size.mjs --dist <dir>       # check a build written elsewhere
 *   node scripts/size.mjs --baseline <file>  # against another baseline (tests)
 *   node scripts/size.mjs --record           # re-record the baseline from dist/
 *
 * TO RE-RECORD: a deliberate growth — a dependency added, a feature that earns
 * its bytes — is `npm run build` then `node scripts/size.mjs --record`, with the
 * new number and the reason for it in the commit message. Never re-record to
 * make a red gate green.
 */

import { readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(SITE, "size-baseline.json");

/** The JS files index.html loads at startup: its module script, then each
 *  modulepreload, by the filename under assets/. Read from the HTML Vite wrote
 *  rather than from the module graph, because the HTML is what a browser obeys. */
function startupChunks(dist) {
  let html;
  try {
    html = readFileSync(join(dist, "index.html"), "utf8");
  } catch {
    throw new Error(`No build to measure at ${dist}. Run \`vite build\` first.`);
  }
  const srcs = [
    ...html.matchAll(/<script\b[^>]*type="module"[^>]*\bsrc="([^"]+\.js)"/g),
    ...html.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*\bhref="([^"]+\.js)"/g),
  ].map((m) => m[1].slice(m[1].lastIndexOf("/") + 1));
  const names = [...new Set(srcs)];
  if (!names.some((n) => /^index-.*\.js$/.test(n))) {
    throw new Error(`index.html in ${dist} loads no index-*.js entry chunk.`);
  }
  return names.map((name) => ({ name, bytes: statSync(join(dist, "assets", name)).size }));
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

function main(argv) {
  const distArg = argv.indexOf("--dist");
  const dist = distArg === -1 ? join(SITE, "dist") : resolve(argv[distArg + 1] ?? "");
  const baselineArg = argv.indexOf("--baseline");
  const baselineFile = baselineArg === -1 ? BASELINE : resolve(argv[baselineArg + 1] ?? "");
  const chunks = startupChunks(dist);
  const total = chunks.reduce((sum, c) => sum + c.bytes, 0);
  const parts = chunks.map((c) => `${c.name} ${kb(c.bytes)}`).join(" + ");

  if (argv.includes("--record")) {
    const baseline = { ...JSON.parse(readFileSync(baselineFile, "utf8")), bytes: total };
    writeFileSync(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
    process.stdout.write(`size: recorded ${kb(total)} (${total} B): ${parts}\n`);
    return 0;
  }

  const baseline = JSON.parse(readFileSync(baselineFile, "utf8"));
  const limit = Math.floor(baseline.bytes * (1 + baseline.marginPercent / 100));
  const drift = (total / baseline.bytes - 1) * 100;

  process.stdout.write(
    `size: startup ${kb(total)} (${total} B) — baseline ${kb(baseline.bytes)}, ` +
    `${drift >= 0 ? "+" : ""}${drift.toFixed(1)}%, limit ${kb(limit)}\n` +
    `      ${parts}\n`,
  );

  if (total > limit) {
    process.stderr.write(
      `\nWhat loads at startup grew past its ${baseline.marginPercent}% margin.\n` +
      `A locale must load as its own chunk (ADR 0004 decision 5), so check that\n` +
      `nothing imports one at the top of the module graph. If the growth is\n` +
      `deliberate, re-record with \`node scripts/size.mjs --record\` and say why.\n`,
    );
    return 1;
  }
  return 0;
}

try {
  process.exit(main(process.argv.slice(2)));
} catch (error) {
  process.stderr.write(`size: ${error.message}\n`);
  process.exit(1);
}
