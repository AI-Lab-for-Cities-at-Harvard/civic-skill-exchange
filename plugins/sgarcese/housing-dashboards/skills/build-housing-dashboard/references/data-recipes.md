# Data recipes

Every pull writes raw files into the run folder. The same assemble/build scripts read them whether they came from a script or a connector.

```
<run>/
  config.json
  data/census/raw/a<year>_*.json, t<year>.json   -> assemble_census.py -> acs5_snapshot.json, acs1_trend.json
  data/hud/raw/<key>.json  (mf, lihtc, phd, pha, hcv, fmr)
  data/bls/bls_timeseries.json, qcew.json, oews.json
  build/dashboard_data.json, findings.json
  <slug>.html
```

## Census (ACS)

**Plan:** `config.py plan <run> census` lists 6 calls: 4 for the latest 5-year vintage (estimates + MOEs) and 2 for the prior vintage (estimates only). Every call covers all geographies at once through a comma-separated `ucgid` list. `config.py plan <run> trend` lists one call per 1-year vintage for the geographies of 65,000+ people.

**Connector path:** for each plan entry call `census_get_raw` with `dataset`, `year`, `ids`, `ucgid` exactly as planned. Save the **entire JSON response** unchanged to `data/<file>`. `assemble_census.py` accepts the connector envelope (`data.header`, `data.rows`, `source.ids`), a `{"url","header","rows"}` object, or a bare API array. Do not reformat, reorder or round anything.

**Direct path:** `pull_census.py <run> census|trend`. An optional `CENSUS_API_KEY` raises rate limits.

**Annotations:** negative sentinel values (-666666666, -555555555, …) become null. -555555555 on population MOEs just means "controlled estimate" and is normal for counties and states.

**Variables used** (all in `config.py`): B01003, B01002, B11001, B25001–B25004 (units, occupancy, vacancy status), B25003/B25003H/B/I (tenure, total and by race/ethnicity of householder), B19013, B25119 (income by tenure), B25064, B25077, B25088, B25070 (rent burden), B25091 (owner burden), B25007 (tenure by age), B25010, B17001, B25014 (crowding), B25024 (units in structure), B25034 (year built; `_004` is 2000–2009 in every recent vintage, so the grouping is stable).

## HUD open data (ArcGIS)

`config.py plan <run> hud` returns six queries with dataset id, service URL, `where` and `out_fields`:

| key | dataset | Hub id | filter |
|---|---|---|---|
| mf | Multifamily Properties – Assisted (Section 8 PBRA, 202, 811, RAD) | f4721da932a94b218bdb5a861fd7429e | COUNTY_LEVEL IN (…) |
| lihtc | LIHTC properties | 810ccb34dd464ec4ad4697d35fff21a5 | COUNTY_LEVEL IN (…) |
| phd | Public Housing Developments | 5c96143f79c940a0a8cedae99a1ac562 | COUNTY_LEVEL IN (…) |
| pha | Public Housing Authorities | 3d6ef39026b94eb59ddb7ce28eb0b692 | COUNTY_LEVEL IN (…) |
| hcv | Housing Choice Vouchers by Tract | 8d45c34f7f64433586ef6a448d00ca12 | GEOID LIKE '<county fips>%' |
| fmr | Fair Market Rents | 12d2516901f947b5bb4da4e780e35f07 | FMR_CODE LIKE 'METRO<cbsa>%' or 'NCNTY<fips>%' |

**Connector path (HUD Open Data, the `hud` server's `arcgis__query_data`):** the tool reports "Returned N record(s)" but prints only the first 10 records. For each dataset:
1. Call `arcgis__query_data` with the dataset's id as `dataset_id`, and the planned `where`, `out_fields` (always includes OBJECTID) and `limit: 1000`. Note N.
2. Save the printed output verbatim to `data/hud/raw/<key>_p01.txt`.
3. Take the largest OBJECTID on the page and call again with `<where> AND OBJECTID > <that id>`, wrapping the original clause in parentheses when it contains OR. Save as `_p02.txt`, and so on until you have N records. Records come back in ascending OBJECTID order.
4. Run `hud_parse.py <run> <key> <N>`. It must print `ok`. A mismatch means a page is missing.
Keep `out_fields` exactly as planned, because longer field lists make each page heavier. A ring of 5 mid-size counties is roughly 8 pages for mf, 11 for lihtc, 3 for phd, 1 for pha, 23 for hcv and 1 for fmr. Use a subagent.

**Direct path:** `pull_hud.py <run>` (needs services.arcgis.com). It pages with resultOffset.

**Quirks:**
- County codes: the LIHTC layer drops leading zeros (`8031` for Denver County `08031`, places as `820000`); the other layers keep them. The plan queries both spellings and build_data normalizes every `COUNTY_LEVEL` to 5 digits, so states with FIPS below 10 (AL, AK, AZ, AR, CA, CO, CT, DE, DC) work. Keep both spellings if you hand-write a `where`.
- Resident fields use -4 for suppressed values; build_data treats values ≤ 0 as missing.
- REAC scores carry letter suffixes (`97 b`). Keep them as text.
- LIHTC has duplicate project records and `YR_PIS = 8888` for not-yet-placed projects. build_data merges duplicates on name + city and excludes 8888 from counts.
- HCV by tract suppresses counts under 11 (null), so county sums are floors. PHA voucher counts (`SECTION8_UNITS_CNT`) show where vouchers are administered, not where holders live.
- The FMR layer has no fiscal-year field. Values are the current fiscal year as of the layer's modified date; say so in `config.notes` if it matters.
- Small Area FMRs and the Picture of Subsidized Households are not reachable through the connector.

## BLS

**Direct path (preferred):** `BLS_CONTACT_EMAIL=<user email> python3 pull_bls.py <run> all` needs api.bls.gov, data.bls.gov and www.bls.gov. bls.gov blocks anonymous downloads, so always set a contact email (the user's). Without `BLS_API_KEY` the API allows 25 queries/day per IP, and a run uses about 4. When the cloud shell is blocked or out of quota, run it in the user's computer shell (copy `config.py`, `pull_bls.py` and `config.json` there, then bring `data/bls/*.json` back).
- `api`: PPI (national construction inputs and 12 materials), CES construction employment for each metro (tries construction `20000000`, falls back to mining+logging+construction `15000000`; missing variants are expected), state and U.S. construction employment and hourly earnings, LAUS unemployment for every county, city (25k+), state and U.S., and CPI shelter/rent for U.S. and the Census region.
- `qcew`: annual averages for the last 11 years, private ownership, NAICS 10 (total), 23, 236, 2361, 238, for every county, the state and U.S. Disclosure code `N` means suppressed, stored as null.
- `oews`: May estimates for the latest year and six years earlier, for each metro, state and U.S., 14 construction-related occupations plus all occupations. It downloads ~50 MB of zip files and deletes them after parsing.

**Connector fallback (API series only):** call the BLS connector's `bls_get_raw` with batches of series ids from `config.py plan <run> bls` (field `series`) and a start year of 2016. Save each full response to `data/bls/raw/<n>.json`, then run `bls_from_raw.py <run>`. QCEW and OEWS have no bulk connector equivalent. If the direct path is impossible everywhere, skip them; the page hides those panels. Note the gap in `config.notes`.

## Known gaps to state in the methods section
- No building permits (Census BPS), CHAS cost burden by income, or eviction data in this version.
- HUD tract voucher counts are floors; LIHTC's most recent years are incomplete; MF contract expiration is contract 1 only.
- PPI is national; CPI is regional.
