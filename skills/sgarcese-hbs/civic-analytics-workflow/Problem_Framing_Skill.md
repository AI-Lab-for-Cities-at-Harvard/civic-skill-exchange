---
name: civic-problem-framing
description: "Use this skill when the user needs to define, scope, or reframe a local government problem before diving into data analysis. ALWAYS trigger before any data analysis begins when the problem is vague, broad, or solution-first. Inspired by the Bloomberg Center for Public Innovation (JHU) Path to Public Innovation methodology, Bloomberg Center for Government Excellence (GovEx), and the Bloomberg Center for Cities (HKS). Triggers include: 'help me define the problem', 'what data do we have on', 'scope this project', 'frame the question', 'where do I start', 'what should we be asking', 'I want to improve [public service]', requests to explore what data exists on a topic, or any situation where the user appears to be jumping to solutions before understanding the problem. Also use when the user is stuck, overwhelmed by a broad challenge, or when a stated problem sounds like a predetermined solution ('we need an app for...')."
---

# Problem Framing — Bloomberg Public Innovation Methodology

> Read the filled `context.yml` before the first tool call. Dataset
> identifiers, field names, geographic units and office titles all come from it.

## Core Principle

**Define the right problem before solving it.** Jurisdictions that invest in
rigorous problem framing before solution design consistently produce better
outcomes for residents. This skill prevents the most common public innovation
failure: solving the wrong problem well.

---

## Step 1: Resist the Urge to Query Data Immediately

Before touching any MCP tool, work through these questions:

**Domain:** What broad area is this? (housing, safety, transportation,
environment, health, economic opportunity, equity, public services, education,
infrastructure)

**Trigger:** What set this off? (resident complaint, data anomaly, leadership
priority, crisis, opportunity, budget cycle)

**Scope check:**
- Jurisdiction-wide or specific to one area?
- Specific population or universal?
- Acute crisis or chronic condition?
- One department or cross-cutting?

**Assumption check — ask these explicitly:**
- Is the stated problem the actual problem, or a symptom?
- Who defined this problem? From whose perspective?
- What would affected residents say the problem is?
- Are we starting from a predetermined solution? (If yes → step back)

---

## Step 2: Map the Stakeholder Ecosystem

| Stakeholder | Key Question |
|-------------|-------------|
| **Residents affected** | Who experiences this problem daily? Who is most impacted and least heard? |
| **Frontline staff** | Which public employees encounter this? What patterns do they see that data doesn't capture? |
| **Decision-makers** | Who has authority to change policy, allocate resources, or approve action? |
| **Cross-agency partners** | Which departments touch this issue? Where do handoffs break down? |
| **Community organizations** | Who is already working on this outside government? |

For the decision-maker row, the context file matters: `executive_official`,
`legislative_body` and `department_head_title` tell you who actually holds the
authority in question, and whether it is one office or shared. A recommendation
routed to the wrong office dies quietly.

**Equity mapping (never skip):**
- Which communities bear disproportionate burden?
- Whose voices are typically absent from this conversation?
- What historical patterns of investment or disinvestment are relevant?
- Are there language, access, or trust barriers to engagement? (See
  `translation_languages` and `digital_access_dataset` in the context file.)

---

## Step 3: Data Discovery

Goal: understand what evidence is available — **not analysis yet**.

```
Step 1: Broad search
→ search datasets by topic keywords
  Try several queries; datasets may be categorized differently than expected

Step 2: Examine candidates
→ get dataset info
  Find resource IDs and read the description carefully

Step 3: Inspect structure
→ get schema
  Know exact field names BEFORE writing any analysis queries

Step 4: Sample data
→ query with limit=10, sorted by the date field descending
  Check data quality and relevance

Step 5: Document the landscape
  What exists? What's missing? What can and cannot be answered?
```

Exact tool names are in the context file (`tool_search_datasets`,
`tool_get_dataset_info`, `tool_get_schema`, `tool_query`).

**Datasets by domain.** Your jurisdiction's dataset identifiers live in the
context file. The domains that usually have something published:

| Domain | Context file key |
|--------|------------------|
| Public services / service requests | `service_request_dataset`, `service_request_resource_ids` |
| Public safety | `public_safety_datasets` |
| Housing and development | `permits_dataset`, `additional_datasets.housing` |
| Code enforcement | `code_violations_dataset` |
| Transportation | `additional_datasets.transportation` |
| Environment | `additional_datasets.environment` |
| Demographics | `population_dataset` |
| Digital access | `digital_access_dataset` |

If a domain has no entry, that is itself a finding worth stating: the question
cannot be answered from open data as published, and saying so early is cheaper
than discovering it in Phase 2.

---

## Step 4: Write the Problem Statement

A good problem statement is the foundation of everything. It must be:
- **Human-centered:** Framed around people's experience, not bureaucratic process
- **Specific:** Narrow enough to investigate and act on
- **Measurable:** Connected to observable indicators
- **Honest:** Acknowledges what we don't know

### Template

> **[Affected population]** in **[geographic scope]** experience **[specific problem]**,
> as evidenced by **[data indicator or qualitative observation]**. This matters because
> **[human impact / equity concern]**. Current understanding suggests **[what we think we know]**,
> but we need to investigate **[key unknowns]** before recommending action. Available data from
> **[sources]** can help us understand **[specific questions]**, though we should note that
> **[key data limitations]**.

### Example

The shape to imitate — substitute your own geographic units, service types and
figures:

> Residents in [the affected areas, named] experience disproportionately long service
> request response times for street and sidewalk repair, as evidenced by service
> request data showing median resolution times materially longer than the
> jurisdiction-wide average. This matters because infrastructure maintenance
> affects pedestrian safety, property values, and resident trust in government
> responsiveness. Current understanding suggests staffing allocation may not
> match request volume by area, but we need to investigate seasonal patterns,
> request complexity differences, and crew or contractor availability before
> recommending action. The service request dataset can help us understand
> geographic and temporal patterns, though we should note that service request
> usage rates vary by area and may undercount problems where digital access is
> lower.

Note what the example does: it names a gap without asserting a cause, lists the
alternative explanations it has not ruled out, and states the reporting-bias
limitation in the same breath as the finding.

---

## Step 5: Define Success Criteria

Before moving to analysis, establish what "better" looks like:
- **Outcome metrics:** What would change for residents if this problem improved?
- **Process metrics:** What operational changes would we expect to see?
- **Equity metrics:** How would we know the solution isn't creating new disparities?
- **Timeframe:** Over what period should change occur?
- **Baseline:** Current state we're measuring against?

---

## Anti-Patterns to Catch and Correct

| Anti-Pattern | What It Looks Like | How to Fix |
|-------------|-------------------|------------|
| **Solution-first thinking** | "We need a new app for..." | Step back: what problem would that solve? |
| **Vague scoping** | "We need to fix housing" | Narrow: which aspect? For whom? Where? |
| **Data-free assertions** | "Everyone knows that..." | Ask: what does the data actually show? |
| **Single-perspective framing** | Problem defined only by leadership | Ask: what would affected residents say? |
| **Ignoring history** | "Let's try something new" | Ask: what's been tried? What happened? |
| **Equity blindness** | Analysis without distributional lens | Ask: who benefits and who is burdened? |
| **Capacity blindness** | Recommending work no one is staffed to do | Check `analytics_function` and `departments` before promising a workstream |

---

## Handoff to Analysis Phase

Pass these to `Analytical_Skill.md`:
1. ✅ Written problem statement (human-centered, specific, measurable, honest)
2. ✅ Stakeholder map with equity dimensions
3. ✅ Identified datasets with resource IDs
4. ✅ Confirmed field names from schema inspection
5. ✅ Specific analytical questions the data can answer
6. ✅ Known data limitations
7. ✅ Success criteria for evaluating recommendations

## Bloomberg Core Principles

1. **Resident outcomes are the north star** — Connect analysis to how people experience public services
2. **Cross-agency thinking** — Most public problems don't respect departmental boundaries
3. **Inclusive design** — Affected people have essential knowledge
4. **Test and learn** — Frame problems to allow piloting and iteration
5. **Data as foundation, not decoration** — Use data to understand, not justify predetermined conclusions
