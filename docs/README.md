# Documentation

## Start here

| | |
|---|---|
| [SUBMITTING.md](SUBMITTING.md) | Sharing a skill or plugin — the walkthrough, with screenshots. Installing points to the site's Using the Exchange page |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the registry is put together, and why it is a git repository rather than a service |
| [TIERS.md](TIERS.md) | What Community and Reviewed each mean, how a skill moves between them, and when to open neither |
| [SECURITY.md](SECURITY.md) | The threat model, the layered checks, and the CI hardening rules |

## Working on it

| | |
|---|---|
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local setup, the validator's two runtimes, and the gate suite to run before a pull request |
| [REVIEW.md](REVIEW.md) | The Reviewed-tier checklist. Read it before requesting review, not after |
| [LOCALIZATION.md](LOCALIZATION.md) | Generalized and localized skills, and what moves between them |

Contributing a skill is [CONTRIBUTING.md](../CONTRIBUTING.md), one level up.

## Decisions

Architecture decision records, numbered. An ADR states what was decided, what it
gives up, and when to revisit — it is not revised when the world changes; it is
superseded by a later one.

| | |
|---|---|
| [0001](adr/0001-reviewed-is-a-lab-attestation.md) | Reviewed means the Lab read it — single reviewer, self-review with disclosure |
| [0002](adr/0002-lab-is-authorship-not-a-tier.md) | Lab is authorship, not a tier — and the Lab waives the waiting period on its own namespace |
| [0003](adr/0003-no-backend-until-the-experience-requires-one.md) | No backend — a preference tested against the experience, with the conditions that would overturn it named in advance |
| [0004](adr/0004-language-is-metadata-and-verification-not-translation.md) | Language is metadata and verification, not translation — a listing declares its language, the ledger records what a reviewer verified, and the site ships in Spanish |
| [0005](adr/0005-plugins-are-a-second-listing-kind.md) | Plugins are a second listing kind — several skills and their MCP servers under `plugins/`, in the Agent Plugins layout, installable from both marketplaces |
| [0006](adr/0006-every-listing-in-the-agent-plugins-layout.md) | Every listing in the Agent Plugins layout — a single skill's files move to `skills/{ns}/{name}/skills/{name}/`, so Codex and Claude Code both load it; built in M9 |

## Spikes

Written analyses of questions that were not obvious. Each ends in numbered
decision questions; the rulings are recorded on the linked issue, and an ADR
encodes whatever was decided.

**A spike is a record of the analysis, not a statement of current behaviour.**
Once it is ruled on, the answer lives in the document that owns the behaviour —
the spike stays as the reasoning behind it.

| | |
|---|---|
| [a-better-way-to-manage-spacing.md](spikes/a-better-way-to-manage-spacing.md) | Tailwind, a component library, or layout primitives of our own instead of hand-written spacing? Two proofs measured on the numbered steps — [#310](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/310), awaiting rulings |
| [the-using-the-exchange-page.md](spikes/the-using-the-exchange-page.md) | What goes on the "Using the Exchange" page, how other pages link to it, and which screenshots it needs: the design pass before the build — [#224](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/224), ruled; the rulings are recorded at the end |
| [every-listing-in-the-agent-plugins-layout.md](spikes/every-listing-in-the-agent-plugins-layout.md) | How every single-skill listing moves to the Agent Plugins layout: the move, the reviews, the published zip and links, the validator, the submission page, and the order of work — [#241](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/241), ruled; see [ADR 0006](adr/0006-every-listing-in-the-agent-plugins-layout.md) |
| [end-to-end-submission-and-install.md](spikes/end-to-end-submission-and-install.md) | Two simulated newcomers submit a skill and a plugin, and install both in Claude Code and Codex: what worked, what they tripped on, and recommendations — [#286](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/286), ruled; the fixes are #293–#303 |
| [single-skill-listings-in-codex.md](spikes/single-skill-listings-in-codex.md) | Codex installs every single-skill listing and loads none of them — what should the exchange publish? Also returns #183's deferred question with evidence — [#207](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/207), ruled: option 1, every listing in the Agent Plugins layout, built as M9 |
| [plugins-as-the-unit-of-distribution.md](spikes/plugins-as-the-unit-of-distribution.md) | Should the exchange publish plugins rather than skill directories, now that Agent Plugins 1.0 exists and Codex has adopted it? — [#183](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/183), awaiting rulings |
| [the-exchange-in-more-than-one-language.md](spikes/the-exchange-in-more-than-one-language.md) | What changes when the exchange speaks more than one language? — [#143](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/143), ruled on seven of eight; see [ADR 0004](adr/0004-language-is-metadata-and-verification-not-translation.md) |
| [where-a-backend-would-live.md](spikes/where-a-backend-would-live.md) | If a backend is ever built, where should it run? — [#71](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/71); the platform question is open, the decision to have none for now is [ADR 0003](adr/0003-no-backend-until-the-experience-requires-one.md) |
| [submitting-a-multi-file-skill.md](spikes/submitting-a-multi-file-skill.md) | How does a skill that is more than one file reach a pull request? — [#70](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/70), ruled and built; the sign-in half ([#71](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/71)) was closed as not planned, and its design stays here |
| [the-hbs-design-system-and-this-site.md](spikes/the-hbs-design-system-and-this-site.md) | Where does this site agree with the HBS design system, and where did it invent? — [#101](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/101), ruled and built; the rulings are recorded at the end of the spike |
| [lab-as-a-tier.md](spikes/lab-as-a-tier.md) | Should Lab be a third tier? — [#53](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/53), ruled; see [ADR 0002](adr/0002-lab-is-authorship-not-a-tier.md) |
| [reviewed-tier-definition.md](spikes/reviewed-tier-definition.md) | What should a Reviewed listing mean? — [#38](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/38), ruled; see [ADR 0001](adr/0001-reviewed-is-a-lab-attestation.md) |

## Archive

Superseded documents keep their content and gain a banner pointing at what
replaced them. Nothing here describes how the system works today.

| | |
|---|---|
| [archive/removals.md](archive/removals.md) | Skills that were listed and are no longer — one line each, so a withdrawn skill is distinguishable from one that never existed |
| [advisories/](advisories/) | Advisories for a skill removed for a security reason. Empty, which is the correct state |

`internal/archive/` holds the retired roadmap, and `internal/` is not part of
the repository.
