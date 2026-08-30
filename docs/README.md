# Documentation

## Start here

| | |
|---|---|
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

## Spikes

Written analyses of questions that were not obvious. Each ends in numbered
decision questions; the rulings are recorded on the linked issue, and an ADR
encodes whatever was decided.

**A spike is a record of the analysis, not a statement of current behaviour.**
Once it is ruled on, the answer lives in the document that owns the behaviour —
the spike stays as the reasoning behind it.

| | |
|---|---|
| [lab-as-a-tier.md](spikes/lab-as-a-tier.md) | Should Lab be a third tier? — [#53](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/53), ruled |
| [reviewed-tier-definition.md](spikes/reviewed-tier-definition.md) | What should a Reviewed listing mean? — [#38](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/38), ruled; see [ADR 0001](adr/0001-reviewed-is-a-lab-attestation.md) |

## Archive

Superseded documents keep their content and gain a banner pointing at what
replaced them. Nothing here describes how the system works today.

Nothing tracked yet — `internal/archive/` holds the retired roadmap, and
`internal/` is not part of the repository.
