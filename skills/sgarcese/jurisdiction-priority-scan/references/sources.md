# Sources Reference

Operational detail for each evidence source. The seed datasets below were supplied for this jurisdiction and were verified against the live portal on the date given with them. Dataset IDs are usually stable; row counts, latest periods and column names are not.

## Contents

1. Performance data — the jurisdiction's open data (OpenContext MCP)
2. Local media
3. Public testimony
4. Social media
5. Other web — audits, federal data
6. The two traps

---

## 1. Performance data — OpenContext MCP

Connector: `{{open_data_connector}}`, backend `{{open_data_backend}}`, portal `{{portal_url}}`. Tools: `mcp__{{open_data_connector}}__{{open_data_backend}}__*`. The available verbs and query syntax depend on the backend; `references/backends.md` has the full table.

### Start from the seed datasets rather than searching blind

Searching the portal costs a round trip and usually returns the same datasets. Go straight to a known ID where one exists.

{{seed_datasets}}

If the list above is empty or says `none`, search using the terms in the domain pack, then call `get_dataset` on the two or three most promising results to confirm publisher, coverage and last-updated date before querying any of them.

### Search for breadth, query for depth

The portal is also a map of what the agency measures. A search that returns nothing for one remit area is itself informative — either the agency does not publish that data, or it is filed under another name. Try one alternate term before concluding, and record the absence in the memo's Coverage section. An unmeasured program is a candidate problem in its own right when it is a large one.

### Before any query

**Always call `get_schema` before querying.** Field names are not guessable and vary between datasets that look similar. One dataset stores `year` and `month` as separate numeric columns; the next uses a single period-ending date. A query written from a reasonable assumption will fail or, worse, succeed against the wrong column.

**Check the last-updated date.** Portals keep listing datasets long after publication stops. A series whose latest period is two years old is evidence about two years ago, and the citation must say so.

### The mixed-granularity trap

Many state and city datasets put units of different size in the same column: counties alongside regional aggregates and a statewide total, or neighborhoods alongside council districts and a citywide row. Grouping without filtering double-counts and produces a leaderboard mixing units of different size. Inspect the distinct values of any geography column before trusting a ranking, and filter explicitly.

### Known quirks in this jurisdiction's data

The context this skill was localized from lists the field-level quirks already known in this portal — mixed-granularity columns, inconsistent date fields, series that do not reconcile. Treat each as a check to run, not a fact to repeat: a quirk found last year may have been fixed.

### A metric worth looking for in every domain

Duration and timeliness metrics — how long people stay on benefits, how long an application waits for a decision, how long a service request stays open, how long a call waits for a unit — are jointly determined by conditions and by administrative performance. A unit that is an outlier against its own underlying conditions is a genuine operational lead rather than a restatement of the economy or the weather. The domain pack names the timeliness metric for each domain.

---

## 2. Local media

`WebSearch`, then `WebFetch` on every story that will be cited. A search snippet is not a retrieval — if the memo relies on a story, fetch it.

### Why local first

Local outlets cover what residents of this jurisdiction actually experience — the office with the line out the door, the backlog a county commissioner complained about, the contractor that missed a deadline. National outlets cover a jurisdiction when something is already large. For problem identification the early, local signal is the valuable one.

### Query patterns

Run several, each pairing a subject with a problem word:

- **Subject:** the agency's name and its common short form; each major program in the remit; the jurisdiction's name plus the service ("[city] 311", "[state] unemployment").
- **Problem words:** backlog, delays, wait times, complaints, audit, lawsuit, investigation, shortage, overtime, closure, outage, error, fraud, overpayment.
- **Outlet:** the local outlets named in the context, by name or with `site:` restrictions where the search tool supports them. Include local public radio and nonprofit newsrooms — they often run the longer investigative pieces.
- **Time:** bound to the last twelve months. Older stories establish a chronic pattern; recent ones establish acute episodes.

A story with a date is the fastest route to an `Acute` tag. A series of stories on the same failure across several years is evidence for `Chronic`.

### Reading a story honestly

- **Separate the reporting from the framing.** A news story's facts — a date, an official's statement, a figure attributed to the agency — are retrievals. Its characterization ("crisis", "chaos") is not.
- **Opinion is not reporting.** Editorials and op-eds show that someone is pressing a problem, which is worth knowing; they are not evidence of its size.
- **One story is a lead, not a pattern.** Check the portal for the underlying series. A story confirmed by the data is the strongest item the scan can produce; a story the data contradicts is a finding in itself.
- **A reporter's figure is `Partial`** until an official source confirms it. Cite the outlet, the date and the figure's attributed source.
- **Paywalls.** If a story cannot be fetched, the snippet is all that was retrieved. Say so and mark the item accordingly.
- **Coverage follows attention, not need.** Neighborhoods, programs and populations that reporters rarely cover will be under-represented. The Coverage section should make that visible rather than letting the silence read as absence of problems.

---

## 3. Public testimony

Tagged `Public testimony`. Legislative and council hearings, budget testimony, and rulemaking comment are where problems surface with a named constituency attached, often a year before they appear in a data series. That earliness is the value, and it is also why these items usually rate `Partial`: testimony is evidence that someone asserted a problem, not that the problem is the size they said it was.

Search the venues named in the context this skill was localized from — the hearings, budget sessions and rulemaking dockets where this jurisdiction's problems get asserted on the record. Bound searches to the last twelve months, and pair the venue with the agency or program name. Useful routes in:

- **Official records** — hearing schedules, agendas, video archives and transcripts. Transcripts often post late; agendas and witness lists post early and show who came to complain.
- **Submitted testimony** — advocacy organizations, unions, provider associations and local governments often publish their written testimony faster than the legislature or council posts transcripts.
- **Local media coverage of hearings** — reporters cover the exchanges that matter, which makes local media a good route into the testimony worth reading. Tag the item with both sources when both were retrieved.
- **The agency's own testimony** — what its leadership told legislators or council members about backlogs, staffing and budget needs. An agency conceding a problem on the record is strong evidence it exists.

Attribute every item to who said it, where, and when. "Home care employers testified in this year's budget hearings that…" is usable; "there are concerns that…" is not. Testimony that the data confirms is strong; testimony the data contradicts is a finding worth reporting; testimony with no data either way is a lead for the analyst work plan.

---

## 4. Social media

Use it only if a tool in this session actually reaches a platform — a connector, an API, or a search tool that returns the posts themselves. Otherwise do not use it, and write "Social media: not searched — no tool available" in the Sources section. That is a complete and correct answer.

When a tool is available:

- Search the agency's name, its programs, and the jurisdiction's name with the same problem words used for local media. Community forums and neighborhood groups are often more useful than broadcast platforms for local services.
- A web search result pointing to a public post counts as social media evidence only if the post itself was fetched.
- Cite each post or thread with its date and platform, and treat it as a lead to check rather than a finding.
- Never invent posts, volumes, sentiment scores, or trends. Do not summarize "what residents are saying" from a handful of posts as though it were representative.
- Resident complaints about a public service — claims not processing, a portal that fails, a call center that never answers, a pothole reported five times — are legitimately useful leads for process improvement, and they are also unrepresentative by construction. Say both.
- Do not quote or identify private individuals in the memo. Describe the complaint, not the person.

---

## 5. Other web — audits, federal data

Tagged `Web`. These support and check the four main sources.

**Audits.** The jurisdiction's audit office, named in the context this skill was localized from, deserves a targeted search every run. Program audits are unusually well suited to this skill's purpose, because they are already framed as process failures with dollar figures attached.

**Federal data.** Federal sources often carry the jurisdiction's own administrative data in comparable form — the domain pack lists them. They are the fallback when the portal lacks a series, and the cross-check when it has one.

**Non-local coverage.** National or trade press about this jurisdiction. Secondary to local media, and usually later.

Prefer primary and official sources. Date every claim — "as of" is not optional in a memo about what to prioritize this quarter.

---

## 6. The two traps

Both are errors an assistant will otherwise make confidently.

**Trap 1 — Summing a stock.** Stock variables (headcount, caseload, enrollment, active claims, open requests, pending applications) are snapshots at a point in time. Summing them across periods produces person-months or request-months, not people or requests, and the result looks plausible. A workforce series with nineteen monthly headcount rows, summed, returns a number nineteen times the true headcount — stated without a hedge. Flow variables (hires, separations, initial claims, applications received, requests opened, calls received) are events and sum correctly. When a figure could be either, take a single period and name it.

**Trap 2 — Totals that do not reconcile.** Stocks and flows should balance: last period's stock, plus inflows, minus outflows, roughly equals this period's stock. When separations exceed hires by more than a hundred across two months while headcount falls by a few dozen, those cannot both be true as labeled. The likely explanations — outflows counting events rather than people, internal transfers registering as both an exit and an entry, demographic or category rows double-counting, reopened items re-entering the stock — are all guesses, and the honest output says so and names the check.

The general lesson to carry into every scan: an assistant is far better at answering the question it was asked than at noticing the question was not answerable from the data. Reconciliation is not automatic. Do it deliberately, and report what fails to reconcile.
