# Sorting what you find

Three piles. Most mistakes are sorting mistakes, not extraction mistakes.

## First, the boundary

The piles are not fixed properties of a value. They depend on how far the skill
is meant to travel, which is why scope is settled before sorting starts.

**A fact above the reach line is shared context and stays. A fact at or below it
is local and comes out.**

| Tier | Reach | National law | State law | The city itself |
|---|---|---|---|---|
| city | other cities, same country | shared | local | local |
| city | other countries | local | local | local |
| neighborhood | other wards, same city | shared | shared | **shared — keep it** |

The third row is the one that surprises people, and over-extraction is a real
failure rather than merely wasted effort. A ward-level skill with the city taken
out of it has lost the ground it stands on: the datasets, the ordinances and the
reporting structure are all still true for every adopter it will ever reach, and
replacing them with `TODO` asks people to fill in what they already share.

Record the reach in the context file. Without it, a deliberately retained city
name reads like a value somebody forgot.

## Local — extract

Verifiably true in one place, and false or absent elsewhere.

- Jurisdiction and agency names, and the possessives built from them
- Statute and regulation citations, ordinance numbers
- Form numbers and names
- Deadlines, appeal windows, response-time standards
- Dollar thresholds, fee schedules, income limits
- Dataset identifiers, API endpoints, portal URLs
- Column and field names from a local schema
- System and vendor names where the vendor is that organization's choice
- Contact details
- Local vocabulary: *selectboard* / *city council*, *parcel* / *lot*,
  *constituent* / *resident*
- Neighborhood, district and ward names
- Eligibility rules set locally

## Method — leave alone

True regardless of where the skill runs. Removing this is the failure that
produces an empty skill nobody can use.

- Analytical frameworks and the standards they set
- What makes a problem statement good
- Statistical practice: confidence, sample size, when a difference is real
- Document structure — how a memo or a brief is organized
- Equity analysis as a method, distinct from the local groups it is applied to
- Named methodologies and their sources. **J-PAL, Bloomberg, GovLab and
  PerformanceStat are attributions, not local facts.** A skill written in Boston
  citing J-PAL is not thereby a Boston-specific skill.

The test: *if this skill ran at the far edge of its reach, would this sentence
still be right?* If yes, it is method. For a skill headed abroad that is another
country; for one headed across a single city's wards it is the next ward over,
and rather more survives the question.

## Comparators — extract, and mark as a choice

The middle case, and the one most often got wrong in both directions.

A peer set, a benchmark group, a reference population. It looks local because it
names places, and it is not a local fact — it is a judgment about which places
are usefully similar. Boston benchmarking against San Francisco is a defensible
choice, not a property of Boston.

Extract them so the next adopter is asked. Mark them as comparators so nobody
treats an unchanged one as a bug.

## When you cannot tell

Record the uncertainty. Do not resolve it by picking.

The cases that recur:

- **A number that might be a threshold or might be a convention.** Is a 30-day
  window this city's rule, or a widely used default?
- **A name that might be a department or might be a product.** Local
  organizations and their vendors read alike from outside.
- **A term that might be jargon or might be standard.** Some words are local
  vocabulary in one region and the ordinary word in another.
- **A field name that might be a local schema or might be an open standard.**
  Open311 has standard field names; a local CRM does not.

Record which way the evidence leaned, and why. The author answers in seconds
what a guess gets wrong silently.
