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
`civic.jurisdiction` like `us-state`. If the specifics have been lifted out, the
jurisdiction should be `generic` (or `intl`). If they haven't, the skill is
`localized`. An adopter reading both fields cannot tell which one is wrong, so we
catch it at submission instead.

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

## Why this matters for the registry

A registry of localized skills accumulates. A registry of generalized skills
compounds: one agency does the work, several adopt it, and each adoption is a
chance to find the thing the original author did not know was local.

That is the whole premise of this exchange — a city that solves a problem once
should be able to hand the solution to the next hundred cities. Generalizing is
how a solution actually makes that trip.
