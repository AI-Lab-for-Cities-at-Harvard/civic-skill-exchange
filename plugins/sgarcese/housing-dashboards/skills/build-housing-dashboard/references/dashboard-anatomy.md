# Dashboard anatomy

The page is `assets/template.html` (layout, CSS tokens for light and dark themes) + `assets/app.js` (all charts, vanilla JS/SVG, no libraries) + the embedded `dashboard_data.json`. Fonts: system fonts only, so the page downloads nothing and carries no font license — a condensed grotesque for display (Avenir Next Condensed, Helvetica Neue, Roboto Condensed, Arial Narrow) and the platform's UI sans for body text. Keep it that way: no web fonts and no font CDN.

Color roles are fixed across the page. Focus = blue (`--s1`), home county = orange (`--s2`), state = aqua (`--s3`), U.S. = gray (`--bench`), other ring members = muted gray-blue (`--other`). Program colors in the assisted section reuse the categorical order. The focus and home county rows are bold. Separator gaps sit before the first county and before the state.

| Section | Panel | Data key | Hidden when |
|---|---|---|---|
| Overview | KPI strip (households, rent, value, rent burden, PPI inputs, assisted rentals) | demand, econ.ppi, hud.counties | KPI omitted if its source is missing |
| Overview | 4 findings | findings.overview | no findings |
| Demand | Rents / values / income, year by year (toggle) | trend | no 1-year geos (all under 65k) |
| Demand | Share of households renting (dumbbell, prior vs latest 5-year) | demand | — |
| Demand | Householders by age and tenure (pyramid, focus only) | demand.age_* | — |
| Demand | Renters paying 30%+ (stacked 30–49.9 / 50+, MOE whisker) | demand | — |
| Demand | Homeownership by race/ethnicity (dot plot) | demand.own_rate_* | groups <300 households dropped |
| Demand | Age of housing stock; type of housing (100% bars) | demand.year_built, structure | — |
| Economy | Material costs vs construction pay vs CPI (index) | econ.cost_vs_wage | no BLS |
| Economy | Housing wage vs metro median wage | hud.fmr + econ.oews | no FMR |
| Economy | 13 PPI small multiples | econ.ppi | no BLS |
| Economy | Building construction employment index (QCEW 236) | econ.qcew | no QCEW |
| Economy | Construction vs all-private weekly wage | econ.qcew | no QCEW |
| Economy | Trades wage table (OEWS) | econ.oews | no OEWS |
| Economy | Labor table (CES, LAUS) + CPI note | econ.ces, laus, cpi | no BLS |
| Assisted | Units per 1,000 renters by program + LIHTC row | hud.counties | no HUD |
| Assisted | Expiring contracts (next years, first 5 highlighted) | hud.mf | no HUD |
| Assisted | Property map | geo + hud points | no HUD or no Node |
| Assisted | LIHTC production by 5-year period | hud.lihtc | no HUD |
| Assisted | PHA table with PHAS designation pills | hud.phas | no HUD |
| Assisted | Multifamily property table (home county) | hud.mf | no HUD |
| Compare | 14-indicator table, all geos, MOEs for cities, change vs prior | demand | — |
| Methods | Sources with retrieval dates, geography, ACS, economy, assisted notes, `config.notes` | sources, notes | — |

## Customizing
- Wording of panel titles/subtitles lives in `template.html`; place names and vintages are filled by `render.py` placeholders (`{{FOCUS}}`, `{{HOME}}`, `{{L5}}`, `{{P5}}`, `{{QY}}`, `{{OY}}` …).
- To add a panel: compute its data in `build_data.py`, add a `<div data-need="…" class="panel">` in the template, and a `draw…()` function in `app.js` called from `drawAll()`.
- Keep the page self-contained (no external scripts). It must stay under a few hundred KB and must not scroll sideways at 400px.
