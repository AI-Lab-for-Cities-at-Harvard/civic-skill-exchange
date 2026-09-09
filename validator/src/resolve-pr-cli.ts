/**
 * Decides which pull request the reporting job may comment on. What
 * `.github/workflows/report.yml` runs between listing the candidates and
 * posting.
 *
 * The workflow asks the API for the repository's open pull requests whose head
 * is the triggering run's head branch, and writes that response to a file. This
 * reads it, calls `resolvePullRequest`, and writes the resolved number — or an
 * empty file, which the posting step reads as "say nothing". The reason is
 * printed to the job log either way, because a report that does not arrive
 * needs somewhere to explain itself.
 *
 * The verdict is not made here. It is made in `resolve-pr.ts`, which takes data
 * and returns an answer, so every way of resolving the wrong pull request is a
 * unit test rather than something only a live fork could demonstrate.
 *
 * DEPENDENCY-FREE, for the same reason `report-cli.ts` is: it imports one local
 * module and one `node:` builtin and nothing from `node_modules`, so the
 * privileged job runs it with `node` alone — no `npm ci`, no `npx`, no package
 * fetched at run time into a job holding `pull-requests: write`.
 *
 * Usage:
 *   node resolve-pr-cli.ts --candidates candidates.json \
 *     --head-sha "$HEAD_SHA" --head-repo "$HEAD_REPO" --out resolved-pr.txt
 */

import { readFileSync, writeFileSync } from "node:fs";

import { resolvePullRequest } from "./resolve-pr.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const candidatesPath = arg("candidates");
const out = arg("out");
if (!candidatesPath || !out) {
  console.error(
    "Usage: resolve-pr-cli.ts --candidates <file> --head-sha <sha> " +
      "--head-repo <owner/repo> --out <file>",
  );
  process.exit(2);
}

// This file is written by a step of our own, not by the artifact. If it will not
// parse, something is wrong with the workflow rather than with the pull request:
// fail loudly and post nothing, rather than quietly commenting nowhere.
const candidates: unknown = JSON.parse(readFileSync(candidatesPath, "utf8"));

const resolution = resolvePullRequest({
  candidates,
  headSha: arg("head-sha"),
  headRepo: arg("head-repo"),
});

if (resolution.pr === null) {
  console.log(`Not commenting: ${resolution.reason}.`);
  writeFileSync(out, "", "utf8");
} else {
  console.log(`Resolved the run to pull request #${resolution.pr}.`);
  writeFileSync(out, String(resolution.pr), "utf8");
}
