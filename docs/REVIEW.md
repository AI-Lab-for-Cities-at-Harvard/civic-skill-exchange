# Reviewer guide

This is the checklist for admitting a skill into the **Reviewed** tier. It is bounded to roughly fifteen minutes per skill by design.

The manual review determines if the skill supports civic/ public benefit.

## Before you start

You need, on one screen: the scanner findings, the full diff of every file under `scripts/`, the rendered `SKILL.md`, and this list.

**Reaching the maintainer** is an issue or a mention on the namespace's GitHub account. There is no contact field to check: it was removed in [#95](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/95) because L1 already proves the submitter owns that account, and an address typed into frontmatter can bounce or go stale while the account does not. If the account itself is gone, that is disqualifying — see [TIERS.md](TIERS.md). For a security problem, do not open an issue: follow [SECURITY.md](SECURITY.md).

**One reader: the AI Lab for Cities at Harvard.** The rule this replaces asked for two people from separate organizations, working independently and not comparing notes until both had finished — a rule about independence *between* reviewers, which has nothing left to say when there is one. [ADR 0001](adr/0001-reviewed-is-a-lab-attestation.md) records what that gives up.

The checklist below is unchanged. What changed is who works it and what the badge may therefore claim, and the honest way to hold the difference is to work the list more carefully rather than faster. There is no second pass behind this one.

Two consequences worth naming before you start:

- **The attestation PR is not a check on the review.** `CODEOWNERS` gates `registry/reviewed.yml` to the reviewers team, and that team is one person across two accounts. The gate stays so the mechanism is correct when a second reviewer exists; approving your own attestation is not a second pair of eyes and must never be written up as one.
- **The Lab reviews skills it wrote**, in the reserved `civic-skills` namespace. Item 7 is where that costs the most — you are judging the civic appropriateness of your own work. Say so in `notes`, and treat a close call as a decline.

You may decline a review at any point, without completing the checklist and without giving a reason. Review capacity is the scarcest resource this registry has.

---

## Deployment evidence

Skills carry self-reported provenance: who maintains it, whether it has actually
been used, and at what scale. Real operational history is useful context — it is
evidence a skill *works*, which is hard to get by reading.

It is not evidence a skill is *safe*. Every item below applies the same way
regardless of who submitted it.

---

## The checklist

Items marked **REJECT** are automatic. No judgment call, no discussion, no exceptions for a trusted contributor.

### 1. Does `description` honestly describe what the skill does? — REJECT if not

The description is the attack surface for autonomous invocation. Agents decide to run a skill based on the name and description alone, before the body is loaded. A description broader than the actual behavior means the skill fires in situations its author never handled — and a description that is *deliberately* broader is how a malicious skill gets itself invoked.

Read the description, then read the body. If you'd have expected something different, that's the finding.

### 2. Read every line of every file under `scripts/` — REJECT if you wouldn't run it

These are executed by the agent, not read by the model. Reviewing the prose is not reviewing the skill.

The standard is simple: if you would not run this on your own laptop, it does not enter the Reviewed tier. Length is not an excuse — if it is too long to read, it is too long to attest to.

### 3. Is every entry in `allowed-tools` necessary? — REJECT wildcard Bash grants

The grant applies without a permission prompt and is not gated by workspace trust. Check each tool against what the skill actually does. A `Write` grant on a skill that only explains things is a finding, not a rounding error.

`Bash(*)` is an automatic rejection.

### 4. Is every network destination named, expected, and documented? — REJECT unexplained egress

Any egress to a domain the skill's stated purpose does not require is a rejection, not a question. Check `scripts/`, the skill body, and `references/`.

A documented call to a jurisdiction's own public API is fine. A call to a URL shortener, a paste service, or a domain that merely resembles a legitimate one is not.

### 5. Any credential, environment, or filesystem access outside the working directory?

If present, it must be declared in `compatibility` and consistent with `civic.data-sensitivity`. An undeclared one is a rejection; a declared one is a judgment call about necessity.

### 6. Does anything instruct the agent to disregard prior instructions, conceal an action, or omit something from its summary?

Legitimate skills never need the agent to hide its work from the person running it. Treat any such instruction as disqualifying regardless of the stated rationale.

Look for it in the body, in `references/`, in comments inside `scripts/`, and in any file the skill tells the agent to read.

### 7. Civic appropriateness — does this affect anyone's rights, benefits, or legal standing?

**This is the item no tool can do for you, and the reason human review exists here at all.**

If the answer is yes, then:
- `civic.human-review` must not be `none`
- The skill must say so **in its own output**, not only in its metadata — the person reading the result is not the person who read the frontmatter
- `civic.data-sensitivity` must match what it actually touches

A skill that drafts benefit denial letters is a different risk class than one that formats a budget table. Both can be well-written, well-scoped, and clean on every automated check. Only one of them can cause a person to lose their housing assistance because an agent got a rule wrong.

Ask: if this ran unsupervised on a real case and produced a plausible-looking wrong answer, who is harmed, and would they know?

### 8. Is the license present and actually applicable?

The spec field is free text, not SPDX-constrained — machine-*present*, not machine-*verifiable*. Check that the declared license makes sense for the bundled content, including anything under `references/` that may have come from somewhere else.

### 9. Would this work outside its home jurisdiction?

Not a rejection — a quality bar. Hardcoded field names, form numbers, and internal URLs are what make a skill useless to the next city, which is the entire point of the registry. If it's tightly bound to one jurisdiction, ask the author to move the specifics into `references/` before you sign off.

---

## Signing off

### Getting the SHA

The SHA is the last commit that touched the skill's directory. Do not read blame for it — there are two shorter routes.

**With a clone.** This prints the whole attestation block, ready to paste:

```bash
python scripts/attestation.py {namespace}/{skill-name} --notes "Read-only. No egress."
```

It takes the SHA from the same call the build compares against, and refuses rather than printing one the build would reject — a dirty working tree, a shallow clone, a branch that is not `main`. It writes nothing and decides nothing: `notes` is yours.

**In the browser.** GitHub will filter its commit list to one directory. The newest entry is the commit to attest to, and each row has a copy button for the full SHA:

```
https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/commits/main/skills/{namespace}/{skill-name}
```

**With git and nothing else.** The helper imports the build's own resolver, so it needs the Python dependencies; this is the same question asked directly, and it needs none:

```bash
git log -1 --format=%H -- skills/{namespace}/{skill-name}
```

### Three ways it goes wrong

Each produces an attestation that looks correct and grants no badge. The helper refuses all three; if you took the SHA in the browser, check them yourself.

- **Taking it from the contributor's branch.** Pull requests are squash-merged, so the branch's commits never appear on `main` — the whole branch becomes one new commit, and that commit is what you are attesting to. A SHA from the branch does not exist on `main`. This is why the browser link above is pinned to `/commits/main/`.
- **Working in a shallow clone.** If git cannot reach the commit, the build gets nothing back, treats the skill as unverifiable, and demotes it. `git clone` without `--depth` gives you what you need.
- **Attesting before a follow-up commit.** Anything that touches that directory afterwards — a typo fix in the `SKILL.md` included — replaces the SHA and demotes the skill. Yours has to be the last word on the directory.

### Writing it down

Comment on the review-request issue with the SHA you reviewed and any conditions. Then open a PR adding to `registry/reviewed.yml`:

```yaml
- skill: cityofx/permit-status-explainer
  sha: a3f19c8d4b2e7f60a1c9d8e3b5f7204c6a8e1d92
  reviewers: ["AI Lab for Cities at Harvard"]
  reviewed: 2026-09-14
  expires: 2027-09-14
  notes: "Read-only. No network egress. No PII handling."
```

**The SHA is the attestation.** You are signing off on one exact commit, not on a skill name and not on a person. If the content changes, your attestation stops applying automatically and the skill drops back to Community. That is the mechanism working — you do not need to monitor anything.

### Checking that it took

The file being right is not the same as the badge appearing. Ask what a clone would see:

```bash
python scripts/build_index.py --out /tmp/idx
python3 -c "import json;[print(s['id'],s['tier'],'|',s['reason']) for s in json.load(open('/tmp/idx/index.json'))['skills']]"
```

Your skill should come back `reviewed`. If the SHA is wrong the tier stays `community` and `reason` says which of the two values did not match — that is where a mistyped or branch-taken SHA shows up, and it is much easier to see here than after the deploy.

Write `notes` for the next reviewer, a year from now, who has to re-review this and has no memory of the conversation. What did you check especially closely? What would you look at first if something went wrong? If the Lab wrote the skill, say that here too — the site discloses it on the listing, and the note is where the next reader learns what you were careful about because of it.

## Withdrawing a sign-off

Comment on the original issue and open a PR removing the attestation. Reviews can be removed without any notification or clear cause.

## When you find something bad

Don't comment publicly on the PR. Follow [SECURITY.md](SECURITY.md) — open a private advisory. A public comment tells the author exactly which check caught them.
