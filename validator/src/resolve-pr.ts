/**
 * Which pull request the privileged reporting job may comment on.
 *
 * `validate.yml` runs on `pull_request`, which means a fork controls every byte
 * of what it uploads. `report.yml` consumes that artifact on `workflow_run`
 * while holding `pull-requests: write`, and it used to post to the number the
 * artifact named in `pr-number.txt`. So a fork could put a clean "no signatures
 * matched" report on any pull request or issue in the repository. `safe()` in
 * report.ts stops the comment from carrying markup; nothing stopped it from
 * being carried to the wrong place (#153).
 *
 * The reporting job therefore resolves the pull request itself. The
 * `workflow_run` event carries three fields a fork cannot forge, because they
 * describe what actually ran: `head_sha`, `head_repository.full_name` and
 * `head_branch`. The workflow lists the repository's open pull requests whose
 * head is `{head owner}:{head branch}` and hands them here; this module decides
 * whether exactly one of them is the pull request that run belongs to.
 *
 * `workflow_run.pull_requests[]` would be the direct answer and is not used: it
 * is empty for pull requests from forks, which is every submission the exchange
 * receives.
 *
 * THE RULE IS SINGULARITY, NOT BEST MATCH. Zero matches and several matches
 * resolve the same way — to nothing, with a reason for the job log. A fork
 * branch can be the head of two open pull requests at once (one per base
 * branch), and a report on the wrong one of them is the bug this file exists to
 * prevent. Not commenting is a nuisance; commenting somewhere else is the
 * vulnerability.
 *
 * Pure by construction: it takes the parsed API response and returns a verdict.
 * Reading files and calling the API belong to `resolve-pr-cli.ts` and the
 * workflow. That is what makes every case above a unit test in
 * `resolve-pr.test.ts` rather than something only a live fork could show us.
 */

/** A resolved pull request number, or nothing and why not. */
export type Resolution = { pr: number } | { pr: null; reason: string };

export interface ResolveInput {
  /** The parsed body of `GET /repos/{owner}/{repo}/pulls?state=open&head=…`.
   *  Untyped: it arrives over a file boundary and is not trusted to be shaped. */
  candidates: unknown;
  /** `github.event.workflow_run.head_sha` — the commit the run ran on. */
  headSha: unknown;
  /** `github.event.workflow_run.head_repository.full_name`, as `owner/repo`. */
  headRepo: unknown;
}

const FULL_SHA = /^[0-9a-f]{40}$/;

/** Lower-cased and trimmed, for comparing two spellings of the same name. */
const norm = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The `head` of one candidate, as `{sha, repo}` — or nothing usable. */
function headOf(candidate: unknown): { sha: string; repo: string } | null {
  if (!isRecord(candidate)) return null;
  const head = candidate["head"];
  if (!isRecord(head)) return null;
  const repo = head["repo"];
  return {
    sha: norm(head["sha"]),
    repo: isRecord(repo) ? norm(repo["full_name"]) : "",
  };
}

export function resolvePullRequest(input: ResolveInput): Resolution {
  const headSha = norm(input.headSha);
  const headRepo = norm(input.headRepo);

  // A missing head SHA must not degrade into "the only open pull request".
  if (!FULL_SHA.test(headSha)) {
    return { pr: null, reason: `the event carries no head commit SHA to match on` };
  }
  if (!headRepo.includes("/")) {
    return { pr: null, reason: `the event names no head repository for ${headSha}` };
  }

  const list = Array.isArray(input.candidates) ? input.candidates : [];
  const matched = list.filter((candidate) => {
    const head = headOf(candidate);
    return head !== null && head.sha === headSha && head.repo === headRepo;
  });

  if (matched.length === 0) {
    return {
      pr: null,
      reason: `no open pull request in this repository has head ${headSha} from ${headRepo}`,
    };
  }
  if (matched.length > 1) {
    // One head branch, two base branches. Which of them this report belongs on
    // is not a question this has an answer to.
    const numbers = matched.map((c) => (isRecord(c) ? String(c["number"]) : "?")).join(", #");
    return {
      pr: null,
      reason:
        `${matched.length} open pull requests have head ${headSha} from ` +
        `${headRepo} (#${numbers}); refusing to guess which the report is for`,
    };
  }

  const number = isRecord(matched[0]) ? matched[0]["number"] : undefined;
  if (typeof number !== "number" || !Number.isInteger(number) || number <= 0) {
    return {
      pr: null,
      reason: `the pull request with head ${headSha} has no usable number`,
    };
  }
  return { pr: number };
}
