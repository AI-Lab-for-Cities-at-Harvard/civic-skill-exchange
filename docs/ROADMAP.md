# Roadmap

**Current phase: 0.**

The ordering here is the recommendation, not a formality. Every documented failure mode of community registries is a *submission-volume* failure mode, so the volume comes last — deliberately.

---

## Phase 0 — Ask whether this already has a home

**~2 weeks. No code.**

Contact each of these and ask one question: *would you host or co-brand a civic agent-skill registry?*

- [ ] GovAI Coalition
- [ ] Code for America
- [ ] InnovateUS
- [ ] US Digital Response
- [ ] Beeck Center for Social Impact + Innovation
- [ ] Digital Government Hub
- [ ] Civic Tech Field Guide

An existing home brings the two things that cannot be manufactured: standing with government buyers, and reviewers who are not you. Both are harder to acquire than any part of the software.

This gate exists because the research behind this design **could not answer** whether such a home already exists — no claim about existing civic-tech AI catalogs survived verification. It is the only open question whose answer would change the decision to build rather than the design of what gets built.

**Exit:** either a partner, or a documented "no" from each. Record the outcome in this file.

---

## Phase 1 — Seed it closed

**~4–6 weeks. Submissions closed.**

Write or solicit 10–20 skills yourself. Build the machinery against real content.

- [ ] `schema/skill.schema.json` and `registry/categories.yml`
- [ ] `scripts/validate.py` — L0 and L1
- [ ] `scripts/scan.py` — L2 and L3 signatures
- [ ] `scripts/build_index.py` — tree + ledger → JSON
- [ ] Static site: browse, filter, render `SKILL.md`, show `allowed-tools`, copyable download
- [ ] `build.yml` deploying to Pages
- [ ] The docs in this directory, revised against what you actually learned

Let the categories be wrong the first time. They will be. Fixing a taxonomy across twenty skills is an afternoon; across two hundred it is a migration.

Ship the site read-only at the end of this phase. **A registry with twenty good skills and no submission form is useful. A registry with an open form and nothing in it is not** — and the empty-catalog version is the one that never recovers, because the first visitor is also the last.

**Exit:** the site is live, 10+ skills listed, and you have used your own submission path end to end at least twice.

---

## Phase 2 — Open the Community tier

**Ongoing.**

- [ ] `.github/ISSUE_TEMPLATE/submit-skill.yml`
- [ ] `validate.yml` (untrusted, no token) and `report.yml` (trusted, comments) — see [SECURITY.md](SECURITY.md)
- [ ] L4 scanner integration
- [ ] `rescan.yml` — **on day one, not later**
- [ ] Disclaimer rendered everywhere someone can download
- [ ] A stated response time you can actually meet
- [ ] `security@` address live and monitored

The weekly re-scan goes up with the submission form, not after it. It is ten lines of scheduling and it covers the failure mode a submission gate structurally cannot: the contributor whose account is compromised three months from now.

Publish a response time you can meet on your worst week, not your best. A missed SLA on a public page costs more trust than a modest one ever earns.

**Exit:** there is no exit. This is the steady state, and it is a legitimate place to stop permanently.

---

## Phase 3 — Open the Reviewed tier

**Only when staffed.**

- [ ] Two or more named reviewers from **different organizations**, with committed hours
- [ ] `registry/reviewed.yml` and the SHA-drift check in the build
- [ ] `.github/ISSUE_TEMPLATE/review-request.yml`
- [ ] Attestation expiry and demotion automation
- [ ] Tier displayed honestly on cards and detail pages

The tier's entire value is that credible people put their names on a specific commit hash. Opening it understaffed converts the registry's best asset into its largest liability, because people act on the badge while the process behind it has quietly stopped running.

**If you cannot staff this, ship Community-only and say so on the front page.** That is a coherent registry and several successful ones operate exactly that way. A Reviewed tier with a stale queue is strictly worse than none.

---

## Deliberately not planned

**Sandboxed detonation in CI.** It is the logical layer between the scanners and human review, and it is not on this roadmap because no verified source describes a working pattern for skill packages, its cost, or its false-negative rate. Treat it as a research task. Do not promise it in documentation until someone has built and measured it.

**A search backend.** A client-side index over a few thousand entries is fast and has no operational surface. Revisit only when the index actually gets slow.

**Federation or subregistries.** The two-tier split inside one repository covers the same need at this scale. Revisit if a partner organization wants to run its own curation over the same data.

---

## Re-verify before implementing

This ecosystem moves in weeks, and parts of this plan rest on specifications that are explicitly in flux:

- `allowed-tools` is marked **experimental** in the Agent Skills spec, and its semantics are under active dispute upstream
- The spec's field list and validator behavior should be checked directly rather than taken from this document
- The security base rates cited in [SECURITY.md](SECURITY.md) are a February 2026 snapshot
- Install-path conventions differ across agent tools and are still settling

Check the primary sources at the start of Phase 1, not at the end.
