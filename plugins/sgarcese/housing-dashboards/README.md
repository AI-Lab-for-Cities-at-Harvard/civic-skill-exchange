# housing-dashboards

Builds housing dashboards and briefs for any U.S. city or county from federal open data. The reference build is the South Bend, IN dashboard.

## Skills
| Skill | Use it for |
|---|---|
| **build-housing-dashboard** | "Build a housing dashboard for Fort Wayne." Picks the comparison region, pulls Census, BLS and HUD data, writes findings and publishes an interactive dashboard. |
| **refresh-housing-dashboard** | "Refresh the South Bend dashboard." Re-pulls new releases, lists what changed, updates findings and republishes to the same link. |
| **housing-brief** | "Write a housing memo for Elkhart County's council." Recommendations first, backed by the same data. |

## What the dashboard covers
1. **Demand** (ACS 5-year and 1-year): households, tenure, incomes, rents and values, cost burden, age by tenure, homeownership by race/ethnicity, housing stock, vacancy.
2. **Construction economy** (BLS): PPI construction materials, QCEW construction jobs and wages, CES metro construction jobs, OEWS trade wages, LAUS unemployment, CPI shelter, the housing wage.
3. **Assisted housing** (HUD): project-based Section 8, Section 202/811, public housing, Housing Choice Vouchers, LIHTC, PHAs, Fair Market Rents, expiring contracts and a property map.

## Connectors
The plugin installs five hosted MCP servers (`.mcp.json`):

| Server | URL | Used for |
|---|---|---|
| census | https://census-mcp.responsive.city/mcp | ACS snapshot and trend pulls (`census_get_raw`), place resolution |
| bls | https://bls-mcp.responsive.city/mcp | PPI, CES, LAUS, CPI, QCEW and OEWS (`bls_get_raw`, `bls_get_indicator`) |
| hud | https://hud.responsive.city/mcp | HUD Open Data on ArcGIS Hub: multifamily, LIHTC, public housing, PHAs and vouchers by tract (`arcgis__query_data`, `arcgis__aggregate_data`) |
| hud-user | https://hud-user.responsive.city/mcp | Fair Market Rents, Income Limits, CHAS, Picture of Subsidized Households |
| geo | https://geo-mcp.responsive.city/mcp | Place resolution and county/metro containment |

When the underlying hosts are reachable (api.census.gov, services.arcgis.com, api.bls.gov, www.bls.gov), bundled scripts pull directly and much faster.

> **The fallback scripts need your own credentials.** `pull_bls.py` and `pull_census.py` call the agencies' APIs directly, so they use your accounts, not the plugin's: set `BLS_CONTACT_EMAIL` (BLS refuses downloads without one), and `BLS_API_KEY` and `CENSUS_API_KEY` for anything beyond light use — without keys both APIs answer smaller, slower requests. The plugin ships no keys and never writes them into a run folder. The MCP servers above need none.

## Claude and Codex
One package installs in both hosts. `.claude-plugin/plugin.json` (Claude) and `.codex-plugin/plugin.json` (Codex compatibility layout) share the same skills and `.mcp.json`; keep `name`, `version` and `description` identical in both when releasing. The skills name host tools generically (question tool, publishing tool, subagents) and fall back to plain files when a host lacks them.

## Maintainer
Santiago Garcés, AI Lab for Cities.

## Requirements
Python 3.9+ (`openpyxl` for OEWS wages). Node 18+ with npm for the map (the us-atlas county boundaries are installed once into `~/.cache/housing-dashboards`). Panels whose data is unavailable are hidden and noted.

## Output
Each run lives in `housing-runs/<slug>/` (config, raw data, build files, HTML) so it can be refreshed or turned into a brief later.

## License
MIT License

Copyright (c) 2026 Santiago Garcés

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
