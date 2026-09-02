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
 */

import { readFileSync, writeFileSync } from "node:fs";

import { renderReport, type ScanFindings } from "./report.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const findingsPath = arg("findings");
if (!findingsPath) {
  console.error("Usage: report-cli.ts --findings <file> [--conclusion <s>] " +
    "[--failed-steps <file>] [--out <file>]");
  process.exit(2);
}

// A findings document that will not parse is not a clean run. Fail loudly here
// rather than posting a comment that says nothing matched.
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

const out = arg("out");
if (out) writeFileSync(out, body, "utf8");
else process.stdout.write(body);
