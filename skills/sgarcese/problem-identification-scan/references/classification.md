# Classification Reference

Worked examples for the five axes, concentrating on the calls that are easy to get wrong. The examples illustrate the *reasoning*; the tags on any real item must follow from what was actually retrieved in that run. Examples are drawn from several domains; each domain pack adds its own.

## Contents

1. Shape — acute vs. chronic
2. Horizon — quarter / year / term
3. Control — controls / influences / little control
4. Dominant cost
5. Evidence source
6. Ranking the lists
7. Worked example

---

## 1. Shape — Acute vs. Chronic

The test is not severity or urgency. It is whether the problem has a date attached.

**Acute** — a departure from an established baseline, with an identifiable onset. A plant closing, a claims backlog after a system migration, a storm that tripled 311 volume, a dispatch center that lost three call-takers in one month, a court decision that changed eligibility overnight.

**Chronic** — a persistent condition or slow drift with no meaningful onset date. Declining labor force participation, a long-standing gap in service response between neighborhoods, an aging inspector workforce, a training program whose placement rate has been mediocre for a decade.

### The call that gets missed

**A chronic problem with an acute episode on top of it.** This is common, and it is usually the most valuable item on the list, because the two components need different responses and get confused with each other constantly.

Schematic example: an agency's separations exceed hires in nine of eleven months — chronic. Then two consecutive months show separations running at roughly three times hires — acute, on top of the chronic pattern. Tag it `Chronic + acute episode` and say plainly which component the recommendation addresses. A retirement-incentive window closing produces exactly this signature and calls for an entirely different response than the underlying attrition does.

The failure mode in both directions: an acute spike gets treated as proof of systemic decline (over-response), or a genuine step-change gets absorbed into "we've always had turnover" (under-response). Naming both components is what prevents each.

### Practical notes

- Do not tag `Acute` without the date or period. If the onset cannot be named, it is chronic or it is unverified.
- Age of the problem is not the test. A problem that started three years ago and has been stable since is chronic; one that started three weeks ago is acute.
- Seasonality is neither. A December claims spike, a July heat-complaint surge, or a winter pothole wave that recurs every year is a chronic capacity mismatch wearing an acute costume. Check the prior years before tagging.

---

## 2. Horizon — Quarter / Year / Term

Where **meaningful impact** is achievable, not where the problem ends. Most public-sector problems never fully end. The `Term` length is the principal's term of office for this jurisdiction.

| Tag | Impact achievable through | Examples |
|---|---|---|
| `Quarter` | Administrative action alone — a form, a queue, a script, a routing rule, a staffing reallocation, a policy interpretation | Redesigning a claim form that generates avoidable rework; reallocating adjudicators to the counties with the longest durations; fixing a 311 category that routes to the wrong department; fixing a portal step that fails for mobile users |
| `Year` | A budget cycle, a procurement, a rule change, a pilot that can be stood up and evaluated | Launching a targeted sector program; replacing a scheduling or CAD module; a new data-sharing agreement between agencies; standing up an alternative response team for behavioral health calls |
| `Term` | Statute or ordinance, capital, or a pipeline that takes years to fill | Rebuilding a benefits system; shifting the occupational mix of a region; growing a licensed workforce from scratch; replacing a CAD or 311 platform end to end |

Where the jurisdiction budgets on a two-year cycle, `Year` means "within the current or next budget cycle", and the memo should say so.

### The call that gets missed

**Labeling a term problem as a year problem because that is what a principal wants to hear.** This is the most common failure on this axis and the most damaging, because it sets up a program to be judged a failure at month 14 on a metric that could not have moved by then.

The check: name the specific mechanism and ask what it depends on. If the mechanism requires legislation, a capital appropriation, or people who must first be trained, the honest horizon is `Term`, whatever the political calendar wants.

The converse also happens. A problem gets tagged `Term` because the *condition* is structural, when a real administrative improvement is available this quarter. Rural transportation to job sites is a term problem; whether the career center's hours match the one bus route that serves it is a quarter problem, and it is inside the same condition. Dispatcher shortages are a term problem; whether low-priority calls are diverted to an online reporting channel is a quarter problem. **When a term problem contains a quarter-sized piece, split it into two items.** That split is often the most useful thing the scan produces for a performance officer.

---

## 3. Control — Controls / Influences / Little control

| Tag | Means | Test |
|---|---|---|
| `Controls` | The jurisdiction can change the outcome by deciding to | It is the jurisdiction's own process, staff, system, or rule |
| `Influences` | The jurisdiction shapes the outcome through funding, regulation, convening, or information, but others decide | Money, licensure, procurement, contracts, or data are the levers |
| `Little control` | Driven by markets, federal policy, another level of government, demographics, or technology | The jurisdiction can prepare and position, not direct |

Authorities, independent boards, contracted providers, and other levels of government sit in `Influences` even when they feel like part of the family. A city rarely controls the state benefit system its residents depend on; a state rarely controls a city's 311 routing.

### The call that gets missed

**Reflexively tagging anything hard as `Little control`.** Low control is a real and important finding, but it is also the easiest place to hide. Before assigning it, ask what the jurisdiction *does* own inside the problem — usually its own response capacity, its own information, and its own eligibility or routing rules.

Worked example. Rising homelessness is `Little control` at the level of "will housing costs push more people out" — rents, wages and federal housing funding drive that. But the jurisdiction controls how fast its outreach connects people to shelter, how its shelter intake works, and how long a voucher application waits for a decision. The honest treatment is to split: tag the housing-market trend `Little control` and the intake-and-processing response `Controls`, as two items. The second is where a performance officer can actually act, and it disappears entirely if the whole thing is filed under `Little control`.

The same move works at city scale. Rising behavioral health calls to 911 are driven by conditions the city does not control. Whether those calls are triaged to a clinician-led response, and whether the call-taker protocol can identify them, is the city's own process.

Also worth stating: `Little control` never means low priority. Demographic aging is close to uncontrollable and is among the most consequential things a public workforce or a human services agency faces. It changes what the response *is* — preparation and positioning rather than intervention — and a performance officer needs that signal before assigning a team.

---

## 4. Dominant cost

Which of the four actually dominates. Pick one; if two genuinely tie, name both and say why.

| Cost | Looks like |
|---|---|
| `Dollars` | Direct expenditure — benefits paid, contracts, overtime, improper payments |
| `Staff time` | Capacity consumed — hours in queues, manual handoffs, duplicate data entry, units tied up on calls that did not need them |
| `Rework` | Work done twice because it was wrong the first time — appeals, corrected determinations, re-filed forms, redeterminations, reopened service requests, duplicate requests for the same problem |
| `Reputation` | Trust and political cost — media coverage, legislative or council attention, resident complaints, declining take-up |

### Why rework deserves attention

Rework is chronically underweighted because it does not appear as a line item anywhere. It shows up as staff time in the budget and as delay to the resident, and it is usually where recoverable capacity is largest — an appeal costs many times what getting the determination right the first time costs, a reopened 311 request costs a second truck roll, and both generate the reputation cost.

For a scan whose stated purpose is identifying **process improvement** targets, rework-dominant items deserve a hard look even when their dollar figure is unimpressive. A performance officer can act on rework without new appropriation, which is rarely true of the dollar-dominant items.

### The call that gets missed

Tagging `Dollars` because a large number is available. Ask which cost the jurisdiction would actually recover by fixing the problem. Benefits paid is a large number and mostly not a cost the jurisdiction should want to reduce — reducing improper payments and reducing duration are different problems with different tags, and only one of them is about dollars.

---

## 5. Evidence source

Tag what produced the candidate **in this run**, not what could have. If two independent sources converged, list both.

`Data` · `Local media` · `Public testimony` · `Web` · `Social media`

`Web` covers audits, federal data, and non-local coverage.

Convergence is the strongest signal the scan produces and must be visible in the table. A problem that appears in a monthly series, in local reporting, and in budget testimony is a different proposition from one that appears in a single search result, and the reader should be able to see that at a glance without reading the memo.

The inverse is also informative. A problem visible in local media or testimony but absent from every data series is either early — the value of those sources — or unrepresentative. A problem visible in the data but absent from all coverage is often a quiet operational failure no one has noticed yet, which makes it a strong candidate. Both are worth saying, and the distinction is exactly the kind of question a first analyst pass can settle cheaply.

---

## 6. Ranking the lists

Order each list most actionable first. Actionability rises with control and falls with horizon, then gets adjusted for how well the evidence actually holds.

A workable ordering heuristic:

1. `Controls` + `Quarter`, `Verified` — act now; these are the items that justify the scan
2. `Controls` + `Quarter`, `Partial`/`Unverified` — cheap to check, high payoff if they hold
3. `Controls`/`Influences` + `Year` — plan into the next cycle
4. Anything `Acute`, regardless of position — time-sensitive by construction, and may not be there next quarter
5. `Term` and `Little control` — position and prepare

Do not let `Verified` alone drive the ranking to the top. A verified but low-control, term-horizon problem is well-evidenced and not actionable, and putting it first wastes the reader's attention. Evidence quality determines what can be *said*; control and horizon determine what can be *done*.

---

## 7. Worked example

An illustration of the reasoning and the format. The figures are shown as symbols because they are not from any real run; a real run retrieves its own and writes the numbers.

> **Separations outpacing hiring at a public authority, with an unexplained spike in the last two months**
>
> | | |
> |---|---|
> | Source | `Data` |
> | Shape | `Chronic + acute episode` |
> | Horizon | `Year` |
> | Control | `Influences` |
> | Dominant cost | `Staff time` |
> | Confidence | `Verified` |
>
> Separations exceeded new hires in nine of the eleven months in the series, with a sharp episode in the last two months (S₁ and S₂ separations against H₁ and H₂ hires). Source: [dataset ID], [portal], queried [date].
>
> **Leverage and control.** The authority sets its own staffing, so the jurisdiction influences rather than controls it. What the jurisdiction does control is whether the pattern gets noticed and asked about, which has not visibly happened.
>
> **What does not reconcile.** Over the two months, separations exceed hires by (S₁+S₂) − (H₁+H₂), but headcount falls by far less. Those cannot both be true as labeled. Candidate explanations — separations counting events rather than people, internal transfers registering as both a separation and a hire, demographic rows double-counting — are guesses.
>
> **First analyst pass.** Confirm the definition of `separations` with the authority's reporting staff before any figure from this series goes into a briefing. Then check whether the episode coincides with a retirement incentive window, which would make it a scheduled event rather than a deterioration.

Note what the example does: it leads with the finding, cites the dataset and the date, distinguishes what is controlled from what is not, reports the inconsistency instead of hiding it, and hands the analyst a specific first task. The `Verified` flag covers the figures, and the reconciliation problem is stated rather than resolved — because it has not been resolved.
