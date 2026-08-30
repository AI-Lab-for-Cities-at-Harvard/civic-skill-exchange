# ADR 0001 — Reviewed means the Lab read it

**Status:** accepted, 2026-08-30
**Supersedes:** the two-reviewer definition in `docs/TIERS.md` and `docs/REVIEW.md`
**Analysis:** [spikes/reviewed-tier-definition.md](../spikes/reviewed-tier-definition.md)
**Rulings:** [#38](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/38)

## Context

The Reviewed tier was specified as *two named people from different
organizations* reading one commit against a published checklist. It has never
run: `registry/reviewed.yml` holds `attestations: []`.

Two reviewers from different organizations was the strongest available bar, and
it was unstaffable at this stage. `TIERS.md` names the failure mode itself — *"a
Reviewed tier with a stale queue is worse than no Reviewed tier at all"* — and a
rule that keeps the tier permanently closed protects nothing.

The spike recommended a middle option: two reviewers, at least one not a
maintainer. The owner ruled for a single reviewer, with the argument for the
middle option on the table. This ADR encodes what was decided.

## Decision

**A Reviewed listing means the AI Lab for Cities at Harvard read that exact
commit against `docs/REVIEW.md` and put its name on it.**

1. **One reviewer: the Lab.** Not an independent attestation, and nothing in the
   registry may imply that it is.
2. **The Lab may review its own skills, with disclosure.** A skill authored by or
   affiliated with the Lab is marked as such wherever it appears. The marker is
   derived from the reserved `civic-skills` namespace, which already exists in
   `validator/src/rules.ts` — no new field, nothing to self-declare.
3. **The attestation pull request is approved by the Lab.** The repository has two
   review members; both are the owner, one HBS and one personal account. The
   `CODEOWNERS` gate on `registry/reviewed.yml` stays, so the mechanism is
   correct when a second person exists — but **this is one person, and no
   document may describe it as an independent check or a second pair of eyes.**
4. **The badge renders from the ledger.** No hardcoded reviewer count anywhere in
   the site.
5. **The 30-day Community waiting period and the one-year expiry both stand.**
   Neither depends on reviewer count, and the waiting period does work no
   reviewer does — it lets the weekly re-scan run several times first.
6. **The tier opens when the Lab has committed the hours**, and not before.

Unchanged, and still the point: **the attestation is pinned to a commit SHA.**
Content changes demote the skill automatically. That mechanism carried most of
the tier's security value before this decision and carries proportionally more
after it.

## Consequences

### What the registry gives up

The property that mattered: no single person — including a compromised reviewer
account — can confer the badge. The SHA pin already assumes a *contributor*
account may be compromised later; the reviewer's account is now the same class of
single point of failure, and nothing structural catches it.

Also gone: independent judgment on `REVIEW.md` item 7, civic appropriateness —
described there as *"the item no tool can do for you, and the reason human review
exists here at all."* One reading now, by a party that may also be the author.

These are real. They are accepted because the alternative was a tier that never
opened, and because a smaller honest claim beats a larger one nobody can make.

### What the wording must now carry

The claim is asserted in eleven places, and they move together or the site says
something untrue. In particular:

- `site/src/components/Badges.tsx` hardcodes `"two reviewers signed off"` on
  every Reviewed card. False from the moment this is accepted.
- `docs/REVIEW.md` — *"Two people who talked first are one reviewer"* is about
  independence between reviewers and no longer applies as written.
- `README.md`'s tier table says *"Two named reviewers"*.
- `docs/SECURITY.md` lists *"Two named reviewers against REVIEW.md"* as what
  admits a skill.

The full list is in the spike. Nothing in the build derives behaviour from the
reviewer count — `build_index.py` treats `reviewers` as an opaque list — so this
is a policy and copy change, not a mechanism change.

### What partly compensates, later

Adopter feedback ([#48](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/48))
restores a second perspective through a different mechanism: people who actually
ran a skill saying whether it worked. It is not review and must never be
presented as review, but it is the honest way to get more than one view of a
skill into the catalogue under this decision.

### When to revisit

When a second reviewer exists who is not the Lab. At that point the spike's
option C — two reviewers, at least one not a maintainer — becomes available, and
the `CODEOWNERS` gate is already shaped for it.
