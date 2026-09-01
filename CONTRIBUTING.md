# Contributing a skill

Thanks for sharing your work. This page is the whole contract: what a skill has to look like, what our automation checks, and what happens after you open the pull request.

## Before you start

Two things worth knowing up front:

1. **Submitting is easy; getting into the Reviewed tier is not.** Most submissions land in the Community tier, which is a real and useful place to be. See [docs/TIERS.md](docs/TIERS.md).
2. **Write for someone else's jurisdiction.** The skills that get used are the ones that don't hardcode your city's field names, form numbers, or URLs. Put local specifics in a `references/` file the user can swap out.

---

## 1. Create the directory

```
skills/{your-github-username}/{skill-name}/
├── SKILL.md          required
├── scripts/          optional — code the agent executes
└── references/       optional — data, templates, examples the agent reads
```

Rules the automation enforces:

- The folder namespace must match **your GitHub username** — the account opening the PR.
- `{skill-name}` must match the `name` field in `SKILL.md` exactly.
- Your PR may not touch anything outside your own namespace. Changes to schema, workflows, or documentation are separate PRs and need maintainer review.
- No symlinks, no binaries, no nested `.git` directories, no compiled artifacts.
- **All four size limits**, so you can check before you hit them:

  | Limit | Value |
  |---|---|
  | Files per skill | 100 |
  | Total per skill | 2 MB |
  | Any single file | 256 KB |
  | Frontmatter | 16 KB |

  The file count is not our ceiling — GitHub's own multi-file upload interface
  refuses more than a hundred, so a submission going that way could not exceed
  it anyway. The rest come from measuring real skills: the numbers are set where
  they stop refusing work people actually do.

## 2. Write `SKILL.md`

Frontmatter follows the [Agent Skills specification](https://agentskills.io/specification) — six fields, no more. Anything registry-specific goes under `metadata`, which the spec defines as a string map.

```yaml
---
name: permit-status-explainer
description: >
  Explains the status of a municipal building permit in plain language, given a
  permit record. Read-only; does not submit or modify applications.
license: MIT
compatibility: "Requires no network access and no credentials."
allowed-tools: Read, Grep
metadata:
  civic.category: permitting-licensing
  civic.jurisdiction: us-local
  civic.data-sensitivity: none
  civic.human-review: advisory-only
  civic.use-when: >
    A resident asks why their permit is stuck and the status codes in the system
    mean nothing to them.
  civic.avoid-when: >
    Not for appeals or variance questions — it explains a status, it does not
    advise on what to do about one.
  civic.maintainer: "City of X, Department of Building Safety"
  civic.contact: "digital@cityofx.gov"
  civic.affiliation: government
  civic.deployment: organization
  civic.deployed-at: "City of X, Department of Building Safety"
  civic.deployed-in: "US-MA / Boston"
  civic.deployed-since: "2026-03"
---

# Permit Status Explainer

## Steps
...
```

### Field reference

| Field | Required | Notes |
|---|---|---|
| `name` | yes | ≤64 chars, lowercase alphanumeric and hyphens, must match the directory |
| `description` | yes | ≤1024 chars. **Read the warning below.** |
| `license` | yes here | Optional in the spec; we require it. Use an SPDX identifier. |
| `compatibility` | recommended | ≤500 chars. State network, credential, and platform needs plainly. |
| `allowed-tools` | if needed | Least privilege. See the warning below. |
| `metadata` | yes | String map. All `civic.*` fields below are required. |

### `civic.*` metadata

| Field | Values | Meaning |
|---|---|---|
| `civic.category` | one of the [category vocabulary](docs/ARCHITECTURE.md#categories) | Closed list. Propose additions in a separate PR. |
| `civic.jurisdiction` | `us-local`, `us-state`, `us-federal`, `intl`, `generic` | Who this is shaped for. `generic` means no jurisdiction assumptions. |
| `civic.data-sensitivity` | `none`, `pii`, `protected` | What the skill is expected to touch. `protected` covers health, benefits, immigration, criminal justice, and anything else with a statutory regime. |
| `civic.human-review` | `none`, `advisory-only`, `decision-support` | Whether output affects a person's rights, benefits, or legal standing. |
| `civic.use-when` | free text, ≤500 | Optional. When the skill earns its place. Plain text — the site renders it as text, never as markdown. |
| `civic.avoid-when` | free text, ≤500 | Optional, and **the one worth writing.** Where it falls down and what it should not be pointed at. Same plain-text rule. |
| `civic.maintainer` | free text | Organization or individual accountable for the skill. |
| `civic.contact` | free text | A working address for security reports. |
| `civic.affiliation` | `government`, `nonprofit`, `academic`, `vendor`, `individual` | Affiliation of the party in `civic.maintainer`. |
| `civic.deployment` | `none`, `personal`, `team`, `organization` | The widest scope at which the skill has **actually** run. |
| `civic.deployed-at` | free text | The organization where it ran. Required unless `deployment: none` — and forbidden when it is. |
| `civic.deployed-in` | e.g. `US-MA / Boston`, `GB` | Where that organization operates. Same rule. |
| `civic.deployed-since` | `YYYY` or `YYYY-MM` | Optional. Duration carries more weight than any other part of the claim. |
| `civic.localization` | `generalized`, `localized` | Optional. Where the skill sits on the jurisdiction axis — see [docs/LOCALIZATION.md](docs/LOCALIZATION.md). Omit it if the skill has no jurisdiction-specific content. |

### When your skill fits, and when it doesn't

`civic.use-when` and `civic.avoid-when` are how the catalogue answers the question
an adopter actually has: is this for my situation? Both are optional. Both are
worth the two minutes.

`civic.avoid-when` is the one to spend the time on. Anyone can guess at what a
skill is for from its description; nobody but you knows where it breaks down,
what it should not be pointed at, or what it gets subtly wrong. A skill that is
honest about its limits gets adopted by the people it actually helps, instead of
by people who find out the hard way.

Keep both to a couple of sentences. They are a note on fit, not a second
description — and they are rendered as plain text, so markdown in them will show
up as literal asterisks.

`civic.data-sensitivity` and `civic.human-review` exist because they are the first two questions any government IT reviewer asks, and neither is answerable from reading the code. Answer them honestly — an understated declaration that contradicts the code is grounds for rejection, and it's the kind of thing a reviewer notices.

### Deployment provenance

`civic.deployment` says whether the skill has actually been used and at what scale.
It is useful context for anyone deciding whether to adopt it, and `none` is a
perfectly good answer — plenty of good skills have never run in production.

If you claim anything other than `none`, name where: `civic.deployed-at` and
`civic.deployed-in` are then required, because an unattributed claim isn't context.

### Two warnings that are not boilerplate

**`description` is how an agent decides to run your skill.** Agents invoke skills autonomously based on the name and description alone. A description broader than what the skill actually does means it fires when it shouldn't. Describe the behavior, not the aspiration.

**`allowed-tools` grants tool access without prompting the user.** The grant applies when the skill is invoked, with no approval dialog, and it is not gated by workspace trust. Request the narrowest set that works. A wildcard Bash grant (`Bash(*)`) is an automatic rejection — no exceptions, no discussion.

## 3. Write the body

Whatever helps an agent do the job. A useful shape:

```markdown
## Steps
The actual procedure.

## Output
Anything the skill must always say, verbatim.

## Adapting this to your jurisdiction
What a user has to change. Point at files under references/.
```

**Don't add "When to use this skill" or "What this skill does not do" sections.**
That guidance belongs in `civic.use-when` and `civic.avoid-when`, and stating it
in both places means one copy goes stale — the body copy, usually, because it is
the one nobody is looking at when they edit the frontmatter. The frontmatter is
also the only copy a person browsing the catalogue can see; the site does not
render skill bodies.

Boundaries that the agent has to *act* on are a different thing and belong in the
body, written as steps. "Don't use this on filled notices" is fit guidance and
goes in `civic.avoid-when`; "if the text contains a real person's name, stop and
tell the user" is a procedure and goes in `## Steps`.

If your skill produces anything affecting someone's rights, benefits, or legal standing, **say so in the skill's own output**, not just in the frontmatter. The person reading the result is not the person who read your metadata.

## 4. Regenerate the marketplace manifest

`.claude-plugin/marketplace.json` is what makes the registry installable with
`/plugin marketplace add`. It is generated from `skills/`, and CI fails a pull
request that adds a skill while leaving it stale:

```bash
python scripts/build_marketplace.py
```

Commit the result alongside your skill, before you open the pull request. One
command, and the check tells you exactly this if you forget.

If you submitted through the website and have no Python to hand, leave it — a
maintainer runs it before merging.

## 5. Open the pull request

Title it `Add {skill-name}`. In the description, tell us:

- What problem it solves and who for
- Whether it's been used in production anywhere
- Anything a reviewer should look at closely

### If you would rather not use git

The [submission page](https://ai-lab-for-cities-at-harvard.github.io/civic-skill-exchange/#/submit)
does the same thing through GitHub's own interface. Drop your skill on it as a
`.zip`, or give it the address of the repository the skill lives in — it reads
the file, fills in what it can, and asks only for what the registry needs and
your file does not already say.

It never sends your skill anywhere. The archive is unpacked in your browser, and
what it hands back is your own files with the extra fields written into
`SKILL.md`. Nothing else is touched.

Where it goes from there depends on how many files your skill has:

| | What happens |
|---|---|
| **One file** | The page opens GitHub's new-file editor with your `SKILL.md` already in it. Commit, and GitHub offers the pull request. |
| **More than one** | A link cannot carry a folder. The page hands your folder back corrected, then walks you through four steps: download it, fork this repository, drag the folder onto the upload page in your fork, and open the pull request. |

Either way **you** are the author of the commit, which is what the namespace
check in L1 requires — a skill committed on your behalf would fail it.

---

## What the automation checks

Everything below runs on your PR and reports back in a comment. Layers 0–2 fail the build; 3–4 flag for a human.

| | Check | Result |
|---|---|---|
| **L0** | Schema, name/directory match, category in vocabulary, size caps, no symlinks or binaries | Blocks |
| **L1** | PR author matches the namespace; nothing touched outside it | Blocks |
| **L2** | Dynamic-context commands invoking network or credential tools; `allowed-tools: Bash(*)`; environment and credential access patterns | Blocks |
| **L3** | External URLs, network calls in scripts, `eval`/`exec`, base64 blobs, unicode homoglyphs, instructions to suppress output | Flags |
| **L4** | Dedicated skill scanner plus generic static analysis over `scripts/` | Flags |

A flag is not a rejection. Several of these signatures fire on entirely legitimate skills — a bare external-URL match trips on anything that cites documentation. Flags route to a maintainer, who will ask you about them.

You can run the same L0 and L1 checks locally with `npx tsx validator/src/cli.ts skills/your-name/your-skill` — it is the identical module CI runs.

**If L2 blocks you**, do not work around the signature. Open the PR anyway and explain what you're trying to do. There are legitimate reasons to need network access, and a maintainer would much rather discuss it than watch someone obfuscate past a check.

Full detail, including the threat model behind these layers, is in [docs/SECURITY.md](docs/SECURITY.md).

## After merge

- Your skill lists in the **Community** tier and appears on the site within a few minutes.
- It is **re-scanned weekly** alongside everything else. If a new signature matches later, we open an issue and tag you.
- To update it, open another PR against your own directory.
- To request Reviewed-tier consideration, open an issue with the `review-request` template. See [docs/REVIEW.md](docs/REVIEW.md) for what reviewers look at — reading that checklist before you submit is the fastest way to write something that passes it.

## Removing your skill

Open a PR deleting the directory, or open an issue and we'll do it. No justification needed. Downstream users who already cloned it still have it — removal delists, it does not recall.
