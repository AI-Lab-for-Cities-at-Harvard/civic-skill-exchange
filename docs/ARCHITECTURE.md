# Architecture

The registry is a single GitHub repository. Skills are plain directories committed to it. A build step turns the tree into a static JSON index, and GitHub Pages serves a static site over that index. There is no database, no server, and no application to operate.

## Why this shape

Git supplies, for free, the primitives a registry needs to make any safety claim at all: content-addressed history, signed commits, line-level diffs, blame, and instant revert. A skill is a directory, so it is stored, reviewed and diffed as one. Pages hosting costs nothing and cannot be taken down by a traffic spike.

There is one packaging step, added deliberately. The index build writes a `.zip` per skill, because `git clone` and `npx degit` both assume developer tooling and a large part of this audience has neither — see [The index build](#the-index-build). The archive is a build output, never a stored artifact: the directory in git remains the only source of truth.

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
│   └── skill.schema.json               the frontmatter contract, as documentation
├── validator/                          npm workspace — L0 + L1, TypeScript
│   └── src/
│       ├── rules.ts                    pure frontmatter rules — browser AND CI
│       ├── structure-core.ts           pure structural rules — browser AND CI
│       ├── yaml-safety.ts              frontmatter size and aliases — both
│       ├── structure.ts                walks a directory into entries — Node only
│       └── cli.ts                       what CI invokes
├── scripts/
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

**A consequence worth stating plainly: an organization cannot own a namespace.**
The pull request author is always an individual account, so `namespace` must be
somebody's personal GitHub handle. The `cityofx` used in the examples here is
achievable only if a person registers an account by that name.

That means the registry attributes a skill to a person, while the institutional
claim — "City of X, Department of Building Safety" — lives in
`civic.maintainer` and `civic.affiliation`, which are self-reported and shown
that way. For a civic registry that is the weaker of the two claims, and it
forces an individual to put their own name on institutional work.

Whether institutional namespaces should exist, and what would verify one, is an
open question being settled in the submission spike. This section describes what
the code does today, not what it should do.

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
  civic.use-when: >                      # optional, ≤500, plain text
    A resident asks why their permit is stuck and the status codes in the system
    mean nothing to them.
  civic.avoid-when: >                    # optional, ≤500, plain text
    Not for appeals or variance questions — it explains a status, it does not
    advise on what to do about one.
  civic.maintainer: "City of X, Department of Building Safety"
  civic.contact: "digital@cityofx.gov"
  civic.affiliation: government          # who maintains it
  civic.deployment: organization         # widest scope at which it has ACTUALLY run
  civic.deployed-at: "City of X, Department of Building Safety"
  civic.deployed-in: "US-MA / Boston"    # ISO country, optional subdivision, optional locality
  civic.deployed-since: "2026-03"        # optional, YYYY or YYYY-MM
```

### Localization

`civic.localization` is optional and records whether a skill carries one
jurisdiction's specifics (`localized`) or has had them lifted out into a context an
adopter fills in (`generalized`). Skills with no jurisdiction-specific content omit
it. The validator rejects the one contradiction an adopter cannot resolve —
`generalized` alongside a named jurisdiction like `us-state`. See
[LOCALIZATION.md](LOCALIZATION.md).

### Fit

`civic.use-when` and `civic.avoid-when` are the submitter's account of when the
skill helps and when it does not. Both optional, both capped at 500 characters,
both **plain text and never markdown**.

That last constraint is the reason they are frontmatter rather than prose. The
detail page publishes structure but not content — no skill body, no file
contents — because rendering submitter-authored markdown on our origin is a
stored XSS surface (see [The site](#the-site)). But an adopter's first question
is whether a skill fits their situation, and before these fields the page had no
way to answer it. Two short plain-text fields answer it without reopening the
surface.

The validator checks length and nothing else. Neither field is required, and
there is no rule relating them: a blocking check on `civic.avoid-when` would
produce a sentence written to satisfy the check. The submission form pushes for
it instead, which is where the pushing belongs.

### The schema file

`schema/skill.schema.json` is the contract a contributor reads. It is no longer
executed — `validator/src/rules.ts` is the implementation — so a test in the
validator asserts the two agree on every enum, every required field, and the six
spec fields. Drift is a build failure rather than a surprise.

One thing the schema deliberately does not carry: the category enum. That lives
in `registry/categories.yml` and would go stale here the moment a category is
added.

### Provenance

The `deployment` fields are self-reported and published as such. One rule lives in
`validator/src/rules.ts` rather than the schema, because the error message
matters: a claim
other than `none` must name both `deployed-at` and `deployed-in`.

Provenance plays no part in deriving tier. It is context for a human deciding
whether to adopt a skill, not a security signal.

### Where an imported copy came from

`civic.source-repo` and `civic.source-commit` record the repository a skill was
copied in from, and the commit it was taken at. Both optional: a skill written
here has no upstream. The submission page fills them when someone imports from
GitHub. They surface in the index as `source`, an object or `null`.

**The registry always holds the content.** That is what the SHA pin, the weekly
re-scan and the published archive work against, and none of them could work
against a repository this project does not control.

So these fields are provenance, not a link. Nothing in the build resolves them,
fetches them or compares against them, and a listing stays valid when its
upstream is deleted, renamed or made private. A commit without a repository is
rejected — it names a point in a history nobody can find.

Whether a listing may instead *point at* an external repository, holding no copy
of its own, is a different question and a much larger one. It is a spike:
[#62](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/62).

---

## Categories

A closed vocabulary in `registry/categories.yml`, enforced by schema. Free-text tags make classification unenforceable and faceted browsing impossible.

```yaml
categories:
  - id: constituent-services
    label: Constituent Services & Casework
  - id: benefits-eligibility
    label: Benefits & Eligibility
  - id: permitting-licensing
    label: Permitting & Licensing
  - id: procurement-contracting
    label: Procurement & Contracting
  - id: budget-finance
    label: Budget & Finance
  - id: public-records-foia
    label: Public Records & FOIA
  - id: open-data-publishing
    label: Open Data & Publishing
  - id: policy-legislative
    label: Policy & Legislative Analysis
  - id: grants-development
    label: Grants & Development
  - id: emergency-public-safety
    label: Emergency Management & Public Safety
  - id: plain-language-accessibility
    label: Plain Language & Accessibility
  - id: language-access
    label: Translation & Language Access
```

Start narrow. Adding a category is a PR against this file, and it should require evidence that at least two existing skills are miscategorized without it. Splitting a category later is easy; merging two that never should have been separate is not.

---

## The index build

`build_index.py` walks `skills/`, joins each skill against `registry/reviewed.yml`, attaches the latest scan findings, and writes:

```
/index.json                            all skills with tier, category, scan status
/categories.json                       the vocabulary, for the site's facets
/skills/{namespace}/{skill}.json       one skill's full metadata
/skills/{namespace}/{skill}.zip        the same skill, downloadable
```

The archive is written from the file list the detail payload already computed,
so the two cannot disagree about what a skill contains — including about
symlinks, which that traversal drops. It is deterministic: fixed timestamps and
sorted entries, so an unchanged skill produces byte-identical output rather than
churning the Pages artifact on every build.

The tier is **derived, never stored on the skill**. A skill is Reviewed if and only if `reviewed.yml` contains an unexpired attestation whose `sha` matches the skill directory's current commit. Everything else is Community. This is what makes the attestation meaningful — see [TIERS.md](TIERS.md).

An index entry, with every field the build actually emits:

```json
{
  "id": "cityofx/permit-status-explainer",
  "name": "permit-status-explainer",
  "namespace": "cityofx",
  "description": "Explains the status of a municipal building permit...",
  "license": "MIT",
  "compatibility": "Requires no network access and no credentials.",
  "allowed_tools": ["Read", "Grep"],
  "category": "permitting-licensing",
  "jurisdiction": "us-local",
  "localization": "localized",
  "data_sensitivity": "none",
  "human_review": "advisory-only",
  "use_when": "A resident asks why their permit is stuck and the status codes...",
  "avoid_when": "Not for appeals or variance questions — it explains a status...",
  "maintainer": "City of X, Department of Building Safety",
  "source": null,
  "provenance": {
    "self_reported": true,
    "affiliation": "government",
    "deployment": "organization",
    "deployed_at": "City of X, Department of Building Safety",
    "deployed_in": "US-MA / Boston",
    "deployed_since": "2026-03"
  },
  "tier": "reviewed",
  "reason": "attestation matches current content",
  "reviewed": { "date": "2026-09-14", "expires": "2027-09-14",
                "reviewers": ["AI Lab for Cities at Harvard"], "notes": "Read-only." },
  "sha": "a3f19c8d4b2e7f60a1c9d8e3b5f7204c6a8e1d92",
  "has_scripts": false,
  "script_files": [],
  "scan": { "last_run": "2026-09-20", "blocking": 0, "flags": 0, "signatures": [] },
  "path": "skills/cityofx/permit-status-explainer",
  "download": "https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/tree/main/skills/cityofx/permit-status-explainer"
}
```

`civic.contact` is deliberately absent. It exists so somebody can be reached
about a security report, not to be harvested out of a static JSON file.

The per-skill detail payload is this plus two fields the index does not carry:
`files`, the tree with sizes and which entries the agent executes rather than
reads, and `archive`, the path and size of the downloadable `.zip`.

Publishing scan status into the index matters: it lets the site show what was checked, when, and by what — rather than presenting a listing as unqualified.

## The site

A static reader over `index.json`. It needs to do four things well and nothing else:

1. **Browse and filter** by category, jurisdiction, data sensitivity, and tier.
2. **Show the tier honestly.** A Community listing must carry its disclaimer on the card and on the detail page — at the point where someone is about to download, not buried in a footer.
3. **Describe the skill honestly without republishing it.** The page publishes structure, not content: the file tree with sizes, which files are executed rather than read, `allowed-tools` shown prominently, and the submitter's own `civic.use-when` / `civic.avoid-when` as plain text. It does **not** render `SKILL.md` or any file contents — submitter-authored markdown on our origin is a stored XSS surface, and describing a skill does not require it. Anyone reading the actual code reads it on GitHub, where they get the real thing rather than our rendering of it.
4. **Make downloading obvious, without assuming tooling.** A `.zip` anyone can take with a browser alone, plus copyable `degit` and `clone` commands for people working in a terminal.

Any static generator works, or none — the index is small enough to render client-side for a long time. Don't build a search backend; a client-side index over a few thousand entries is fast and has no operational surface.
