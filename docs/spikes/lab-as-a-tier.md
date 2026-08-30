# Spike: should Lab be a third tier?

**Status:** analysis, awaiting rulings. Issue [#53](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/53).

This document sets out what the site currently asserts, tests the premise the
question rests on, lays out three shapes the answer could take, and ends in six
numbered questions with recommendations. **It decides nothing.**

---

## 1. What the site says today, exactly

Three chips can appear on a listing. Two are tiers; one is not.

| Chip | Derived from | What it asserts |
|---|---|---|
| `Community · automated checks only` | absence of a ledger entry | nobody has read this skill |
| `Reviewed · {reviewers} read this commit` | `registry/reviewed.yml`, SHA-matched | the named party read this exact commit |
| `Written by the AI Lab` | `RESERVED_NAMESPACES` in `validator/src/rules.ts` | the Lab wrote it |

`tier` is two-valued — `"reviewed" | "community"` in `site/src/lib/types.ts` —
and `resolve_tier()` in `scripts/build_index.py` derives it from the ledger
alone. The third chip is orthogonal to tier and always has been.

**Two facts frame everything below.**

**No skill has ever been reviewed.** `registry/reviewed.yml` still holds
`attestations: []`. Every Lab skill is in the state this spike is about — written
by the Lab, read by nobody in the sense the ledger records.

**The registry currently contains one skill, and the Lab wrote it.**
`skills/civic-skills/plain-language-notice-rewriter` is the whole catalogue. So
today *every* listing is a Lab listing, and any rule about Lab listings is a rule
about the entire site.

### What #52 changed, and why it forces this question

Before [#52](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/pull/52),
a Lab-authored Community listing carried both chips: the amber warning and the
crimson mark. The owner ruled the amber chip off Lab listings as redundant on a
registry the Lab runs.

The result is that a Lab card shows a crimson chip where every other card shows
an amber warning, on identical evidence — both cleared the same automated checks
and neither was read. **The site now behaves as though Lab were a tier while
nothing defines what it claims.** That is the gap, and it is a gap in the
direction of over-claiming, which is the one direction this registry has
consistently refused to drift.

---

## 2. The premise, tested

The question was raised in these words:

> A skill that was authored by the Lab had to be read by the Lab.

Taken literally this is true and not in dispute: you cannot write a skill without
reading it. The question is whether that reading is the reading the badge
promises. Four things `REVIEW.md` asks for that authorship does not supply:

**a. Adversarial posture.** The checklist is nine items and the framing is
hostile — *"REJECT if you wouldn't run it"*, *"Read the description, then read
the body. If you'd have expected something different, that's the finding."* An
author reads to confirm intent. A reviewer reads to find the gap between the
description and the behaviour. These are different acts performed on the same
text, and the second is the one the tier sells.

**b. A pin to one commit.** `TIERS.md` calls the SHA pin *"the single
highest-value mechanism in the design"*. An attestation covers one exact content
hash; when the content changes it stops applying and the skill drops to Community
with nobody having to notice. **Authorship cannot drift.** A namespace is
permanent — `civic-skills` will match forever, through every future edit, by a
future maintainer, after a compromised account pushes to it. A tier derived from
a namespace is a tier the pin cannot protect, and the pin is what protects the
registry against its own documented dominant failure mode.

**c. Expiry.** Attestations lapse at one year, on the theory that a reading goes
stale. Authorship never lapses.

**d. Separation of the two roles in the record.** ADR 0001 ruling 2 permits
self-review and requires disclosure of it, which only means something while
authoring and reviewing stay distinguishable. If Lab authorship *is* Lab review,
ruling 2 has nothing left to disclose — the ADR's own mechanism dissolves.

**This is not an argument that the Lab reads its skills carelessly.** It is an
argument that "we wrote it" and "we reviewed it" are separate claims, and that
the registry loses something specific — the pin, the expiry, the disclosure —
when one is allowed to stand in for the other.

### The outside evidence points the same way

Docker's first-party tier is the closest analogue in wide use: a registry
operator publishing curated content of its own alongside third-party content, and
labelling the difference.

**Docker Official Images are curated by Docker in partnership with upstream
project maintainers**, and the review is performed by the official-images
maintainers rather than by whoever wrote the Dockerfile. The programme's own
`NEW-IMAGE-CHECKLIST.md` carries the line:

> 2+ official-images maintainer dockerization review?

So the first-party tier is the **more** reviewed one, not the less. Being the
registry operator is what obliges the extra reading; it does not substitute for
it. (Docker's separate *Verified Publisher* badge marks a vetted third-party
vendor — a provenance mark, not a review claim, which is much closer to what the
crimson chip does today.)

**Caveat worth stating:** Docker's programme has full-time staff and this one has
one person. The precedent establishes what the labels conventionally mean, not
what is staffable here. Question 6 is about that.

---

## 3. What `Lab` would have to assert

Whatever is ruled, the chip needs one sentence a reader can act on. The
candidates are not equivalent:

| Sentence | Honest today? | Survives a content change? |
|---|---|---|
| "The Lab wrote this." | **Yes** | Yes — and that is the problem; it survives changes that should invalidate a quality claim |
| "The Lab wrote this and read it against the checklist." | No — no attestation exists | Only if pinned to a SHA |
| "This is first-party content, held to a higher bar." | No — no higher bar is defined or applied | n/a |

Only the first is true of the registry as it stands.

---

## 4. Three shapes

### A. Lab stays a marker, orthogonal to tier

`tier` remains two-valued. The crimson chip means authorship and nothing else.
The Community chip returns to Lab listings, reversing the #52 ruling.

- *Costs:* the redundancy the owner objected to comes back.
- *Buys:* the data model and the site agree; nothing over-claims; no new
  mechanism.

### B. Lab becomes a third `tier` value, derived from the namespace

`resolve_tier()` returns `"lab"` when the namespace is reserved. Three-valued
`Tier` in `types.ts`, a third count in the index, new copy in `notice.ts` and
`TIERS.md`.

- *Costs:* a tier no SHA pin protects and no expiry bounds, asserted for
  content nobody has read. Every argument in §2 lands here. It also makes
  today's catalogue 100% top-tier, which communicates nothing.
- *Buys:* the site and the data model agree, and #52 stands as ruled.

### C. Lab is `Reviewed` plus authorship — a ledger entry the Lab writes about its own work

`tier` stays two-valued. The Lab attests to its own skills through the normal
ledger, SHA-pinned and expiring, and the crimson chip marks authorship beside
the Reviewed chip. ADR 0001 ruling 2 already permits exactly this, with
disclosure, and `DownloadBox` already renders the disclosure. **Nothing needs
building.** What is needed is the reading, and an entry in `reviewed.yml`.

- *Costs:* the Lab must actually work the checklist on its own skills before the
  badge appears. That is the work ADR 0001 ruling 6 says opens the tier.
- *Buys:* the pin, the expiry, the disclosure, and a claim that is true when
  made. It also makes the tier *run*, which it never has.

**On what C means for #52's ruling.** Under C a Lab skill spends its first 30
days unreviewed, and during that window the card shows a crimson chip and no
warning. So C does not by itself resolve the gap #52 opened — question 2 does.

---

## 5. The second-order things a third tier touches

Worth listing because option B looks like a one-line change to
`resolve_tier()` and is not:

- `counts` in `index.json` is `{total, reviewed, community}` and
  `site/src/lib/notice.ts` derives the standing Community notice from it. A third
  value changes the arithmetic of a sentence on the browse page.
- `filter.ts` matches `s.tier === filters.tier`. `Facets.tsx` renders no tier
  facet today, so a third value is invisible in filtering either way — but the
  filter contract widens.
- `TIER_LABELS` in `labels.ts`, and `TIERS.md`'s structure, which is written as
  two tiers throughout.
- `tests/test_build_index.py` asserts tier derivation directly.
- The `drift` flag and the demotion path in `TIERS.md` both assume a skill falls
  *to* Community. There is no defined demotion for a namespace-derived tier,
  because there is no event that could trigger one.

---

## 6. The decision questions

### 1. Does `Lab` become a tier at all?

*Recommendation: **no** — option C.* Keep `tier` two-valued and let the Lab earn
Reviewed on its own skills through the ledger, with the crimson chip marking
authorship beside it. It is the only shape where the badge's sentence is true
when it is shown, it needs no new mechanism, and it uses the permission ADR 0001
already granted. Option B asks the registry to assert quality for content nobody
has read, protected by neither the pin nor the expiry — the two mechanisms
`TIERS.md` and ADR 0001 both name as load-bearing.

### 2. What does an unreviewed Lab listing show on a card?

This is the live gap #52 opened, and it needs an answer under any option above.

*Recommendation: **restore the Community chip on unreviewed Lab listings**, and
let the crimson chip sit beside it.* The amber chip is not a provenance label
that the crimson one duplicates — it is the only card-level statement that nobody
has read the skill, and that is exactly as true of a Lab skill as of anyone
else's. If the redundancy is the objection, question 3 offers a cheaper fix than
deleting the warning.

### 3. If both chips stay, does the Community chip keep its note on Lab listings?

*Recommendation: **yes, keep it.*** *"automated checks only"* is the plainest
sentence on the card and the reason the chip works. If the row is too heavy, drop
the note on the **crimson** chip's neighbours rather than the warning itself —
but this is a layout problem, and layout should not be solved by removing
information.

### 4. Does the Lab hold itself to the 30-day waiting period?

`TIERS.md` promotion step 2 requires 30 days in Community before review, so the
weekly re-scan runs several times first. ADR 0001 ruling 5 kept it, explicitly
because *"the waiting period does work no reviewer does."*

*Recommendation: **yes**, unchanged.* It is not a staffing rule and single-Lab
review does not touch its rationale. Note it is enforced by a checkbox in the
issue template, not by code — worth a build issue if the tier starts running.

### 5. Does the crimson chip's wording change?

*Recommendation: **no**.* *"Written by the AI Lab"* states authorship and stops,
which is what keeps it from drifting into the ledger's territory. Any wording
that implies a standard — "first-party", "official", "curated" — asserts a bar
that is not defined and not applied, and would need one defined first.

### 6. Is the honest answer that the Lab should not badge its own skills at all?

Worth asking directly, because the spike on #38 asked the equivalent question
about Reviewed and the answer shaped the ADR.

*Recommendation: **no — self-review with disclosure is the right call and was
already made.*** ADR 0001 ruling 2 settled it, the disclosure mechanism exists
and ships, and `DownloadBox` says *"The AI Lab for Cities wrote and reviewed this
skill. Nobody outside the Lab has read it."* That is a smaller, honest claim, and
this spike should not relitigate it. What it should not become is a tier that
says something larger without saying it out loud.

---

## 7. Blast radius, if B is ruled

Counted rather than estimated, so a ruling for B is costed:

`scripts/build_index.py` (`resolve_tier`, `counts`) · `tests/test_build_index.py`
· `site/src/lib/types.ts` (`Tier`) · `site/src/lib/labels.ts` (`TIER_LABELS`) ·
`site/src/lib/notice.ts` (the standing notice's arithmetic) ·
`site/src/components/Badges.tsx` · `docs/TIERS.md` (written as two tiers
throughout) · `README.md` (two-column tier table) ·
`site/src/components/About.tsx` and `Bands.tsx` (both say "Two tiers") · a new
ADR superseding part of ADR 0001.

Under A or C: `Badges.tsx` and `docs/TIERS.md` only.

---

## Sources

- [Docker Official Images — `NEW-IMAGE-CHECKLIST.md`](https://github.com/docker-library/official-images/blob/master/NEW-IMAGE-CHECKLIST.md)
- [docker-library/official-images](https://github.com/docker-library/official-images)
- [Docker Verified Publisher: Trusted Sources, Trusted Content](https://www.docker.com/blog/docker-verified-publisher-trusted-sources-trusted-content/)
