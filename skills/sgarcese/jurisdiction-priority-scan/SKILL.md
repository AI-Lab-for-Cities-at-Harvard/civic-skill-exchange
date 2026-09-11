---
name: jurisdiction-priority-scan
description: Supports problem identification, the first phase of performance management. Runs a broad scan for potential issues a state or city agency might focus on, drawing on the jurisdiction's performance data through an OpenContext MCP connector, local media coverage, public testimony, and social media where a tool can reach it. Covers state labor and workforce, state health and human services, city 311, emergency dispatch (CAD), and city operations. Produces a ranked list of candidate problems for agency leaders and performance officers, each tagged by evidence source, shape (acute/chronic), horizon, degree of control, and dominant cost, with a verified/partial/unverified confidence flag, plus a second list of adjacent problems where the agency has leverage but no formal remit. Use when someone asks what a state or city agency should prioritize, where to target process improvement, what data or local coverage shows about emerging problems, or for a priority scan or focus areas.
license: MIT
compatibility: >
  Requires an OpenContext MCP connector (github.com/sgarcese/OpenContext) for the
  jurisdiction's open data portal, and a web search and fetch tool. A social media
  tool is optional; without one the skill skips that source and says so. Network
  access to those services only; no credentials beyond what the connectors hold.
metadata:
  civic.category: policy
  civic.category-secondary: data-analysis
  civic.scope: regional
  civic.scope-secondary: municipal
  civic.language: en
  civic.localization: generalized
  civic.data-sensitivity: none
  civic.human-review: none
  civic.use-when: >
    Problem identification, the first phase of performance management. A US state
    or city with an OpenContext connector wants a broad, evidence-disciplined scan
    of potential issues for one agency in one domain, drawn from its performance
    data, local media, public testimony and social media, and classified for a
    performance officer deciding where to send analysts.
  civic.avoid-when: >
    Not for jurisdictions without an open data connector; the scan degrades to
    media and testimony alone, which over-weight whatever got attention. Not for
    places outside the US, since the domain packs assume US federal programs and
    standards. Not a diagnosis or a decision about any person or case. Not for a
    live demo on a three-to-four minute clock; use a quick-scan variant.
  civic.maintainer: Santi Garces
  civic.affiliation: individual
  civic.deployment: none
---

# Jurisdiction Priority Scan

Produce a defensible, sourced list of candidate priority problems for one agency in one domain, classified so that a performance officer can decide where to point scarce analyst time.

The scan supports the first phase of performance management, problem identification. It is deliberately broad: its job is to surface the full range of issues the agency might focus on, across its whole remit, before anyone narrows to one. Its output is a candidate list and an analyst work plan, not a diagnosis, a target, or a program design; those come in later phases, once a problem has been selected and its evidence closed.

This is the deep version of the scan: it retrieves widely, checks what it retrieves, and takes seven to ten minutes. Use it for desk research and preparation.

**If the output will be watched while it is produced — a live demo, a workshop, anything on a three-to-four-minute clock — use `{{quick_scan_skill}}` instead**, if one is installed. A quick scan runs a fixed small query pack with a hard information budget and produces three items per list. Same classification scheme, same evidence rules, a fraction of the retrieval. If no quick-scan skill exists, run this one with Phase 1 capped at one portal search, one dataset query, and two local media searches, and say you did.

## Setup — what this run is about

This skill is configured for one jurisdiction, one domain, and one principal agency.

- **Domain pack:** `references/domains/{{domain}}.md`. Read it before the first run of a session. It lists the principal agency's typical remit, the dataset families to look for, what local media tends to cover in this domain, federal comparators, the domain's own traps, and the touchpoints that create List B leverage.
- **Principal:** the agency whose remit defines List A, and the office the memo is prepared for, are named in the context this skill was localized from. The principal agency's actual remit, also from the context, overrides the typical remit in the domain pack wherever they differ — agencies are organized differently from place to place, and the scan must follow how this one is actually organized.
- **Performance data:** the jurisdiction's OpenContext connector, `{{open_data_connector}}`, running the `{{open_data_backend}}` backend against `{{portal_url}}`. Tool names follow the pattern `mcp__{{open_data_connector}}__{{open_data_backend}}__<verb>`. The verbs, query dialect and row limits differ by backend — read `references/backends.md` before writing the first query.
- **Cross-tier connectors:** `{{secondary_connectors}}`. A city scan often needs the state's data (unemployment claims by county, benefit caseloads) and a state scan sometimes needs a large city's. Use these where the domain pack says cross-tier evidence matters.
- **Local media:** the outlets that cover this agency, named in the context this skill was localized from. Search them by name.

## What makes this skill worth using

Anyone can generate a plausible list of agency problems from background knowledge. That list is worthless to a performance officer, because they cannot tell which items are real and which are the model's priors dressed up in numbers.

This skill's value is two disciplines together. **Breadth:** it looks across the agency's whole remit, in its own data and in local coverage, rather than stopping at the first strong signal. **Evidence:** every figure is retrieved during the run or it does not appear as a figure. Candidates that come from judgment rather than retrieval are still allowed and often valuable, but they are labeled as such and carry the check that would confirm them. A user should be able to look at the output and know, item by item, what they can take to a briefing and what needs an analyst first.

## The four sources

1. **Performance data (OpenContext).** What the agency's own numbers show — volumes, backlogs, timeliness, outcomes, staffing. The most reliable source and the one that anchors `Verified` items.
2. **Local media.** What reporters in the jurisdiction are covering — backlogs residents feel, failures that made the news, investigations, lawsuits, closures. Local outlets surface problems with a date and a named constituency attached, often before a data series moves. National coverage is secondary; use it only where it concerns this jurisdiction.
3. **Public testimony.** What gets asserted on the record — legislative or council hearings, budget testimony, rulemaking comment. Problems surface here with a named constituency attached, often a year before they appear in a data series.
4. **Social media, where a tool can reach it.** What residents say about the agency's services. The weakest source and the easiest to fabricate. If no available tool reaches a platform, do not use it and say so in the Sources section.

Other web sources — audit reports, federal comparison data, non-local coverage — support and check the four, and are tagged `Web`.

The strongest candidates appear in more than one source. A backlog visible in the portal *and* in a local story *and* in resident complaints is a different proposition from any one of them alone.

## Run order

Phase 1 and Phase 2 are where the time goes. Issue Phase 1's calls together in a single block — they are independent, and running them in parallel is the difference between a three-minute scan and a ten-minute one. If the environment defers tool loading, load the connector's tools first.

### Phase 1 — Retrieve broadly (parallel)

Before firing, take the remit list — from the context, or the domain pack if the context is silent — and treat it as a checklist. The retrieval below should touch every area on it at least once, through data, local media or testimony. An area nothing touched is a gap to report, not an area without problems.

Fire all of these in one block:

1. **Two to four `mcp__{{open_data_connector}}__{{open_data_backend}}__search_datasets` calls**, each on a different part of the remit, using the search terms in the domain pack.
2. **Queries against two to four known datasets** — the seed datasets in `references/sources.md` — favoring timeliness, backlog, and outcome series over raw volume. The query verb depends on the backend (`query_dataset` for Socrata, `query_data` or `aggregate_data` elsewhere); see `references/backends.md`.
3. **Three to five local media searches** with `WebSearch`, naming the local outlets and the agency or its programs, paired with problem words — backlog, delays, wait, complaints, audit, lawsuit, investigation, shortage, closure. Bound them to the last twelve months. `references/sources.md` has the query patterns.
4. **One or two testimony searches** — the hearings, budget sessions and rulemaking dockets named in the context, over the last twelve months.
5. **One audit search** — the jurisdiction's audit office named in the context.
6. **Social media**, only if a tool in this session actually reaches a platform. Otherwise skip it and record that it was skipped.
7. **One cross-tier query** against a secondary connector, where the domain pack calls for it.

Read `references/sources.md` before the first run of a session. It carries the seed datasets, the known data quirks for this jurisdiction, the local media query patterns, and the two traps that will otherwise produce wrong numbers.

After the first block, spend the remaining budget where the first block found something — a series that moved, a story with a date — and on any remit area still untouched.

### Phase 2 — Verify the numbers you plan to use

For every figure that will appear in the output, confirm it came back from a tool call in this run. A figure quoted in a news story is the reporter's figure: cite the story, and where the portal has the underlying series, check it. Three checks, each of which catches real and common errors:

**Never sum a stock across time.** Headcount, enrollment, caseload, open requests, and vacancy counts are snapshots. Summing monthly headcount over nineteen months does not give you headcount; it gives you person-months, and it will be wrong by a factor of nineteen while looking entirely reasonable. Flows — hires, separations, claims filed, requests opened, calls received — are events and sum correctly. When in doubt, take a single-period slice and say which period.

**Check that related totals reconcile.** If separations exceed hires by more than a hundred over two months but headcount falls by a few dozen, something in the data does not mean what its column name says. The same holds for requests opened minus closed against the open backlog, or applications received minus decided against pending. Do not silently pick whichever number supports the story. Report the discrepancy as a finding — an inconsistency a performance officer did not know about is often more valuable than the metric they asked for.

**Check that a row limit did not truncate the answer.** Every OpenContext backend caps rows returned, some as low as 100. A count computed by counting returned rows, or an aggregation whose group count exceeds the limit, is silently wrong. Aggregate server-side where the backend allows it, and state the limit where it does not. See `references/backends.md`.

### Phase 3 — Classify and write

Build both lists, apply the five classifications, and write the memo.

## Classification

Every candidate on both lists carries five tags. Use exactly these vocabularies so items are comparable.

**Evidence source** — `Data` · `Local media` · `Public testimony` · `Web` · `Social media`

Tag what actually produced the candidate in this run, not what could have. `Web` covers audits, federal data, and non-local coverage. If two sources converged on the same problem, list both — convergence across independent sources is the strongest signal in the output and should be visible.

**Shape** — `Acute` (a spike with a date attached) or `Chronic` (a slow, persistent drift)

The distinction drives the response, not just the description. Acute problems need a response now and often resolve on their own; chronic ones need a program and will not. A chronic problem with an acute episode sitting on top of it is common and worth calling out explicitly — that combination is usually the highest-value item on the list.

**Horizon** — `Quarter` · `Year` · `Term ({{term_length_years}} yr)`

Where meaningful impact is achievable, not where the problem ends. A quarter-horizon item is one where an administrative change — a form, a queue, a routing rule, a staffing reallocation — moves the number. A term-horizon item needs statute or ordinance, capital, or a pipeline that takes years to fill. Be honest here; the most common failure is labeling a term problem as a year problem because that is what a principal wants to hear.

**Control** — `Controls` (the jurisdiction can act directly) · `Influences` (it shapes the outcome through funding, regulation, or convening) · `Little control` (driven by markets, federal policy, another level of government, or demographics)

Low control does not mean low priority. It means the response is preparation and positioning rather than direct intervention, and a performance officer needs to know that before assigning it to a team.

**Dominant cost** — `Dollars` · `Staff time` · `Rework` · `Reputation`

Which one actually dominates. Rework — work done twice because it was wrong the first time — is chronically underweighted in public-sector problem selection and is often where the recoverable capacity is.

## Confidence

Every claim carries one of three flags. This is not decoration; it is the reason the output can be trusted.

| Flag | Means | Requirement |
|---|---|---|
| `Verified` | The figure came back from a tool call in this run | Cite the dataset ID or URL and the period covered |
| `Partial` | Retrieved something adjacent — a related figure, a news report of a figure, an older period | Say what you actually retrieved versus what is being claimed, and give the check that would close the gap |
| `Unverified` | Judgment or background knowledge, retrieved nothing | State no specific number. Give the check that would confirm or kill it. |

**The rule that matters: no number without a retrieval.** If a figure was not returned by a tool during this run, do not write it — not as an estimate, not as "roughly," not as a range. Describe the pattern qualitatively and mark it `Unverified`. A memo that says "appeals backlogs appear to be growing; I did not retrieve a figure, check the appeals dataset on the portal or the federal quarterly report" is useful. A memo with a fabricated backlog number is worse than no memo, because it will be repeated.

A figure from a local story, fetched in this run, is `Partial` until the portal or an official source confirms it — the retrieval is real, but it is the reporter's number. The standards and benchmarks in the domain packs are background knowledge until a retrieval in this run confirms the current version.

Social media candidates are almost always `Unverified` or `Partial` and should say so plainly. Do not invent posts, volumes, or sentiment.

## The two lists

### List A — Core problems (minimum 3)

Problems inside the principal agency's remit, as the context defines it. The domain pack lists the typical remit for this kind of agency; use it only where the context is silent. Aim for spread across the remit — five items that all concern one program usually mean the scan stopped looking.

### List B — Adjacent leverage (minimum 3)

Problems the principal agency does not own, but where its operations give it unusual reach. This list is the one that earns the memo its keep, because these are invisible to a scan organized by agency remit.

The structural insight to apply: every agency touches some population or channel, at some moment, that other agencies struggle to reach. That makes it a distribution channel for problems owned elsewhere. The domain pack names the specific touchpoints for this kind of agency and the territory where they tend to pay off.

For each List B item, state the leverage explicitly — the specific touchpoint, moment, or dataset that creates the opening. "The labor agency sees every claimant at the moment of job loss, which is also the moment health coverage lapses" is a leverage statement. "The labor agency cares about childcare" is not.

## Output format

Produce the structured list first, then the memo. The list is the artifact a performance officer will work from; the memo is what they forward.

### Part 1 — The classified list

One table per list, with these columns:

`# | Problem | Source | Shape | Horizon | Control | Dominant cost | Confidence`

Keep the problem statement to one line. Detail goes in Part 2. Order each list by the priority ranking, most actionable first — where "actionable" means high control and short horizon, adjusted for how much the evidence actually supports it. `references/classification.md` gives the ordering heuristic.

### Part 2 — The memo

```
# [Jurisdiction] Priority Scan — [Domain]
[Date] · Prepared for [the office named in the context]

## Recommendation
[The two or three items to act on first, and why those and not the others.
Lead with this. Do not make the reader work through the evidence to find the answer.]

## What the evidence supports
[The verified findings, with the figures and their sources. This is the short
section and it should be the most confident one.]

## List A — Core problems
[Per item: the problem in a sentence, the evidence with its citation, the
five tags, and what a first analyst pass should look at.]

## List B — Adjacent leverage
[Same, plus the explicit leverage statement.]

## Coverage
[Each remit area, and which sources the scan examined it through — data, local
media, testimony, social — or none. Areas no source reached are gaps, not clean
bills of health.]

## What I could not verify
[Every Partial and Unverified item, with the check that would close it.
This section is a feature. It is the analyst work plan.]

## Sources
[Dataset IDs with periods covered, the portal they came from, and URLs.
Local media stories with outlet and date. Testimony with who said it, where and when. Social media: what was searched,
with which tool, or "not searched — no tool available".]
```

The "What I could not verify" section is not a disclaimer to be minimized. For a performance officer deciding where to send analysts, it is frequently the most actionable page in the document. The Coverage section is its partner: it shows where no one has looked yet.

## Running this live

- Say what you are reaching for before you reach for it. "I'm going to ask the open data portal what exists across the agency's programs, search the local papers and hearing records for the last year, and check what residents are saying" is a sentence the room can follow; a wall of parallel tool calls is not.
- Prefer one deep, verified finding over five shallow assertions. The audience remembers the number you could stand behind.
- When something fails or returns nothing, say so out loud and continue. A visible gap is a better demonstration of the method than a smooth answer, particularly in front of an audience being taught to distrust smooth answers.
- If a retrieved figure looks wrong, stop and check it in front of them rather than quietly dropping it.

## Failure modes

| Symptom | What is happening | What to do |
|---|---|---|
| A headcount, caseload or backlog figure is implausibly large | A stock column was summed across periods | Re-query a single period; state which period |
| A count lands on a round number like 100 or 1,000 | The backend's row limit truncated the result | Aggregate server-side or say the figure is a floor; see `references/backends.md` |
| Portal returns an error or nothing | Dataset retired, renamed, or the connector is down | Search the portal again; if it stays down, proceed on other sources and mark the affected items `Unverified` |
| A dataset looks right but its latest period is old | Publication stopped; the portal still lists it | Check `get_dataset` for the last-updated date before trusting it for "current"; say the period in the citation |
| Every item traces to one or two news stories | Media drove the list; the data was not queried or found nothing | Go back to the portal for each item; mark media-only items `Partial` and say the data did not confirm them |
| All the items sit in one program | The scan stopped at the first strong signal | Check the Coverage section; run one search per untouched remit area |
| The list reads as generic national talking points | Retrieval failed and background knowledge filled the gap | Say so, mark the items `Unverified`, and go back for evidence specific to this jurisdiction |
| Every item is `Chronic` / `Term` / `Influences` | Real, and also a sign the scan only found structural problems | Look for something acute — local media is the fastest source of dated events; the domain pack lists acute signals |
| Two sources disagree | Often the most interesting finding available | Report both figures and the disagreement; do not average them or pick one |

## Reference files

- `references/sources.md` — seed datasets for this jurisdiction, known data quirks, local media, testimony and social media search patterns, and how to handle each evidence source. Read before the first run in a session.
- `references/backends.md` — how the four OpenContext backends (Socrata, CKAN, ArcGIS Hub, Opendatasoft) differ in tool verbs, query dialect, row limits and traps.
- `references/classification.md` — worked examples of each classification axis, including the borderline calls that are easy to get wrong.
- `references/domains/` — one pack per domain. State: `state-labor.md`, `state-hhs.md`. City: `city-311.md`, `city-cad.md`, `city-operations.md`.
