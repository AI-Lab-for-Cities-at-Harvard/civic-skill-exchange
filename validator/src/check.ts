#!/usr/bin/env -S npx tsx
/**
 * One local check: all four layers, reported the way the pull request will
 * report them.
 *
 * Both halves already ran locally before this existed — `cli.ts` for L0 and L1,
 * `scripts/scan.py` for L2 and L3. What could not be reproduced was the comment:
 * the Blocking and Flagged sections, their counts and their wording lived as
 * JavaScript inside `.github/workflows/report.yml`. A contributor saw one thing
 * here and another on their pull request, and a local pass that fails in CI
 * teaches people to stop running the local check (#8).
 *
 * So the last section this prints is not a reproduction of the comment. It is
 * the comment, rendered by `report.ts`, which is what report.yml calls too.
 *
 * Usage:
 *   check-skill skills/octocat/permit-status-explainer
 *   check-skill all
 *   check-skill skills/octocat/permit-status-explainer --author octocat
 *
 * Exit code 0 if every layer passed, 1 otherwise.
 *
 * Why this drives scan.py as a subprocess rather than being written in either
 * language alone: see "One command over two languages" in docs/DEVELOPMENT.md.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderReport, type ScanFindings } from "./report";
import { discoverAll, loadCategories, validateSkill } from "./skill";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * The step names are `.github/workflows/validate.yml`'s, character for
 * character. The report names the step that failed, so a local failure and a
 * pull request failure have to name the same one — otherwise the report matches
 * and the sentence above it does not.
 *
 * `tests/test_workflows.py` checks that these two still agree.
 */
const STEP_STRUCTURE = "L0 + L1 — structure and namespace ownership";
const STEP_SCAN = "L2 + L3 — signature scan";

function parseArgs(argv: string[]): { target?: string; author?: string } {
  let target: string | undefined;
  let author: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--author") author = argv[++i];
    else if (arg && !arg.startsWith("--")) target = arg;
  }
  return { target, author };
}

/** The interpreter that has scan.py's dependencies. The repository's own venv
 *  first, because that is what the documented setup builds; `$PYTHON` wins over
 *  it for anyone whose environment is arranged differently. */
function pythonCommand(): string {
  const fromEnv = process.env["PYTHON"];
  if (fromEnv) return fromEnv;
  const venv = join(ROOT, ".venv", "bin", "python");
  return existsSync(venv) ? venv : "python3";
}

/** L0 and L1, in process. Prints per-skill lines, because a report that says
 *  only "structure failed" is no use to the person who has to fix it — the
 *  pull request comment can be terse there, since the run log is a click away. */
function runStructure(targets: string[], author?: string): boolean {
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
  return failed === 0;
}

/** L2 and L3, by running scan.py and reading the findings document it writes —
 *  the same document CI uploads and report.yml renders. */
function runScan(target: string): { findings: ScanFindings; passed: boolean } {
  const python = pythonCommand();
  const dir = mkdtempSync(join(tmpdir(), "civic-skill-check-"));
  const out = join(dir, "findings.json");

  try {
    const run = spawnSync(python, [join(ROOT, "scripts", "scan.py"), target, "--out", out], {
      encoding: "utf8",
    });

    // A scanner that could not run is not a scanner that found nothing. Say so
    // and stop, rather than rendering a clean report over an absent layer.
    if (run.error || run.status === null || !existsSync(out)) {
      const why = run.error ? run.error.message : (run.stderr || "").trim();
      console.error(
        `\nCould not run the signature scan with '${python}'.\n${why}\n\n` +
        "scan.py needs pyyaml. See docs/DEVELOPMENT.md — Setup. Set $PYTHON to " +
        "choose a different interpreter.");
      process.exit(2);
    }

    const findings = JSON.parse(readFileSync(out, "utf8")) as ScanFindings;
    // scan.py exits 1 when an L2 signature matched, 0 otherwise.
    return { findings, passed: run.status === 0 };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main(): number {
  const { target, author } = parseArgs(process.argv.slice(2));
  if (!target) {
    console.error("Give a skill directory, or 'all'.");
    return 2;
  }

  const targets = target === "all" ? discoverAll(ROOT) : [resolve(target)];
  if (targets.length === 0) {
    console.log("No skill directories to check.");
    return 0;
  }

  const structurePassed = runStructure(targets, author);
  const { findings, passed: scanPassed } = runScan(target === "all" ? "all" : resolve(target));

  const failedSteps: string[] = [];
  if (!structurePassed) failedSteps.push(STEP_STRUCTURE);
  if (!scanPassed) failedSteps.push(STEP_SCAN);

  console.log(
    "\n" +
    "─".repeat(72) + "\n" +
    "What the pull request comment would say:\n" +
    "─".repeat(72) + "\n");
  console.log(renderReport({
    findings,
    conclusion: failedSteps.length === 0 ? "success" : "failure",
    failedSteps,
  }));

  return failedSteps.length === 0 ? 0 : 1;
}

process.exit(main());
