# Asking well

Read this before putting a question to anybody. Most failed localizations fail
here, and they fail silently — the adopter stops replying, and it reads as lost
interest rather than as a question nobody could have answered.

## Ask about the organization, not about the skill

An adopter knows their own organization. They do not know the skill, and they
very often do not know their own data — the person who wants a pothole analysis
is rarely the person who named the columns.

| Do not ask | Ask instead |
|---|---|
| What is your 311 open-date column? | *Which system takes your service requests?* Then read the schema. |
| What is your dataset identifier? | *Where does your open data live?* Then find it. |
| What is `repair_standard_days`? | *Do you publish a target for how fast potholes get fixed?* |
| Who is `approving_official`? | *Who signs off on analysis that leaves your team?* |
| What is your fiscal year start? | Look it up. It is published. Confirm it. |

The left column asks somebody to hold the skill's internal model in their head.
The right column asks about their working life, and produces the same values.

## Recall versus recognition

The single highest-yield move. *What is your open-date field?* demands recall
from someone who may never have seen the schema. *It looks like
`case_opened_dt` — is that the one?* asks for recognition, which is a different
and far easier cognitive task, and one a non-technical adopter can do reliably.

So the order is always: **derive, propose, confirm** — never *ask, then verify*.
This does not weaken the check. An `exact: true` value still needs a person to
say yes. It changes what the person has to supply in order to say it.

Where nothing can be derived, offer candidates rather than a blank:
*Public Works, Transportation, Streets, Highway — or something else?*

## Matching the question to `exact`

**`exact: false`.** Say that a rough answer is fine, and mean it. Offer a
default so the adopter can accept rather than compose. Accept *we do not have
one*, *it varies*, *whoever is around* as answers and write them through as
prose — these are true descriptions of small organizations, not evasions, and a
skill that cannot represent them cannot be adopted by them.

**`exact: true`.** Say the value must match exactly, and say what reads it, so
the adopter can tell that a guess is not an option. Then take responsibility for
finding it: a question of this kind that the adopter cannot answer is a signal
to go and derive it, not to press them.

Getting this backwards is the common damage. An adopter not told that
approximate is fine will invent something precise-looking, because precision
reads as competence. That invention lands in the notes as a confirmed value.

## Batching and order

One batch. A drip of single questions makes the length unknowable, which is
worse than a long list the adopter can see the end of.

Order by confidence, not by the order the slots appear: organization and people
first, process next, data last. The early questions build enough context to
derive some of the later ones, and an adopter who answers three easy questions
first will stay for a hard one.

Say how many there are and what happens when they are answered.

## Do not ask at all

The best question is the one skipped. Skip a slot when:

- The profile already answers it. Asking twice is how the second adoption fails.
- Another slot implies it, or `scope` settles it.
- It belongs to a branch of the skill this adopter will not use. Ask when they
  reach it, if they ever do.
- The skill reads fine without it, in which case it should not have been a slot
  and belongs in the notes.

## When the answer is "I do not know"

A real and common answer, and the design has to hold it.

For `exact: false`, take the vaguest true thing they can say and write that.
For `exact: true`, do not fill it. Leave the slot, record it in
`LOCALIZE-NOTES.md`, and say plainly which part of the skill will not run until
it is answered. Hand back a skill that is honestly incomplete in a named way.

Never resolve an unanswered slot by picking. A localized skill that runs on an
invented dataset identifier returns numbers, and nobody downstream can tell they
are wrong.
