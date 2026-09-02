# Documentation

## Start here

| | |
|---|---|
| [SUBMITTING.md](SUBMITTING.md) | Installing a skill in Claude or ChatGPT, and sharing one — the walkthrough, with screenshots |
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

## Spikes

Written analyses of questions that were not obvious. Each ends in numbered
decision questions; the rulings are recorded on the linked issue, and an ADR
encodes whatever was decided.

**A spike is a record of the analysis, not a statement of current behaviour.**
Once it is ruled on, the answer lives in the document that owns the behaviour —
the spike stays as the reasoning behind it.

| | |
|---|---|
| [where-a-backend-would-live.md](spikes/where-a-backend-would-live.md) | If a backend is ever built, where should it run? — [#71](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/71), open; see [ADR 0003](adr/0003-no-backend-until-the-experience-requires-one.md) |
| [submitting-a-multi-file-skill.md](spikes/submitting-a-multi-file-skill.md) | How does a skill that is more than one file reach a pull request? — [#70](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/70), [#71](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/71), open |
| [lab-as-a-tier.md](spikes/lab-as-a-tier.md) | Should Lab be a third tier? — [#53](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/53), ruled; see [ADR 0002](adr/0002-lab-is-authorship-not-a-tier.md) |
| [reviewed-tier-definition.md](spikes/reviewed-tier-definition.md) | What should a Reviewed listing mean? — [#38](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/38), ruled; see [ADR 0001](adr/0001-reviewed-is-a-lab-attestation.md) |

## Archive

Superseded documents keep their content and gain a banner pointing at what
replaced them. Nothing here describes how the system works today.

Nothing tracked yet — `internal/archive/` holds the retired roadmap, and
`internal/` is not part of the repository.
