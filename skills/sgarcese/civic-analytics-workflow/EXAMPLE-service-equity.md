---
name: worked-example-service-response-equity
description: "End-to-end worked example demonstrating every phase applied to: are service request response times equitable across areas of a jurisdiction, and how does that compare to a peer? Shows the query patterns, the reasoning at each decision point, and the caveats each step requires."
---

# Worked Example: Service Response Time Equity + Peer Benchmark

This walks through the complete FRAME → ANALYZE → BENCHMARK → COMMUNICATE
workflow.

The example is written with placeholders — `[Area A]`, `[Peer]`, `[Department]`.
Substitute your own from the context file. What transfers is the sequence of
decisions, not the specifics.

---

## PHASE 1: FRAME (Bloomberg Methodology)

### The Triggering Question

An elected representative asks: *"My constituents in [Area A] feel like the
government takes forever to fix things compared to other areas. Is that true?
And are we even doing well compared to other jurisdictions?"*

### Reframe Before Querying

**Don't jump to:** "Let me pull the service request data and compare averages."

**Instead, apply problem framing:**
- "Fix things" — which service types? All categories or specific ones?
- "Takes forever" — total time to close? Time to first response?
- "Compared to other areas" — which comparison is fair?
- "Other jurisdictions" — which peers, and what metrics are actually comparable?
- What would explain differences? Volume? Complexity? Staffing? Geography?

### Stakeholder Map

| Stakeholder | Perspective |
|-------------|------------|
| Residents of [Area A] | Direct experience; may have stopped reporting |
| Service request operators | See the full queue; know the bottlenecks |
| Field crews in the responsible departments | Know operational constraints |
| The elected representative | Needs defensible evidence to advocate |
| The chief executive's office | Needs to know if there's a systemic issue |

Who the last two rows actually are — and whether the representative's body votes
on resources or is merely notified — comes from the context file, and determines
what the eventual brief has to accomplish.

### Problem Statement

> Residents in [Area A] report experiencing longer wait times for service
> request resolution compared to other areas. Available service request data
> includes case open and close dates, on-time indicators, service types, and
> geographic unit — allowing us to assess whether measurable response time
> disparities exist. We will examine on-time performance across areas,
> disaggregated by service type. Key limitations: the data measures reported
> cases and is subject to reporting bias; date fields measure system closure,
> which may not match physical work completion; and the on-time field depends on
> service-level targets that may vary by request type.

---

## PHASE 2: ANALYZE (J-PAL Methodology)

### Query Sequence

```
# Step 1: Confirm schema for the period being analyzed
get schema for [service request resource ID]
→ Confirm the actual names of: open date, close date, on-time,
  service type, department, geographic unit
  Do not assume them from another year's resource

# Step 2: Volume for the area in question
query([resource], filters={"{{geographic_unit_field}}": "[Area A]"}, limit=5)
→ Note total_count from the response, not the number of rows returned

# Step 3: On-time vs. missed for [Area A]
query([resource], filters={"{{geographic_unit_field}}": "[Area A]",
      "{{on_time_field}}": "{{on_time_met_value}}"}, limit=5)
query([resource], filters={"{{geographic_unit_field}}": "[Area A]",
      "{{on_time_field}}": "{{on_time_missed_value}}"}, limit=5)

# Step 4: Repeat for comparison areas
[Choose comparison areas spanning the demographic and density range you have —
 every one of them if you have only a handful. Not just the ones expected to
 look good or bad]

# Step 5: Service type breakdown for [Area A]
query([resource], filters={"{{geographic_unit_field}}": "[Area A]"}, limit=200)
→ Tally the most common service types and their on-time rates

# Step 6: Population for per-capita rates
query([population resource ID], limit=[number of areas])
```

Before Step 2, list the distinct values in the geographic unit field. If
`[Area A]` is recorded under a second spelling, the filter silently returns
nothing and the analysis reports a confident zero.

### Results Table

| Area | Total Requests | On-Time | Missed | On-Time Rate | Per-Capita Rate |
|-------------|---------------|---------|---------|-------------|----------------|
| [Area A] | [N] | [N] | [N] | [%] | [per denominator] |
| [Area B] | [N] | [N] | [N] | [%] | [per denominator] |
| [Area C] | [N] | [N] | [N] | [%] | [per denominator] |
| [Area D] | [N] | [N] | [N] | [%] | [per denominator] |
| Jurisdiction-wide | [N] | [N] | [N] | [%] | [per denominator] |

### Claim Strength Labels

The discipline this example is really demonstrating: the same underlying data
supports four claims of very different strength, and each gets different
language.

| Finding | Claim Level | Language |
|---------|------------|----------|
| [Area A]'s on-time rate vs. jurisdiction-wide | **Descriptive** | "The data shows [Area A]'s on-time rate is X percentage points below the jurisdiction-wide average" |
| The gap is largest for one service type | **Descriptive** | "The disparity is most pronounced for [type] requests" |
| Service mix explains part of the gap | **Correlational** | "Differences in request types account for approximately Z% of the gap" |
| Staffing allocation drives the gap | **Hypothetical** | "One possible explanation is that crew allocation doesn't proportionally match request volume; this hypothesis cannot be tested with available data" |

Note that the most policy-useful claim is the weakest one. Say so rather than
promoting it.

### Equity Analysis

Geographic equity check:
- Rank every area by on-time rate
- Cross-reference with demographic profiles from the population dataset
- Question: do areas with higher proportions of residents of color or lower
  incomes show systematically lower on-time rates?

Access equity check:
- Per-capita request rates by area
- Cross-reference with the digital access dataset, if one is published
- If lower digital access correlates with lower per-capita reporting, the
  measured disparity may **understate** the actual service gap — the residents
  least served are also the least likely to appear in the data

**Required caveat:**
> "This analysis uses area-level data as a proxy for demographic analysis.
> Individual-level demographic data is not available in the service request
> dataset. Patterns observed at the area level may not apply to all individuals
> within those areas (ecological fallacy). However, area-level patterns are
> directly relevant for resource allocation decisions."

---

## PHASE 4: BENCHMARK (Cross-Jurisdiction Comparison)

### Discover the Peer's Equivalent Data
```
[Peer MCP]: search datasets for "service requests"
[Peer MCP]: search datasets for "311 customer service"
→ Identify the peer's equivalent dataset. Search by function, not brand —
  many jurisdictions route requests through a branded app

[Peer MCP]: get schema for the resource
→ Find equivalent fields for: case open date, case close date,
  on-time indicator or resolution time, request type, geographic unit
```

Where the peer runs a different platform, the call syntax differs. Check the
peer's entry in the context file before writing the query.

### Comparability Assessment

| Dimension | Ours | [Peer] |
|-----------|--------|---------|
| Metric | on-time field, two-valued | [check schema — may be a duration instead] |
| Population | [from context file] | [from context file] |
| Service-level targets | Vary by request type | [verify] |
| Comparable? | — | [Equivalent / Approximately / No] |

If the peer records resolution duration rather than an on-time flag, the two
metrics are not the same thing, and the honest move is to compare median
resolution time instead — and say why.

### Benchmark Summary

```
CROSS-JURISDICTION BENCHMARK: Service Request On-Time Performance

Jurisdiction    On-Time Rate    Requests per Head   Period    Source
──────────────────────────────────────────────────────────────────
[Ours]          [%]             [normalized]        [period]  [portal]
[Peer 1]        [%]             [normalized]        [period]  [portal]
[Peer 2]        [%]             [normalized]        [period]  [portal]

Comparability: Moderate — service-level target definitions and request category
definitions differ. Use as directional, not precise.
```

**Appropriate claim:** "Our on-time rate is [X] percentage points
[above/below] [Peer]'s, though differences in service-level target definitions
mean this comparison is directional rather than precise."

---

## PHASE 3: COMMUNICATE (GovLab / InnovateUS)

### Three Audience-Specific Outputs

**Output A: Executive Memo**
```
TO:   [Chief of staff, or whoever screens for the chief executive]
FROM: [Your office]
DATE: [Date]
RE:   Service Response Time Disparities — [Area A] and Peer Comparison

BOTTOM LINE: Analysis of [period] service request data confirms that [Area A]
residents experience on-time completion rates X percentage points below the
jurisdiction-wide average. This pattern extends to [Y other areas] and is
consistent with systemic resource allocation rather than area-specific factors,
though the data cannot establish that. Our on-time rate appears
[above/below/comparable to] [Peer]'s, though definitional differences limit
direct comparison.

[Continue with Key Findings, Equity Note, Recommendation, Requested Decision]
```

**Output B: Policy Brief for the legislative body (3-5 pages)**
Uses the Policy Brief template from TEMPLATES.md. Include the "What Peer
Jurisdictions Have Done" section with the benchmark findings.

**Output C: Community Fact Sheet for [Area A] residents**
Uses the Community Fact Sheet template. Plain language. Specific to [Area A]'s
experience. Working feedback mechanism. Translated into every language in the
context file's list.

---

## Engagement Design (GovLab)

1. Share draft findings with [Area A] community organizations before finalizing
2. Ask specific questions: "Does this match your experience? What are we missing?"
3. Build an area comparison dashboard for public exploration
4. Commit to reporting back on what changed based on findings
5. Publish the methodology so others can verify or extend the analysis

---

## Tool Call Summary

| Step | Jurisdiction | Purpose |
|------|------|---------|
| 1 | Ours | Search datasets → find the service request dataset |
| 2 | Ours | Get dataset info → resource IDs by period |
| 3 | Ours | Get schema → confirm field names for this resource |
| 4 | Ours | List distinct geographic unit values → verify filter strings |
| 5 | Ours | Query filtered by area → volume |
| 6 | Ours | Query filtered by area + on-time met → count |
| 7 | Ours | Query filtered by area + on-time missed → count |
| 8 | Ours | Repeat 5–7 for each comparison area |
| 9 | Ours | Query population resource → per-capita denominator |
| 10 | Peer | Search datasets → find equivalent data |
| 11 | Peer | Get schema → field names, platform syntax |
| 12 | Peer | Query → peer metrics |

---

## Key Methodology Lessons

**Problem Framing (Bloomberg):** The representative's question needed reframing
before querying. Stakeholder mapping revealed frontline knowledge the data can't
capture. The problem statement explicitly listed what the data could and couldn't
answer.

**Analysis (J-PAL):** Started descriptive before diagnostic. Checked whether
service mix explains the gap before concluding anything systemic. Used explicit
claim-strength language throughout — and noted that the most decision-relevant
claim was the weakest. Verified filter strings before trusting a count.

**Benchmarking:** Discovered the peer's data before comparing. Documented metric
definitions to assess comparability, and switched metrics when the definitions
didn't align. Reported differences as directional, not precise.

**Communication (GovLab):** Three outputs for three audiences from the same
analysis. The executive memo leads with the bottom line. The community fact sheet
uses plain language, invites participation, and is translated. All cite data
sources and acknowledge limitations.
