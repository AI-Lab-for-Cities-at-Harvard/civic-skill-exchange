# Spike: should Lab be a third tier?

**Status:** ruled. Issue [#53](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/53).

> Kept as the analysis behind the decision, not as a description of current
> behaviour. The rulings are in §7; the documents that own each behaviour are
> where it is described.

Three chips read as three categories, but `tier` is two-valued. This asks
whether Lab should become the third, and ends in six questions the owner ruled
on.

---

## 1. What the site says today

| Chip | Derived from | Asserts |
|---|---|---|
| `Community · automated checks only` | no ledger entry | nobody has read this skill |
| `Reviewed · {reviewers} read this commit` | `registry/reviewed.yml`, SHA-matched | the named party read this exact commit |
| `Written by the AI Lab` | `RESERVED_NAMESPACES` in `validator/src/rules.ts` | the Lab wrote it |

`tier` is `"reviewed" | "community"` in `site/src/lib/types.ts`, derived by
`resolve_tier()` in `scripts/build_index.py` from the ledger alone. The third
chip is orthogonal to tier.

Two facts frame the rest:

- **No skill has been reviewed.** `registry/reviewed.yml` holds
  `attestations: []`.
- **The catalogue is one skill and the Lab wrote it.**
  `skills/civic-skills/plain-language-notice-rewriter`. Any rule about Lab
  listings is currently a rule about the whole site.

[#52](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/pull/52)
removed the Community chip from Lab listings. A Lab card then shows a crimson
chip where every other card shows an amber warning, on the same evidence: both
cleared the automated checks, neither was read. The site behaves as though Lab
were a tier while nothing defines what it claims.

---

## 2. The premise

> A skill that was authored by the Lab had to be read by the Lab.

True, and not the reading the badge promises. Four things `REVIEW.md` asks for
that authorship does not supply:

**Adversarial posture.** The checklist is hostile by design — *"REJECT if you
wouldn't run it"*. An author reads to confirm intent; a reviewer reads to find
the gap between the description and the behaviour.

**A pin to one commit.** `TIERS.md` calls the SHA pin *"the single
highest-value mechanism in the design"*. A namespace cannot drift: `civic-skills`
matches forever, through every future edit and after any future compromise. A
tier derived from a namespace is one the pin cannot protect.

**Expiry.** Attestations lapse at a year because a reading goes stale.
Authorship does not lapse.

**A distinction to disclose.** ADR 0001 ruling 2 permits self-review with
disclosure, which requires authoring and reviewing to stay separable.

### Outside evidence

Docker is the closest analogue: a registry operator publishing curated content
of its own beside third-party content. Its first-party tier is the more reviewed
one. Official Images are curated by Docker with upstream maintainers, and the
programme's `NEW-IMAGE-CHECKLIST.md` asks:

> 2+ official-images maintainer dockerization review?

Docker's separate *Verified Publisher* badge marks a vetted third-party vendor —
provenance, not review — which is closer to what the crimson chip does.

Caveat: Docker has staff and this has one person. The precedent shows what the
labels conventionally mean, not what is staffable here.

---

## 3. What `Lab` would assert

| Sentence | True today? | Survives a content change? |
|---|---|---|
| "The Lab wrote this." | yes | yes — including changes that should invalidate a quality claim |
| "The Lab wrote this and read it against the checklist." | no | only if pinned to a SHA |
| "First-party content, held to a higher bar." | no — no bar defined | n/a |

---

## 4. Three shapes

**A — marker, orthogonal to tier.** `tier` stays two-valued, the crimson chip
means authorship, the Community chip returns. Reverses #52.

**B — third `tier` value from the namespace.** `resolve_tier()` returns `"lab"`.
Three-valued `Tier`, third count in the index, new copy in `notice.ts` and
`TIERS.md`. No pin, no expiry, and today's catalogue becomes 100% top tier.

**C — Reviewed plus authorship.** The Lab attests to its own skills through the
normal ledger, SHA-pinned and expiring; the crimson chip marks authorship beside
the Reviewed chip. ADR 0001 ruling 2 permits it and `DownloadBox` renders the
disclosure. No new mechanism — what is needed is the reading and a ledger entry.

---

## 5. What a third tier would touch

Option B is not a one-line change to `resolve_tier()`:

- `counts` in `index.json` is `{total, reviewed, community}`, and
  `site/src/lib/notice.ts` derives the standing notice from it.
- `filter.ts` matches `s.tier === filters.tier`. `Facets.tsx` renders no tier
  facet, so a third value is invisible in filtering, but the contract widens.
- `TIER_LABELS` in `labels.ts`; `docs/TIERS.md`, written as two tiers throughout.
- `tests/test_build_index.py` asserts tier derivation directly.
- The `drift` flag and the demotion path assume a skill falls *to* Community.
  A namespace-derived tier has no event that could demote it.

Under A or C: `Badges.tsx` and `docs/TIERS.md` only.

---

## 6. The questions

**1. Does `Lab` become a tier?** *Recommendation: no — option C.* It is the only
shape where the badge is true when shown, it needs no new code, and it uses the
permission ADR 0001 already granted.

**2. What does an unreviewed Lab listing show on a card?** *Recommendation:
restore the Community chip beside the crimson one.* The amber chip is the only
card-level statement that nobody has read the skill, and that is as true of a Lab
skill as of any other.

**3. Does the Community chip keep its note on Lab listings?**
*Recommendation: yes.* *"automated checks only"* is why the chip works.

**4. Does the Lab hold itself to the 30-day waiting period?**
*Recommendation: yes, unchanged.* ADR 0001 ruling 5 kept it because it does work
no reviewer does — the weekly re-scan runs several times first.

**5. Does the crimson chip's wording change?** *Recommendation: no.* *"Written by
the AI Lab"* states authorship and stops. Wording that implies a standard —
"first-party", "official", "curated" — asserts a bar that is not defined.

**6. Should the Lab badge its own skills as Reviewed at all?**
*Recommendation: yes; already settled by ADR 0001 ruling 2.*

---

## 7. Rulings

Recorded 2026-08-30.

**1. No third tier — option C.** `tier` stays two-valued. The Lab attests to its
own skills through the ledger, SHA-pinned and expiring; the crimson chip marks
authorship beside the Reviewed chip.

**2. The Community chip returns to unreviewed Lab listings.** Both chips show.
This reverses the ruling built in #52.

**3. The chip keeps its note.** `Community · automated checks only`. Ruled by the
card layout chosen with question 2.

**4. The Lab does not wait 30 days on its own skills.** *The recommendation was
to keep the period; the owner ruled to waive it for the reserved namespace, with
the argument on the table.*

This supersedes part of **ADR 0001 ruling 5**, which kept the waiting period
unchanged. The period still applies to every other namespace. What it buys —
several passes of the weekly re-scan before anyone reads the skill — is given up
for `civic-skills` only.

**5. The crimson chip's wording is unchanged.** `Written by the AI Lab`. Ruled by
acceptance of the copy shipped in #52.

**6. Self-review with disclosure stands**, per ADR 0001 ruling 2. Not reopened.

### Consequences

- **#52 must change before merge.** Ruling 2 reverses the tier-chip suppression
  it implements, and the `docs/TIERS.md` paragraph written to describe it.
- **An ADR encodes rulings 1 and 4**, and supersedes part of ADR 0001 ruling 5.
- **`docs/TIERS.md` promotion step 2** states the 30-day period without
  exception. Ruling 4 needs it to carve out the reserved namespace.
- **The waiting period is a checkbox** in `.github/ISSUE_TEMPLATE/review-request.yml`,
  not enforced in code. Ruling 4 narrows what that checkbox means.

---

## Sources

- [Docker Official Images — `NEW-IMAGE-CHECKLIST.md`](https://github.com/docker-library/official-images/blob/master/NEW-IMAGE-CHECKLIST.md)
- [docker-library/official-images](https://github.com/docker-library/official-images)
- [Docker Verified Publisher](https://www.docker.com/blog/docker-verified-publisher-trusted-sources-trusted-content/)
