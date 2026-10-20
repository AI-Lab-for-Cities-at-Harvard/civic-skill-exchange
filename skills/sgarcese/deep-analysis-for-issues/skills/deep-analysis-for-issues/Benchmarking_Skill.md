---
name: civic-benchmarking
description: "Use whenever the user wants to compare their jurisdiction to peers, identify best practices from other governments, understand how they rank on a metric, or find evidence a policy approach worked elsewhere. ALWAYS use on: 'other cities', 'other counties', 'other towns', 'how do we compare', 'best practices', 'peer cities', 'peer jurisdictions', 'what works', 'benchmarks', 'lessons from elsewhere', or whether they are doing better or worse than comparable jurisdictions. Uses the primary open data MCP plus the peer MCPs configured in the context file. Applies J-PAL caution to comparative claims and Bloomberg framing to turn benchmarks into actionable recommendations. Includes a Performance Management Benchmarking module — pair with Performance_Management_Skill.md to compare cost-per-outcome, workload-per-FTE and budget-efficiency ratios across jurisdictions."
---

# Benchmarking — Cross-Jurisdiction Comparative Analysis

> Read the filled `context.yml` first. Your peer set, their portals,
> platforms, populations and comparability cautions are all under
> `comparators.peer_jurisdictions`.

## Purpose and Power

Benchmarking against peers is one of the most persuasive forms of evidence in
public policy. It answers the question every skeptic asks: *"Is this actually a
problem, or is every jurisdiction like this?"* Used carefully, cross-jurisdiction
comparison can:

- Validate that a problem is real and solvable (not just inherent to public service delivery)
- Identify specific practices from peers worth adapting
- Set realistic performance targets grounded in what's achievable
- Build the case for investment by showing what's possible
- Compare efficiency ratios (cost-per-outcome, workload-per-FTE) against jurisdictions with similar service obligations

**Used carelessly, it misleads.** Jurisdictions differ in geography,
demographics, data systems, and reporting practices. Apply J-PAL rigor to every
comparative claim.

---

## Choosing and Justifying the Peer Set

The peer set is a **judgment, not a fact** — which places are usefully similar.
It is recorded under `comparators` in the context file precisely because a new
adopter should be asked rather than handed someone else's answer.

Select peers for structural comparability, and write the rationale down before
running a single comparison. `peer_selection_rationale` exists for this: it is
what you show the skeptic who says the peer set was picked to flatter. Peers
chosen after seeing results are not peers.

The templates below show three peers because that is a common working number.
One well-chosen peer beats three poorly matched ones, and a small office with
time for a single comparison should make that comparison rather than skip the
phase.

The dimensions that usually matter:

| Dimension | Why it matters |
|-----------|----------------|
| Population scale | Per-capita normalization only stretches so far; a jurisdiction ten times your size has different fixed costs |
| Urban density and geography | Drives infrastructure demand, response times, service routes |
| Form of government | Who decides, how fast, and whether the comparison is politically legible |
| Service obligations | Whether the peer runs its own schools, transit, police, utilities — or delegates them |
| Regional/state functions | A peer that absorbs county or state functions has a broader budget and headcount for the same nominal department |
| Labor market and cost of living | Determines whether raw dollar comparisons mean anything |
| Data maturity and platform | Whether you can query their data live or are stuck comparing published reports |
| Workforce structure | Unionized versus not changes cost structure and staffing flexibility |

Record for each peer, in the context file: portal URL, MCP server, platform,
population, **comparability strengths** and **comparability cautions**. The
cautions are not boilerplate — they are the qualifications that must travel with
every number you take from that peer.

---

## MCP Tool Reference

### Primary jurisdiction

Tool names are in the context file (`tool_search_datasets`,
`tool_get_dataset_info`, `tool_get_schema`, `tool_query`).

### Peer jurisdictions

Each peer's MCP server name and platform are in the context file. Platform
determines call shape:

- **Socrata** portals typically expose dataset search, dataset metadata, schema,
  record query, and a SoQL execution endpoint
- **CKAN** portals typically expose dataset search, dataset info, datastore
  schema, and datastore query
- **ArcGIS** portals typically expose dataset search, dataset metadata, feature
  query, and server-side aggregation — the syntax differs meaningfully from
  Socrata and CKAN

**⚠️ ALWAYS retrieve the schema before any query. Field names differ across
jurisdictions and across datasets within one jurisdiction.** Where your peers
run different platforms, expect the query syntax to differ too — check the
peer's platform in the context file before writing the call.

---

## Benchmarking Workflow

### Phase 1: Establish the Comparison Question

Before querying any jurisdiction's data, define:

1. **What metric** are we comparing? (Be precise — response time? Per-capita complaints? Permit approval rate?)
2. **Are these metrics comparable?** Do all jurisdictions measure and report the same thing?
3. **What denominator** makes the comparison fair? (Per capita? Per lane-mile? Per housing unit?)
4. **What time period** aligns across jurisdictions?
5. **What structural differences** must we account for?

**Comparability Assessment Template:**
```
Metric being compared: [X]
We measure it as: [field name, definition]
Peer 1 measures it as: [field name, definition]
Peer 2 measures it as: [field name, definition]
Peer 3 measures it as: [field name, definition]
Are definitions equivalent? [Yes / Approximately / No — explain]
Recommended denominator: [why]
Known structural differences: [from each peer's comparability cautions]
Confidence in comparison: [High / Moderate / Low]
```

---

### Phase 2: Data Discovery Across Jurisdictions

Run parallel searches across your jurisdiction and every peer:

```
# Primary
search datasets for "[topic]"

# Each peer, using that peer's MCP server name and platform syntax
[peer MCP server]: search datasets for "[topic]"
```

For each jurisdiction that has relevant data:
1. Identify dataset IDs and resource IDs
2. Inspect schema to find the equivalent fields
3. Note data quality indicators (how current? how complete?)

---

### Phase 3: Parallel Data Collection

Collect metrics for each jurisdiction using consistent parameters:

```
# Primary — service request volume
query([resource_id], limit=5)  → note total_count
# cross-reference with your population figure for the per-capita rate

# Each peer — find the equivalent service request data, then:
[peer]: search datasets for "311 service requests"
[peer]: get schema for the resource
[peer]: query the resource, limit=5  → note equivalent metrics
```

Where a peer has no equivalent field, say so rather than substituting the
nearest-looking one. A missing comparison is a result; a silently mismatched one
is an error that survives into the brief.

---

### Phase 4: Normalize and Compare

**Standard Normalization Approaches:**

| Metric Type | Denominator | Rationale |
|-------------|-------------|-----------|
| Service requests, complaints | Per `{{rate_denominator}}` residents | Population-adjusted comparison |
| Response times | Median (not mean) | Resistant to outliers from long-tail cases |
| Permit approvals | Per 1,000 housing units | Accounts for housing stock size |
| Infrastructure issues | Per lane-mile or per acre | Accounts for physical footprint |
| Budget allocations | Per resident | Standard public finance comparison |
| Cost per outcome | $ per resolved case | Service efficiency comparison |
| Workload per staff | Cases per employee per year | Staffing efficiency comparison |

Population figures for every jurisdiction in the comparison — yours and each
peer's — are in the context file. Use them; do not estimate from memory.

**Pick a denominator your size supports**, once, in the context file as
`rate_denominator`. Per 10,000 residents is the usual convention, and it is
nonsense in a town of eight thousand or for a sub-area of five hundred, where
every rate becomes a fractional extrapolation that reads as absurd in a public
document. Scale down to per 1,000 or per 100, say which you used, and keep it
identical across every jurisdiction in the comparison.

---

### Phase 5: Interpret with J-PAL Rigor

Cross-jurisdiction comparisons require special care. Apply these claim strength
rules:

| Finding | Appropriate Language |
|---------|---------------------|
| Our metric is higher/lower than a peer's | "Our [metric] is [X%] higher than [peer]'s [metric] in [year]" |
| The difference may reflect a real performance gap | "This suggests we may have room to improve [metric]" |
| A peer's policy may explain their performance | "[Peer] implemented [policy] in [year]; their performance improved; this is consistent with — but does not prove — that the policy worked" |
| We should adopt a peer's approach | "[Peer]'s experience provides preliminary evidence for [approach], though adaptation to our context would be needed" |

**Never say:** "[Peer]'s policy caused their better performance" without
quasi-experimental evidence.

---

### Phase 6: Benchmark Report Template

```markdown
## Cross-Jurisdiction Benchmark: [Metric]

### Summary Table

| Jurisdiction | [Metric] | Per Capita | Time Period | Data Source |
|------|----------|------------|-------------|-------------|
| [Ours] | [value] | [rate] | [period] | [dataset ID] |
| [Peer 1] | [value] | [rate] | [period] | [dataset ID] |
| [Peer 2] | [value] | [rate] | [period] | [dataset ID] |

State the denominator in the header — `{{rate_denominator}}` from the context
file — and use the same one for every row.

### How We Compare
[1-2 sentences: above, below, or in line with peers?
 Use hedged language appropriate to comparison confidence level.]

### What Might Explain Differences
[Structural factors, policy differences, data collection differences,
 confidence level for each. Draw on each peer's comparability cautions.]

### What We Can Learn
[Specific practices from peers worth investigating — labeled as
 "worth exploring," not "proven solutions"]

### Important Caveats
[Definition alignment, data quality, structural differences, time period alignment]

### Recommended Next Steps
[What additional investigation is needed before acting on these benchmarks]
```

---

## Performance Management Benchmarking

> **This module requires familiarity with `Performance_Management_Skill.md`.**
> Run that skill first to establish your own internal efficiency ratios, then use
> this module to compare against peers.

The most powerful benchmarking extends beyond service volume and response times
to **efficiency ratios**: How much does it cost to deliver one unit of service?
How much work is each employee carrying? Are peers getting better outcomes from
the same investment?

### Why This Matters

A jurisdiction can have fast response times *because* it's understaffing other
services, or *because* it has invested more — or *because* it's measuring
differently. Performance management benchmarking surfaces these distinctions and
gives decision-makers evidence to defend or challenge investment levels.

### Step 1: Establish Your Own Baseline First

Before comparing across jurisdictions, complete an internal analysis using
`Performance_Management_Skill.md`:
- **Module 1:** Cost per outcome for the service domain
- **Module 2:** Workload per FTE
- **Module 3:** Budget vs. performance trend (multi-year)

Document and lock these numbers before searching peer data:
- Cost per resolved case: $[X]
- Workload per employee: [N] cases/year
- On-time rate: [X]%
- Fiscal year(s) used: [per `fiscal_year_start` and `fiscal_year_convention`]

Locking first is not ceremony. It is what stops the peer numbers from quietly
reshaping which of your own figures you decide to report.

### Step 2: Search for Equivalent Financial Data in Peer Jurisdictions

Each jurisdiction organizes budget and staffing data differently. For each peer,
run a discovery sequence:

```
[peer]: search datasets for "budget expenditure"
[peer]: search datasets for "employee compensation payroll"
[peer]: search datasets for "department salaries"
```

Once datasets are found: confirm schema, identify the department/agency field,
identify the spend/compensation fields, and align to the same period you used
for your own figures.

### Step 3: Search for Equivalent Service Outcome Data

```
[peer]: search datasets for "311 cases service requests"
```

Confirm: does the peer have an equivalent "on-time" or "resolved" field? If not,
use total volume and median resolution time as proxies, and say that you did.

### Step 4: Compute Normalized Efficiency Ratios

For each jurisdiction where both budget and outcome data are available:

```
cost_per_outcome         = department_annual_spend / resolved_cases_same_period
workload_per_employee    = total_service_volume / employee_headcount_proxy
overtime_rate            = total_overtime / total_gross_compensation
```

Apply the same fiscal-year alignment and service-scope boundaries throughout.
**Do not mix fiscal years across jurisdictions** — fiscal calendars differ, and
a July-start jurisdiction compared against a January-start one is comparing
different halves of different years.

### Step 5: Performance Benchmark Template

```markdown
## Performance Benchmark: [Service Domain]

### Efficiency Ratio Comparison

| Jurisdiction | Annual Spend | Resolved Cases | Cost/Case | Headcount Proxy | Workload/Employee | On-Time Rate |
|------|-------------|----------------|-----------|-----------------|-------------------|-------------|
| [Ours] | $[X] | [N] | $[X] | [N] | [N] | [X]% |
| [Peer 1] | $[X] | [N] | $[X] | [N] | [N] | [X]% |
| [Peer 2] | $[X] | [N] | $[X] | [N] | [N] | [X]% |

### Interpretation (with J-PAL Claim Strength)
[Label each finding: Descriptive / Correlational / Suggestive]

### Key Caveats Across Jurisdictions
- Budget definitions differ: some include fringe/benefits in department budgets; others budget separately
- Headcount proxies from payroll records ≠ authorized FTE positions, anywhere
- Service volumes reflect reported/recorded cases only — reporting rates differ
- Labor cost differences: raw dollar comparisons without cost-of-living adjustment favor lower-cost jurisdictions. Check each peer's comparability cautions
- Scope differences: a peer that absorbs regional, county or state functions has a broader department than the same-named one elsewhere. See `regional_authority`
- Fiscal calendars vary: verify each peer's fiscal year definition before aligning

### What to Investigate Further
[Specific efficiency gaps worth deeper investigation — not conclusions]
```

### Performance Benchmarking Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Raw cost comparison | Labor costs differ; raw $/case flatters low-cost jurisdictions | Acknowledge the cost-of-living gap; focus on trend direction, not absolute dollars |
| Ignoring scope differences | A peer absorbing state or county functions carries work you delegate | Note scope differences before comparing headcounts or budgets |
| Matching fiscal years carelessly | Misaligned periods mix different service volumes | Verify each fiscal year definition before computing ratios |
| Using headcount as proof | Payroll-based proxy ≠ authorized FTE, anywhere | Always caveat as headcount proxy |
| Single-year conclusions | One year may reflect an anomaly (crisis, vacancy spike, one-time capital spend) | Use at least 2–3 years for trend claims |

---

## Domain-Specific Benchmarking Guides

For each domain: identify your dataset from the context file, then run discovery
against each peer with the search terms below.

### Service Requests / 311
- **Yours:** `service_request_dataset` — `{{on_time_field}}`, `{{geographic_unit_field}}`
- **Peers:** search "311 cases", "service requests", "customer service requests". Note that some jurisdictions route requests through a branded app rather than a 311 line
- **Key metrics:** On-time rate, median resolution time, per-capita volume
- **Key caveat:** Service-level targets differ by jurisdiction *and* by service type. "On-time" means different things when the targets behind it differ

### Building Permits / Housing Development
- **Yours:** `permits_dataset`
- **Peers:** search "building permits", "permits issued", "construction permits"
- **Key metrics:** Permits issued per 1,000 housing units, median approval time, residential vs. commercial mix
- **Key caveat:** Permitting processes differ significantly; some jurisdictions require more permits for the same scope of work, which inflates their volume without meaning more construction

### Public Safety
- **Yours:** `public_safety_datasets`
- **Peers:** search "police incidents", "crime data", "crime incidents"
- **Key metrics:** Incident rate per `{{rate_denominator}}` residents by category
- **Key caveat:** Among the least comparable metrics. Reporting practices and offense classifications vary widely, and UCR-to-NIBRS transitions break year-over-year comparability *within* a single jurisdiction, let alone across several. Confirm each jurisdiction's transition date

### Transportation / Mobility
- **Yours:** `additional_datasets.transportation`
- **Peers:** search "transportation", "traffic counts", "pavement condition", "road inventory", "transit", "bike share" — whichever your jurisdictions actually run. Shared mobility systems are branded differently everywhere; search by function, not by brand

---

## Contextual Enrichment: Beyond the Data

Data comparison is stronger when paired with qualitative context. For any
benchmarking finding:

1. **Search for what the peer actually did** — news, policy documents, case studies explaining their performance
2. **Check What Works Cities** (Bloomberg Philanthropies) and **Results for America** for documented case studies
3. **Look for cost data** — performance differences may reflect investment differences, not just approach differences
4. **Contact peer practitioners** — data benchmarks are a starting point for peer learning, not a conclusion

---

## Benchmarking Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **Metric shopping** | Picking comparisons that flatter or indict | Define metrics before looking at results |
| **Definition mismatch** | Comparing metrics that sound the same but measure differently | Always document what each jurisdiction actually measures |
| **Scale blindness** | Comparing without adjusting for population or cost of living | Normalize by population; note labor cost differences for financial comparisons |
| **Attribution error** | "[Peer] is better because of policy X" | Label as correlation; require additional investigation for causation |
| **Cherry-picked peers** | Choosing only jurisdictions that support a preferred narrative | Fix the peer set and its rationale in the context file *before* running comparisons |
| **Data quality gap** | One jurisdiction's data is far more complete than another's | Note data quality differences; they may explain apparent performance gaps |
| **Cost-of-living blindness** | Comparing raw cost-per-outcome across different labor markets | Flag labor cost differences from each peer's comparability cautions |

---

## J-PAL Core Values Applied to Benchmarking

1. **Comparability first** — Ensure you're measuring the same thing before comparing
2. **Structural humility** — Jurisdictions differ; differences in outcomes don't automatically mean differences in effort or competence
3. **Peer learning framing** — Benchmarks should inspire and inform, not shame
4. **Action orientation** — Every benchmark finding should connect to a specific investigable hypothesis
5. **Transparency** — Show whose data you used, how you normalized, and what you couldn't account for
