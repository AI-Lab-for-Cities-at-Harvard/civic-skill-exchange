---
name: civic-policy-analysis
description: "Use this skill when the user needs to conduct rigorous data analysis on local government open data for policy-making purposes. ALWAYS use when the user wants to query or interpret local government open data, make statistical claims about public services, or move from raw data to defensible findings. Inspired by J-PAL's (Abdul Latif Jameel Poverty Action Lab at MIT) evidence-to-policy methodology. Triggers include: 'analyze this data', 'what does the data show', 'run the numbers', 'is there an equity issue', 'compare neighborhoods', 'compare districts', 'compare wards', 'compare towns', 'what are the trends', 'evidence-based analysis', 'policy analysis', requests to query city, county or town data, or any situation where the user needs to move from raw data to defensible findings. Also use when the user makes claims that need data validation, or when findings need to be labeled with appropriate confidence levels."
---

# Policy Analysis — J-PAL Evidence-to-Policy Methodology

> Read the filled `context.yml` before the first tool call. Every
> resource ID, field name and geographic unit below comes from it.

## Core Commitment

**Policy recommendations must be grounded in the best available evidence, with
honest accounting of what we know and don't know.** Overstating causal claims
undermines credibility and leads to bad policy.

---

## Pre-Analysis Checklist

Before writing a single query, confirm:
- [ ] Do I have a clear problem statement from Problem Framing phase (or will I create one now)?
- [ ] Do I have the specific resource IDs I need to query?
- [ ] Have I confirmed field names via the schema tool? **Never guess field names.**
- [ ] Do I have a population/denominator dataset for per-capita calculations?
- [ ] Am I clear on what time period I'm analyzing?
- [ ] If the period spans a system replacement, am I querying each era separately?

---

## Level 1: Descriptive Analysis — "What Is Happening?"

This is the foundation. Establish facts before explaining them.

**Core questions:** What is the current state? How has it changed over time?
How does it vary by geography? By population? What are the outliers?

**MCP Workflow:**
```
Step 1: Confirm schema
→ get schema for the resource
  Know your fields before querying. Note date, categorical, and geographic fields.

Step 2: Get overall volume and recent records
→ query with limit=20, sorted by the date field descending

Step 3: Filter by category to understand composition
→ query with filters={"[category]": "[value]"}, limit=50
  Repeat for key categories.

Step 4: Temporal analysis
→ query with date_range={"field": "{{open_date_field}}",
    "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}, limit=1000

Step 5: Cross-reference with other datasets
→ Repeat discovery and querying for related datasets
  (population by geographic unit, budget, staffing)
```

**Descriptive reporting standards:**
- Always report total N (number of records)
- Always report the time period covered
- Note if data is a sample or full population
- Report both central tendency (average/median) AND spread (range, distribution)
- Flag data quality issues (missing values, implausible entries)

---

## Level 2: Diagnostic Analysis — "Why Is It Happening?"

Move carefully from description to explanation.

**Approaches:**
1. **Correlation** — Do two things tend to occur together? *Correlation ≠ causation — always state this.*
2. **Comparison** — How do different groups or areas differ? *Group differences may reflect many underlying factors.*
3. **Temporal** — Did something change after a specific event or policy? *Other things change simultaneously — before/after is not proof of cause.*
4. **Decomposition** — What factors contribute to an observed outcome?

### Claim Strength Framework (J-PAL)

| Claim Level | Language to Use | Evidence Required |
|-------------|----------------|-------------------|
| **Strong causal** | "X caused Y" | Randomized evaluation — rarely available in open data |
| **Suggestive causal** | "Evidence suggests X contributed to Y" | Before/after + comparison group + alternatives ruled out |
| **Correlational** | "X is associated with Y" | Systematic co-occurrence in data |
| **Descriptive** | "The data shows X" | Observed patterns |
| **Hypothetical** | "One possible explanation is..." | Logical reasoning consistent with data |

**With administrative open data, most findings will be descriptive or
correlational. Be transparent about this every time.**

---

## Level 3: Equity Analysis — "Who Benefits and Who Is Burdened?"

Average effects mask important distributional differences. This step is
**mandatory**.

**Equity Analysis Checklist:**
- [ ] **Geographic equity:** Do outcomes vary by geographic unit? Do historically underserved areas fare differently?
- [ ] **Racial/ethnic equity:** Can area demographics serve as a proxy? (note limitations)
- [ ] **Economic equity:** Do outcomes differ by income level?
- [ ] **Access equity:** Who is represented in the data? Who might be missing?
- [ ] **Temporal equity:** Are some groups waiting longer?

**Equity data strategy:**
- Cross-reference with `population_dataset` for demographic profiles by
  geographic unit — this is also your per-capita denominator
- Use `digital_access_dataset` for access analysis, where one is published. If
  reporting depends on digital channels and digital access is uneven, low volume
  in an area may mean low access rather than low need — which makes a measured
  disparity an *understatement*
- Use the finest geographic granularity your population data supports; a
  census-tract or block-group resource, where available, surfaces variation that
  larger units average away

**Equity caveats (always include):**
- Ecological fallacy: area-level patterns don't necessarily apply to individuals
- Reporting bias: open data reflects reported events, which may differ from actual incidence
- Missing populations: people with less access to government services may be underrepresented

---

## Level 4: Counterfactual Thinking

To evaluate a policy, ask: what would have happened without it?

1. **Baseline trend:** What's the trajectory without intervention? Is the problem getting better or worse on its own?
2. **Comparison groups:** Are there natural comparison cases? (Areas that did/didn't receive intervention; before/after a policy change)
3. **Dose-response:** If an intervention varies in intensity, do outcomes vary accordingly?
4. **Confounders:** What else changed at the same time? List plausible alternative explanations.

---

## Level 5: Evidence Synthesis Template

```markdown
## Summary of Findings

### What the Data Shows (Descriptive)
[Clear, factual summary of patterns. N = X records, period = Y]

### What Might Explain This (Diagnostic)
[Possible explanations, each labeled with claim strength level]

### Who Is Most Affected (Equity)
[Distributional analysis across geography, demographics, access]

### What Would Happen Without Action (Counterfactual)
[Baseline trends and projections]

### What We Don't Know
[Questions that require additional data or deeper analysis]

### Limitations and Caveats
[Honest accounting — what this analysis CANNOT tell us]

### Implications for Policy
[What decision-makers can reasonably conclude from this evidence]
```

---

## Common MCP Query Patterns

### Geographic comparison
```
query(resource_id, filters={"{{geographic_unit_field}}": "[area A]"}, limit=200)
query(resource_id, filters={"{{geographic_unit_field}}": "[area B]"}, limit=200)
# Compare volumes, rates, outcomes — always per-capita when comparing areas
```

Verify the exact strings the field contains before filtering. Area names are
recorded inconsistently in most jurisdictions — an alternate spelling, a merged
label, or a renamed district will return zero rows that read like a real answer.
Any known naming variations for your jurisdiction are in the context file under
`geographic_units`.

### On-time performance
```
query(resource_id, filters={"{{geographic_unit_field}}": "[area]",
      "{{on_time_field}}": "{{on_time_met_value}}"}, limit=5)
query(resource_id, filters={"{{geographic_unit_field}}": "[area]",
      "{{on_time_field}}": "{{on_time_missed_value}}"}, limit=5)
# Note total_count in each response rather than counting returned rows
```

An on-time rate only means what the underlying service-level target means. If
targets differ by request type, an area's rate partly reflects its service mix —
check that before reading a gap as a performance difference.

### Cross-dataset (per-capita rates)
```
# Step 1: Count by geographic unit in primary dataset
query(primary_id, filters={"{{geographic_unit_field}}": "[area]"}, limit=5)  # note total_count

# Step 2: Get population
query([resource id from population_dataset in the context file],
      limit=[number of units])

# Step 3: rate = count / population × {{rate_denominator}}
```

---

## Analytical Pitfalls to Avoid

| Pitfall | Remedy |
|---------|--------|
| **Cherry-picking** | Report ALL major findings, including uncomfortable ones |
| **Denominator neglect** | Always calculate per-capita rates when comparing areas |
| **Simpson's Paradox** | Check subgroup patterns before reporting aggregates |
| **Survivorship bias** | Consider what happened to cases that dropped out |
| **False precision** | Use ranges for uncertain quantities; round appropriately |
| **Causal overclaiming** | Label every finding with its appropriate confidence level |
| **Silent empty filter** | A filter matching nothing looks like a real zero — confirm the exact string first |
| **Joining across a system change** | Field names and definitions rarely survive a migration; query eras separately |

---

## Handoff to Communication Phase

Pass these to `Communication_Skill.md`:
1. ✅ Key findings organized by confidence level
2. ✅ Equity analysis results
3. ✅ Clear statement of limitations
4. ✅ Specific, actionable recommendations (or questions for further investigation)
5. ✅ Data tables ready for formatting
6. ✅ Target audience identified
7. ✅ Success criteria from problem framing phase

## J-PAL Core Values

1. **Intellectual honesty** — Report what you find, not what you hoped to find
2. **Transparency** — Show your work; describe methodology; acknowledge limitations
3. **Humility** — Administrative data rarely proves causation
4. **Equity focus** — Always ask who benefits and who is burdened
5. **Action orientation** — Analysis should inform decisions, not just describe situations
6. **Iterative learning** — Frame recommendations as hypotheses to test
