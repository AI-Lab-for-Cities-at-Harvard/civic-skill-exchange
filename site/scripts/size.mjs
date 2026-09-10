/**
 * The English entry chunk, held to a recorded size.
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
 *   node scripts/size.mjs --record           # re-record the baseline from dist/
 *
 * TO RE-RECORD: a deliberate growth — a dependency added, a feature that earns
 * its bytes — is `npm run build` then `node scripts/size.mjs --record`, with the
 * new number and the reason for it in the commit message. Never re-record to
 * make a red gate green.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = join(SITE, "size-baseline.json");

/** The entry chunk Vite names for `index.html`. Asked of the build output
 *  rather than written down twice: a hash is in the filename. */
function entryChunk(dist) {
  const assets = join(dist, "assets");
  let names;
  try {
    names = readdirSync(assets).filter((n) => /^index-.*\.js$/.test(n));
  } catch {
    throw new Error(`No build to measure at ${assets}. Run \`vite build\` first.`);
  }
  if (names.length !== 1) {
    throw new Error(
      `Expected one entry chunk in ${assets}, found ${names.length}` +
      `${names.length ? `: ${names.join(", ")}` : ""}.`,
    );
  }
  const path = join(assets, names[0]);
  return { name: names[0], bytes: statSync(path).size };
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

function main(argv) {
  const distArg = argv.indexOf("--dist");
  const dist = distArg === -1 ? join(SITE, "dist") : resolve(argv[distArg + 1] ?? "");
  const entry = entryChunk(dist);

  if (argv.includes("--record")) {
    const baseline = { ...JSON.parse(readFileSync(BASELINE, "utf8")), bytes: entry.bytes };
    writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`);
    process.stdout.write(`size: recorded ${kb(entry.bytes)} (${entry.bytes} B)\n`);
    return 0;
  }

  const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
  const limit = Math.floor(baseline.bytes * (1 + baseline.marginPercent / 100));
  const drift = (entry.bytes / baseline.bytes - 1) * 100;

  process.stdout.write(
    `size: ${entry.name} ${kb(entry.bytes)} — baseline ${kb(baseline.bytes)}, ` +
    `${drift >= 0 ? "+" : ""}${drift.toFixed(1)}%, limit ${kb(limit)}\n`,
  );

  if (entry.bytes > limit) {
    process.stderr.write(
      `\nThe English entry chunk grew past its ${baseline.marginPercent}% margin.\n` +
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
