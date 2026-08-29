# Design decisions and their evidence

Why the registry is built this way, and — more usefully — where that reasoning is thin. Read the second half before you cite any of this to a stakeholder.

---

## 1. A single GitHub repository with GitHub Pages

**Decision:** host skills as directories in one repo; build a static JSON index; serve a static site from Pages.

**Why:** git supplies, for free, the primitives any safety claim depends on — content-addressed history, signed commits, line-level diffs, blame, instant revert. A skill is a directory, so distribution is `git clone` with no packaging step. Contributors already have accounts. There is no server to operate and nothing to take down.

**Confidence: reasoned, not evidenced.** The comparative research on Hugging Face Hub, Homebrew-style taps, npm/PyPI packaging, and Discussions-based submission produced nothing that survived verification. This recommendation comes from the properties of git and from one verified working exemplar, not from a completed comparison. If someone presents a strong case for one of those alternatives, this design has no evidence to rebut it with.

**Tradeoff taken deliberately:** because we host artifacts rather than pointers, we cannot delegate malware scanning to an upstream package registry. A pointer-based registry can lean on npm, PyPI, or Docker. We own the scanning.

## 2. Two tiers rather than one

**Decision:** an unbounded Community tier gated only on automation, and a small Reviewed tier gated on human sign-off.

**Why:** the registry that has shipped at the largest scale defines curation *out of scope* — it removes only illegal content, malware, spam, and completely broken listings, and explicitly declines to remove low-quality entries or ones with known vulnerabilities. That is a survivable policy, and it is available to that registry because nobody reads a listing there as an endorsement.

We cannot adopt it wholesale. For a government and nonprofit audience the registry's implied endorsement *is* the value proposition. The two-tier split is how you get both: volume without endorsement, and endorsement without unbounded review load.

**Confidence: adapted, untested.** This borrows the metaregistry/subregistry pattern from a registry still in preview and collapses it into a single repo. Nobody in the evidence base has operated a curated-plus-community split at civic-trust expectations. It may turn out that the Community tier's disclaimer is not read and the registry is held responsible for it anyway.

## 3. Automation rejects; humans admit

**Decision:** automated checks can only fail a submission, never bless one. Human sign-off is the only thing that admits a skill to the tier carrying the registry's name.

**Why both, and not either alone:**

*Automation alone fails* because it is bypassable by construction. Static signatures are triage — their own authors present them that way, and one research pipeline uses them to filter ~86% of benign skills before anything more expensive runs. Published bypass rates against eight open-source skill scanners run 11.6–33.5%, via payloads hidden in `.docx`/ZIP-XML and code examples. And an LLM reviewer is worse than useless as a sole gate: dynamic-context commands execute during preprocessing, before the model reads a line. Researchers exfiltrated a GitHub token that way while a frontier model, reading the same skill at maximum reasoning, was correctly refusing it.

*Humans alone fail* because review quality decays with queue length, reviewers miss obfuscation a regex catches instantly, and nobody re-reads every listing weekly — which matters because account compromise poisons skills that already passed.

**Confidence: high on the mechanism.** The findings behind each half are individually well-corroborated. The synthesis — that automation's real job is making human review cheap enough to sustain — is our framing.

## 4. SHA-pinned attestations

**Decision:** a Reviewed listing is pinned to one commit hash. Content changes demote it automatically.

**Why:** a submission-time gate protects only against skills that were malicious when submitted. The dominant failure mode is a legitimate contributor whose account is compromised later. The SHA pin makes that fail closed without anyone having to notice.

**Confidence: our own construction.** The reasoning follows from the threat model and the implementation is cheap, but **no source describes an existing skill registry doing this.** It is the piece of this design most worth testing early, and the piece most likely to have a flaw we haven't seen.

## 5. Namespace ownership checked against the PR author

**Decision:** check the folder namespace against `github.event.pull_request.user.login`.

**Why:** the reference implementation checks against the *fork owner*, which lets any member of an organization fork the repo and write into that organization's namespace. This is a straightforward correction to a real bug in the pattern being borrowed.

**Confidence: high.** Verified directly against the exemplar's workflow source.

## 6. CI hardening as a first-class concern

**Decision:** the scanning job holds no token; privileged work is split into a separate `workflow_run` job; no event text is ever interpolated into a model prompt.

**Why:** prompt injection from attacker-authored PR text into a privileged Action is a consummated attack. It has extracted secrets from a major vendor's own shipped Action, and an injected issue *title* stole an npm publish token and published a malicious release. A study of 13,392 workflows confirmed 496 of 519 candidates exploitable.

This is worse for a skill registry than for an ordinary repo: SKILL.md bodies are natively instruction-shaped prose that needs no disguise, and the pipeline's stated purpose is to read them.

**Confidence: high.** Multiple independent reproductions across different vendors' agent workflows.

## 7. A closed category vocabulary

**Decision:** a fixed enum in `registry/categories.yml`, enforced by schema.

**Why:** free-text tags make classification unenforceable and faceted browsing impossible. Splitting a category later is easy; merging two that never should have been separate is not.

**Confidence: conventional.** No specific evidence; standard practice.

## 8. Seed closed before opening submissions

**Decision:** 10–20 skills written or solicited directly, with no submission path, before the form opens.

**Why:** every documented failure mode of community registries is a volume failure mode. Seeding first gets the schema and taxonomy wrong cheaply, and avoids the empty-catalog problem where the first visitor is also the last.

**Confidence: judgment.** Reasonable and low-cost, but not evidenced.

---

## The load-bearing open question

**Does an existing civic-tech or govtech home already exist for this?**

No claim about Code for America, US Digital Response, the GovAI Coalition, UK GDS, the Beeck Center, or InnovateUS survived verification. Sources were fetched — the GovAI Coalition templates library, the Digital Government Hub's government-AI-uses catalog, InnovateUS's Prompting Lab, the Civic Tech Field Guide's AI section — but nothing verifiable emerged about whether any of them would host or already hosts something like this.

This is the only question whose answer changes whether to build rather than what to build. [ROADMAP.md](ROADMAP.md) Phase 0 exists to answer it manually. Do not skip it.

---

## Things that were claimed and did not hold up

Seven claims were killed in adversarial verification during the research behind this design. Several would have been load-bearing. **Do not build on any of these:**

- That a ready-made GitHub Action scans PRs for prompt injection, PII, and excessive agency and posts findings as review comments. It does not do this.
- That the same Action's fork-PR scanning is disabled by default behind an `enable-fork-prs` input. Unverified.
- That `mcp-scan` achieves 90–100% recall on confirmed malicious skills with 0% false positives. Did not hold up.
- That unvetted open submission was the *identified root cause* of one marketplace's malware problem. The causal claim was not supported — the correlation is real, the causal attribution isn't established.
- That the exemplar's path-based policy gate enforces trust structurally and never runs untrusted code with write privileges.
- That delegating scanning upstream works *because* the registry hosts only pointers. The architectural tension is real; this framing of it isn't established.
- That the largest registry's moderation disclaimer documents maintainer burnout. It reads as a deliberate scope decision, not evidence of burnout — and there is essentially no evidence in this base about burnout dynamics either way.

## How to read the numbers in these docs

The security base rates come from vendors who sell scanning, corroborated by independent parties. Confidence is high on the order of magnitude and lower on exact figures.

**The 36.8% figure is "at least one security flaw" — a broad bucket spanning injection patterns and exposed secrets. It must never be restated as a malware rate.** The 76 confirmed malicious payloads are a floor under one vendor's lens, not an ecosystem total.

The snapshot is February 2026 and this ecosystem moves in weeks. The largest registry self-describes as preview with possible breaking changes and its moderation policy has already moved URLs once. Re-verify anything schema- or policy-specific before implementing against it.

---

## Provenance

This design rests on 18 adversarially verified findings drawn from 26 sources across six research angles: 130 claims extracted, 25 put to three-vote verification, 18 confirmed, 7 refuted. Judgment calls are flagged as such above.

Key primary sources: the [Agent Skills specification](https://agentskills.io/specification); the [MCP Registry moderation policy](https://modelcontextprotocol.io/registry/moderation-policy) and [aggregator model](https://modelcontextprotocol.io/registry/registry-aggregators); [agentsystems/agent-index](https://github.com/agentsystems/agent-index) as the architectural exemplar; Datadog Security Labs and Reversec Labs on skill supply-chain risk; Snyk on marketplace base rates; [GitHub Security Lab on pwn requests](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/) and Aikido on agentic workflow injection.
