# Architecture

The registry is a single GitHub repository. Skills are plain directories committed to it. A build step turns the tree into a static JSON index, and GitHub Pages serves a static site over that index. There is no database, no server, and no application to operate.

## Why this shape

Git supplies, for free, the primitives a registry needs to make any safety claim at all: content-addressed history, signed commits, line-level diffs, blame, and instant revert. A skill is a directory, so distribution is `git clone` with no packaging step. Contributors already have accounts. Pages hosting costs nothing and cannot be taken down by a traffic spike.

The tradeoff, taken deliberately: because we host the artifacts rather than pointers to them, we cannot delegate malware scanning to an upstream package registry the way a pointer-based registry can. We own the scanning. See [SECURITY.md](SECURITY.md).

---

## Repository layout

```
civic-skills/
├── skills/
│   └── {github-username}/              namespace = submitter, so ownership is checkable
│       └── {skill-name}/
│           ├── SKILL.md
│           ├── scripts/                executed by the agent, not read — scan as real code
│           └── references/             read by the agent
├── registry/
│   ├── categories.yml                  closed vocabulary
│   └── reviewed.yml                    SHA-pinned review attestations
├── schema/
│   └── skill.schema.json               JSON Schema for SKILL.md frontmatter
├── scripts/
│   ├── validate.py                     schema + ownership + structure
│   ├── scan.py                         signature layers, emits JSON findings
│   └── build_index.py                  tree + ledger → index.json
├── site/                               static reader over index.json
├── .github/
│   ├── CODEOWNERS
│   ├── ISSUE_TEMPLATE/
│   │   ├── submit-skill.yml
│   │   └── review-request.yml
│   └── workflows/
│       ├── validate.yml                untrusted, no token
│       ├── report.yml                  trusted, comments on PRs
│       ├── build.yml                   builds index + deploys Pages
│       └── rescan.yml                  weekly, whole tree
└── docs/
```

`CODEOWNERS` protects everything outside `skills/`. A PR that touches `schema/`, `scripts/`, `.github/`, or `registry/` requires maintainer review; a PR confined to one `skills/{user}/` directory does not.

### Namespace ownership

Check the folder namespace against **`github.event.pull_request.user.login`** — the account that opened the PR.

Do not check it against the fork owner. The reference implementation this design borrows from checks the fork, which means any member of an organization can fork the repo and write into that organization's namespace. Check the author.

---

## The skill contract

Frontmatter follows the [Agent Skills specification](https://agentskills.io/specification): exactly six top-level fields. Registry-specific data goes under `metadata`, which the spec defines as a string map, so we extend without leaving the standard.

```yaml
name: permit-status-explainer          # required, ≤64, matches parent directory
description: >                         # required, ≤1024 — the invocation surface
  Explains the status of a municipal building permit in plain language, given a
  permit record. Read-only; does not submit or modify applications.
license: MIT
compatibility: "Requires no network access and no credentials."
allowed-tools: Read, Grep              # least privilege; Bash(*) is an auto-reject
metadata:
  civic.category: permitting-licensing
  civic.jurisdiction: us-local
  civic.data-sensitivity: none
  civic.human-review: advisory-only
  civic.maintainer: "City of X, Department of Building Safety"
  civic.contact: "digital@cityofx.gov"
```

The `civic.` prefix keeps registry fields from colliding with anything a tool vendor adds to `metadata` later.

### Handling non-spec fields

Some agent tools accept fields beyond the six — roughly twenty in one popular implementation. Rejecting those would reject otherwise-working skills. **Quarantine them into `metadata` rather than failing the build**, and record what was moved in the PR comment so the contributor knows.

### Portability notes

- `license` is free text in the spec, not SPDX-constrained. We require an SPDX identifier by convention, but it is machine-*present*, not machine-*verifiable*. License checking stays a human step.
- `allowed-tools` is marked **experimental** in the spec and its semantics are under active dispute upstream. Re-verify before implementing against it.
- Install paths differ across tools (`.claude/skills/`, `.agents/skills/`, others). Do not hardcode one in generated install instructions.

---

## Categories

A closed vocabulary in `registry/categories.yml`, enforced by schema. Free-text tags make classification unenforceable and faceted browsing impossible.

```yaml
categories:
  - id: constituent-services
    label: Constituent services & casework
  - id: benefits-eligibility
    label: Benefits & eligibility
  - id: permitting-licensing
    label: Permitting & licensing
  - id: procurement-contracting
    label: Procurement & contracting
  - id: budget-finance
    label: Budget & finance
  - id: public-records-foia
    label: Public records & FOIA
  - id: open-data-publishing
    label: Open data & publishing
  - id: policy-legislative
    label: Policy & legislative analysis
  - id: grants-development
    label: Grants & development
  - id: emergency-public-safety
    label: Emergency management & public safety
  - id: plain-language-accessibility
    label: Plain language & accessibility
  - id: language-access
    label: Translation & language access
```

Start narrow. Adding a category is a PR against this file, and it should require evidence that at least two existing skills are miscategorized without it. Splitting a category later is easy; merging two that never should have been separate is not.

---

## The index build

`build_index.py` walks `skills/`, joins each skill against `registry/reviewed.yml`, attaches the latest scan findings, and writes:

```
/index.json                            all skills with tier, category, scan status
/categories.json                       the vocabulary, for the site's facets
/skills/{namespace}/{skill}.json       one skill's full metadata
```

The tier is **derived, never stored on the skill**. A skill is Reviewed if and only if `reviewed.yml` contains an unexpired attestation whose `sha` matches the skill directory's current commit. Everything else is Community. This is what makes the attestation meaningful — see [TIERS.md](TIERS.md).

An index entry:

```json
{
  "id": "cityofx/permit-status-explainer",
  "name": "permit-status-explainer",
  "description": "Explains the status of a municipal building permit...",
  "namespace": "cityofx",
  "license": "MIT",
  "allowed_tools": ["Read", "Grep"],
  "category": "permitting-licensing",
  "jurisdiction": "us-local",
  "data_sensitivity": "none",
  "human_review": "advisory-only",
  "tier": "reviewed",
  "sha": "a3f19c8d4b2e7f60a1c9d8e3b5f7204c6a8e1d92",
  "reviewed": { "date": "2026-09-14", "expires": "2027-09-14",
                "reviewers": ["alice-gov", "bob-nonprofit"] },
  "scan": { "last_run": "2026-09-20", "findings": [], "flags": 0 },
  "download": "https://github.com/ORG/civic-skills/tree/main/skills/cityofx/permit-status-explainer"
}
```

Publishing scan status into the index matters: it lets the site show what was checked, when, and by what — rather than presenting a listing as unqualified.

## The site

A static reader over `index.json`. It needs to do four things well and nothing else:

1. **Browse and filter** by category, jurisdiction, data sensitivity, and tier.
2. **Show the tier honestly.** A Community listing must carry its disclaimer on the card and on the detail page — at the point where someone is about to download, not buried in a footer.
3. **Show the skill's own text.** Render `SKILL.md`, list the files under `scripts/`, and display `allowed-tools` prominently. Someone should be able to evaluate a skill without leaving the page.
4. **Make downloading obvious.** A copyable command and a link to the tree.

Any static generator works, or none — the index is small enough to render client-side for a long time. Don't build a search backend; a client-side index over a few thousand entries is fast and has no operational surface.
