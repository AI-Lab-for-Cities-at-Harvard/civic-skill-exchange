/**
 * The pull request comment, rendered from `findings.json`.
 *
 * This wording used to live as JavaScript inside `.github/workflows/report.yml`,
 * where nothing outside CI could produce it. A contributor's local run and their
 * pull request comment then said different things about the same skill, and a
 * local pass that fails in CI teaches people to stop reading the local check.
 * So the renderer moved here and both callers ask it: `report.yml` posts what it
 * returns, and `validator/src/check.ts` prints it (#8).
 *
 * TWO RULES, INHERITED FROM THE PRIVILEGED JOB.
 *
 * 1. `findings.json` is built from contributor content, so every string in it is
 *    attacker-controlled. Render from typed fields — signature name, file path,
 *    line number — and put every free-text value through `safe()`, which fences
 *    it in a code span, neutralises the backticks that would close that span,
 *    flattens the newlines a code span does not survive, and caps the length.
 *    The comment is posted by a job holding `pull-requests: write`; an injected
 *    issue title has already stolen an npm publish token from a workflow shaped
 *    like that one.
 *
 * 2. This module takes data and returns a string. It reads no files and imports
 *    no `node:` builtin, because it is reachable from the package entry point
 *    that the site imports — `validator/src/purity.test.ts` enforces that by
 *    reading the source. Filesystem and subprocess work belongs in `check.ts`.
 *
 * The wording is fixed by fixtures in `report.test.ts`. Changing a sentence here
 * means changing it there, which is the point: it is a contract, not copy.
 */

/** One signature match, as `scripts/scan.py` writes it into `findings.json`. */
export interface SignatureFinding {
  signature: string;
  file: string;
  line: number;
  excerpt?: string;
  explanation?: string;
}

/** `findings.json`. Both lists are optional — scan.py omits neither, but this
 *  document arrives over an artifact boundary and is not trusted to be shaped. */
export interface ScanFindings {
  generated?: string;
  skills_scanned: number;
  results: Record<string, { blocking?: SignatureFinding[]; flags?: SignatureFinding[] }>;
}

export interface ReportInput {
  findings: ScanFindings;
  /** The run's conclusion. Anything other than `"success"` — including absent —
   *  is a failure: a report that cannot tell must not announce a pass. */
  conclusion?: string;
  /** Names of the steps that failed, so the report can say which rather than
   *  leave a contributor to guess from the findings below it (#88). */
  failedSteps?: string[];
}

/**
 * The signature vocabulary, mirroring `HARD`, `SOFT` and `MCP` in `scripts/scan.py`.
 *
 * The signature name is the one field rendered as markdown rather than fenced —
 * it is bold, so it cannot be a code span. It does not need to be, because it is
 * one of a fixed set: a value outside this list did not come from scan.py, and
 * is rendered as `unrecognised-signature` instead of passed through.
 *
 * `validator/src/signatures.test.ts` reads scan.py and fails if the two lists
 * diverge, so adding a signature there without adding it here is caught.
 */
export const SIGNATURE_NAMES: readonly string[] = [
  // L2 — hard signatures, which fail the build.
  "dynamic-context-exec",
  "dynamic-context-secrets",
  "wildcard-bash-grant",
  "credential-access",
  // L3 — soft signatures, which route to a human.
  "external-url",
  "network-in-script",
  "dynamic-execution",
  "encoded-blob",
  "bidi-or-invisible",
  "instruction-suppression",
  // L2, over the MCP servers a skill declares rather than over file text.
  "mcp-remote-execution",
];

const KNOWN = new Set(SIGNATURE_NAMES);

const EXCERPT_CAP = 120;

const FOOTER =
  "---\n<sub>Automated checks verify structure, namespace ownership, and " +
  "known-bad signatures. They can only ever reject — a pass is not a statement " +
  "that a skill is safe. Signature scanning is triage, not a gate. See " +
  "[docs/SECURITY.md](../blob/main/docs/SECURITY.md).</sub>";

const BLOCKING_INTRO = "These signatures are high precision and fail the build.";

const BLOCKING_OUTRO =
  "Please do not rewrite the code to dodge the pattern. Explain what you are " +
  "trying to do in a comment — there are legitimate reasons to need these, and " +
  "a maintainer would rather discuss it.";

const FLAGGED_INTRO =
  "These are noisy by design and do **not** block. Several fire on entirely " +
  "legitimate skills — an external-URL match trips on anything citing " +
  "documentation. A maintainer will look.";

const NOT_THE_CAUSE =
  "The signature scan found nothing blocking, so anything listed below is " +
  "**not** the cause.";

/**
 * Fence one untrusted string into an inert code span, capped to `cap`
 * characters.
 *
 * Three hazards, in the order they are dealt with: a backtick would close the
 * span and let what follows be markdown, so it becomes an apostrophe; a newline
 * ends a code span outright, so every whitespace run collapses to one space;
 * and a long value buries the rest of the comment, so it is capped.
 */
const fence = (value: unknown, cap: number): string =>
  "`" +
  String(value).replace(/`/g, "'").replace(/\s+/g, " ").trim().slice(0, cap) +
  "`";

/**
 * `fence`, capped to the pull request comment's 120 characters. Kept as its
 * own one-argument function — not `fence` with a default parameter — because
 * it is called as `.map(safe)` below: a default parameter there would read
 * `Array.prototype.map`'s index argument as the cap, capping every excerpt
 * but the first to nothing. `renderRescanReport` calls `fence` directly with
 * its own, much larger cap instead of adding a second one here.
 */
const safe = (value: unknown): string => fence(value, EXCERPT_CAP);

/** A count or line number, or 0 when the field is not one. A non-numeric value
 *  did not come from scan.py, and must not reach the comment as text. */
const count = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Findings for one skill, prefixed with the skill they came from so a report
 *  covering several is still attributable. */
function collect(
  into: SignatureFinding[],
  list: unknown,
  skillId: string,
): void {
  if (!Array.isArray(list)) return;
  for (const f of list) {
    if (!isRecord(f)) continue;
    into.push({
      signature: String(f["signature"]),
      file: `${skillId}/${String(f["file"])}`,
      line: count(f["line"]),
      ...(f["excerpt"] === undefined ? {} : { excerpt: String(f["excerpt"]) }),
    });
  }
}

const renderList = (list: SignatureFinding[]): string =>
  list
    .map((f) => {
      const name = KNOWN.has(f.signature) ? f.signature : "unrecognised-signature";
      return (
        `- **${name}** — ${safe(f.file)} line ${f.line}\n` +
        `  <sub>${f.excerpt ? safe(f.excerpt) : ""}</sub>`
      );
    })
    .join("\n");

const section = (heading: string, intro: string, list: SignatureFinding[]): string =>
  `${heading}\n\n${intro}\n\n${renderList(list)}\n\n`;

/** The whole comment body, for a run that has finished. */
export function renderReport(input: ReportInput): string {
  const { findings, conclusion, failedSteps } = input;

  const blocking: SignatureFinding[] = [];
  const flags: SignatureFinding[] = [];

  const doc: Record<string, unknown> = isRecord(findings) ? findings : {};
  const results = doc["results"];
  if (isRecord(results)) {
    for (const [skillId, result] of Object.entries(results)) {
      if (!isRecord(result)) continue;
      collect(blocking, result["blocking"], skillId);
      collect(flags, result["flags"], skillId);
    }
  }

  let body = "## Automated checks\n\n";

  if (conclusion !== "success") {
    // Step names come from our own workflow and CLI definitions, not from
    // contributor input — but they go through safe() anyway, because the next
    // person to edit this should not have to know which strings are trusted.
    const named = (Array.isArray(failedSteps) ? failedSteps : [])
      .filter((s) => typeof s === "string" && s.trim() !== "")
      .map(safe)
      .join(", ");

    const lead = named
      ? `Something did not pass: ${named}.`
      : "Validation did not pass. See the workflow run for details.";

    // #88. This used to announce a failure it could not attribute, directly
    // above findings it had just called harmless — so a stale-manifest failure
    // read as "the URL blocked me".
    body += (blocking.length ? [lead] : [lead, NOT_THE_CAUSE]).join(" ") + "\n\n";
  }

  if (blocking.length) {
    body += section(`### Blocking — ${blocking.length}`, BLOCKING_INTRO, blocking);
    body += `${BLOCKING_OUTRO}\n\n`;
  }

  if (flags.length) {
    body += section(`### Flagged for review — ${flags.length}`, FLAGGED_INTRO, flags);
  }

  // Only a run that both passed and matched nothing gets to say so. A failed run
  // claiming "no signatures matched" is the same misattribution as #88.
  if (!blocking.length && !flags.length && conclusion === "success") {
    body += `No signatures matched across ${count(doc["skills_scanned"])} skill(s).\n\n`;
  }

  return body + FOOTER;
}

// --------------------------------------------------------------------------- //
// The weekly re-scan's issue body (L6, #156).
//
// validateLog and scanLog are raw stdout from a run of validator/src/cli.ts
// and scripts/scan.py over the whole tree — the same layers renderReport
// already renders findings from, just captured as console output rather than
// findings.json. Contributor-authored content can appear in either: a matched
// excerpt scan.py prints is exactly the excerpt renderReport already fences.
// This is that same discipline applied to the log as a whole, so the job that
// runs it does not need Node dependencies installed to get it — `report-cli.ts`
// calls this the same way it already calls renderReport.

/** One skill demoted this run, as `build_index.py --drift-out` writes it. */
export interface DriftEntry {
  id: string;
  reason: string;
}

export interface RescanReportInput {
  /** stdout from validator/src/cli.ts's run over the whole tree. */
  validateLog: string;
  /** stdout from scripts/scan.py's run over the whole tree. */
  scanLog: string;
  /** Skills whose attestation no longer matches their current commit. */
  drift: DriftEntry[];
  /** Names of the steps that failed this run (validate, scan, the manifest
   *  check, or the drift check itself), so the issue says which rather than
   *  leaving a maintainer to read three logs to find out. Ours, not a
   *  contributor's — fenced anyway, on the same reasoning as `renderReport`'s
   *  step names: the next person editing this should not have to know which
   *  strings are trusted. */
  failedSteps?: string[];
}

const RESCAN_INTRO =
  "The weekly re-scan found something that was not there at submission time.\n\n" +
  "This is expected behaviour, not an emergency — it is the layer that " +
  "catches an already-merged skill going bad. Triage against " +
  "docs/SECURITY.md, and demote or delist per docs/TIERS.md.\n\n";

/** Said only when the manifest check is what failed.
 *
 *  The manifests are regenerated on `main` after merge, by
 *  `.github/workflows/manifest.yml` (#188). Nothing is asked of a submitter,
 *  and nothing else repairs `main` — this re-scan only reports. So a stale
 *  manifest here has exactly one cause worth looking at, and saying which
 *  stops a maintainer from going to look on a branch.
 *
 *  Matched on the word rather than on rescan.yml's exact step name, so
 *  renaming the step does not silently drop the note. */
const MANIFEST_NOTE =
  "**A stale manifest on `main` means the post-merge regeneration failed.** " +
  "Nothing is needed from a submitter: `.github/workflows/manifest.yml` " +
  "regenerates these files after every merge, and this re-scan only reports. " +
  "Check that run — its App token, the App's installation on this " +
  "repository, and whether the ruleset on `main` still names the App as a " +
  "bypass actor.\n\n";

const mentionsManifest = (failedSteps: unknown): boolean =>
  (Array.isArray(failedSteps) ? failedSteps : []).some(
    (step) => typeof step === "string" && /manifest/i.test(step),
  );

const renderDrift = (drift: DriftEntry[], cap: number): string =>
  drift.length
    ? drift.map((d) => `- ${fence(d.id, cap)} — ${fence(d.reason, cap)}`).join("\n")
    : "(none)";

/**
 * The weekly re-scan issue body. `cap` defaults far larger than the pull
 * request comment's, because a log is not one line — but the fencing rule
 * fires unchanged: every backtick in either log, in a demoted skill's id or
 * reason, or in a failed step's name becomes an apostrophe, so nothing
 * embedded in any of them can close a fence around it.
 */
export function renderRescanReport(input: RescanReportInput, cap = 8000): string {
  const { validateLog, scanLog, drift, failedSteps } = input;

  const named = (Array.isArray(failedSteps) ? failedSteps : [])
    .filter((s) => typeof s === "string" && s.trim() !== "")
    .map((s) => fence(s, cap))
    .join(", ");
  const lead = named ? `Failed: ${named}.\n\n` : "";

  return (
    RESCAN_INTRO +
    lead +
    (mentionsManifest(failedSteps) ? MANIFEST_NOTE : "") +
    `### Validation\n\n${fence(validateLog, cap)}\n\n` +
    `### Signatures\n\n${fence(scanLog, cap)}\n\n` +
    `### Attestation drift\n\n${renderDrift(drift, cap)}\n\n` +
    FOOTER
  );
}
