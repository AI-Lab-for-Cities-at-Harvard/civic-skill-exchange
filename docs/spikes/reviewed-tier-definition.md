# Spike: what should a Reviewed listing mean?

**Status:** analysis, awaiting rulings. Issue [#38](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/38).

The proposal is to change the Reviewed tier from **two named people from
different organizations** to **one reviewer drawn from the project maintainers**.

This document sets out what the current rule buys, what the change would cost,
what the outside evidence actually says, and ends in six numbered questions with
recommendations.

---

## 1. What the rule is today, exactly

From [TIERS.md](../TIERS.md): *two named people from different organizations read
every line of this specific commit against a published checklist and put their
names on it.*

[REVIEW.md](../REVIEW.md) makes the independence explicit and strict:

> Two reviewers work independently, from **different organizations**. Don't
> discuss the skill until both have finished. **Two people who talked first are
> one reviewer.**

Two facts about the current state matter for everything below.

**The tier has never run.** `registry/reviewed.yml` contains
`attestations: []`. No skill has been reviewed, no queue has decayed, and no
reviewer has burned out. Any staffing argument here is anticipatory rather than
observed.

**The checklist is small.** REVIEW.md bounds it to *roughly fifteen minutes per
skill*. Two reviewers is therefore about thirty minutes of reading per skill —
which is unlikely to be the real constraint. The expensive part is finding a
second person at a different organization and getting two independent passes
scheduled, not the reading itself.

---

## 2. What two-from-different-organizations actually buys

Four distinct properties, worth separating because the proposed change collapses
all four at once and they are not equally valuable.

**a. No single person can confer the badge.** Including a maintainer. Including
a compromised account. This is the property with real security content: the
registry's SHA-pinned attestation model already assumes a contributor account may
be compromised later, and a one-person sign-off makes the *reviewer's* account a
single point of failure in the same way.

**b. No single organization can confer it.** A weaker but real property, and the
one most expensive to keep.

**c. Two independent readings of the judgment item.** REVIEW.md item 7 — civic
appropriateness — is described as *"the item no tool can do for you, and the
reason human review exists here at all."* It asks whether a skill affects
somebody's rights, benefits or legal standing. That is exactly the kind of
question where two competent people can reasonably differ, and where a second
reading is worth more than on any mechanical item.

**d. Two-person control over the ledger.** `CODEOWNERS` gates
`registry/reviewed.yml` to `@…/reviewers`. Today the attestation PR is opened by
one reviewer and approved under that gate, so writing the ledger already involves
more than one person.

---

## 3. The honest case for changing it

**The tier is unstaffable as specified, and an unstaffed tier is worse than
none.** TIERS.md argues this itself: *"A Reviewed tier with a stale queue is
worse than no Reviewed tier at all… people act on the badge while the process
behind it has quietly stopped running."* If two-from-different-organizations
means the tier never opens, the rule has not protected anything — it has just
prevented the registry from making any human claim at all.

**The registry has one skill.** Designing the review regime for a volume that
does not exist is its own failure mode.

**Reviewer capacity is explicitly the scarce resource.** REVIEW.md says reviewers
may decline *"without completing the checklist and without giving a reason"* —
the document already treats capacity as the binding constraint.

---

## 4. What the outside evidence says

Two findings, and they point in opposite directions.

**The widely-adopted bar is weaker than ours.** The OpenSSF Best Practices
criterion requires only that modifications be *"reviewed before release by a
person other than the author"* — and its rationale addresses our exact question
directly:

> Note that the set of criteria allow people within the same organization to
> review each others' work; **it is better to require different organizations**
> to review each others' work, **but in many situations that is not practical.**

So: different-organizations is acknowledged as *better*, and commonly dropped as
impractical. That is a precedent for relaxing the affiliation constraint. It is
**not** a precedent for dropping to one person — OpenSSF's floor is still
not-the-author.

**Nobody has solved the single-maintainer case.** SLSA's issue on exactly this —
how a solo-maintainer project meets a two-person review requirement — is
[open and unresolved](https://github.com/slsa-framework/slsa/issues/93), with no
documented position from the framework maintainers. There is no settled industry
answer to adopt here.

---

## 5. Two problems the proposal creates that are not about counting

**Self-certification.** `skills/civic-skills/` is a maintainer-seeded namespace.
`CODEOWNERS` gates it to `@…/maintainers`, and the validator skips the author
check for it precisely because maintainer approval is the stronger control. Under
a one-maintainer rule, a maintainer reviewing a maintainer-authored skill is the
project vouching for its own work and calling the result "Reviewed". Whatever is
decided about counting, this needs an explicit rule.

**The badge would over-claim, in a string.** `site/src/components/Badges.tsx`
hardcodes `"two reviewers signed off"` on every Reviewed card, and
`DownloadBox.tsx` renders `reviewers.join(" and ")`. The claim is asserted in
**eleven places** across docs, site copy, the issue template and the ledger's
schema comment. Nothing in the build derives behaviour from the
reviewer *count* — `build_index.py` treats `reviewers` as an opaque list — so
this is a policy and copy change, not a mechanism change.

That is cheaper than it looks, but it means a half-done change leaves the site
telling people something untrue.

---

## 6. The options

| | Independence | Cross-org | Staffable | Self-cert risk |
|---|---|---|---|---|
| **A.** Two, different orgs *(today)* | strong | yes | hardest | none |
| **B.** Two, affiliation unconstrained | strong | no | moderate | needs a rule |
| **C.** Two, at least one not a maintainer | strong | no | moderate | handled |
| **D.** One maintainer *(proposed)* | none | no | easiest | acute |
| **E.** Ship Community-only | n/a | n/a | n/a | n/a |

**E deserves saying out loud.** TIERS.md already names it as a coherent
destination: *"Ship Community-only and say so on the front page. That is a
coherent, defensible registry, and several successful registries operate exactly
that way."* If the honest answer is that nobody has committed hours, E is more
truthful than D.

---

## Decision questions

**1. How many reviewers, and with what affiliation constraint?**
*Recommendation: **C** — two reviewers, at least one of whom is not a project
maintainer; different organizations preferred and recorded when true, but not
required.* This keeps property (a), which carries the actual security content,
and drops (b), which the OpenSSF rationale says is commonly impractical. It is a
smaller step than D and it is the one the outside evidence supports. If C is also
unstaffable, the honest next step is E, not D.

**2. May a maintainer review a maintainer-authored skill?**
*Recommendation: no.* A skill under `skills/civic-skills/` requires at least one
reviewer who is not a maintainer, and no reviewer may review their own work.
Cheap to state, and it closes the self-certification gap under any option.

**3. Does the attestation pull request still carry a second pair of eyes?**
*Recommendation: yes, and make it explicit.* The `CODEOWNERS` gate on
`registry/reviewed.yml` should require approval from a reviewer **other than** the
one who opened it. Under option D this would be the only remaining two-person
control; under C it is redundant but free.

**4. Does the tier keep the name "Reviewed"?**
*Recommendation: keep the name, and stop hardcoding the count.* Render the badge
from `reviewers.length` rather than the literal `"two reviewers signed off"`, so
the site states what actually happened and cannot over-claim after a future
change. The word "Reviewed" stays accurate under any option except D, where it
becomes a claim the project makes about itself.

**5. Do the 30-day Community waiting period and the one-year expiry still hold?**
*Recommendation: yes, both, unchanged.* Neither depends on reviewer count, and
the waiting period does work no reviewer does — it lets the weekly re-scan run
several times before anyone reads the skill.

**6. What must be true before the tier opens at all?**
*Recommendation: name a floor and hold it.* Under C: two people who have
committed hours, at least one not a maintainer. If that floor cannot be met, ship
Community-only and say so on the front page rather than opening a tier that will
go stale. This is TIERS.md's own test, restated for whatever option is chosen.

---

## If a change is ruled

The claim is asserted in eleven places, and they move together or the site lies:

**Eleven assert the claim.** `docs/TIERS.md` (definition, ledger example,
promotion step 3) · `docs/REVIEW.md` ("Two people who talked first are one
reviewer") · `docs/SECURITY.md` ("Two named reviewers against REVIEW.md") ·
`docs/ARCHITECTURE.md` (the two-handle example) · `registry/reviewed.yml`
(schema comment: *"two, from different organizations"*) · `README.md` (tier
table) · `.github/ISSUE_TEMPLATE/review-request.yml` ·
`site/src/components/Badges.tsx` (*"two reviewers signed off"*, on every card) ·
`Bands.tsx` · `About.tsx` · `DownloadBox.tsx`

**One would need changing without asserting it:** `.github/CODEOWNERS` gates
`registry/reviewed.yml` to `@…/reviewers` but says nothing about a count. It is
where question 3's recommendation would land.

Question 4's recommendation removes one of these permanently: a badge rendered
from `reviewers.length` cannot drift from the ledger again.
