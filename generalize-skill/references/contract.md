# The context file

The contract between `generalize` and `localize`. Both read it; nothing else
depends on it, so it can change — but it has to change in both places at once.

## `contract_version` — one integer, bumped rarely

Every context file carries it, and every reader checks it:

```yaml
contract_version: 1
```

The contract lives in two copies, in two skills, that will sit on different
machines at different versions. Keeping the copies identical in one repository
does not help the adopter who runs a two-year-old `localize-skill` against a
context file written last week — the copies were never in the same place. The
version is what makes that mismatch **detectable** rather than merely unlikely.

### Bump only when an old reader would get it wrong

Adding an optional key is **not** a bump. Renaming a key, removing one, or
changing what a key means **is**.

This rule matters more than the number. If additive changes bumped the version,
every adopter would see a warning on every skill, none of the warnings would
mean anything, and they would learn to click past the one that did. A check
people ignore is worse than no check, for the same reason a context file full of
unnecessary questions goes unfilled.

So a version mismatch always means real trouble. Treat it that way.

### What a reader does about a mismatch

The two directions are not symmetrical, and conflating them is the mistake to
avoid.

| Situation | What it means | What to do |
|---|---|---|
| Versions match | Nothing to say | Proceed. Say nothing — silence is the point |
| File **older** than reader | Reader knows what changed since | Migrate it, and note which entries were affected |
| File **newer** than reader | Reader does not know what changed | **Stop.** Do not fill |
| No `contract_version` at all | Written before versioning | Ask. Do not assume `1` |

The newer-file case is the one that needs discipline, because the file will
usually look readable. An unknown breaking change means any value in it may be
misread, and a misread value becomes a plausible wrong value in a skill that
runs and returns numbers. Name the gap, point at the changelog below, and get a
newer reader.

A missing version is not version 1. Files predating this key were written
against a contract nobody recorded, so their shape is unknown rather than old.
Ask what wrote it.

### Changelog

A version number is useless without this. A reader that finds a gap has to be
able to say what changed, or it can only report that something did.

- **1** — First versioned contract. `jurisdiction`, `scope`, `description`,
  `use_when`, `avoid_when`, `slots`, `comparators`; entries carry `what`,
  `exact` and `value`. `scope` carries `tier`, `reach` and `reaches-into`.

Add one entry per bump, saying what a reader must do differently — not what
changed in the abstract.

## Two files, not one

`generalize` writes two context files from the same template:

- **`context.template.yml`, inside the generalized skill.** Every value `TODO`.
  It travels with the skill and tells the next adopter what they must supply.
- **`<org>.context.yml`, outside it.** The same shape with the original
  organization's values filled in.

Keeping the filled one outside the skill directory is the point. A generalized
skill that ships with one city's values in it is not generalized — it is that
city's skill with extra steps.

## Where the template lives

`context.template.yml`, beside `SKILL.md` at the top of the skill directory.

Not under `references/`, which holds background a model may choose to read, and
not under `assets/`, which holds files an output is built from. This is
configuration an adopter must fill in, so it sits where it cannot be missed and
where a check can find it at a known path.

## Shape

```yaml
jurisdiction: "City of Boston"
scope:
  tier: city              # international | country | state | county | city |
                          # neighborhood | other
  reach: "Other US cities and towns."
  reaches-into: ["country"]
description: >
  Master workflow for City of Boston policy analysis, orchestrating framing,
  analysis, communication, benchmarking and performance management.
use_when: "Analysing Boston city data, services or performance."
avoid_when: "Not for jurisdictions other than Boston without re-localizing."

slots:
  open_date_field:
    what: "The 311 open-date column in the service request data."
    exact: true
    value: "open_date"
  current_dataset_id:
    what: "Identifier for the current service-request dataset."
    exact: true
    value: "254adca6-..."
  approving_official:
    what: >
      Who signs off on outgoing analysis. A title is enough, and so is a
      description — if no single office does this, say who actually does.
    exact: false
    value: "Commissioner of Public Works"

comparators:
  peer_cities:
    what: >
      Cities to benchmark against. A starting point, not a fact — choose peers
      by size, form of government and service model.
    value: ["San Francisco", "Seattle", "Washington DC"]
```

## `scope` says who the skill is for

`tier` is the level of government the skill acts on. `reach` is how far it was
generalized to travel, and `reaches-into` lists tiers it cites without operating
at, so a national standard inside a municipal skill does not read as a stray
local value. All three are written by `generalize`, not filled in by an adopter.

Reach is in the file because it explains an absence as well as a presence. A
skill generalized across one city's wards keeps that city everywhere, and
without reach saying so, the retained name looks like an oversight — or worse,
gets "fixed".

A filler shows `scope` before asking anything else. It is the fastest way for an
adopter to find out the skill is not for a place like theirs, and that is worth
finding out before answering twenty questions. Whether they fall inside it is a
judgment, not a lookup, so say it aloud rather than checking it.

## Why the four top-level keys are not slots

`jurisdiction`, `description`, `use_when` and `avoid_when` are read before the
skill body, by an agent deciding whether to invoke it at all. They cannot carry
a placeholder, so they are named separately rather than hidden in a list a
filler might treat uniformly.

## Why comparators are separate from slots

A slot is a fact about one organization. A comparator is a **judgment** — which
places are usefully similar. An adopter who leaves a slot on its original value
has a bug; one who keeps the original peer set may simply agree with it.

A filler should ask about these differently, and a check must not treat an
unchanged comparator as an unfilled slot.

## `what` is required, and is for a person

Every entry says what the value is, in a sentence someone at another
organization can act on without reading the skill. `"the open date field"` is
not enough; `"the 311 open-date column in your service request data"` is.

That sentence is what `localize` shows when it asks, so a vague one produces a
wrong answer rather than a missing one.

## `exact` says how good an answer has to be

`true` where the value is consumed by machinery and has one right answer —
identifiers, field names, URLs, anything appearing as a `{{slot}}`. `false`
where it is read as prose and a high-level answer does the job: a cadence, an
office, a rough threshold.

It exists to stop two opposite failures. An adopter not told that approximate is
acceptable invents something exact-looking rather than admitting they do not
know. An adopter assuming approximate is fine supplies a description where a
schema needs a field name.

A filler asks differently for each, and treats *we do it informally, whoever is
around* as a real answer to an `exact: false` question rather than a refusal.

## Not everything local becomes a slot

Every slot is a question somebody has to answer, and a long interview gets
abandoned partway. A value nothing reads, one another slot implies, or one
sitting in a single sentence that reads fine without it, belongs in
`GENERALIZE-NOTES.md` rather than here. The file is an interview, not an
inventory.

## Unfilled values

A slot that has not been filled carries the literal string `TODO`. Not an empty
string, not a null, not a plausible placeholder value — those are all things a
skill could run on without anyone noticing.

## Slots in the body

`{{snake_case}}`, matching the key under `slots:`. Data-shaped values only —
field names, identifiers, numbers, URLs.

Names and phrases are written as prose that points at the context instead. A
sentence reading *"the {{agency_name}} response standard"* is worse than *"your
agency's response standard, named in `context.yml`"* — the first reads badly
until it is filled, and reads like a template even after.
