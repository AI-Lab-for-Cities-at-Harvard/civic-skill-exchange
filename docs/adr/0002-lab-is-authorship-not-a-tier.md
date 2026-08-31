# ADR 0002 — Lab is authorship, not a tier

**Status:** accepted, 2026-08-30
**Supersedes:** part of [ADR 0001](0001-reviewed-is-a-lab-attestation.md) ruling 5 — the 30-day waiting period, for the reserved namespace only
**Analysis:** [spikes/lab-as-a-tier.md](../spikes/lab-as-a-tier.md)
**Rulings:** [#53](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/53)

## Context

A `Written by the AI Lab` chip was added in #52, derived from the reserved
`civic-skills` namespace. The same PR removed the Community chip from Lab
listings. Three chips then read as three categories while `tier` stayed
two-valued — `"reviewed" | "community"`, derived by `resolve_tier()` in
`scripts/build_index.py` from the attestation ledger alone.

The question was whether Lab should become the third tier. The argument for it:
the Lab is the sole reviewer under ADR 0001, so a skill the Lab wrote was
necessarily read by the Lab.

That is true of reading and not of review. `REVIEW.md` asks for an adversarial
pass, pinned to one commit, expiring at a year. Authorship supplies none of
those. A namespace cannot drift: `civic-skills` matches forever, through every
future edit and after any future compromise, so a tier derived from it is one the
SHA pin cannot protect — and `TIERS.md` calls that pin the single highest-value
mechanism in the design.

## Decision

**1. Lab is not a tier.** `tier` stays two-valued and stays derived from the
ledger. The crimson chip marks authorship and asserts nothing about review.

**2. The Lab reaches Reviewed the same way anyone else does.** An entry in
`registry/reviewed.yml`, SHA-pinned and expiring at a year. On a Reviewed Lab
skill both chips show and mean different things: who wrote it, who read it.
ADR 0001 ruling 2 already permits this, with disclosure, and `DownloadBox`
already renders the disclosure.

**3. An unreviewed Lab listing shows the Community chip**, with its note, beside
the crimson chip. The Community chip is not a provenance label — it is the only
card-level statement that nobody has read the skill, and that is as true of a Lab
skill as of any other.

**4. The chip's wording is `Written by the AI Lab`.** Wording implying a standard
— "first-party", "official", "curated" — would assert a bar that is not defined.

**5. The Lab does not observe the 30-day waiting period on `civic-skills`.** It
still applies to every other namespace.

**6. Self-review with disclosure stands**, per ADR 0001 ruling 2. Not reopened.

## Consequences

### What ruling 5 gives up

ADR 0001 kept the waiting period because it *"does work no reviewer does"* — it
lets the weekly L0–L4 re-scan run several times before anyone reads the skill, so
a signature added to the scanner after submission still has a chance to fire
before the badge is granted. A Lab skill can now be reviewed and badged after one
scan pass.

This is accepted for the namespace the Lab controls and where it can re-scan on
demand. It is not extended to submissions, where the submitter is unknown and the
period is doing most of its work.

The one-year expiry is untouched.

### What holds

The SHA pin still governs every Reviewed listing, the Lab's included. A Lab skill
that changes after review drops to Community automatically, which is precisely
the protection a namespace-derived tier would not have had.

`tier` stays two-valued, so `counts` in the index, the standing notice in
`notice.ts`, the filter contract and the demotion path are unchanged.

### What must change

- `docs/TIERS.md` promotion step 2 states the 30-day period without exception;
  ruling 5 needs the carve-out.
- `.github/ISSUE_TEMPLATE/review-request.yml` carries the period as a checkbox,
  not enforced in code. Ruling 5 narrows what that checkbox means.

## When to revisit

If the catalogue grows enough that "Lab" reads as a quality claim by volume
rather than by wording, or if a second reviewer exists and Reviewed stops being a
single-party attestation. Neither is true today: the catalogue is one skill and
the ledger is empty.
