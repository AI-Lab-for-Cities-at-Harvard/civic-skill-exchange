---
name: localize-skill
description: >
  Fits a generalized skill to one organization writes its local values back in
  and produces an ordinary, self-contained skill that runs without a context
  file. Works out what it can from the organization's own data and public
  sources, and asks a person only what no source can answer, at the precision
  the value actually needs. Confirms every machine-consumed value before
  shipping, because a plausible wrong value is worse than a blank one.
license: CC0-1.0
compatibility: >
  Reads and writes local files. Optionally reads public open-data catalogues to
  propose values, which are always confirmed and never written unseen. No
  credentials, no writes to any external service.
allowed-tools: Read, Write, Grep, Glob, WebFetch
metadata:
  civic.category: ai-tools
  civic.jurisdiction: generic
  civic.localization: generalized
  civic.data-sensitivity: none
  civic.human-review: none
  civic.use-when: >
    Someone has a generalized skill and wants to run it where they work. Run
    this to fit it to their organization and hand back a skill that works.
  civic.avoid-when: >
    Not for a skill that was never generalized — there is nothing to fill, and
    editing local values by hand is the better tool. Not a review: it does not
    check whether the skill is correct or worth adopting, only that every value
    it wrote is one somebody confirmed.
  civic.maintainer: "AI Lab for Cities at Harvard"
  civic.contact: "security@civic-skill-exchange.example"
  civic.affiliation: academic
  civic.deployment: none
---

# Localize a skill

## What this produces

**One artifact that stands alone, plus the record of how it was made.**

```
<skill-name>/                 an ordinary skill. Runs as-is.
  SKILL.md                    values written in, no {{slots}}, no TODO
  references/…  scripts/…     the same, throughout
<org>.context.yml             the filled context. Keep it to re-localize later.
<org>.profile.yml             org-wide answers, reused by every future skill
LOCALIZE-NOTES.md             what was derived, asked, defaulted, unconfirmed
```

The localized skill **does not read the context file at run time**. Values go
into the body. A skill that must load a context to know its own field names
pays that cost on every invocation and fails confusingly when the file moves —
the context is the record of a decision, not a runtime dependency.

Read `references/contract.md` for the file format, `references/asking.md`
before asking anybody anything, and `references/verify.md` before handing
anything back.

## The failure that matters

Not question count. **Questions the adopter cannot answer.**

A skill that asks a town clerk for a dataset identifier and a schema field name
does not get filled in slowly — it gets abandoned, and the abandonment looks
like disinterest rather than a design fault. This is what stops an exchange
working at scale, and it is a property of the questions, not of the adopter.

So: derive what can be derived, ask about the organization rather than about the
skill, and let the answers an organization has already given serve every skill
it adopts afterwards.

The second failure is quieter. A slot filled with a plausible wrong value
produces a skill that runs, returns numbers, and is wrong. **Never write an
unconfirmed value into an `exact: true` slot.** A blank that blocks is
recoverable; a fill that misleads is not.

## Steps

**1. Check `contract_version` before reading anything else.** It is the first
key in the context file. Compare it to the version in
`references/contract.md`.

Matching is the ordinary case — proceed, and say nothing about it. If the file
is **older**, migrate it against the changelog and note which entries changed.
If the file is **newer than this skill understands, stop.** Do not fill any
slot. An unknown breaking change means any value in the file may be misread, and
a misread value becomes a plausible wrong one in a skill that runs and returns
numbers. Name the gap and ask for a newer `localize-skill`.

If there is **no** `contract_version`, do not assume `1`. A file written before
versioning has an unknown shape rather than an old one. Ask what produced it.

**2. Read `scope`, and say it aloud.** Before any question, tell the
adopter what tier the skill operates at and how far it was generalized to
travel, in a sentence: *this was written for cities and generalized for other
US cities and towns.*

Whether they fall inside that reach is a judgment, not a lookup, so put it to
them rather than testing it. An adopter outside the reach should **re-generalize
rather than fill**: the slots are the only things made portable, and what was
left standing is invisible from here. Filling those slots produces a skill that
looks finished and quietly assumes a country, a legal system or a form of
government they do not have.

If the retained values look local to them — a city name in a ward-level skill —
that is `reach` working, not an oversight. Say so before they try to fix it.

**3. Load what is already known.** Before asking anything, assemble the answers
on hand:

- `<org>.profile.yml`, if this organization has adopted a skill before.
  Jurisdiction, the approving official, the open-data portal, the fiscal year
  are the same across every skill they will ever adopt. Asking twice is how an
  exchange loses people on the second skill.
- Values that another slot implies. A portal base URL and a dataset identifier
  are not two independent questions.
- Defaults settled by `scope` — country, currency, postal format, statutory
  regime — which a tier and reach already fix.

**4. Derive what can be derived, then confirm it.** For values with a public
source — dataset identifiers, schema field names, portal endpoints, department
names — look them up and **propose** them. *Your 311 open-date column appears to
be `case_opened_dt`. Correct?* is a question anybody can answer. *What is your
311 open-date column?* is a question almost nobody can.

Confirming a derived value is a question too, but it is a different kind: it
asks for recognition rather than recall, and recognition is what makes this
usable by someone who did not build the data. Derivation never removes the
confirmation for `exact: true` values. It moves the burden, not the check.

**5. Ask for the rest, once.** One batch, not a drip. Order by what the adopter
knows best: their organization first, their data last. Skip anything already
answered in step 2, and skip any slot whose branch of the skill this adopter
will not use — an optional slot asked eagerly is indistinguishable from a
required one.

Match the question to `exact`. Where it is `false`, offer a default and say a
rough answer is fine; *we do it informally, whoever is around* is a real answer.
Where it is `true`, say that the value must match exactly and why, so a guess is
recognisably not an option. `references/asking.md` has the shapes that work.

**6. Write the values in.** Substitute throughout — body, references, scripts,
file names, comments. Then restore the frontmatter: `description`,
`civic.use-when` and `civic.avoid-when` get the organization-specific versions
from the context, because an agent reads those before any context is loaded and
a neutral one will not fire on a local request.

Set `civic.localization: localized` and `civic.jurisdiction` to the
organization. Remove `context.template.yml` from the skill directory. What ships
should look like a skill someone wrote for this organization, because that is
now what it is.

**7. Write the record.** `<org>.context.yml` with every value and where it came
from — profile, derived, asked, defaulted. `<org>.profile.yml` updated with
anything org-wide, so the next skill starts most of the way filled.
`LOCALIZE-NOTES.md` for what was defaulted without confirmation, what was
skipped as unused, and anything the adopter was unsure of. Provenance is what
lets somebody audit a wrong number later without redoing the interview.

**8. Verify before handing it back.** `references/verify.md`. A skill that still
contains `{{slot}}` or `TODO` is not finished, and a skill whose values were
never confirmed is worse than one that is obviously unfinished.

## Before finishing

- The context file's `contract_version` was checked, and no slot was filled from
  a file newer than this skill understands.
- No `{{placeholder}}` and no `TODO` survives anywhere, including scripts,
  references, file names and comments.
- Every `exact: true` value was confirmed by a person or came from the
  organization's own systems. None was inferred and written silently.
- `description`, `civic.use-when` and `civic.avoid-when` name the organization
  and would fire on a local request.
- The skill runs without reading any context file.
- `LOCALIZE-NOTES.md` lists every unconfirmed or defaulted value, and the
  adopter has seen that list.
- `<org>.profile.yml` holds everything org-wide, so the next skill asks less.
