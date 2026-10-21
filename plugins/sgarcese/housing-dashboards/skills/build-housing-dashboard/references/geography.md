# Geography: choosing the comparison set and writing config.json

## Roles

| role | count | what it is | notes |
|---|---|---|---|
| `focus` | 1 | the city (Census place) or county the dashboard is about | a city is `kind: place`, 7-digit id = state FIPS + place code (South Bend = `1871000`) |
| `home_county` | 1 if focus is a place | the county containing most of the focus city | omit when the focus is a county. For a city split across counties, use the county with the largest share in `geo_get_containment` |
| `peer_place` | 0–3 | other principal cities in the region, ideally 25,000+ people | LAUS publishes city unemployment only for 25,000+; set `"laus_city": false` for smaller ones (`geo_resolve_place` flags them `below_threshold`) |
| `ring_county` | 3–6 | counties that share a housing and labor market with the focus | adjacent counties sharing the commute-shed; cross state lines when the market does (Berrien Co., MI for South Bend) |
| `state` | 1 | the focus's state | `id` = 2-digit FIPS |
| `nation` | 1 | United States | `id` = `US` |

### Picking the ring
- Start with counties adjacent to the home county (or focus county). Keep those in the same metro or combined statistical area, plus any adjacent county whose largest city is a major commute destination or origin.
- Drop tiny rural counties when there are more than six candidates; keep at least one if the region is mixed urban/rural, because the contrast is informative.
- Peer places: the largest city in each ring county if it has 25,000+ people, plus an adjacent large suburb of the focus (Mishawaka for South Bend). Cap at three.
- For a county focus, peer places are the county's principal cities and the ring is still adjacent counties.
- State-level dashboards are not the target of this skill. If asked, use the state as the focus, neighboring states as the ring, and no places, and warn that HUD pulls get large.

## Resolving with the geo server
The `geo` server answers these questions from the Census Bureau's geographic reference files, so what would otherwise be a judgement is a lookup. Use it first. The Census and BLS resolvers are the fallback when it is not available.

| question | tool | what to read |
|---|---|---|
| any geography's identifiers | `geo_resolve_place` with `kind` (`city`, `county`, `metro`, `state`) and `state` | `geoid` is the `id` in config.json; `ucgid` is what the other geo tools take. A status of `ambiguous` means narrow it with `kind` or `state` — never take the first candidate. |
| a city's home county | `geo_get_containment` on the city's `ucgid` | the county edge with the largest `share`. Kansas City, MO: Jackson County 0.62, Clay 0.27, Platte 0.11, so Jackson. |
| a county's metro | `geo_get_containment` on the county's `ucgid` | the metropolitan statistical area edge; its `geoid` is the CBSA code. St. Joseph County, IN → 43780. No metro edge means the county is outside any metro. |
| whether a peer city has city unemployment | the `below_threshold` flag from `geo_resolve_place`, or `geo_list_availability` on its `ucgid` | `below_threshold`, or LAUS with `hasCode: false`, means `"laus_city": false` |

Read the structured flags (`below_threshold`, `non_nesting`, `cdp`, `consolidated_city`) rather than the prose around them. A `cdp` is a census-designated place, not a city government: if one is the focus, say so in `notes`. Cite the geo server's answers as the Census Bureau's geographic reference files.

## Metros
For each county in the config, find its CBSA with `geo_get_containment` (fallback: `bls_resolve_place`, or `census_resolve_place` with `kind: "metro"`). Add one `metros` entry per distinct metro:
```json
{"cbsa": "43780", "name": "South Bend–Mishawaka MSA", "state": "18", "counties": ["18141"]}
```
- `state` is the state CES files the metro under. For multi-state metros BLS uses the principal city's state (the BLS connector says which).
- Counties outside any metro get no entry. The page then shows their housing wage without a metro wage comparison, and their HUD FMR comes from the nonmetro county area.
- Only list the counties of the metro that are in the config.

## config.json schema
```json
{
 "slug": "south-bend-in",
 "title": "South Bend Housing Dashboard",
 "geos": [
  {"id": "1871000", "name": "South Bend", "kind": "place", "role": "focus"},
  {"id": "18141", "name": "St. Joseph Co.", "kind": "county", "role": "home_county"},
  {"id": "1849932", "name": "Mishawaka", "kind": "place", "role": "peer_place"},
  {"id": "18039", "name": "Elkhart Co.", "kind": "county", "role": "ring_county"},
  {"id": "26021", "name": "Berrien Co., MI", "kind": "county", "role": "ring_county"},
  {"id": "18", "name": "Indiana", "kind": "state", "role": "state"},
  {"id": "US", "name": "United States", "kind": "nation", "role": "nation"}
 ],
 "metros": [{"cbsa": "43780", "name": "South Bend–Mishawaka MSA", "state": "18", "counties": ["18141"]}],
 "map_labels": [{"name": "South Bend", "lat": 41.6764, "lon": -86.2520}],
 "notes": ["Optional edition-specific caveats shown in the methods section"]
}
```
- `name` is the short label used on charts: "St. Joseph Co.", "Berrien Co., MI" (add the state when it differs from the focus state), "Elkhart (city)" when a city and county share a name.
- `map_labels`: 4–8 city points (lat/lon from `census_resolve_place` or common knowledge of the city center). They are labels only.
- `config.py check` adds `acs` (latest and prior 5-year vintages, latest 1-year), LAUS ids, CES ids, CPI region and `counties`. To force a vintage, set `"acs": {"latest5": 2024, "prior5": 2019, "latest1": 2024}` yourself.

## ACS availability rules
- 5-year estimates exist for every place and county; the latest 5-year release comes out in December (the 2020–2024 file appeared in December 2025).
- 1-year estimates exist only for geographies of 65,000+ and usually arrive in mid-September. `config.py plan trend` includes only focus/home county/state/nation geos above the threshold. There is no standard 2020 1-year release.
- If the latest-year request 404s, the vintage is not out yet: lower `latest1` (or `latest5`) in config.json by one and re-plan.
