# Civic Analytics Skills for Claude

> **Evidence-based public policy analysis, powered by Claude and live open government data.**

A set of Claude Skills that guide analysts through rigorous, equity-focused
policy work — from scoping a problem to publishing findings. Built on
established public innovation methodologies and connected to your jurisdiction's
open data via Model Context Protocol (MCP).

The skills are jurisdiction-neutral. Everything specific to one place — dataset
identifiers, field names, office titles, fiscal calendar, geographic units,
peer set — lives in a single context file you fill in.

---

## What This Is

Analysts spend too much time wrestling with data portals and too little time
asking the right questions. These skills flip that equation.

Each skill encodes a proven methodology and handles the mechanics of data
discovery, querying, and quality control — so analysts can focus on judgment,
equity, and communication. Claude acts as an expert collaborator who knows the
methods, knows the audience, and knows to check the schema before believing a
number.

---

## The Five-Phase Framework

| Phase | Skill File | Methodology | Core Question |
|-------|-----------|-------------|--------------|
| **1. Frame** | `Problem_Framing_Skill.md` | Bloomberg Centers (JHU & HKS) | Are we solving the right problem? |
| **2. Analyze** | `Analytical_Skill.md` | J-PAL at MIT | What does the evidence actually show? |
| **3. Communicate** | `Communication_Skill.md` | The GovLab (NYU & Northeastern) | Who needs to know what, in what format? |
| **4. Benchmark** | `Benchmarking_Skill.md` | Cross-jurisdiction comparison | Is this our problem, or every jurisdiction's? |
| **5. Perform** | `Performance_Management_Skill.md` | Results for America / PerformanceStat | Are we getting results for our investment? |

The master orchestrator (`SKILL.md`) routes automatically between phases based
on your request. You can run a single phase or the full workflow end-to-end.

---

## Source Methodologies

**Bloomberg Centers for Public Innovation** — *Johns Hopkins University & Harvard Kennedy School*
Problem framing, stakeholder mapping, assumption interrogation, human-centered scoping. Prevents the most common public innovation failure: solving the wrong problem well.

**J-PAL — Abdul Latif Jameel Poverty Action Lab at MIT**
Five levels of evidence — descriptive, diagnostic, equity, counterfactual, synthesis — with explicit claim-strength labeling. Ensures analysts never overstate what administrative data can prove.

**The GovLab — New York University & Northeastern University**
Data collaboratives, collective intelligence, consequential engagement, democratic legitimacy. Translates analysis into formats that create real civic action.

**InnovateUS**
Accessible public communication, co-design methodology, plain-language standards. Bridges the gap between expert findings and community understanding.

**Results for America / PerformanceStat (CitiStat)**
Budget × staffing × service outcomes. Connects actual expenditures and employee headcount to delivered results. Surfaces cost-per-outcome, workload-per-FTE, and multi-year efficiency trends to ground investment decisions in evidence.

---

## Setup

### 1. Fill in the context file

Copy `context.template.yml` to `context.yml` beside it, and fill in every
`TODO`. The skills read `context.yml`; the template stays blank.

`context.yml` is gitignored, and that is deliberate: a skill that ships with one
jurisdiction's values baked in is that jurisdiction's skill with extra steps.
Fill in your copy, keep it out of anything you publish, and the skill stays
portable for whoever you pass it to.

This is the whole setup. The skills read the context before their first tool
call and will stop rather than guess at a missing value.

What it asks for:

- Your open data portal, MCP server name, and its four core tool names
- Dataset identifiers and resource IDs for service requests, population,
  budget, actual spending, payroll, permits, code enforcement and public safety
- The field names your workflows filter and sort on
- Your geographic unit — neighborhood, ward, district, borough — and every unit
  with its population
- Your fiscal calendar
- Who holds which authority: chief executive, legislative body, department heads
- The languages public-facing materials must be published in
- Your benchmarking peers, with their portals, platforms, populations and
  comparability cautions

### 2. Connect your MCP data sources

Add your open data MCP server and any peer jurisdiction servers to your Claude
environment. See your Claude configuration for MCP setup instructions.

### 3. Add the skills to Claude

Add the `.md` files and the filled context file to your Claude project. The
master orchestrator in `SKILL.md` routes to sub-skills automatically.

### 4. Start analyzing

```
# Full end-to-end workflow
"Investigate whether our service request response times are equitable across
areas. Frame the problem, analyze the data, compare to a peer, and write a
brief for leadership."

# Single-phase analysis
"Analyze building permit approval times by area for last year.
Flag any equity concerns."

# Cross-jurisdiction benchmark
"Compare us against our peer set on service request closure rates.
What can we learn from the better performers?"

# Performance management
"What is our cost per resolved service request in [department] for the last
fiscal year? How does workload per employee compare to our peers?"

# Communication package
"Write a 1-page memo for leadership AND a community fact sheet for [area]
residents from the same equity analysis."
```

More prompts in [`PROMPTS.md`](PROMPTS.md), organized from simple to expert-level.

---

## Scope

This skill set assumes a **US local government**: 311-style non-emergency
service requests, ZIP codes, UCR/NIBRS crime classification, and US
plain-language reading conventions. Adopters outside the US will need to adapt
those conventions, not merely fill in the context file.

Within the US it is designed to travel: the offices, fiscal calendar, geographic
units and departmental structure are all context values, so a council-manager
town of eight thousand and a strong-mayor city of a million can both use it. If
a step assumes an office you don't have, the context file is where you say who
does that work instead — "the clerk, as one of nine duties" is a valid answer.

---

## Repository Structure

```
.
├── SKILL.md                         # Master orchestrator — start here
├── context.template.yml             # Copy to context.yml and fill in first
├── Problem_Framing_Skill.md         # Phase 1: Bloomberg methodology
├── Analytical_Skill.md              # Phase 2: J-PAL evidence framework
├── Communication_Skill.md           # Phase 3: GovLab/InnovateUS methods
├── Benchmarking_Skill.md            # Phase 4: Cross-jurisdiction comparison
├── Performance_Management_Skill.md  # Phase 5: Results for America / PerformanceStat
├── TEMPLATES.md                     # 6 fill-in-the-blank output formats
├── CHECKLISTS.md                    # Pre-flight & review checklists
├── PROMPTS.md                       # Example prompts by complexity
├── REFERENCE.md                     # How to build and maintain your dataset catalog
└── EXAMPLE-service-equity.md        # Complete worked example end-to-end
```

---

## Design Principles

**Rigorous** — Every claim carries a confidence level. Limitations are stated, not buried. Administrative data rarely proves causation; these skills say so explicitly.

**Human-centered** — Problems are framed around residents' lived experience. Success is measured by resident outcomes, not bureaucratic process metrics.

**Equity-focused** — Every analysis asks who benefits and who is burdened. Asset-based framing is required. Geographic proxies are noted alongside their limits.

**Transparent** — Data sources are cited with resource IDs. Methodology is reproducible. Findings are structured for open sharing.

**Actionable** — Communication is designed to create action, not just awareness. Recommendations specify who, what, and when — and are checked against the capacity that actually exists.

---

## A Note on Schema Drift

Service request systems get replaced. Budget datasets rename their columns each
cycle. Department names are recorded inconsistently across datasets almost
everywhere.

These skills therefore require confirming the schema before every query, treat a
zero-row result as a possible filter error rather than a finding, and refuse to
join across a system migration without disclosing it. Record your own
transitions and field mappings in the context file — see
[`REFERENCE.md`](REFERENCE.md).

---

## License

MIT License — open source, public domain data.

---

*Built with Claude · Methodologies from Bloomberg Centers, J-PAL, The GovLab, InnovateUS, and Results for America*
