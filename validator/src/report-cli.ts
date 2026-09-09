/**
 * Renders findings.json into the pull request comment body. What
 * `.github/workflows/report.yml` runs.
 *
 * The privileged job posts what this prints. It therefore does as close to
 * nothing as a program can: read two files, call `renderReport`, write one. All
 * of the judgement — and all of the fencing — is in `report.ts`, which the local
 * check calls too, so the two cannot say different things.
 *
 * DELIBERATELY DEPENDENCY-FREE. It imports one local module and two `node:`
 * builtins, and nothing from `node_modules`. That is what lets report.yml run it
 * with `node` alone — no `npm ci`, no `npx`, no package fetched at run time into
 * a job holding `pull-requests: write`. Node strips the type annotations itself
 * (22.18+/24+), which is why the import below carries an explicit `.ts`.
 *
 * Keep it that way. If this file ever needs a dependency, the dependency is
 * being installed inside the privileged job, and that is the thing to argue
 * about rather than the import.
 *
 * Usage:
 *   node report-cli.ts --findings findings.json --conclusion success \
 *     --failed-steps failed-steps.json --out body.md
 *
 * `--failed-steps` names a JSON array of step names; a missing or unreadable
 * file means "we could not tell", which the report already has wording for.
 *
 * Additive: `--rescan` renders the weekly re-scan's issue body instead
 * (#156), from the same layers' raw output rather than findings.json —
 * `rescan.yml` runs everything over the whole tree, not just a diff.
 *
 *   node report-cli.ts --rescan --validate-log validate.log \
 *     --scan-log scan.log --drift-json drift.json --out issue-body.md
 *
 * `--drift-json` is `build_index.py --drift-out`'s output: an unreadable or
 * missing file means "no drift", the same way a missing findings artifact
 * means "nothing to report" elsewhere in this pipeline.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { renderReport, renderRescanReport, type DriftEntry, type ScanFindings } from "./report.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function readOr(path: string | undefined, fallback: string): string {
  return path && existsSync(path) ? readFileSync(path, "utf8") : fallback;
}

function readDrift(path: string | undefined): DriftEntry[] {
  if (!path || !existsSync(path)) return [];
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
      .map((d) => ({ id: String(d["id"]), reason: String(d["reason"]) }));
  } catch {
    // A drift file that will not parse is not a run with no drift, but this
    // is a report, not a gate — degrade to "none reported" rather than fail
    // the issue the rest of the run's findings still need to reach.
    return [];
  }
}

const out = arg("out");

if (arg("rescan") !== undefined) {
  const body = renderRescanReport({
    validateLog: readOr(arg("validate-log"), "(no output)"),
    scanLog: readOr(arg("scan-log"), "(no output)"),
    drift: readDrift(arg("drift-json")),
  });

  if (out) writeFileSync(out, body, "utf8");
  else process.stdout.write(body);
} else {
  const findingsPath = arg("findings");
  if (!findingsPath) {
    console.error("Usage: report-cli.ts --findings <file> [--conclusion <s>] " +
      "[--failed-steps <file>] [--out <file>]\n" +
      "   or: report-cli.ts --rescan [--validate-log <file>] [--scan-log <file>] " +
      "[--drift-json <file>] [--out <file>]");
    process.exit(2);
  }

  // A findings document that will not parse is not a clean run. Fail loudly
  // here rather than posting a comment that says nothing matched.
  const findings = JSON.parse(readFileSync(findingsPath, "utf8")) as ScanFindings;

  let failedSteps: string[] = [];
  const stepsPath = arg("failed-steps");
  if (stepsPath) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(stepsPath, "utf8"));
      if (Array.isArray(parsed)) failedSteps = parsed.map(String);
    } catch {
      // Which step failed is a nicety; the report degrades to naming the run.
    }
  }

  const body = renderReport({ findings, conclusion: arg("conclusion"), failedSteps });

  if (out) writeFileSync(out, body, "utf8");
  else process.stdout.write(body);
}
