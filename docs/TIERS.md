# Tiers

Every listing sits in exactly one tier. The split exists so the registry can accept submissions at volume without implicitly endorsing them, and so human review stays bounded to work we have actually staffed.

## Community

**What it means:** the skill is well-formed and nothing mechanical is wrong with it.

**What it does not mean:** that it is safe, correct, useful, or appropriate for your jurisdiction.

Automated checks can only ever say *no*. A pass is the absence of a specific set of known-bad signals, not the presence of safety. Signature scanning is triage, and evasion is well documented — see [SECURITY.md](SECURITY.md).

- Merged without human sign-off once L0–L2 pass.
- Listed with an explicit disclaimer on the card, on the detail page, and in the merge comment.
- Unbounded in size. This is where the long tail lives, and that's fine.

## Reviewed

**What it means:** two named people from different organizations read every line of this specific commit against a published checklist and put their names on it.

- Everything in Community, plus sign-off against [REVIEW.md](REVIEW.md).
- **Pinned to a commit SHA.** The attestation covers one exact content hash.
- Attestations expire after one year.
- Deliberately small. Its entire value is its scarcity — a tier that admits everything communicates nothing.

This is the tier a city IT director can act on. Protect it accordingly.

---

## The attestation ledger

`registry/reviewed.yml` is the only place tier is recorded. Skills do not declare their own tier.

```yaml
- skill: cityofx/permit-status-explainer
  sha: a3f19c8d4b2e7f60a1c9d8e3b5f7204c6a8e1d92   # exact reviewed tree
  reviewers: [alice-gov, bob-nonprofit]           # two, different organizations
  reviewed: 2026-09-14
  expires: 2027-09-14
  notes: "Read-only. No network egress. No PII handling."

  # Optional. Present only when a reviewer confirmed the deployment claim with a
  # human at the named organization. Never written by a submitter.
  provenance_verified:
    scope: organization
    method: "Reply from the named contact on the agency's .gov domain, 2026-09-12"
    by: alice-gov
    date: 2026-09-12
```

The build joins this ledger against the current tree and derives tier:

```
tier = "reviewed"  if an unexpired attestation exists AND its sha == the skill's current commit
       "community" otherwise
```

### Why the SHA pin is the load-bearing piece

A submission-time gate protects you only against skills that were malicious *when submitted*. That is not the common failure. The common failure is a legitimate contributor whose account is compromised later, and whose already-reviewed skill is quietly amended.

The SHA pin makes that attack fail closed. A reviewer attests to a content hash, not to a person or a name. The moment the content changes, the attestation no longer matches, and the skill drops to Community automatically — no maintainer has to notice.

This is cheap to implement and it is the single highest-value mechanism in the design.

**Note:** this pattern is our own construction rather than an established convention, so treat it as the part of the design most worth testing early.

---

## Provenance is a separate axis from tier

Every skill carries self-reported provenance: maintainer affiliation, whether it
has been used, at what scale, where, and since when. It is published in the index
and filterable on the site, because "deployed organization-wide at a peer agency"
is one of the most useful things a city IT director can filter on.

**Provenance never moves a skill between tiers on its own.** It is evidence of
function, not of safety — a compromised account at a real agency ships malware
from a real agency. What it can do is shorten the waiting period before review,
because a skill with real operational history has been tested by reality in a way
the waiting period is only crudely approximating.

Claims stay labelled **self-reported** until a reviewer confirms one with a human
at the named organization, at which point the confirmation is recorded in
`reviewed.yml` — reviewer-signed, like everything else that carries weight here.
A submitter can never mark their own claim verified.

---

## Promotion

1. Anyone opens a `review-request` issue naming the skill. Authors may request review of their own work.
2. A maintainer confirms the skill is in scope, has clean L0–L4 results, and has served its waiting period in Community. The wait is deliberate: it lets the weekly re-scan run several times and gives the ecosystem time to surface problems.

   | Deployment claim | Wait |
   |---|---|
   | `none` or `personal` | 30 days |
   | `team` | 21 days |
   | `organization`, verified by a reviewer | 7 days |

   Real operational history is evidence the waiting period is a poor substitute for. An unverified `organization` claim gets the `team` wait — the discount is for the verification, not the assertion.
3. Two reviewers from **different organizations** work the checklist in [REVIEW.md](REVIEW.md) independently.
4. Both sign off in the issue. A PR adds the attestation to `reviewed.yml` with the skill's current SHA.
5. The build promotes it on the next run.

Reviewers may decline without a full checklist pass and without justification. Review capacity is the scarcest resource here; nobody should feel obliged to spend it on a marginal submission.

## Demotion

A skill leaves Reviewed when any of these happen. The first is automatic:

- **Content changes.** SHA drift is detected by the build, which demotes the skill and opens an issue. The author may request re-review.
- **The attestation expires** at one year.
- **A new scan finding appears** at L2, or at L3–L4 with maintainer judgment.
- **A reviewer withdraws** their sign-off, for any reason.
- **The maintainer contact goes stale.** A `civic.contact` that bounces means there is nobody to reach about a security report, which is disqualifying on its own.

Demotion is not a punishment and should not be written up as one. It is the mechanism working. The issue template for demotion should say so plainly, because a registry where demotion feels like an accusation is a registry where maintainers avoid demoting.

## Removal

Distinct from demotion. A skill is removed from the registry entirely for:

- Malware, credential theft, or exfiltration
- Deliberate evasion of the automated checks
- Impersonating another jurisdiction, agency, or organization
- A legitimate legal complaint

Removal delists; it does not recall. Anyone who already cloned the skill still has it. When removing for a security reason, publish an advisory — see [SECURITY.md](SECURITY.md).

---

## If you cannot staff the Reviewed tier

Ship Community-only and say so on the front page. That is a coherent, defensible registry, and several successful registries operate exactly this way.

A Reviewed tier with a stale queue is worse than no Reviewed tier at all. It converts the registry's best asset — a credible signal — into its largest liability, because people act on the badge while the process behind it has quietly stopped running. Open this tier when reviewers have committed real hours, and not before.
