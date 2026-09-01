# Verifying a localized skill

Two different failures, checked differently. One is obvious and mechanical. The
other is invisible and is the reason this file exists.

## Part 1 — Nothing was left unfilled

Mechanical. Grep the whole directory, including scripts, file names and
comments.

- No `{{` anywhere.
- No `TODO`, `FIXME`, `XXX`, or `<placeholder>`.
- No key in the context still holding the template's TODO.
- Every context entry is used somewhere in the skill; an unused one means either
  a missed substitution or a slot that should never have existed.
- The skill reads no context file at run time. If a path to `.context.yml`
  survives in the body, substitution was skipped somewhere and papered over.

Also confirm the version check actually happened and was recorded. A localized
skill built from a context file whose version was never compared is not a
verified skill — it is one where the comparison was skipped silently, which
looks identical from the outside.

## Part 2 — Nothing was filled wrongly

Not mechanical, and not detectable by reading the skill — a wrong dataset
identifier looks exactly like a right one. The check is provenance, not
plausibility.

For every `exact: true` value, one of these must be true:

- A person confirmed it, and the notes say so.
- It came out of the organization's own systems.

Inference is not on that list. A value derived from a public catalogue is a
proposal until somebody says yes; if nobody said yes, it is unconfirmed and
belongs in the notes as such, not in the skill as fact.

Where a value can be tested cheaply, test it rather than trusting it: an
endpoint that resolves, an identifier the catalogue returns, a field name
present in the schema. Report what was tested and what was not.

## Part 3 — It will actually fire

The most-missed step, because it looks like metadata rather than content.
`description`, `civic.use-when` and `civic.avoid-when` are read by an agent
before any context is loaded.

A localized skill that kept its neutral description will not be invoked on a
local request — the adopter's *analyse our pothole response* will not match
*analyses 311 service requests for a jurisdiction*. The skill is correct,
complete, and never runs.

Check that the frontmatter names the organization, uses the words the adopter
would use, and that `civic.localization` reads `localized` rather than
`generalized`. Then read the description as though deciding whether to invoke
it, and ask whether a request phrased in local terms would match.

## Part 4 — What the adopter is told

Hand back the skill with the honest list, not just the skill:

- Values that were defaulted rather than confirmed.
- Slots left unfilled, and which part of the skill each one blocks.
- Values derived from public sources and confirmed by recognition rather than
  from an authoritative system — right almost always, and worth naming.
- Anything retained because it sat above the reach line, so it does not read as
  a leftover and get "fixed".

An adopter who knows which three values are shaky can check three values. An
adopter handed a skill described as finished checks nothing.
