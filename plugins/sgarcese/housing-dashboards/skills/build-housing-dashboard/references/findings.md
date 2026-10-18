# Writing findings

Findings are the only prose the assistant writes for the dashboard. The numbers come from `digest.py`. Findings pick the few that matter and say them plainly.

## File format: build/findings.json
```json
{
 "lede": "optional replacement for the masthead paragraph (1–2 sentences)",
 "overview": [{"head": "+2,714 households", "body": "South Bend grew by 2,714 households while population rose 1,048. Nearly all of the gain was owners (+2,804); renter households were flat."}],
 "demand": [...], "economy": [...], "assisted": [...]
}
```
- `overview`: exactly 4, one per component plus the single most important cross-cutting fact (the housing wage vs median wage is usually it).
- `demand`: 4–5; `economy`: 4; `assisted`: 4. Omit a section's list if its data is missing, and the page hides it.

## Headline (`head`)
- Lead with the number: "+64.8% home value", "$24.85/hr housing wage", "17 per 100 renters", "678 units".
- 2–5 words. No verbs needed. Use the same units and rounding as the charts.

## Body
- One or two sentences, under 45 words. Say what the number is, for which place and period, and give one comparison (county, ring, state or U.S.) that makes it meaningful.
- Plain words: "renters paying half their income or more on rent", not "severely cost-burdened renter households" (use the technical term once in a chart subtitle, not in findings).
- Direct and specific, no hedging filler, no adjectives like "alarming" or "notable". Let the comparison carry the weight.
- Name the period for ACS figures when it matters ("2020–2024"), and say "since January 2020" for PPI.

## What to look for (in order of usefulness)
**Demand**
- Household growth vs population growth (household formation), and whether the gain was owners or renters.
- Renter share now vs prior period, and against county/state.
- Rent and value growth vs income growth (use renter median income for rent, all-household income for value).
- Share of renters paying 30%+ and 50%+; renter vs owner median income gap.
- Homeownership gap by race/ethnicity (only groups with 300+ households; the build already suppresses smaller ones).
- Old stock (pre-1940 share) and "other vacant" share vs state: signs of disinvestment in older cities.
- Rental vacancy below ~5% signals a tight market; above ~10% a soft one. Check the MOE for small places before saying either.

**Economy**
- PPI residential inputs since Jan 2020 and y/y; the one or two materials with the biggest moves. Say "new high" when `from_peak` is 0.0.
- Construction wages (U.S. hourly earnings index) vs input costs vs CPI.
- County building-construction employment change (NAICS 236) vs state and U.S.; location quotient below 0.8 = fewer builders than the county's size predicts.
- Metro construction jobs (CES) over the year and vs 2019.
- Housing wage vs metro median wage (the bridge to the demand section).

**Assisted housing**
- Total assisted households in the home county and per 100 renter households, ranked against the ring.
- Program mix: voucher-heavy vs project-based vs LIHTC-heavy, compared with ring counties.
- Units whose project-based contracts expire within five years (preservation risk).
- Elderly/disabled share of project-based units; recent LIHTC production (last 10 years).
- PHA designations: call out Troubled or Substandard authorities by name.

## Checks before rendering
- Every number in a finding appears in the digest (or is a subtraction/percentage of two digest numbers, computed in Python, not by hand).
- Signs and directions are right (a falling renter share is "fell", not "shifted").
- Voucher counts are described as "at least" or given a "+" (tract floors).
- No finding relies on a low-reliability estimate without saying so.
