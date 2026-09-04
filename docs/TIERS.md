# Tiers

Every listing sits in exactly one tier. The split exists so the registry can accept submissions at volume without implicitly endorsing them, and so human review stays bounded to work we have actually staffed.

## Community

**What it means:** the skill is well-formed and nothing mechanical is wrong with it.

**What it does not mean:** that it is safe, correct, useful, or appropriate for your jurisdiction.

Automated checks can only ever say *no*. A pass is the absence of a specific set of known-bad signals, not the presence of safety. Signature scanning is triage, and evasion is well documented — see [SECURITY.md](SECURITY.md).

- Merged without human sign-off once L0–L2 pass.
- Listed with an explicit disclaimer on the card, on the detail page, and in the merge comment. This applies to the Lab's own skills on the same terms as anyone else's: a skill the Lab wrote has cleared the same automated checks and no more, and writing a skill is not reviewing it. Lab-authored listings carry the authorship chip alongside the tier chip, never instead of it — see [#53](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/53) ruling 2.
- Unbounded in **number of listings**. This is where the long tail lives, and
  that's fine. Individual skills are capped — see
  [CONTRIBUTING.md](../CONTRIBUTING.md) for the four limits.

## Reviewed

**What it means:** the AI Lab for Cities at Harvard read every line of this specific commit against a published checklist and put its name on it.

**What it does not mean:** that anyone outside the Lab looked. This is an attestation by one party, not an independent audit, and not a second opinion. See [ADR 0001](adr/0001-reviewed-is-a-lab-attestation.md) for what that gives up and why it was accepted.

- Everything in Community, plus sign-off against [REVIEW.md](REVIEW.md).
- **Pinned to a commit SHA.** The attestation covers one exact content hash.
- Attestations expire after one year.
- Deliberately small. Its entire value is its scarcity — a tier that admits everything communicates nothing.
- **The Lab may review skills it wrote itself**, in the reserved `civic-skills` namespace. Those listings disclose it: the site derives Lab authorship from the namespace and says so on the review claim.

This is the tier a city IT director can act on. It is a smaller claim than two readers from separate organizations would have been, and it is one that can actually be made — which is why the SHA pin below carries proportionally more of the tier's weight than it did.

---

## The attestation ledger

`registry/reviewed.yml` is the only place tier is recorded. Skills do not declare their own tier.

```yaml
- skill: cityofx/permit-status-explainer
  sha: a3f19c8d4b2e7f60a1c9d8e3b5f7204c6a8e1d92   # exact reviewed tree
  reviewers: ["AI Lab for Cities at Harvard"]     # the attesting party
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

The SHA pin makes that attack fail closed. A reviewer attests to one commit — the last one that touched the skill's directory — not to a person or a name. The moment anything commits to that directory the attestation no longer matches, and the skill drops to Community automatically. No maintainer has to notice.

That is deliberately stricter than hashing the reviewed content: a commit that touches the directory without changing the file the reviewer read demotes the skill too. Re-attesting after a typo fix is cheap. Failing to notice an amendment is not.

This is cheap to implement and it is the single highest-value mechanism in the design.

**Note:** this pattern is our own construction rather than an established convention, so treat it as the part of the design most worth testing early.

---

## Promotion

1. Anyone opens a `review-request` issue naming the skill. Authors may request review of their own work.
2. A maintainer confirms the skill is in scope, has clean L0–L4 results, and has been listed in Community for at least 30 days. The waiting period is deliberate: it lets the weekly re-scan run several times and gives the ecosystem time to surface problems. **Skills in the reserved `civic-skills` namespace are exempt** ([ADR 0002](adr/0002-lab-is-authorship-not-a-tier.md) ruling 5) — the Lab may review its own work immediately. That gives up the re-scan passes: a signature added to the scanner after submission may not fire before the badge is granted. It is accepted for the one namespace the Lab controls and can re-scan on demand, and for no other.
3. The Lab works the checklist in [REVIEW.md](REVIEW.md).
4. The result is written up in the issue. A PR adds the attestation to `reviewed.yml` with the skill's current SHA.

   `CODEOWNERS` gates that file to the reviewers team, and the team currently holds one person across two accounts. That is the mechanism being right in advance of a second reviewer existing — it is **not** two-person control, and nothing here should be read as a second pair of eyes.
5. The build promotes it on the next run.

Reviewers may decline without a full checklist pass and without justification. Review capacity is the scarcest resource here; nobody should feel obliged to spend it on a marginal submission.

## Demotion

A skill leaves Reviewed when any of these happen. The first is automatic:

- **Content changes.** SHA drift is detected by the build, which demotes the skill and opens an issue. The author may request re-review.
- **The attestation expires** at one year.
- **A new scan finding appears** at L2, or at L3–L4 with maintainer judgment.
- **The Lab withdraws** its sign-off, for any reason.
- **The maintainer becomes unreachable.** A namespace whose GitHub account is deleted or suspended leaves nobody to reach about a security report, which is disqualifying on its own. There is no separate contact field to go stale — see [#95](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/95).

Demotion is not a punishment and should not be written up as one. It is the mechanism working. The issue template for demotion should say so plainly, because a registry where demotion feels like an accusation is a registry where maintainers avoid demoting.

## Removal

Distinct from demotion. A skill is removed from the registry entirely for:

- Malware, credential theft, or exfiltration
- Deliberate evasion of the automated checks
- Impersonating another jurisdiction, agency, or organization
- A legitimate legal complaint

Removal delists; it does not recall. Anyone who already cloned the skill still has it. When removing for a security reason, publish an advisory — see [SECURITY.md](SECURITY.md).

---

## Seed before you open submissions

Every documented failure mode of a community registry is a **volume** failure
mode: unreviewable queues, taxonomy that cannot be fixed retroactively, moderation
load that arrives faster than the people to carry it. So volume comes last, on
purpose.

Write or solicit the first skills directly, with no submission path open. It gets
the schema and the categories wrong cheaply — fixing a taxonomy across twenty
skills is an afternoon, across two hundred it is a migration — and it avoids the
empty-catalogue problem, where the first visitor is also the last.

**A registry with twenty good skills and no submission form is useful. A registry
with an open form and nothing in it is not**, and the empty version is the one
that does not recover.

## If you cannot staff the Reviewed tier

Ship Community-only and say so on the front page. That is a coherent, defensible registry, and several successful registries operate exactly this way.

A Reviewed tier with a stale queue is worse than no Reviewed tier at all. It converts the registry's best asset — a credible signal — into its largest liability, because people act on the badge while the process behind it has quietly stopped running. Open this tier when the Lab has committed real hours, and not before.
