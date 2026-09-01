# ADR 0003 — No backend, until the experience requires one

**Status:** accepted, 2026-09-01
**Analysis:** [spikes/submitting-a-multi-file-skill.md](../spikes/submitting-a-multi-file-skill.md)
**Rulings:** [#71](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/71)

## Context

`ARCHITECTURE.md` opens by saying there is no database, no server, and no
application to operate. Until now that was a description rather than a decision —
nothing had asked for one.

Two things asked at once. [#71](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/71)
would let a submitter sign in and have the page open their pull request for them.
[#48](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/48)
would collect adopter feedback, which has to be written down somewhere.

Neither can be served by the current stack, and the reason is worth stating
precisely, because it is narrower than "we need a server". Measured:

- `api.github.com` sends `access-control-allow-origin: *`, so the browser can do
  the whole of forking, committing and opening a pull request by itself.
- `github.com/login/*` sends no CORS headers at all, so the browser cannot
  exchange an OAuth code for a token. GitHub has supported PKCE since July 2025
  and it does not help: GitHub does not distinguish public from confidential
  clients, so the client secret remains mandatory outside the device flow.
- GitHub Actions runs ephemeral jobs with no inbound socket. GitHub Pages
  executes nothing at request time. Neither can host the exchange.

So #71 needs roughly forty lines of server-side code, and nothing more than that.
#48 needs somewhere to put text.

## Decision

**1. No backend. This is a preference, not a principle.** It holds because it is
currently buying a great deal — no secret to rotate, no uptime to own, no
institutional approval path, nothing that can be taken down — and because
[#70](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/70)
made the submission flow whole without one.

**2. It is tested against the experience, not defended for its own sake.** A
registry nobody can conveniently contribute to has optimised the wrong thing. The
conditions under which this ADR is wrong are named below, deliberately and in
advance, so that meeting one is an observation rather than an argument.

**3. #48 is re-scoped to git-native intake** — a file in the repository, ingested
by `build_index.py`, submitted the way a skill is. `registry/reviewed.yml`
already establishes the pattern. #48's own text named this option; it was
deferred for the answer to "how does someone without a GitHub account
contribute", which #70 has now answered.

**4. #71 stays open and unbuilt.** It is a convenience over a path that works,
not a fix for one that does not. It is the first thing to build if condition (a)
or (b) below is met, and the spike already carries the verified design — PKCE and
`state`, an org-owned OAuth App, fork polling, inline tree content — so meeting a
condition starts a build rather than a study.

**5. If a backend is built, it is AWS.** API Gateway, Lambda, Parameter Store,
CDK, deployed from Actions by OIDC so no long-lived credential sits in GitHub.
Not because it is the lightest — a Cloudflare Worker is — but because it is the
only candidate that is also a home for whatever comes after the first endpoint,
and adopting two platforms in sequence is worse than adopting the heavier one
once. Recorded now so that meeting a condition does not reopen the question.

## Consequences

### What this gives up

**A three-step submission is a six-step submission.** Sign-in would make it: drop
the zip, fill the gaps, submit. Without it, a multi-file skill is: download the
folder, fork, unzip, drag it in, commit, open the pull request. Every one of
those is a place to stop, and the audience is public-sector staff for whom none
of it is familiar. This is the real cost and it is not small.

**`public_repo` cuts both ways.** Sign-in would ask for write access to all of a
submitter's public repositories, because GitHub offers no narrower classic scope.
Some of this audience would decline. So the manual path is not purely a fallback
— for some people it is the better path, which softens the cost above without
erasing it.

**Feedback intake will be the weakest point.** Requiring a GitHub account to say
"we used this and it worked" filters out precisely the people whose signal is most
valuable — #48 says so itself. Email plus a maintainer transcribing is the
fallback, and transcription does not scale. It does not need to yet.

**We cannot instrument any of this.** Measuring abandonment would require the
thing this ADR declines to build. The evidence available is what people tell us
and what arrives in the tracker, which is weaker evidence, and the conditions
below are written to be observable without instrumentation.

### What it keeps

No secret to rotate, no OAuth App registration to get approved, no AWS account to
provision, no second deploy pipeline, no endpoint whose outage breaks submission,
and a site that cannot be taken down by traffic. For a project whose institutional
approval is still pending, acquiring none of that is worth something on its own.

## When to revisit

Any one of these is sufficient. None requires agreement about whether a backend
is desirable in principle.

**(a) Submitters are getting stuck.** Three or more submissions where a
maintainer had to intervene to complete a hand-off that the page was supposed to
carry, or direct reports that the fork-and-upload path was abandoned. Three, not
one: the first is a bug report, and #70's flow has never been used in anger.

**(b) Submissions are not arriving at all** from people who said they had a skill
to share. The absence of pull requests is evidence, and it is the evidence this
ADR is most likely to be wrong about.

**(c) Feedback intake outgrows transcription.** More than roughly one adopter note
a week arriving by email, or a maintainer spending real time copying text into
YAML.

**(d) Something genuinely needs state.** Anything that must be written by a
member of the public and read back — not a signal that can live as a file in the
repository. Nothing on the board today qualifies once #48 is re-scoped.

**(e) Rate limits start biting.** `api.github.com` allows 60 requests an hour per
address unauthenticated, shared by everyone behind one NAT. The username check
and the repository import spend them. Today this degrades quietly; if it starts
degrading loudly, a proxy is a backend.

Condition (a) or (b) starts #71. Condition (c) or (d) starts #48's service half.
Condition (e) starts neither on its own — it argues for spending fewer requests
first.
