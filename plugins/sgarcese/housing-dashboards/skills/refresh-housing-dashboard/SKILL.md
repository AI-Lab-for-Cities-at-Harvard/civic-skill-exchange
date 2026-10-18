---
name: refresh-housing-dashboard
description: "Refreshes an existing housing dashboard made by build-housing-dashboard with the latest federal data releases (new ACS year, monthly BLS prices and jobs, annual QCEW and OEWS, HUD portfolio and Fair Market Rent updates), reports what changed, rewrites affected findings and republishes to the same link. Use when someone asks to update or refresh a housing dashboard, add the new ACS or new FMRs, or rerun it for the latest month."
license: MIT
compatibility: >
  U.S. cities and counties; a state works with fewer comparisons. Reuses build-housing-dashboard's scripts and run folder, so both must be installed together. The fallback scripts need your own credentials: a contact email for BLS (BLS_CONTACT_EMAIL), and API keys (BLS_API_KEY, CENSUS_API_KEY) for anything beyond light use. The plugin ships none.
metadata:
  civic.category: data-analysis
  civic.category-secondary: planning-land-use
  civic.scope: municipal
  civic.scope-secondary: regional
  civic.language: en
  civic.localization: generalized
  civic.data-sensitivity: none
  civic.human-review: advisory-only
---

# Refresh a housing dashboard

This skill reuses the build skill's scripts and references. Find them in the sibling folder `../build-housing-dashboard/` relative to this skill's base directory. Read that skill's `SKILL.md` and `references/data-recipes.md` before pulling.

## 1. Find the run
- Look for `housing-runs/<slug>/config.json` in the user's project or connected folder, or the working directory. If there are several, ask the user which one.
- If the dashboard was published (for example as a Claude artifact), find its URL with the host's publishing tool or ask the user, so the republish can update it in place. Otherwise overwrite the HTML file in the run folder.
- Copy `build/dashboard_data.json` to `build/previous.json` and `build/findings.json` to `build/findings.previous.json`.

## 2. Decide what to re-pull
Use today's date and this calendar. Re-pull only what can have changed since the run's `built` date, unless the user asks for everything.

| Source | New data appears | Action |
|---|---|---|
| ACS 5-year | December | delete the `acs` block in config.json, run `config.py check` (recomputes vintages), re-pull census + trend |
| ACS 1-year | mid-September | same; trend only if 5-year unchanged |
| PPI, CES, LAUS, CPI | monthly (CPI/PPI mid-month, LAUS ~5 weeks after) | `pull_bls.py <run> api` |
| QCEW annual averages | ~September for the prior year | `pull_bls.py <run> qcew` |
| OEWS | April–May | `pull_bls.py <run> oews` |
| HUD multifamily, public housing, PHAs, vouchers | monthly to quarterly | HUD pull (all six keys) |
| HUD Fair Market Rents | new fiscal year Oct 1 (published Aug–Sep) | HUD `fmr` key |
| LIHTC database | annually (spring) | HUD `lihtc` key |

When a year of the ACS is released, the comparison period moves too (latest−5), so the whole demand section changes.

## 3. Rebuild and compare
1. `python3 <build_dir>/scripts/build_data.py <run>`
2. `python3 <build_dir>/scripts/compare_runs.py <run>/build/previous.json <run>/build/dashboard_data.json` lists changed headline numbers.
3. `python3 <build_dir>/scripts/digest.py <run>`, then update `build/findings.json`. Rewrite only the findings whose numbers changed or that no longer lead; keep the rest. Follow the build skill's `references/findings.md`.
4. `python3 <build_dir>/scripts/render.py <run>`, look once at the page, then republish to the same URL (keep the title) or replace the HTML file.

## 4. Report
Reply with what changed: the data releases picked up, the 3–5 biggest movements from `compare_runs.py` in plain language, and any source that failed or is still pending (e.g. "2025 1-year ACS not yet released").
