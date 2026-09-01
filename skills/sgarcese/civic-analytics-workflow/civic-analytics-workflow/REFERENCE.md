---
name: open-data-reference
description: "How to build and maintain the dataset directory for your jurisdiction and your benchmarking peers: what to catalog, how to record field names and schema changes, and how to plan cross-dataset and cross-jurisdiction joins. Consult before any analysis to identify available data and plan joins."
---

# Open Data Reference Guide

The dataset directory for your jurisdiction lives in your `context.yml`, not
in this file. A catalog of dataset IDs baked into a skill goes stale the first
time a portal republishes; a catalog in a context file is the one thing an
adopter is expected to maintain.

This file covers **how to build and keep that catalog**, and the traps that
consume the most analyst time.

---

## Building the Directory

For each domain your work touches, record in the context file:

- **Dataset identifier or slug** — what discovery returns
- **Queryable resource ID** — what querying needs. These are different things on
  most platforms, and the second is not guessable from the first
- **Coverage period** — many portals split a long-running dataset by year, each
  with its own resource ID
- **Update cadence** — a dataset refreshed annually cannot answer a question
  about last month
- **Known field names** — for the fields your workflows actually filter and sort on

Domains worth cataloging, in rough order of how often they come up: service
requests, population and demographics, budget and actual spending, payroll,
building permits, code enforcement, public safety, transportation, environment,
digital access.

### Discovery sequence

```
1. Search datasets by topic     → find dataset IDs
2. Get dataset info             → find queryable resource IDs + metadata
3. Get schema                   → get EXACT field names + types (NEVER skip)
4. Query                        → retrieve records
```

Step 3 is not optional and not cacheable across resources. Two years of the same
dataset routinely carry different field names.

---

## Recording Schema Changes

Service request systems get replaced. CRM vendors change. Budget datasets rename
their columns every cycle. When that happens in your jurisdiction:

1. **Record the transition date** in the context file alongside the resource IDs
2. **Record the field mapping** — old name to new name, for every field your
   workflows use
3. **Query each era separately.** Do not join across the transition and report a
   single trend line without saying that you did
4. **Say so in the output.** A performance trend that spans a system replacement
   is partly measuring the replacement, and a reader who is not told this will
   read it as a change in service delivery

The same discipline applies to definitional changes without a system change: a
revised service-level target, a redrawn district boundary, or a
crime-classification transition (UCR to NIBRS) each break comparability across
the date they took effect.

---

## Cross-Referencing Strategy

### Geographic joins

Most datasets carry the geographic unit as a **text field**, which makes it the
primary join key and the primary source of silent failure.

```
# Per-capita rate calculation
# Step 1: Count records by geographic unit in the primary dataset
query(primary_id, filters={"{{geographic_unit_field}}": "[area]"}, limit=5)
# note total_count from the response, not the number of rows returned

# Step 2: Get population for that unit
query([population resource id], limit=[number of units])

# Step 3: rate = count / population × {{rate_denominator}}
```

⚠️ **Verify the exact strings before filtering.** Area names vary across
datasets within one jurisdiction — an area known by two names, a district
renamed after redistricting, a label with or without a qualifier. A filter that
matches nothing returns zero rows, and zero rows read exactly like a real
finding of zero. List the distinct values first:

```
query(resource_id, fields=["{{geographic_unit_field}}"], limit=100)
```

Known naming variations for your jurisdiction belong in the context file under
`geographic_units`.

### Department joins

The same trap, worse. Department names are recorded inconsistently across
datasets almost everywhere — an abbreviation in one, the full legal name in
another, a former name in a third. The context file's `departments` entry exists
to hold every string each department appears as. Confirm against schema before
filtering, every time.

---

## Peer Jurisdiction Data

Record the same catalog for each peer in `comparators.peer_jurisdictions`, plus:

- **Platform** — Socrata, CKAN, ArcGIS or other. Determines query syntax and
  field naming conventions
- **MCP server name** — as configured in your environment
- **Portal URL** — for citation
- **Comparability strengths and cautions** — the qualifications that must travel
  with every number you take from that peer

Discovery search terms that generally work across peers:

| Topic | Search terms |
|-------|-------------|
| Service requests | "311 cases", "service requests", "customer service requests" |
| Building permits | "building permits", "permits issued", "construction permits" |
| Crime | "police incidents", "crime data", "crime incidents" |
| Budget / spending | "budget", "expenditure", "agency spending", "checkbook" |
| Payroll / staffing | "employee compensation", "payroll", "salaries", "employee wages" |
| Demographics | "census", "population", "demographics" |
| Transportation | "transportation", "traffic counts", "road inventory", "pavement condition", "transit", "bike share" |

Search by **function, not by brand.** Bike share systems, service request apps
and permitting portals are branded differently in every jurisdiction, and a
brand-name search finds nothing where the brand differs.

---

## Data Quality Notes

These hold across jurisdictions and are worth restating in any published output:

- **Service request reporting bias:** usage varies by area, age, language and
  digital access. High volume means high reporting, not necessarily more
  problems — and low volume in a low-access area may mean the measured
  disparity understates the real one
- **Crime data:** reflects reported and recorded incidents. Reporting rates vary
  by offense type and by community-police relationships. Classification-standard
  transitions break year-over-year comparability
- **Building permits:** formal system only; unpermitted work is not captured
- **Population estimates:** local estimates and federal census figures often
  disagree, sometimes deliberately where local estimates correct for undercounts.
  Say which you used
- **Geographic assignment:** some records are geocoded incorrectly. Check outliers
- **Payroll as headcount:** counts people paid in a period, not authorized
  positions
- **Cross-jurisdiction comparability:** collection practices, definitions and
  completeness differ. Document every assumption in any comparison
