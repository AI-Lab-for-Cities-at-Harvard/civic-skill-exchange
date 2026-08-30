#!/usr/bin/env -S npx tsx
/**
 * Scan layers L0 and L1 — structure and namespace ownership.
 *
 * Checks that a skill is well-formed and that its author owns the namespace it
 * was written into. It does NOT verify that a skill is safe, correct, useful, or
 * fit for any purpose. Content security signatures live in scripts/scan.py; the
 * only thing that admits a skill to the Reviewed tier is a human working
 * docs/REVIEW.md.
 *
 * Usage:
 *   validate-skills all
 *   validate-skills skills/octocat/permit-status-explainer
 *   validate-skills --changed changed.txt --author octocat
 *
 * Exit code 0 if every checked skill passes, 1 otherwise.
 */

import { fileURLToPath } from "node:url";
import { dirname, relative, resolve } from "node:path";
import { loadCategories, validateSkill, discoverAll, discoverChanged } from "./skill";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv: string[]) {
  let changed: string | undefined;
  let author: string | undefined;
  let target: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--changed") { changed = argv[++i]; }
    else if (arg === "--author") { author = argv[++i]; }
    else if (arg && !arg.startsWith("--")) { target = arg; }
  }
  return { changed, author, target };
}

function main(): number {
  const { changed, author, target } = parseArgs(process.argv.slice(2));

  let targets: string[];
  if (changed) targets = discoverChanged(ROOT, changed);
  else if (target === "all") targets = discoverAll(ROOT);
  else if (target) targets = [resolve(target)];
  else {
    console.error("Give a target, 'all', or --changed <file>.");
    return 2;
  }

  if (targets.length === 0) {
    console.log("No skill directories to validate.");
    return 0;
  }

  const categories = loadCategories(ROOT);
  let failed = 0;

  for (const skillDir of targets) {
    const rel = relative(ROOT, skillDir) || skillDir;
    const { findings, notes } = validateSkill(skillDir, categories, author);

    for (const note of notes) console.log(`note  ${rel}: ${note}`);

    if (findings.length > 0) {
      failed += 1;
      console.log(`FAIL  ${rel}`);
      for (const f of findings) console.log(`        ${f.where}: ${f.message}`);
    } else {
      console.log(`ok    ${rel}`);
    }
  }

  console.log(
    `\n${targets.length - failed}/${targets.length} skills passed structural validation.`);
  if (failed > 0) {
    console.log("Structural validation checks form and ownership only — never content safety.");
  }
  return failed > 0 ? 1 : 0;
}

process.exit(main());
