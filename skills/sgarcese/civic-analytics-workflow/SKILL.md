---
name: civic-analytics-workflow
description: "Orchestrator for local government policy analysis and civic innovation. ALWAYS use for any request involving open government data, city, county or town services, neighborhood or ward equity, public policy, government performance, 311 and service request analysis, housing, safety or transportation — even if the user hasn't asked for a 'full analysis'. Routes between five sub-skills: problem framing (Bloomberg-inspired), policy analysis (J-PAL-inspired), communication (GovLab/InnovateUS-inspired), peer benchmarking, and performance management (Results for America / PerformanceStat). Triggers include: 'full analysis', 'policy brief', 'data-driven recommendation', 'service improvement project', 'investigate [issue]', 'compare us to peer cities', 'peer counties', 'similar towns', 'what does the data show', 'help me write a memo about', or any request combining problem definition, data analysis and communication for government or civic purposes."
license: MIT
metadata:
  civic.category: policy
  civic.category-secondary: data-analysis
  civic.jurisdiction: generic
  civic.localization: generalized
  civic.data-sensitivity: none
  civic.human-review: none
  civic.maintainer: Santi Garces
  civic.contact: test@test.org
  civic.affiliation: individual
  civic.deployment: personal
---

# Local Government Policy Analysis — Master Orchestrator

## Before anything else: read the context file

This skill is jurisdiction-neutral. Every dataset identifier, field name,
office title, fiscal calendar and geographic unit it needs lives in
`context.yml` beside this file, copied from `context.template.yml`.

**Read the filled context file before the first tool call.** If it still
contains `TODO` values that the task depends on, say which ones and stop —
guessing a dataset ID or a field name produces a confident wrong answer with
no error to catch it.

Two conventions used throughout:

- **Geographic unit** — your jurisdiction's primary sub-area for analysis:
  neighborhood, ward, district, borough, community area. Named in the context
  file as `geographic_unit_label`, carried in data as `{{geographic_unit_field}}`.
- **Service requests** — your non-emergency request system, whatever it is
  called locally (311, FixIt, CRM, work orders). Datasets and fields are in the
  context file.

**Scope:** this skill assumes a US local government — 311-style service
requests, ZIP codes, UCR/NIBRS crime classification, US plain-language reading
conventions. Adopters elsewhere will need to adapt those, not merely fill slots.

---

## Five-Phase Integrated Framework

| Phase | Source Methodology | When to Use | Reference File |
|-------|-------------------|-------------|----------------|
| **1. FRAME** | Bloomberg Center for Public Innovation (JHU) | Problem is undefined or needs scoping | `Problem_Framing_Skill.md` |
| **2. ANALYZE** | J-PAL, MIT — Evidence-to-Policy | Running numbers, finding patterns, equity analysis | `Analytical_Skill.md` |
| **3. COMMUNICATE** | The GovLab (NYU) / InnovateUS | Writing memos, briefs, dashboards, community reports | `Communication_Skill.md` |
| **4. BENCHMARK** | Cross-jurisdiction comparison against the peer set in your context file | Comparing your jurisdiction to peers, learning from elsewhere | `Benchmarking_Skill.md` |
| **5. PERFORM** | Results for America / PerformanceStat (CitiStat) | Budget × staffing × service outcomes: cost-per-outcome, workload-per-FTE, efficiency trends | `Performance_Management_Skill.md` |

> **Always read the relevant sub-skill file before beginning each phase.**

---

## Quick Decision Router

```
User Request
│
├─ "What data do we have on..." / "Help me define the problem"
│   → Read Problem_Framing_Skill.md → Run Phase 1
│
├─ "Analyze / run the numbers / what does the data show / is there an equity issue"
│   → Read Analytical_Skill.md → Run Phase 2
│
├─ "Write a memo / create a brief / make a dashboard / present these findings"
│   → Read Communication_Skill.md → Run Phase 3
│
├─ "Compare us to other cities, counties or towns / how do we rank / what works elsewhere"
│   → Read Benchmarking_Skill.md → Run Phase 4
│
├─ "Budget vs. performance / cost per outcome / workload per FTE / are we getting results / staffing efficiency / how much does it cost to / is the department understaffed / overtime analysis"
│   → Read Performance_Management_Skill.md → Run Phase 5
│
└─ "Full analysis / investigate / give me a recommendation / policy project"
    → Run all relevant phases in sequence
```

---

## MCP Tool Reference

### Primary jurisdiction

Your portal is named in the context file as `primary_portal_url` — cite it in
every published output. Its MCP server and four core calls are
`primary_mcp_server`, `tool_search_datasets`, `tool_get_dataset_info`,
`tool_get_schema` and `tool_query`. The pattern is the same on every platform:

```
{{tool_search_datasets}}    → Discover datasets by topic
{{tool_get_dataset_info}}   → Find resource IDs and metadata
{{tool_get_schema}}         → Get exact field names before querying
{{tool_query}}              → Retrieve records
```

### Peer jurisdictions

Each peer's MCP server, platform and query syntax is listed under
`comparators.peer_jurisdictions` in the context file. Platforms differ — Socrata,
CKAN and ArcGIS take different call shapes and different field conventions —
so read the peer's entry before calling it.

**⚠️ ALWAYS confirm field names via schema before querying any dataset in any
jurisdiction.** Field names differ across jurisdictions, across datasets within
one jurisdiction, and across years within one dataset.

---

## Standard MCP Sequence

```
1. Search datasets by topic          → find dataset IDs
2. Get dataset info                  → find queryable resource IDs
3. Get schema                        → confirm EXACT field names
4. Query                             → retrieve records
```

Step 3 is not optional. Skipping it is the most common cause of a query that
returns zero rows and gets read as a real finding.

---

## System changes and schema drift

Service request systems get replaced, and field names rarely survive the
migration. Budget datasets roll their column names forward each cycle.
Department names are recorded inconsistently across datasets in almost every
jurisdiction.

Three rules follow:

1. **Confirm the schema for each resource you touch**, not once per session.
2. **When a system was replaced mid-period, query each era separately and
   reconcile.** Do not join across a migration and report a single trend line
   without saying so.
3. **Verify the exact department string before filtering on it.** A department
   filter that silently matches nothing looks identical to a department with no
   cases.

Any known migration dates and field mappings for your jurisdiction belong in
the context file under `service_request_resource_ids`.

---

## Cross-Phase Quality Standards

### Rigor (J-PAL)
Every claim is grounded in data or clearly labeled as interpretation.
Confidence level stated. Limitations named, not buried.

### Human-Centeredness (Bloomberg)
Problem framed around people's lived experience. Recommendations are
implementable by the staff you actually have — check `analytics_function` and
`departments` in the context file before recommending work nobody is resourced
to do.

### Inclusivity (GovLab)
Equity lens applied. Plain-language versions exist. Feedback mechanisms
included, with a working contact route from the context file.

### Transparency
Data sources cited with IDs and portal URL. Methodology reproducible. Findings
shareable as open knowledge.

---

## Supporting Files in This Skill Set

| File | Purpose |
|------|---------|
| `context.template.yml` | The blank template. Copy to `context.yml` and fill it in first — every jurisdiction-specific value the skill needs |
| `Problem_Framing_Skill.md` | Bloomberg methodology: scope, stakeholders, assumptions |
| `Analytical_Skill.md` | J-PAL methodology: descriptive → diagnostic → equity |
| `Communication_Skill.md` | GovLab/InnovateUS: memos, briefs, dashboards, engagement |
| `Benchmarking_Skill.md` | Cross-jurisdiction comparison; includes Performance Management Benchmarking module |
| `TEMPLATES.md` | Fill-in-the-blank templates for 6 output types |
| `CHECKLISTS.md` | Pre-flight and review checklists for all phases |
| `PROMPTS.md` | Example prompts organized by phase and complexity |
| `REFERENCE.md` | How to build and maintain your dataset directory |
| `Performance_Management_Skill.md` | Results for America / PerformanceStat: budget × staffing × outcomes efficiency analysis |
| `EXAMPLE-service-equity.md` | Complete worked example: service request response equity analysis |

---

## When Creating Documents

- Word docs (.docx): also read the `docx` skill
- Presentations (.pptx): also read the `pptx` skill
- Spreadsheets (.xlsx): also read the `xlsx` skill
- Dashboards (React/HTML): also read the frontend design skill available in
  your environment

Skill paths differ by environment; locate them rather than assuming a fixed path.
