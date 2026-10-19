---
name: prompt-examples
description: "Example prompts organized by phase and complexity. Use as templates or starting points. Each shows what skills activate and what happens."
---

# Prompt Examples — How to Use These Skills

Substitute your own jurisdiction, geographic units and service types for the
bracketed placeholders. The shape of each prompt is what transfers.

## Quick Reference

| Goal | Example Prompt | Skills Activated |
|------|---------------|-----------------|
| Explore what data exists | "What data do we have on [topic]?" | Problem Framing |
| Define a problem | "Help me frame the problem of [issue]" | Problem Framing |
| Analyze data | "Analyze [dataset] by [geographic unit]" | Policy Analysis |
| Equity check | "Is there an equity issue with [service]?" | Policy Analysis |
| Write a memo | "Write a memo to [audience] about [finding]" | Communication |
| Create a brief | "Create a policy brief on [topic]" | Communication |
| Compare to peers | "How do we compare to [peer] on [metric]?" | Benchmarking |
| Budget vs. results | "What does it cost us to resolve one [case type]?" | Performance Management |
| Full investigation | "Investigate [issue] and recommend action" | All phases |

---

## Problem Framing Prompts

### Data Discovery
```
"What data do we have on housing development?"
```
→ Dataset search and metadata retrieval across relevant domains
→ Returns overview of available datasets, resource IDs, key fields, limitations

### Scoping a Question
```
"I'm concerned about whether building permits are being approved equitably
across [geographic units]. Help me figure out the right questions to ask
before I dig into the data."
```
→ Stakeholder mapping, assumption interrogation, data landscape assessment
→ Returns problem statement, analytical questions, identified datasets

### Reframing a Predetermined Solution
```
"Leadership wants to launch a new mobile app for service requests to improve
delivery in underserved areas. Before we build it, help me think about
whether that's the right solution."
```
→ Assumption interrogation: is the problem app access, or resource allocation?
→ Examines service request usage by channel and area
→ Surfaces alternative problem framings

### Cross-Agency Problem Scoping
```
"Street and sidewalk issues come in through the service request system and get
split across more than one department. We're getting complaints about cases
falling through the cracks. Help me map this problem."
```
→ Cross-agency problem framing
→ Maps handoff points using the department and assignment fields
→ Identifies where cases get stuck or redirected

---

## Policy Analysis Prompts

### Simple Descriptive
```
"How many service requests were there in [area] last year, and what were
the most common types?"
```
→ Queries the relevant year's data filtered by geographic unit, returns volume + type breakdown

### Comparative Analysis
```
"Compare service request on-time performance across our largest
[geographic units] for last year. Calculate per-capita request rates using
the population estimates."
```
→ Queries per area; cross-references population dataset
→ Returns per-capita rates, on-time comparisons, with appropriate caveats

### Equity Investigation
```
"I want a rigorous analysis of whether service response times show geographic
disparities that correlate with race or income. Use area demographics as a
proxy and be honest about the limitations of that approach."
```
→ Full equity analysis workflow
→ Cross-references performance with demographic profiles by area
→ Explicitly addresses ecological fallacy and reporting bias
→ Labels all claims with confidence levels

### Trend Analysis Across a System Change
```
"How has service request performance changed over the last four years? Note
that we replaced the system partway through and the field names differ."
```
→ Queries each era's resources separately
→ Reports trends with an explicit caveat about the transition
→ Refuses to present a single joined trend line as though nothing changed

### Multi-Dataset Investigation
```
"What's the relationship between building permit activity and noise or
construction complaints in each [geographic unit]? Control for population."
```
→ Queries permits by area
→ Queries service requests filtered by construction-related types
→ Cross-references population data for per-capita rates
→ Reports correlations with explicit causation caveats

---

## Communication Prompts

### Quick Summary
```
"Summarize the key service request findings for [area] in a one-page data summary."
```
→ One-page data summary template; key numbers table, findings, limitations

### Executive Memo
```
"Write a one-page memo to [whoever briefs the chief executive] recommending
a pilot program to improve response times in the worst-served areas. Base it
on the analysis we just did."
```
→ Executive memo template; bottom line + recommendation up front
→ Includes equity note, specific next steps; creates a .docx file

### Community-Facing Report
```
"Create a plain-language fact sheet about service response times in [area]
that I can share at a community meeting. Include how residents can give
feedback, and flag which languages it needs translating into."
```
→ Community report template; plain language, simple visuals
→ Engagement hooks, working feedback mechanism, translation list from the context file

### Interactive Dashboard
```
"Build a dashboard that lets someone pick a [geographic unit] and see service
performance metrics compared to the jurisdiction-wide average. Include on-time
rate, most common request types, and volume trends."
```
→ React artifact with area filter
→ Reads the frontend design skill for visual quality
→ Includes data source attribution and an "About This Data" section

### Presentation Deck
```
"Create a 10-slide presentation for [the legislative body] on service equity.
Start with the human impact, present the evidence, end with three specific
policy recommendations."
```
→ Presentation template; reads the pptx skill
→ Data story arc: HOOK → CONTEXT → EVIDENCE → MEANING → ACTION

### Multi-Audience Communication Package
```
"I need a communication package for the service equity findings: (1) a
one-page executive memo, (2) a 3-page policy brief for [the legislative body],
and (3) a community fact sheet for [area] residents. Same analysis, three
audiences."
```
→ Three distinct outputs from the same analysis
→ Each audience-appropriate in tone, detail and format
→ All cite the same data sources; consistent findings

---

## Benchmarking Prompts

### Simple Comparison
```
"How does our service request on-time rate compare to [peer]'s?"
```
→ Reads Benchmarking_Skill.md
→ Searches the peer's open data MCP for equivalent service request data
→ Normalizes by population; reports with comparability caveats

### Multi-Jurisdiction Benchmark
```
"Compare us against our peer set on building permit approval times and
per-capita permit volume. What can we learn from the better performers?"
```
→ Parallel queries across every peer MCP in the context file
→ Normalization table with per-capita figures
→ Structural differences analysis
→ Peer learning recommendations labeled with confidence levels

### Best-Practice Hunt
```
"I want to know if any comparable jurisdictions have figured out how to improve
service response times in lower-income areas. Look at what our peers have done
and what their data shows."
```
→ Searches each peer's MCP for service request data
→ Searches the web for policy context — what those jurisdictions actually did
→ Returns benchmark table + policy narrative labeled as preliminary evidence

### Equity Benchmark
```
"Is our area-level equity gap in service response times worse or better than
[peer]'s? Use the most recent data available from both."
```
→ Sub-jurisdiction-level analysis in both places
→ Calculates an equity gap metric (top vs. bottom areas — quartiles if you
  have enough units for quartiles to mean anything, otherwise best vs. worst)
→ Reports with structural context and comparability caveats

### Performance Management Benchmark
```
"Compare our cost-per-resolved-case and workload-per-employee to [two peers].
Use the Performance Management skill for our own figures first, then search for
equivalent budget and payroll data in the peer jurisdictions."
```
→ Runs Performance_Management_Skill.md Modules 1 and 2 locally first, and locks the numbers
→ Searches peers for equivalent budget/payroll/outcome data
→ Computes normalized efficiency ratios for each
→ Reports findings with cost-of-living and fiscal-calendar caveats and claim strength labels

---

## Performance Management Prompts

### Cost per Outcome
```
"What did it cost us to resolve one service request in [department] last
fiscal year?"
```
→ Actual spend for the department over the fiscal year ÷ resolved cases
→ Caveats on appropriation vs. actual and on what the department string covers

### Staffing Stress Scan
```
"Which departments are showing staffing stress signals — high overtime
alongside declining on-time rates?"
```
→ Overtime rate per department from payroll
→ Cross-referenced against operational resolution trends
→ Threshold treated as a screening trigger, not a conclusion

---

## Full Workflow Prompts (All Phases)

### Focused Investigation
```
"Investigate whether our service request system is serving all areas
equitably. Frame the problem, analyze the data, and write a brief for
leadership."
```
→ Phase 1: Problem statement, stakeholder map, data discovery
→ Phase 2: Descriptive → diagnostic → equity analysis
→ Phase 3: Executive memo format

### Policy Recommendation with Benchmarks
```
"[The legislative body] is debating whether to reallocate field crews in [the
responsible department] based on service demand data. Help me build the evidence case — analyze our
data, see how our peers handle this, and produce a policy brief with honest
pros and cons."
```
→ Phase 1: Frame the resource allocation question
→ Phase 2: Analyze demand patterns and geographic distribution
→ Phase 4: Peer comparison on crew allocation approaches
→ Phase 3: Policy brief with recommendations, alternatives, limitations

### Equity Index
```
"I'm working on a service equity index for the budget process. I want to
combine service response times, permit activity and population demographics
into a composite picture of service delivery equity across every [geographic
unit]. Help me design the methodology, run the analysis, and produce both a
technical report and a public-facing summary."
```
→ Phase 1: Define what "equity" means operationally; select indicators
→ Phase 2: Multi-dataset analysis with normalization and composite scoring
→ Phase 3: Technical report + community summary + methodology appendix

---

## Tips for Effective Prompts

**Name the audience** — "Write a memo" is OK; "Write a memo to whoever briefs the chief executive, who has to answer questions on this tomorrow" is much better.

**Name the data** — "Analyze last year's service request data" is faster than "look at public services data."

**State your constraints** — "I need this in one page" or "this needs to be readable by someone with no data background."

**Ask for honesty** — "Be honest about what the data can't tell us" signals that you want rigorous caveats, not just confident-sounding conclusions.

**Request specific formats** — "Create a .docx memo" or "build a React dashboard" or "give me a markdown brief."

**Iterate across phases** — Start with framing, review the problem statement, then ask for analysis, review findings, then ask for communication. Course-correct between phases.
