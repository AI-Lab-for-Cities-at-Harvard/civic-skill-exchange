---
name: civic-performance-management
description: "Use this skill when the user needs to analyze public service efficiency through the lens of budget, expenditures, and staffing. ALWAYS use when the user asks about performance management, results for money invested, cost per outcome, workload per FTE, staffing efficiency, budget vs. performance trends, or wants to connect spending and staffing data to service delivery outcomes. Inspired by Results for America and PerformanceStat (CitiStat). Triggers include: 'performance management', 'results for money', 'budget vs. performance', 'cost per outcome', 'workload per FTE', 'staffing efficiency', 'are we getting results', 'spending vs. outcomes', 'PerformanceStat', 'service request efficiency', 'permit processing time', 'code violations performance', 'public safety performance', 'how much does it cost to', 'how many cases per employee', 'is the department understaffed', 'overtime analysis'."
---

# Performance Management — Results for America / PerformanceStat Methodology

> Read the filled `context.yml` first. Every resource ID, field name,
> department string, fiscal date and threshold below comes from it.

## Core Commitment

**Public investment must produce measurable results.** Connect what the
jurisdiction spends and who it employs to what it actually delivers — then ask
whether that relationship is improving over time.

---

## Step 0 — Identify the Service Domain

Before pulling any data, determine which service the user is asking about.
Select the **primary operational data source** for it. **Never default to a
jurisdiction-wide KPI dashboard if a direct operational dataset exists** — a scorecard
records that a metric moved; the operational data records what happened.

| Service Domain | Primary Performance Data | Key Performance Fields |
|---------------|-------------------------|----------------------|
| Basic services (whatever your service request categories cover — sanitation, street repair, streetlights, graffiti, nuisance and pest complaints, abandoned vehicles) | **Service requests** — filter by `{{service_type_field}}` | `{{on_time_field}}`, resolution time (`{{close_date_field}}` − `{{open_date_field}}`), volume by `{{geographic_unit_field}}` and `{{department_field}}` |
| Code enforcement | **Code violations** — `code_violations_dataset` | Open/closed violations, days-to-resolve, address and geographic unit |
| Permitting | **Building permits** — `permits_dataset` | Permit volume, days-to-issue, project type, declared value |
| Public safety | **Dispatch + crime incidents** — `public_safety_datasets` | Dispatch volume (by responding agency where your data splits it), incident counts by type and geographic unit |
| All other services | **KPI dashboard** (`kpi_dashboard_dataset`, fallback only) | Score numerator/denominator by metric name and timestamp |

If a domain has no entry in your context file, discover it before analyzing —
and if nothing is published, say so rather than substituting the scorecard.

---

## Pre-Analysis Checklist

Before querying anything:
- [ ] Have I identified the service domain and selected the correct operational dataset?
- [ ] Do I have the fiscal year(s) the user wants? (See `fiscal_year_start` and `fiscal_year_convention`)
- [ ] Have I confirmed field names via the schema tool? **Never guess field names.**
- [ ] Do I know which department string to filter on? (Names vary across datasets — see `departments`; verify before filtering)
- [ ] Am I clear on whether the user wants *planned* budget or *actual* spend?

---

## Module 1 — Cost per Outcome

*"How much does it cost to deliver one unit of this service?"*

### Data Sources
- **Actual expenditures:** `actual_spend_dataset` — filter by `{{actual_spend_dept_field}}`
- **Planned budget:** `budget_dataset` — filter by `{{budget_dept_field}}`
- **Outcome volume:** Domain-specific operational dataset (see Step 0)

### MCP Workflow
```
1. Get schema for the actual-spend resource
   → confirm exact department field name

2. Query the actual-spend resource,
     filters={"{{actual_spend_dept_field}}": "[department string]"},
     date_range={"field": "{{actual_spend_date_field}}",
                 "start_date": "[fiscal year start]",
                 "end_date": "[fiscal year end]"}
   → total actual expenditure for the fiscal year

3. Get schema for the operational resource
   → confirm service type, date, and on-time field names

4. Query the operational resource,
     filters={"{{department_field}}": "[department string]",
              "{{on_time_field}}": "{{on_time_met_value}}"},
     date_range={"field": "{{close_date_field}}", ...same fiscal year}
   → count of successfully resolved outcomes

5. Compute: cost_per_outcome = total_expenditure / outcome_count
```

Both date ranges must be built from your own fiscal calendar. A fiscal year that
starts in July, October or January produces three different answers from the
same underlying data.

### Interpretation Flags

| Signal | What It Means |
|--------|--------------|
| Spending ↑ + outcomes flat or ↓ | Efficiency loss — investigate cause before drawing conclusions |
| Spending flat + outcomes ↑ | Efficiency gain — examine whether workload or complexity changed |
| Spending ↑ + outcomes ↑ proportionally | Scaling up — cost per outcome stable |
| Spending ↓ + outcomes ↓ | Potential disinvestment — check staffing and volume context |

**Claim strength: correlational.** Label as: *"The data is consistent with
[interpretation], though spending-outcome correlations do not establish
causation."*

---

## Module 2 — Workload per FTE

*"How much work is each employee carrying, and are there signs of staffing
stress?"*

### Data Sources
- **Staffing proxy:** `payroll_dataset`
  - Count unique employee entries per department = headcount proxy (not authorized FTE count)
  - Sum `{{overtime_field}}` and `{{gross_pay_field}}` per department
- **Workload volume:** Total cases/requests/incidents from the operational dataset (do not filter on on-time — use all volume)

### MCP Workflow
```
1. Get schema for the payroll resource
   → confirm field names for department, overtime, gross pay

2. Query the payroll resource,
     filters={"{{payroll_dept_field}}": "[department string]"},
     limit=[high enough to cover the department]
   → count rows = employee headcount proxy
   → sum {{overtime_field}} / sum {{gross_pay_field}} = overtime rate

3. Query the operational resource,
     filters={"{{department_field}}": "[department string]"},
     date_range={"field": "{{open_date_field}}", ...fiscal year}
   → total volume (use total_count from the response, not returned rows)

4. Compute:
   workload_per_employee = total_volume / employee_count
   overtime_rate = total_overtime / total_gross
```

### Staffing Stress Indicators

- **Overtime rate above `overtime_stress_threshold`** → flag for further review
- **Workload per employee trending up year over year** without resolution time improving → potential capacity gap
- **High overtime + declining on-time rate** → strongest combined signal of staffing stress

On the threshold: it is a **screening trigger, not a finding**. Set it against
your own historical distribution across departments. A threshold near the median
flags everything and tells you nothing; one above the maximum flags nothing and
tells you less. With too few departments for a distribution, calibrate against
the same department over several years instead, and treat the flag as "unusual
for us" rather than "high". If your context file carries an inherited default, treat
calibrating it as the first task, not an optional refinement.

**Caveat:** payroll headcount ≠ authorized FTE positions. It counts payroll
entries in a given year, including part-year, part-time and transitional staff.
Always state: *"Employee count is a proxy derived from payroll records, not
official FTE authorization data."*

---

## Module 3 — Budget vs. Performance Trend (Multi-Year)

*"Is performance improving in proportion to investment over time?"*

### Data Sources
- **Budget trend:** `budget_dataset`, using the multi-year columns named in `budget_year_fields`
- **Performance trend:** Repeat the Module 1 outcome count query for each fiscal year

### MCP Workflow
```
1. Get schema for the budget resource
   → confirm the multi-year expense column names. These roll forward each
     budget cycle; last year's column names are not this year's

2. Query the budget resource,
     filters={"{{budget_dept_field}}": "[department string]"}
   → retrieve all available fiscal-year figures in one query

3. Run outcome count queries for each fiscal year, adjusting the date range
   per year using your fiscal calendar

4. Build a year-over-year table:
   | FY | Actual Spend | Outcome Count | Cost per Outcome | % Spend Change | % Outcome Change |
```

### Trend Signals
- Calculate % change year-over-year for both spending and outcomes
- Both moving together proportionally → stable efficiency
- Spend growth outpacing outcome growth → declining efficiency
- Outcome growth outpacing spend growth → improving efficiency, or demand-driven volume

**Claim strength: descriptive/correlational.** Always list plausible alternative
explanations: inflation, demand changes, policy changes, data collection
changes, staffing vacancies, and any system replacement that changed how
outcomes are counted.

---

## Module 4 — Overtime & Staffing Efficiency

*"Which departments are showing staffing stress signals?"*

### MCP Workflow
```
1. Query the payroll resource per department
   → aggregate: overtime_total / gross_total

2. Flag departments above overtime_stress_threshold

3. Cross-reference with operational data:
   → Are high-overtime departments also showing longer resolution times?
   → Are they showing declining on-time rates?
```

### What Overtime Signals (and Doesn't Signal)
- **Does signal:** Potential capacity gap relative to current workload at current staffing levels
- **Does NOT prove:** That more FTEs are needed (could reflect scheduling, vacancy management, or demand spikes)
- **Use for:** A budget advocacy data point, not a standalone staffing conclusion

---

## Evidence Synthesis Template (Results for America Framing)

```markdown
## Performance Summary: [Department / Service Domain] — FY[XX]

### Investment
- Budget allocated: $[X] (source: budget dataset, FY[XX] appropriation)
- Actual spend: $[X] (source: actual-spend dataset, [fiscal year dates])
- Employee headcount (proxy): [N] (source: payroll dataset)
- Overtime as % of gross: [X]% [flag if above threshold: ⚠️ Staffing stress indicator]

### Outcomes
- Total service volume: [N] [cases / permits / incidents / violations]
  (source: [operational dataset])
- On-time / resolved rate: [X]%
- Average resolution time: [X] days
- [Domain-specific metric if applicable]

### Efficiency Ratios
- Cost per [outcome unit]: $[X]
- Workload per employee: [N] [units] per person per year

### Year-over-Year Trend
| FY | Actual Spend | Outcome Count | Cost per Outcome | % Spend Δ | % Outcome Δ |
|----|-------------|---------------|-----------------|-----------|-------------|
| [FY-2] | | | | baseline | baseline |
| [FY-1] | | | | | |
| [FY]   | | | | | |

Trend signal: [improving efficiency / declining efficiency / scaling proportionally / mixed / insufficient data]

### What We Don't Know
- Headcount is a payroll proxy, not authorized FTE count
- Actual-spend data captures recorded transactions; may not reflect all cost centers
- [Operational data source] volume reflects reported activity, not underlying need
- [List any data gaps or coverage issues encountered]

### Implications for Decision-Makers
[2–4 action-oriented bullets. Label each with claim strength: Descriptive / Correlational / Suggestive]
- [Finding 1] (Descriptive): ...
- [Finding 2] (Correlational): ...
- [Open question]: To determine whether [X], additional data on [Y] would be needed.
```

Route the synthesis to whoever holds authority over the department's budget —
`executive_official`, `legislative_body` or `department_head_title`, depending
on who actually decides in your jurisdiction. Whether the legislative body votes
on this or is merely notified changes how the recommendation should be written.

---

## Key Caveats — Always Include

| Caveat | Reason |
|--------|--------|
| Payroll headcount ≠ authorized FTE positions | Payroll counts individuals paid in a year, including part-year, part-time and transitional staff |
| Actual spend ≠ budget appropriation | Appropriations are authorized maximums; actuals reflect what was drawn down |
| Fiscal year is not calendar year | Date ranges must reflect your own fiscal calendar, not the default assumption |
| Service request volume = reported requests, not actual need | Reporting rates vary by area, language access and digital access |
| Spending-outcome correlation ≠ causation | Many factors change simultaneously; label all trend findings as correlational |
| Department name inconsistency across datasets | The same department appears under different strings in different datasets. Verify before filtering — an empty result looks exactly like a real zero |
| KPI dashboards are output/activity data | Scorecard metrics measure volume and timeliness, not impact or resident outcomes |
| A system replacement breaks the trend line | If outcomes are counted differently before and after a migration, the year-over-year comparison is measuring the migration |

---

## Full MCP Query Sequence

```
Step 1: Identify service domain (Step 0 table) → select operational dataset
Step 2: Search datasets for the domain → confirm dataset and resource IDs
Step 3: Get schema for the operational resource → exact field names
Step 4: Query operational resource, filtered by department, over the fiscal year
        → total volume and outcome metrics
Step 5: Get schema for the actual-spend resource
Step 6: Query actual-spend resource, filtered by department, same period
        → actual expenditure
Step 7: Get schema for the budget resource
Step 8: Query budget resource, filtered by department
        → multi-year budget figures
Step 9: Get schema for the payroll resource
Step 10: Query payroll resource, filtered by department
        → headcount proxy + overtime
Step 11: Compute ratios → apply Evidence Synthesis Template
```

---

## Handoff

Pass to other phases when relevant:
- **→ `Analytical_Skill.md`** if equity analysis is needed (do outcomes vary by geographic unit relative to spending?)
- **→ `Benchmarking_Skill.md`** if the user wants to compare efficiency ratios to peer jurisdictions (see the Performance Management Benchmarking module there)
- **→ `Communication_Skill.md`** when converting findings into a memo, brief or dashboard

---

## PerformanceStat Principles Applied

| Principle | Application in This Skill |
|-----------|--------------------------|
| **Regular data review** | Structure findings as a standing template; update each fiscal year |
| **Root cause orientation** | Don't stop at "costs are up" — examine workload, overtime and volume together |
| **Accountability** | Name the department; name the metric; name the fiscal year |
| **Action orientation** | Every synthesis ends with implications for decision-makers |
| **Honest accounting** | State every caveat; label every claim; show what we don't know |
