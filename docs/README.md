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

## Spikes

Written analyses of questions that were not obvious. Each ends in numbered
decision questions; the rulings are recorded on the linked issue, and an ADR
encodes whatever was decided.

**A spike is a record of the analysis, not a statement of current behaviour.**
Once it is ruled on, the answer lives in the document that owns the behaviour —
the spike stays as the reasoning behind it.

| | |
|---|---|
| [reviewed-tier-definition.md](spikes/reviewed-tier-definition.md) | Should Reviewed mean one maintainer rather than two independent reviewers? — [#38](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/38), awaiting rulings |

## Archive

Superseded documents keep their content and gain a banner pointing at what
replaced them. Nothing here describes how the system works today.

Nothing tracked yet — `internal/archive/` holds the retired roadmap, and
`internal/` is not part of the repository.
