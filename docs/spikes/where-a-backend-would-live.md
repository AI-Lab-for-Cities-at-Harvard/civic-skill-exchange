# Where a backend would live, if one is ever built

Status: analysis for review, ends in a decision question.
Ruling to date: [ADR 0003](../adr/0003-no-backend-until-the-experience-requires-one.md)
— no backend, as a preference tested against the experience, with five named
conditions that would overturn it. This document exists so that meeting a
condition starts a build rather than a debate.

## What is actually being placed

Almost nothing. The endpoint that
[#71](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/71)
needs receives an OAuth authorization code and a PKCE verifier, forwards them to
GitHub with the client secret, and returns the access token. It is stateless. It
stores nothing. It sees no skill content — the browser does the forking,
committing and pull request itself, because `api.github.com` sends
`access-control-allow-origin: *` and permits exactly that.

Forty lines, one secret, milliseconds of CPU, a handful of calls a week.

**So the technical differences between the candidates barely matter.** Every
option below runs this comfortably inside a free tier. What separates them is
institutional and operational: which account can be obtained and kept, which
deploy story respects the one-pipeline rule, and which one is still right if a
later condition needs state.

Two costs dominate, and neither is compute:

1. **A secret custodian.** A client secret plus a deploy credential, both
   rotatable, both someone's responsibility indefinitely.
2. **An approval path.** For a project whose institutional approval is itself
   still pending, acquiring a new vendor relationship is not free even when the
   service is.

## The candidates

### Cloudflare Workers

**For.** The lightest real option. Uniquely among the serverless hosts, its
default posture is CI-driven — a Worker has no repository-watching build system
unless one is opted into, so `wrangler-action` in a workflow satisfies "deploys
are CI-only, triggered by merge to main" with nothing to keep switched off. The
free tier carries no commercial-use restriction. If a later condition needs
state, KV and D1 exist without changing vendor.

**Against.** A fourth vendor account, with no existing HBS relationship,
procurement precedent, or security-review history to lean on. D1 is a weaker
datastore story than DynamoDB if the requirement ever grows past a key-value
signal.

### Azure Functions

**For.** Plausibly the shortest approval path of any option, and that is the cost
that actually dominates. If HBS is a Microsoft institution, the account, the
billing relationship and the security review precedent may already exist — which
erases most of what ADR 0003 lists as the real price of a backend. A full
platform if a later condition needs one, and a first-party GitHub Action for
deploys from `build.yml`.

**Against.** Heavier than a Worker for forty lines. Inherits whatever HBS's cloud
governance requires of a public endpoint, which may be considerably more process
than the endpoint deserves.

### AWS — API Gateway, Lambda, Parameter Store

**For.** The strongest destination. DynamoDB is the best datastore story of the
group; OIDC from Actions means no long-lived credential in GitHub; CDK is already
anticipated by this project's own conventions — `CLAUDE.md`'s TDD ground rule
names `assertions.Template` for infrastructure code, so the testing convention
exists before any infrastructure does.

**Against.** The heaviest starting point for the smallest possible endpoint: an
account, IAM, a CDK app, a deploy role, CloudWatch. Justified only if the
account already exists, or if infrastructure beyond this endpoint is expected
regardless of what the board says today.

### Netlify Functions

**For.** The simplest to stand up. Free tier fits. Would share an origin with the
site if hosting ever moved there, removing the CORS surface entirely.

**Against.** Its git integration deploys itself on push — a second pipeline that
must be actively switched off and kept off, which is a standing configuration
obligation rather than a one-time choice. No datastore worth having, so a later
condition means migrating.

### Vercel Functions

**For.** The best developer experience of the group.

**Against.** The Hobby tier is contractually non-commercial, so an institutional
endpoint means the paid tier — roughly $20 a month for forty lines. Same
second-pipeline obligation as Netlify, same migration if state is ever needed.
**Recommend dropping.**

### Deno Deploy

**For.** Very light, deploys from GitHub, generous free tier.

**Against.** The least institutionally legible of the group — the hardest to
justify to a security reviewer who has not heard of it. That is a real cost here
even though it is not a technical one.

### Fly.io, Render, Railway

**For.** Real containers. No cold starts, no platform-specific runtime.

**Against.** You are operating a server again — patching, uptime, a bill that
runs whether or not anyone visits — and receive nothing for it at this size.
**Recommend dropping.**

### Harvard or HBS hosted

**For.** No new vendor, no new secret custodian, and university IT already owns
the compliance story that every other option requires the project to acquire.

**Against.** Slowest to obtain, and university hosting is generally a poor fit
for a small public HTTPS endpoint with a browser-facing CORS policy. Worth one
email to establish whether it exists; not worth waiting on.

## What separates them, ranked by how much it matters here

| Discriminator | Why it matters | Winner |
|---|---|---|
| Existing institutional account and approval path | The dominant real cost. Erases most of ADR 0003's stated price | Azure or AWS, **if** HBS runs one |
| One deploy pipeline, by default not by configuration | `CLAUDE.md` requires CI-only deploys; a default that fights it is a standing obligation | Cloudflare |
| Attention per unit of value | Forty lines should not acquire a platform | Cloudflare |
| Home for later state | Only matters if condition (d) fires, which is now unlikely — #48 is git-native and nothing else on the board needs state | AWS |
| Cost | All free at this volume except Vercel | Everything but Vercel |
| Blast radius when down | Mitigated by design: the manual submission path is required to keep working | All equal |

The fourth row moved after #48 was re-scoped. When AWS was first recommended,
adopter feedback was assumed to need a service, so "the only candidate that is
also a home for the datastore" was decisive. It is no longer, which weakens the
case for the heaviest option.

## Decision question

**Which platform, if a condition in ADR 0003 is met?**

Recommend settling the **criterion** rather than the product: *whichever platform
HBS already runs and can approve for a small public endpoint — defaulting to
Cloudflare Workers if none does.*

That keeps the ADR's purpose intact, because it still means meeting a condition
starts a build rather than reopening a debate. It avoids pre-committing to the
heaviest option on a guess about the institution rather than knowledge of it. And
it puts the one question that actually resolves this where it belongs — with
whoever administers Harvard's cloud accounts:

> Does HBS already have an AWS or Azure account with a route to approving a small
> public HTTPS endpoint that holds one OAuth client secret?

If yes, that is the answer and this document is moot. If no, it is a Cloudflare
Worker.
