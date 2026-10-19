---
name: quality-checklists
description: "Pre-flight and review checklists for all phases of civic analysis. Use BEFORE starting each phase (pre-flight) and BEFORE delivering outputs (review). Encodes quality standards from Bloomberg, J-PAL, GovLab/InnovateUS, and cross-jurisdiction benchmarking."
---

# Quality Checklists

Use at two points: **before starting** (pre-flight ✈️) and **before delivering**
(review ✅).

---

## Phase 0: Context

### Pre-Flight ✈️
- [ ] Has `context.yml` been filled in for this jurisdiction?
- [ ] Do the values the task depends on carry real values, not `TODO`?
- [ ] Have I checked the fiscal calendar, geographic unit and department strings before writing any filter?

### Red Flags 🚩
- A `TODO` value silently treated as a real one
- A dataset ID inherited from another jurisdiction
- A department or area filter written from memory rather than from schema

---

## Phase 1: Problem Framing

### Pre-Flight ✈️
- [ ] Do I understand the triggering event? (Why is this being asked now?)
- [ ] Have I resisted jumping to a solution or querying data immediately?
- [ ] Do I know who is asking and what decision they need to make?
- [ ] Have I considered whose perspective is shaping the problem definition?

### Review Before Handoff ✅
- [ ] **Problem statement written** — human-centered, specific, measurable, bounded, honest
- [ ] **Stakeholders mapped** — affected residents, frontline staff, decision-makers, partners
- [ ] **Decision-maker correctly identified** — the office that can actually act, per the context file
- [ ] **Equity dimensions identified** — who is disproportionately affected?
- [ ] **At least 3 assumptions** explicitly stated and questioned
- [ ] **Data landscape assessed** — relevant datasets identified with resource IDs
- [ ] **Schema examined** — field names confirmed via schema tool
- [ ] **Analytical questions listed** — specific, answerable with available data
- [ ] **Known limitations noted** — what the data cannot tell us
- [ ] **Success criteria defined** — what "better" looks like

### Red Flags 🚩
- Problem statement sounds like a solution ("We need an app that...")
- No equity dimension identified
- Analysis questions are unanswerable with available data
- Stakeholder map only includes people inside government
- The recommendation assumes staff capacity that doesn't exist

---

## Phase 2: Data Analysis

### Pre-Flight ✈️
- [ ] Do I have a clear problem statement?
- [ ] Do I have specific resource IDs to query?
- [ ] Have I confirmed field names via schema tool — not guessed?
- [ ] Do I have a population/denominator dataset for per-capita calculations?
- [ ] Am I clear on what time period I'm analyzing?
- [ ] If the period spans a system replacement or definitional change, am I handling the eras separately?

### Review Before Handoff ✅

**Data Quality**
- [ ] Total N reported (how many records analyzed)
- [ ] Time period clearly stated
- [ ] Data freshness noted (when was this last updated?)
- [ ] Missing values flagged (any key fields with high null rates?)
- [ ] Obvious outliers or quality issues called out
- [ ] Every filter verified against actual field values — no silent empty results

**Descriptive Findings**
- [ ] Central tendency reported (average and/or median)
- [ ] Spread/distribution reported (range, variation)
- [ ] Both raw counts AND rates/per-capita figures where comparing groups
- [ ] Time trends examined (not just a single snapshot)
- [ ] Geographic patterns examined across areas

**Diagnostic Claims**
- [ ] Every claim labeled with appropriate confidence level:
  - "The data shows X" → Descriptive
  - "X is associated with Y" → Correlational
  - "Evidence suggests X may contribute to Y" → Suggestive
  - "One possible explanation is..." → Hypothetical
- [ ] **NO unsupported causal claims** ("X caused Y" without experimental evidence)
- [ ] Alternative explanations considered for key findings
- [ ] Confounders acknowledged

**Equity Analysis**
- [ ] Findings disaggregated by geographic unit at minimum
- [ ] Areas compared in the context of their demographic profiles
- [ ] Reporting/access bias discussed (who might be undercounted?)
- [ ] Ecological fallacy caveat included if using geographic proxies
- [ ] Asset-based framing used (not deficit framing)

**Limitations**
- [ ] Honest limitations section written (not perfunctory boilerplate)
- [ ] Clear distinction: what data shows vs. what we wish it showed
- [ ] Key data gaps identified

### Red Flags 🚩
- Causal language without experimental evidence
- Raw counts compared without population adjustment
- No equity/distributional analysis
- Only jurisdiction-wide averages reported (masks local variation)
- Limitations section missing or reads as boilerplate
- Cherry-picked time periods or areas
- Claims based on very small N without uncertainty acknowledgment
- A zero result reported without confirming the filter matched anything

---

## Phase 3: Communication

### Pre-Flight ✈️
- [ ] Primary audience named specifically?
- [ ] Decision or action this communication should support is clear?
- [ ] Correct format selected for this audience?
- [ ] Appropriate level of technical detail determined?
- [ ] Political or timing considerations noted?
- [ ] Does the recipient actually hold the authority I'm asking them to exercise?

### Review Before Delivery ✅

**Content Quality**
- [ ] Main finding clear within first 30 seconds of reading
- [ ] Every number traceable to specific data query
- [ ] No claims exceed what evidence supports
- [ ] Recommendations are specific (who, what, when)
- [ ] Alternatives considered and addressed
- [ ] Data sources cited with enough detail to reproduce

**Audience Fit**
- [ ] Tone matches audience (executive vs. community vs. technical)
- [ ] Technical jargon eliminated or defined for non-technical audiences
- [ ] Length appropriate for audience
- [ ] Visuals support narrative (not decorative)
- [ ] "So what / now what" is unmistakable

**Equity & Inclusion**
- [ ] Plain language used in public-facing materials (8th grade target)
- [ ] Deficit framing avoided; asset-based language used
- [ ] Translation produced for every language in the context file's list
- [ ] Digital access barriers considered
- [ ] Community voice included or acknowledged as appropriate

**Engagement & Transparency**
- [ ] Feedback mechanism included, with a working contact route — no empty brackets
- [ ] Data sources linked or referenced, including the portal URL
- [ ] Methodology described at appropriate detail level
- [ ] Engagement is genuine (asking questions the audience can influence)

**Document Quality**
- [ ] Professional formatting (consistent headers, clean layout)
- [ ] No typos or calculation errors
- [ ] Visuals are accessible (color-blind safe, labeled)
- [ ] File format appropriate for audience

### Red Flags 🚩
- Main finding buried below the fold
- Recommendations are vague ("explore options")
- No equity analysis in communication
- Public-facing document uses unexplained government jargon
- No mechanism for audience to respond or verify
- Placeholder brackets left in a published contact block
- Misleading visuals (truncated axes, cherry-picked comparisons)

---

## Phase 4: Benchmarking

### Pre-Flight ✈️
- [ ] Is the metric I'm comparing clearly defined?
- [ ] Was the peer set fixed, with its rationale written down, before I looked at any results?
- [ ] Have I verified that every jurisdiction measures this metric similarly?
- [ ] Have I identified the appropriate denominator (per capita, per unit, etc.)?
- [ ] Have I read each peer's comparability cautions from the context file?

### Review Before Delivery ✅

**Comparability**
- [ ] Each jurisdiction's exact metric definition documented
- [ ] Comparability confidence rated (High / Moderate / Low)
- [ ] Key structural differences listed
- [ ] Time periods align (or misalignment explicitly noted)
- [ ] Fiscal calendars verified for each jurisdiction before any financial comparison
- [ ] Data quality differences acknowledged

**Analysis**
- [ ] All metrics normalized by appropriate denominator
- [ ] Population figures used for per-capita calculations, taken from the context file rather than memory
- [ ] Both absolute and per-capita numbers reported
- [ ] Data source for each jurisdiction cited (dataset ID + portal)
- [ ] Labor cost and scope differences flagged on every financial comparison

**Claims and Language**
- [ ] Comparative claims use hedged, appropriate language
- [ ] No causal attribution ("their policy caused their better performance")
- [ ] Peer practices framed as "worth exploring" not "proven models"
- [ ] "Benchmark" framed as a starting point for investigation, not a verdict

**Recommendations**
- [ ] Each benchmark finding connects to a specific investigable hypothesis
- [ ] Next steps proposed before acting on benchmarks (e.g., site visits, practitioner interviews)
- [ ] Cost/resource context noted where available

### Red Flags 🚩
- Comparing metrics with different definitions without acknowledging it
- Drawing causal conclusions from cross-jurisdiction comparison
- Omitting structural differences between jurisdictions
- Peers chosen — or changed — after seeing results
- Using absolute numbers to compare jurisdictions of different sizes without normalizing
- Mixing fiscal years across jurisdictions with different fiscal calendars

---

## Phase 5: Performance Management

### Pre-Flight ✈️
- [ ] Have I selected the direct operational dataset rather than defaulting to a scorecard?
- [ ] Is my fiscal year date range built from this jurisdiction's fiscal calendar?
- [ ] Have I verified the department string in each of the budget, spend, payroll and operational datasets separately?
- [ ] Am I clear whether the question is about planned budget or actual spend?

### Review Before Delivery ✅
- [ ] Headcount explicitly caveated as a payroll proxy, not authorized FTE
- [ ] Appropriation and actual spend not used interchangeably
- [ ] Overtime threshold calibrated against local distribution, not adopted unexamined
- [ ] Trend claims span at least 2–3 years
- [ ] Any system replacement inside the trend window disclosed
- [ ] Alternative explanations listed for every efficiency change (inflation, demand, vacancies, policy, data collection)

### Red Flags 🚩
- A single year of efficiency ratios presented as a trend
- Overtime rate presented as proof of understaffing
- A scorecard metric substituted for operational data that exists
- Cost-per-outcome computed across mismatched date ranges

---

## Final Cross-Phase Review

Before any analysis is considered complete:

### The Rigor Test (J-PAL)
- [ ] Could a skeptical analyst challenge any finding? If so, have you addressed it?
- [ ] Is the weakest link in the evidence chain clearly identified?
- [ ] Would you be comfortable if this analysis were made fully public?

### The Human Test (Bloomberg)
- [ ] If a resident read this, would they recognize their experience in it?
- [ ] Does this connect to something that matters in people's daily lives?
- [ ] Can a public employee actually act on these recommendations, with the staff they have?

### The Democracy Test (GovLab/InnovateUS)
- [ ] Does this increase transparency about how the government works?
- [ ] Does it create an opportunity for meaningful public participation?
- [ ] Is the underlying data accessible for others to verify and build on?

### The Equity Test (All Frameworks)
- [ ] Who benefits from this analysis and its recommendations?
- [ ] Who might be harmed or overlooked?
- [ ] Have historically marginalized communities' perspectives been centered?
- [ ] Does this analysis challenge or reinforce existing power dynamics?
