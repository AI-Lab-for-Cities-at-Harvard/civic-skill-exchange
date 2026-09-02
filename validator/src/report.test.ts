/**
 * The report is the contract between the local check and the pull request
 * comment. Both call `renderReport`, so these fixtures are the only place the
 * wording lives that is not the renderer itself — changing a sentence has to be
 * a deliberate edit here too.
 *
 * The excerpt cases are the security cases. `findings.json` arrives in the
 * privileged reporting job as an artifact built from contributor content, so
 * every string in it is attacker-controlled. Nothing in it may become markup.
 */

import { describe, it, expect } from "vitest";
import { renderReport, type ScanFindings } from "./report";

const FOOTER =
  "---\n<sub>Automated checks verify structure, namespace ownership, and " +
  "known-bad signatures. They can only ever reject — a pass is not a statement " +
  "that a skill is safe. Signature scanning is triage, not a gate. See " +
  "[docs/SECURITY.md](../blob/main/docs/SECURITY.md).</sub>";

const findings = (results: ScanFindings["results"], scanned = 1): ScanFindings => ({
  generated: "2026-01-01T00:00:00+00:00",
  skills_scanned: scanned,
  results,
});

/** The report with every code span removed.
 *
 *  Fencing quotes contributor text; it does not delete it. So "the payload is
 *  absent" is the wrong property to assert — the right one is that no occurrence
 *  of it sits anywhere markdown would read it. This strips the inert copies and
 *  leaves anything that escaped. */
const outsideCodeSpans = (body: string): string => body.replace(/`[^`]*`/g, "");

describe("renderReport", () => {
  it("renders a clean run", () => {
    const body = renderReport({
      findings: findings({ "octocat/permit-status-explainer": { blocking: [], flags: [] } }, 3),
      conclusion: "success",
    });

    expect(body).toBe(
      "## Automated checks\n\n" +
      "No signatures matched across 3 skill(s).\n\n" +
      FOOTER,
    );
  });

  it("renders blocking and flagged findings, prefixed by the skill they came from", () => {
    const body = renderReport({
      findings: findings({
        "octocat/permit-status-explainer": {
          blocking: [
            { signature: "credential-access", file: "SKILL.md", line: 12, excerpt: "os.environ" },
          ],
          flags: [
            {
              signature: "external-url",
              file: "references/links.md",
              line: 3,
              excerpt: "https://example.gov/forms",
            },
          ],
        },
      }),
      conclusion: "failure",
      failedSteps: ["L2 + L3 — signature scan"],
    });

    expect(body).toBe(
      "## Automated checks\n\n" +
      "Something did not pass: `L2 + L3 — signature scan`.\n\n" +
      "### Blocking — 1\n\n" +
      "These signatures are high precision and fail the build.\n\n" +
      "- **credential-access** — `octocat/permit-status-explainer/SKILL.md` line 12\n" +
      "  <sub>`os.environ`</sub>\n\n" +
      "Please do not rewrite the code to dodge the pattern. Explain what you are " +
      "trying to do in a comment — there are legitimate reasons to need these, and " +
      "a maintainer would rather discuss it.\n\n" +
      "### Flagged for review — 1\n\n" +
      "These are noisy by design and do **not** block. Several fire on entirely " +
      "legitimate skills — an external-URL match trips on anything citing " +
      "documentation. A maintainer will look.\n\n" +
      "- **external-url** — `octocat/permit-status-explainer/references/links.md` line 3\n" +
      "  <sub>`https://example.gov/forms`</sub>\n\n" +
      FOOTER,
    );
  });

  // #88. A stale-manifest failure used to read as "the URL blocked me": the
  // comment announced a failure it could not attribute, directly above findings
  // it had just called harmless.
  it("names the failed step, and says the flags are not the cause", () => {
    const body = renderReport({
      findings: findings({
        "octocat/permit-status-explainer": {
          flags: [{ signature: "external-url", file: "SKILL.md", line: 4, excerpt: "https://x.gov" }],
        },
      }),
      conclusion: "failure",
      failedSteps: ["Marketplace manifest is current"],
    });

    expect(body).toContain(
      "Something did not pass: `Marketplace manifest is current`. The signature " +
      "scan found nothing blocking, so anything listed below is **not** the cause.",
    );
    expect(body).toContain("### Flagged for review — 1");
    expect(body).not.toContain("### Blocking");
  });

  it("does not blame the flags when something blocking did fail", () => {
    const body = renderReport({
      findings: findings({
        "octocat/permit-status-explainer": {
          blocking: [{ signature: "wildcard-bash-grant", file: "SKILL.md", line: 4 }],
        },
      }),
      conclusion: "failure",
      failedSteps: ["L2 + L3 — signature scan"],
    });

    expect(body).not.toContain("not** the cause");
  });

  it("falls back to the workflow run when it cannot say which step failed", () => {
    const body = renderReport({
      findings: findings({}),
      conclusion: "failure",
      failedSteps: [],
    });

    expect(body).toContain(
      "Validation did not pass. See the workflow run for details. The signature " +
      "scan found nothing blocking, so anything listed below is **not** the cause.",
    );
    // A failed run is not a clean run: it must not also claim nothing matched.
    expect(body).not.toContain("No signatures matched");
  });

  it("counts findings across every skill in the run", () => {
    const body = renderReport({
      findings: findings(
        {
          "a/one": { flags: [{ signature: "external-url", file: "SKILL.md", line: 1 }] },
          "b/two": {
            flags: [
              { signature: "external-url", file: "SKILL.md", line: 1 },
              { signature: "encoded-blob", file: "data.txt", line: 9 },
            ],
          },
        },
        2,
      ),
      conclusion: "success",
    });

    expect(body).toContain("### Flagged for review — 3");
    expect(body).toContain("`a/one/SKILL.md`");
    expect(body).toContain("`b/two/data.txt`");
  });

  // ------------------------------------------------------------------ //
  // The trust boundary.

  it("fences contributor text so it cannot become markup", () => {
    const body = renderReport({
      findings: findings({
        "evil/skill": {
          blocking: [
            {
              signature: "credential-access",
              file: "](https://evil.example)![x](y",
              line: 1,
              excerpt: "`` [click me](https://evil.example) ``",
            },
          ],
        },
      }),
      conclusion: "failure",
    });

    // Both fields are rendered, and both are inert: the file path's link syntax
    // and the excerpt's own backticks — which would have closed the span and let
    // the link out — survive only as quoted text.
    expect(body).toContain(
      "- **credential-access** — `evil/skill/](https://evil.example)![x](y` line 1\n" +
      "  <sub>`'' [click me](https://evil.example) ''`</sub>",
    );
    expect(outsideCodeSpans(body)).not.toContain("evil.example");
  });

  it("caps an excerpt so a long one cannot bury the comment", () => {
    const body = renderReport({
      findings: findings({
        "evil/skill": {
          blocking: [{ signature: "encoded-blob", file: "SKILL.md", line: 1, excerpt: "A".repeat(400) }],
        },
      }),
      conclusion: "failure",
    });

    expect(body).toContain("`" + "A".repeat(120) + "`");
    expect(body).not.toContain("A".repeat(121));
  });

  it("flattens newlines, which a code span does not survive", () => {
    const body = renderReport({
      findings: findings({
        "evil/skill": {
          blocking: [
            { signature: "encoded-blob", file: "SKILL.md", line: 1, excerpt: "one\n\n## Injected heading" },
          ],
        },
      }),
      conclusion: "failure",
    });

    expect(body).not.toContain("\n## Injected heading");
    expect(body).toContain("`one ## Injected heading`");
  });

  it("refuses to pass an unrecognised signature name through unfenced", () => {
    // The signature name is rendered in bold rather than a code span, so unlike
    // the other fields it cannot be fenced. It is one of a fixed vocabulary; a
    // value outside it did not come from scan.py.
    const body = renderReport({
      findings: findings({
        "evil/skill": {
          blocking: [{ signature: "[click](https://evil.example)", file: "SKILL.md", line: 1 }],
        },
      }),
      conclusion: "failure",
    });

    expect(body).not.toContain("evil.example");
    expect(body).toContain("**unrecognised-signature**");
  });

  it("renders a line number, and a skill count, even when the field is not a number", () => {
    const body = renderReport({
      findings: {
        skills_scanned: "3 <img src=x>" as unknown as number,
        results: {
          "evil/skill": {
            blocking: [
              { signature: "encoded-blob", file: "SKILL.md", line: "1 <img src=x>" as unknown as number },
            ],
          },
        },
      },
      conclusion: "failure",
    });

    expect(body).not.toContain("<img");
    expect(body).toContain("line 0");
  });

  it("survives a findings document that is not shaped like one", () => {
    for (const bad of [null, undefined, 42, "nope", { results: "no" }, { results: { "a/b": 7 } }]) {
      const body = renderReport({ findings: bad as never, conclusion: "success" });
      expect(body).toContain("## Automated checks");
      expect(body).toContain("No signatures matched across 0 skill(s).");
    }
  });

  it("treats a missing conclusion as a failure rather than announcing a pass", () => {
    const body = renderReport({ findings: findings({}) });
    expect(body).not.toContain("No signatures matched");
    expect(body).toContain("Validation did not pass.");
  });
});
