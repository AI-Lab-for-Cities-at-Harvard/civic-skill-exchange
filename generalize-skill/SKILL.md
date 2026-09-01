---
name: generalize-skill
description: >
  Separates a skill written for one organization into two things a portable
  generalized skill, and a context file holding every value that was specific to
  that place. Records how far the skill was generalized to travel, since that is
  what decides which values are local at all. Reports what it was unsure about
  rather than guessing. Produces drafts for the author to check; decides nothing
  and publishes nothing.
license: CC0-1.0
compatibility: >
  No network access, no credentials, no external services. Reads and writes
  local files only.
allowed-tools: Read, Write, Grep, Glob
metadata:
  civic.category: open-data-publishing
  civic.jurisdiction: generic
  civic.localization: generalized
  civic.data-sensitivity: none
  civic.human-review: none
  civic.use-when: >
    A skill works in one city, county or state and someone else wants it. Run
    this to separate what is true everywhere from what is true only where it was
    written.
  civic.avoid-when: >
    Not for a skill with no organization-specific content — it would find
    nothing and waste the author's time. Not a review: it does not check whether
    the skill is correct, safe, or worth adopting. It cannot tell whether a value
    is genuinely local or merely looks it, which is why anything uncertain is
    reported rather than removed.
  civic.maintainer: "AI Lab for Cities at Harvard"
  civic.contact: "security@civic-skill-exchange.example"
  civic.affiliation: academic
  civic.deployment: none
---

# Generalize a skill

## What this produces

**Two separable artifacts, never one.** The generalized skill must carry no
trace of the organization it came from, or it is not portable — so the extracted
values live outside it:

```
<skill-name>/                 the generalized skill. Give this to anyone.
  SKILL.md
  references/…  scripts/…     as before, with local values replaced
  context.template.yml        the slots, all TODO
<org>.context.yml             the extracted values. One organization's copy.
GENERALIZE-NOTES.md           what was extracted, uncertain, and left
```

Either artifact is useful alone. Together they compose: `localize` takes the
generalized skill plus a filled context and writes the values back in.

Copy `assets/context.template.yml` to start both context files. Read
`references/contract.md` for the format and `references/what-is-local.md` for
how to sort what is found — read that one before starting, since most mistakes
are sorting mistakes.

## The failure that matters

A missed value produces confident wrong output in the next organization: no
error, no warning, a wrong answer. A value flagged unnecessarily costs the
author ten seconds.

Flag freely. Remove nothing that cannot be named.

## Steps

**1. Read every file first.** Including `scripts/` — a hardcoded dataset
identifier in a script is the same problem as one in the body, and easier to
miss.

**2. Determine the scope**, before sorting anything. Two questions: at what tier
of government does this skill operate — `international`, `country`, `state`,
`county`, `city`, `neighborhood`, or `other` — and **how far is it meant to
travel?**

The second question sets the boundary, and the sort in step 3 depends on it. A
fact above the reach line is shared context and stays; a fact at or below it is
local and comes out. The same sentence sorts differently depending on the
answer: for a city skill headed to other cities in the same country, national
law is shared and state law is local; headed abroad, both are local, and so is
the assumption that a city council exists. For a skill moving between
neighborhoods of one city, the city itself is shared and must **not** be
extracted — removing it produces a skill that has lost the ground it stands on,
and asks an adopter to fill in what they already share.

Take the tier from what the skill acts on, not from who wrote it: a regional
authority publishing a template for its member towns has written a `city`-tier
skill. `other` is worth using for school districts, transit authorities and
special districts, which do not sit on the municipal ladder.

Ask about the reach if it is not evident. It usually is not — the author never
had to state it. Record both in the context file under `scope`, so an adopter
can tell at a glance whether the skill is meant for a place like theirs.

**3. Sort what is found** into local, method, and comparators, per
`references/what-is-local.md`, against the boundary from step 2. Extract the
first and third. Leave method alone: a generalized skill that has lost its
method is not portable, it is empty.

**4. Replace, never delete.** Each extracted value becomes a named slot. Use
`{{snake_case}}` where the value is data-shaped — a field name, an identifier, a
number, a URL. Use prose that points at the context where the value is a name or
a phrase, because `{{agency_name}}` mid-sentence reads badly both to a person
and to an agent.

A sentence with its specifics removed and nothing put back is worse than the
original: it looks finished and says nothing.

Not every extracted value should become a slot. **The context file is the
interview `localize` will conduct with the next adopter**, not a record of what
was found, and a long interview gets abandoned partway. Before adding a slot,
ask what breaks if it is wrong. If nothing reads the value, if another slot
implies it, or if it sits in one sentence that reads fine without it, it belongs
in the notes instead. Extraction and interrogation are different things.

Then **say how exact each answer has to be**, with `exact:` on the entry. Some
values are consumed by machinery and have one right answer: identifiers, field
names, URLs, anything appearing as a `{{slot}}`. Others are read as prose, and a
high-level answer is genuinely enough — *roughly quarterly*, *our public works
department, whatever it is called this year*, *whoever signs off*. An adopter
who is not told that approximate is acceptable will invent something
exact-looking rather than admit they do not know.

**5. Handle the frontmatter separately.** `description`, `civic.use-when` and
`civic.avoid-when` are read by an agent deciding whether to invoke the skill,
before any context file is loaded. **A placeholder in them is a bug** — the
agent reads `{{city}}` literally and either never invokes the skill or invokes
it everywhere.

Rewrite them as organization-neutral prose, and put the specific versions in the
context under their own keys. Localizing writes them back.

**6. Stamp the contract version.** Both context files open with
`contract_version`, copied from `references/contract.md`. A context file without
it cannot be safely read later — a reader finding no version does not know
whether the file is old or merely unmarked, and must stop and ask rather than
assume. Writing the number is the cheapest thing in this skill and the only
thing that makes a future mismatch legible.

**7. Record what was uncertain**, in `GENERALIZE-NOTES.md`: everything
extracted; everything that could not be confidently sorted, with which way the
evidence leaned; and anything local-looking that was deliberately kept, with the
reason. Methodology named after its source institution is the common case.

Do not resolve an uncertainty by picking. The author knows; a guess does not.

## Before finishing

- Grep the generalized skill for every extracted value. None may survive
  anywhere, including scripts and references.
- Every `{{slot}}` in the body appears in the context, and every context entry
  is used somewhere.
- No placeholder appears in `description`, `civic.use-when` or
  `civic.avoid-when`.
- `scope` records the tier and the reach, and nothing above the reach line was
  extracted.
- Both context files open with `contract_version`, matching the contract.
- Every slot is a question worth asking, and each says how exact its answer
  needs to be.
- Running this skill again on its own output changes nothing. A second pass that
  finds more means the first was incomplete.
