# Security

## Reporting a problem

Open a [private security advisory](../../security/advisories/new). Please do not open a public issue for an active exploit.

Tell us the skill ID, what it does, and how you found it. We aim to acknowledge within 3 business days and to delist a confirmed malicious skill within 24 hours of confirmation.

---

## What a skill can do

Five properties of agent skills that everything below is designed around. If you contribute or review here, these are the facts to hold onto.

**1. A skill is an executable bundle, not a prompt file.** Skills can ship scripts in any language that the agent *runs* rather than reads. Reviewing the prose is not reviewing the skill.

**2. `allowed-tools` grants tool access with no permission prompt.** The grant applies when the skill is invoked, without an approval dialog, and it is not gated by workspace trust. A skill committed to a repository can grant itself broad tool access before anyone has agreed to anything.

**3. Dynamic-context commands execute before any model reads the file.** Commands in backtick-bang syntax run on the host during preprocessing. **This is why an LLM cannot be our safety gate** — model-level judgment sits downstream of code that has already executed.

**4. Skills load without being installed.** Agents pick them up from `.claude/skills/` directories nested anywhere below the working directory, from home directories, from plugins, and from added directories. A cloned repository introduces skills into a trusted session without anyone installing anything. This registry is one distribution channel among several: **delisting a skill does not un-ship it.**

**5. Our own CI is a target.** A pipeline that reads contributor-authored text and also holds a token is an exfiltration path. This is worse for a skill registry than for an ordinary repository, because SKILL.md bodies are natively instruction-shaped prose that needs no disguise, and our pipeline's stated purpose is to read them.

---

## The scan layers

Cheapest first. L0–L2 fail the build. L3–L4 flag for a human. L5 is the human gate. L6 runs on a schedule.

### L0 — Structure
Schema validation, `name` matches directory, category in the closed vocabulary, size caps, no symlinks, no binaries, no nested `.git`, YAML alias rejection as a billion-laughs defense. **Blocks.**

### L1 — Ownership
PR author's login matches the touched namespace. PR touches nothing outside `skills/{that-user}/`. Anything else routes to CODEOWNERS. **Blocks.**

L0 and L1 are implemented in `validator/`, and the submission page runs the same
module in the browser so a contributor is not told "valid" by the site and then
rejected here. **The browser result is advisory.** CI re-runs the module and is
the authority; nothing trusts a client-supplied result.

### L2 — Hard signatures
High precision. Safe to fail a build on. Implemented in `scripts/scan.py`.

```bash
# Dynamic-context commands invoking network or credential tools
grep -rE '!`.*(curl|wget|nc |bash|cat.*env|find.*secret|grep.*password)' skills/

# Unrestricted tool grants
grep -rE 'allowed-tools:.*Bash\(\*\)' skills/

# Credential and environment access
grep -rE '(os\.environ|getenv|process\.env|printenv|\$AWS_|\.ssh/)' skills/
```

**Blocks.** When one of these fires, ask the contributor rather than assuming malice — there are legitimate reasons to need environment access. But do not merge past it, and never accept an obfuscated rewrite that dodges the pattern.

### L3 — Soft signatures
Noisy by nature. These route to a human; they do not block.

- External URLs in skill bodies — fires on virtually any skill citing documentation, which makes it useless as an auto-blocker and genuinely useful as a triage signal
- Network calls anywhere under `scripts/`
- `eval`, `exec`, dynamic imports
- Encoded blobs above a length threshold
- Bidirectional and invisible control characters
- Instructions to disregard prior instructions, conceal an action, or omit something from a summary

### L4 — Scanners
A dedicated skill scanner plus generic static analysis over `scripts/`. Findings attach to the PR and publish into the index. **Flags.**

General-purpose LLM-security products do not cover this artifact type — most are scoped to data-flow analysis over application source and name no skill or manifest format. Use a purpose-built tool.

### L5 — Human gate
The AI Lab for Cities at Harvard against [REVIEW.md](REVIEW.md). Required only for the Reviewed tier. **Admits.**

One reader, and where the skill is Lab-authored the reader is also the author — disclosed on the listing. This layer used to be specified as two people from separate organizations, and dropping to one removes the property that mattered most here: no single account, including a compromised reviewer's, can confer the badge. Nothing structural catches that now, which is why L6 and the SHA pin carry proportionally more weight than they did. [ADR 0001](adr/0001-reviewed-is-a-lab-attestation.md) sets out the trade in full.

### L6 — Standing re-scan
Weekly re-run of L0–L4 across the whole tree, plus SHA-drift detection against `registry/reviewed.yml`. Opens an issue on any new finding.

This layer exists because everything above it is a *submission-time* gate, and submission-time gates do nothing about the dominant failure mode: a contributor whose account is compromised months after their skill merged.

### Signature scanning is triage, not a gate

Published bypass rates against open-source skill scanners are substantial, via payloads hidden in archive formats and code examples. **A clean scan means no known-bad signal matched. It does not mean a skill is safe.** Automated checks can only ever say *no*.

### What is deliberately absent

**Sandboxed detonation.** It is the logical layer between L4 and L5, and we are not claiming it. Do not promise it in documentation until someone has built and measured it here.

---

## CI hardening

The scanning job must never hold a token, because its entire job is to read attacker-controlled content. Getting this wrong turns the registry into the exfiltration vector rather than the defense against one.

### `validate.yml` — untrusted, holds nothing

```yaml
on: pull_request              # NOT pull_request_target
permissions:
  contents: read              # no write, no secrets, no packages
jobs:
  validate:
    steps:
      - uses: actions/checkout@<sha>          # pin actions by SHA, not tag
        with:
          persist-credentials: false
      - run: npx tsx validator/src/cli.ts --changed changed.txt --author "$PR_AUTHOR"
      - run: python scripts/scan.py --changed changed.txt --out findings.json
      - uses: actions/upload-artifact@<sha>
```

### `report.yml` — trusted, never touches skill content

```yaml
on:
  workflow_run:               # separate privileged job reads the artifact
    workflows: [Skills]
    types: [completed]
permissions:
  pull-requests: write
```

Download `findings.json` and render a comment from **structured fields only**. Never echo submitter-authored strings into the comment body unescaped.

The artifact is uploaded only when a pull request touches `skills/`, so most runs
find nothing to download. That is the ordinary path: the download step carries
`continue-on-error` and the render step exits quietly when the file is absent.
Keep both — without them the workflow goes red on every tooling and site pull
request, and a check that is always red is a check nobody reads.

### The rules that matter

1. **`pull_request`, never `pull_request_target`,** for anything that runs on untrusted content. `pull_request_target` executes in the trusted base-branch context with access to secrets — the classic pwn-request surface.
2. **No secrets in any job that reads skill content.** Split privileged work into a separate `workflow_run` job.
3. **Never `${{ }}`-interpolate event text into a model prompt.** If a model ever enters this pipeline, it must read untrusted text from a file or an environment variable.
4. **Pin actions by commit SHA,** not by tag. Tags move, and whoever controls a tag controls what runs in CI — including the job that holds `pull-requests: write` and the one that deploys the site. Every `uses:` carries a full 40-character SHA and a trailing `# vN.N.N` comment saying which release it is. `tests/test_workflows.py` fails if an unpinned ref, a bare SHA, or a "pin this later" comment appears.
5. **`persist-credentials: false`** on checkout.
6. **CODEOWNER approval** for anything outside `skills/`, and for promotion into the Reviewed tier.

### Keeping the pins current

Pinning without an update path trades a mutable ref for a stale one: the SHAs
stop moving, and so do the security fixes in them. `.github/dependabot.yml`
watches `github-actions` weekly and opens one grouped pull request.

Reviewing one is two checks: the trailing comment moved to the next release of
the *same* action, and the new SHA is what that tag actually points at.

```
git ls-remote https://github.com/actions/checkout.git 'refs/tags/v4.4.0^{}'
```

The `^{}` matters — without it an annotated tag returns the tag object's SHA
rather than the commit's, and the two will not match what the workflow needs.

### Repository settings

- Branch protection on `main`: require the validate checks, require review for CODEOWNER paths
- Require 2FA for all organization members
- Require signed commits from maintainers
- Never store a publish or deploy token in a workflow that reads `skills/`

---

## Advisories

When a skill is removed for a security reason, publish an advisory in `docs/advisories/` covering: what the skill did, which commit range was affected, how it was found, when it was delisted, and what someone who installed it should do.

Say clearly that delisting is not recall. Anyone who cloned the skill still has it, and telling them exactly what to look for on their own machine is the only remediation the registry can offer.
