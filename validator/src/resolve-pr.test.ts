/**
 * Which pull request the privileged reporting job is allowed to comment on.
 *
 * These are the security cases. The reporting job holds `pull-requests: write`
 * and is triggered by a `workflow_run` whose artifact a fork wrote, so the only
 * fields it can believe are the ones the event gives it: the head SHA, the head
 * repository and the head branch. Every case below is a way the answer could be
 * the wrong pull request, and the required outcome is the same for all of them —
 * resolve to nothing and post nothing.
 */

import { describe, it, expect } from "vitest";
import { resolvePullRequest } from "./resolve-pr";

const SHA = "9f2c1b4d5e6f708192a3b4c5d6e7f8091a2b3c4d";
const OTHER_SHA = "0123456789abcdef0123456789abcdef01234567";
const REPO = "octocat/civic-skill-exchange";

/** One entry of the `GET /repos/{owner}/{repo}/pulls` response, trimmed to the
 *  fields the resolver reads. */
const candidate = (number: number, sha: string, repo = REPO): unknown => ({
  number,
  head: { sha, repo: { full_name: repo } },
});

describe("resolvePullRequest", () => {
  it("resolves the one open pull request whose head is the run's head", () => {
    const result = resolvePullRequest({
      candidates: [candidate(42, SHA)],
      headSha: SHA,
      headRepo: REPO,
    });

    expect(result).toEqual({ pr: 42 });
  });

  it("resolves nothing when no open pull request has that head", () => {
    const result = resolvePullRequest({ candidates: [], headSha: SHA, headRepo: REPO });

    expect(result.pr).toBeNull();
    expect(result.pr === null && result.reason).toMatch(/no open pull request/i);
  });

  it("resolves nothing when two open pull requests share the head", () => {
    // A fork branch can be the head of two open pull requests at once, one per
    // base branch. Which of them the report belongs on is not knowable here.
    const result = resolvePullRequest({
      candidates: [candidate(42, SHA), candidate(43, SHA)],
      headSha: SHA,
      headRepo: REPO,
    });

    expect(result.pr).toBeNull();
    expect(result.pr === null && result.reason).toMatch(/2 open pull requests/i);
  });

  it("resolves nothing when the pull request has moved on since the run", () => {
    // A newer push. The findings describe the old tree, and the pull request is
    // no longer at the commit they were produced from.
    const result = resolvePullRequest({
      candidates: [candidate(42, OTHER_SHA)],
      headSha: SHA,
      headRepo: REPO,
    });

    expect(result.pr).toBeNull();
  });

  it("resolves nothing when the match's head is a different repository", () => {
    // Two forks can hold the same commit. The event names the repository the
    // run belongs to, so a match from anywhere else is not it.
    const result = resolvePullRequest({
      candidates: [candidate(42, SHA, "impostor/civic-skill-exchange")],
      headSha: SHA,
      headRepo: REPO,
    });

    expect(result.pr).toBeNull();
  });

  it("ignores case and surrounding space in the SHA and the repository name", () => {
    const result = resolvePullRequest({
      candidates: [candidate(42, SHA.toUpperCase(), REPO.toUpperCase())],
      headSha: ` ${SHA} `,
      headRepo: REPO,
    });

    expect(result).toEqual({ pr: 42 });
  });

  it("resolves nothing without a head SHA to compare against", () => {
    // An absent head SHA must not degrade into "the only open pull request".
    for (const headSha of [undefined, "", null, 0]) {
      expect(resolvePullRequest({ candidates: [candidate(42, SHA)], headSha, headRepo: REPO }).pr)
        .toBeNull();
    }
  });

  it("resolves nothing from a candidate list that is not a list of pull requests", () => {
    for (const candidates of [undefined, null, "42", 42, { number: 42 }]) {
      expect(resolvePullRequest({ candidates, headSha: SHA, headRepo: REPO }).pr).toBeNull();
    }
  });

  it("resolves nothing when the matching entry has no usable number", () => {
    for (const number of [undefined, null, "42; rm -rf /", 0, -1, 1.5]) {
      const result = resolvePullRequest({
        candidates: [{ number, head: { sha: SHA, repo: { full_name: REPO } } }],
        headSha: SHA,
        headRepo: REPO,
      });
      expect(result.pr).toBeNull();
    }
  });

  it("skips malformed entries rather than throwing on them", () => {
    const result = resolvePullRequest({
      candidates: [null, "nonsense", { head: null }, { head: { sha: SHA } }, candidate(42, SHA)],
      headSha: SHA,
      headRepo: REPO,
    });

    expect(result).toEqual({ pr: 42 });
  });

  it("says why it resolved nothing, for the job log", () => {
    const result = resolvePullRequest({ candidates: [], headSha: SHA, headRepo: REPO });

    expect(result.pr === null && result.reason).toContain(SHA);
  });
});
