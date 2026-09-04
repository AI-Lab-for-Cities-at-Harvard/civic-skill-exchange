# Generalized and localized skills

Most civic skills start out bound to one place. A policy skill written for the
State of Vermont knows Vermont's statute citations, Vermont's appeal windows, and
Vermont's form numbers. That is what makes it useful there — and useless anywhere
else.

The registry tracks where a skill sits on that axis, so you can tell at a glance
whether you are looking at something you can adopt or something you would have to
rewrite.

## The two states

**Localized** — carries one jurisdiction's specifics. Statute citations, form
numbers, deadlines, agency names, system URLs, local terminology. It works well
where it was written and needs real work to move.

**Generalized** — the jurisdiction-specific values have been lifted out into a
separate context that an adopter fills in. The procedure stays; the particulars
become a form to complete.

```
State of Vermont              generalized                City of Boston
policy skill        ─────►    policy skill      ─────►   policy skill
                   generalize                 localize
                        │                          ▲
                        └──► vermont.context ──────┘  boston.context
```

Neither state is better. A localized skill that solves a real problem in one city
is worth more than a generalized skill nobody has run. Generalizing is what you do
when you want the second city to be able to use it.

## Declaring it

Optional, in your `SKILL.md` frontmatter:

```yaml
metadata:
  civic.localization: generalized   # or: localized
```

**Leave it out if it doesn't apply.** Plenty of skills have no
jurisdiction-specific content in the first place — a plain-language rewriter or a
budget table formatter works anywhere as written. Omitting the field is the honest
answer for those, not a gap to fill in.

One rule the validator enforces: `generalized` contradicts a named
`civic.jurisdiction`. If the specifics have been lifted out, the skill names no
place and the field is simply absent. If they haven't, the skill is `localized`
and names the place it carries — `US-VT`, `US-MA / Boston`. An adopter reading
both fields cannot tell which one is wrong, so we catch it at submission
instead.

The rule runs one way only. A skill that names no place was not necessarily
generalized from anything: a reading-level calculator never had specifics to
lift out.

## The two skills

Two skills do the moving. **Neither is built yet** — they are tracked under the
[Generalize & localize milestone](../../milestone/3), and the convention for how a
generalized skill declares what needs filling in is still an open question
([#13](../../issues/13)).

| Skill | What it does |
|---|---|
| **generalize** ([#14](../../issues/14)) | Takes a jurisdiction-specific skill. Produces a generalized skill plus a context file holding everything it pulled out. |
| **localize** ([#15](../../issues/15)) | Takes a generalized skill and a new organization's context. Produces a skill for that organization. |

Until they exist, generalizing is a manual job: move the jurisdiction-specific
values into `references/`, describe in the body what an adopter has to change, and
say so in your "Adapting this to your jurisdiction" section.

## What usually needs lifting out

From skills we have looked at, in rough order of how often it gets missed:

- Form numbers and form names
- Statute and regulation citations
- Deadlines and time windows — 30 days in one state, 45 in the next
- Dollar thresholds
- Agency, department, and office names
- System URLs and internal tool names
- Local terminology — selectboard, city council, board of supervisors
- Eligibility criteria specifics
- Contact details and office hours

Form numbers lead that list for a reason. A missed agency name is obvious to the
next reader; a missed form number looks perfectly plausible and quietly sends
someone to a form that does not exist in their jurisdiction.

## The contract between the two skills

`generalize` writes a context file; `localize` reads it and fills it in. That
file is the whole interface between them, and it is specified in
`references/contract.md` **inside each skill** rather than here:

```
skills/civic-skills/generalize-skill/references/contract.md
skills/civic-skills/localize-skill/references/contract.md
```

Read that file for the shape — the slot keys, what `what` and `exact` mean, how
an unfilled value is written. This document deliberately does not restate any of
it, because a third copy would be a third thing to keep in step.

### Two copies, on purpose

Each skill installs as a self-contained directory. `localize-skill` on somebody
else's machine has to carry the contract it reads; a pointer to a file in this
repository would point at something the adopter does not have. So the
duplication is deliberate, and the two copies are meant to be kept in step by
hand: change one, change the other.

**There is deliberately no check in this repository for that.** A test
comparing two listings' reference files would be a skill's own test living in
the registry's suite, which is what `docs/DEVELOPMENT.md` rules out — the
registry validates a listing against the contract and has no opinion about a
skill's internals. It would also gate a legitimate edit to one skill on editing
the other, and it would protect the wrong thing: the copies do not live in this
repository once installed, they live on two machines at two versions.

Which is what `contract_version` is for.

### `contract_version`

One integer in every context file, checked by every reader. It is the mechanism
for drift between the copies, and it works where the copies actually are: an
adopter running a two-year-old `localize-skill` against a context file written
last week is the case it makes **detectable** rather than merely unlikely. No
build-time check in this repository could see that machine.

Bumped only when an old reader would get it wrong — renaming a key, removing
one, changing what one means. Adding an optional key is not a bump. That rule is
what keeps the warning meaningful: if every additive change bumped it, every
adopter would see a warning on every skill, none would mean anything, and they
would learn to click past the one that did.

The contract file has the table of what a reader does about a mismatch, in both
directions, which are not symmetrical.

---

## Why this matters for the registry

A registry of localized skills accumulates. A registry of generalized skills
compounds: one agency does the work, several adopt it, and each adoption is a
chance to find the thing the original author did not know was local.

That is the whole premise of this exchange — a city that solves a problem once
should be able to hand the solution to the next hundred cities. Generalizing is
how a solution actually makes that trip.
