# Tiers

Every listing sits in exactly one tier. The split exists so the registry can accept submissions at volume without implicitly endorsing them, and so human review stays bounded to work we have actually staffed.

## Community

**What it means:** the skill is well-formed and nothing mechanical is wrong with it.

**What it does not mean:** that it is safe, correct, useful, or appropriate for your jurisdiction.

Automated checks can only ever say *no*. A pass is the absence of a specific set of known-bad signals, not the presence of safety. Signature scanning is triage, and evasion is well documented — see [SECURITY.md](SECURITY.md).

- Merged without human sign-off once L0–L2 pass.
- Listed with an explicit disclaimer on the card, on the detail page, and in the merge comment.
- Unbounded in **number of listings**. This is where the long tail lives, and
  that's fine. Individual skills are capped — see
  [CONTRIBUTING.md](../CONTRIBUTING.md) for the four limits.

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

## Promotion

1. Anyone opens a `review-request` issue naming the skill. Authors may request review of their own work.
2. A maintainer confirms the skill is in scope, has clean L0–L4 results, and has been listed in Community for at least 30 days. The waiting period is deliberate: it lets the weekly re-scan run several times and gives the ecosystem time to surface problems.
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
