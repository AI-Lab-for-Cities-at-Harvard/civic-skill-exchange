#!/usr/bin/env python3
"""Print a compact, human-readable digest of build/dashboard_data.json for writing findings or a brief.
Every number a finding cites should appear here. Usage: python3 digest.py <run_dir> [--json]"""
import json, os, sys
run = sys.argv[1]
D = json.load(open(os.path.join(run, "build/dashboard_data.json")))
G = {g["id"]: g["name"] for g in D["geos"]}
def c(a, b): return None if a is None or not b else round((a / b - 1) * 100, 1)
out = []
p = out.append
L5, P5 = D["acs"]["latest5"], D["acs"]["prior5"]
p(f"# {D['title']} — digest (ACS 5-yr {L5 - 4}-{L5} vs {P5 - 4}-{P5}; dollars nominal)")
p("\n## Demand (ACS)")
for gid in D["order"]:
    n, v = D["demand"][gid]["now"], D["demand"][gid]["prev"]
    p(f"- {G[gid]} [{D['demand'][gid]['role']}]: pop {n['pop']:,} ({c(n['pop'], v['pop'])}%), hh {n['hh']:,} ({c(n['hh'], v['hh'])}%), "
      f"owners {n['owners']:,} (prev {v['owners']}), renters {n['renters']:,} (prev {v['renters']}); renter share {n['renter_share']}% ±{n['renter_share_moe']} (prev {v['renter_share']}); "
      f"med income ${n['med_income']:,} ({c(n['med_income'], v['med_income'])}%), renter inc ${n['renter_income']}, owner inc ${n['owner_income']}; "
      f"rent ${n['med_rent']} ({c(n['med_rent'], v['med_rent'])}%); value ${n['med_value']:,} ({c(n['med_value'], v['med_value'])}%); "
      f"rent burden 30+ {n['rent_burden30']}% ±{n.get('rent_burden30_moe')}, 50+ {n['rent_burden50']}%; owner burden 30+ {n['owner_burden30']}%; "
      f"rental vac {n['rental_vacancy']}%, other vacant {n['other_vacant_share']}% of units; poverty {n['poverty']}%; "
      f"own rate W-NH {n['own_rate_white_nh']} / Black {n['own_rate_black']} / Hisp {n['own_rate_hisp']}; "
      f"pre-1940 {round(n['year_built'][0] / n['units'] * 100, 1)}%, built 2000+ {round(n['year_built'][4] / n['units'] * 100, 1)}%")
if D["trend"]:
    p("\n## ACS 1-year trend (first -> last year)")
    for gid, rows in D["trend"].items():
        a, b = rows[0], rows[-1]
        p(f"- {G.get(gid, gid)}: rent {a['y']} ${a['rent']} -> {b['y']} ${b['rent']}; value ${a['value']} -> ${b['value']}; income ${a['income']} -> ${b['income']}")
E = D.get("econ", {})
if E.get("ppi"):
    p("\n## Construction costs (national PPI, Jan 2020 = 100)")
    for x in E["ppi"]: p(f"- {x['label']}: {x['since2020']}% since Jan 2020, {x['yoy']}% y/y (latest {x['last_date']}; peak {x['peak_date']}, {x['from_peak']}% from peak)")
    cw = E["cost_vs_wage"]
    for k in cw:
        if cw[k]: p(f"- index {k}: {cw[k][-1]}")
    p(f"- CPI y/y: {E.get('cpi')}")
for x in E.get("ces", []): p(f"- CES {x['name']}: {x['last']}K in {x['last_date']}, {x['yoy']}% y/y, 12-mo avg {x['vs2019']}% vs 2019 ({x['series']})")
for gid, x in E.get("laus", {}).items(): p(f"- Unemployment {G.get(gid, gid)}: {x['last']}% ({x['last_date']}), 12-mo avg {x['avg12']}, 2019 avg {x['avg2019']}")
if E.get("qcew"):
    Q = E["qcew"]; p(f"\n## QCEW {Q['years'][0]}-{Q['latest_year']} (private)")
    for a in Q["areas"]:
        e = a["emp236"]; l = a["latest"]
        p(f"- {a['name']}: NAICS236 emp {e[0]} -> {e[-1]} ({c(e[-1], e[0])}%); NAICS23 {l['emp23']}; specialty 238 {l['emp238']}; LQ236 {l['lq236']}; "
          f"wage236 ${l['wage236']}/wk ({a['wage236_chg']}% since {Q['years'][0]}); all private ${l['wage_private']}/wk ({a['wage_private_chg']}%)")
if E.get("oews"):
    O = E["oews"]; p(f"\n## OEWS May {O['latest']} median annual wage (change since {O['prior']})")
    for o in O["occs"]:
        p(f"- {o['label']}: " + "; ".join(f"{a['name']} ${v['a_median']} ({v['chg']}%)" for a, v in zip(O["areas"], o["vals"]) if v["a_median"]))
H = D.get("hud", {})
if H.get("counties"):
    p("\n## HUD assisted housing by county")
    for cid, x in H["counties"].items():
        p(f"- {x['name']}: renters {x['renters']:,}; vouchers(tract floor) {x['hcv']} ({x['hcv_tracts_reported']}/{x['tracts']} tracts; PHA-reported {x['hcv_pha']}); "
          f"project-based Sec8 {x['sec8']}; 202/811 {x['prac']}; public housing {x['ph']}; LIHTC LI units {x['lihtc']} in {x['lihtc_projects']} projects; "
          f"total federal {x['federal_rental_assist']} = {x['share_renters_assisted']} per 100 renters; per1000 {x['per1000']}")
    home = D.get("home") or next(iter(H["counties"]))
    import datetime; now = datetime.date.today().year
    soon = [m for m in H["mf"] if m["county"] == home and m["exp_year"] and m["exp_year"] <= now + 4]
    p(f"- {G[home]}: {sum(m['units'] or 0 for m in soon)} assisted units in {len(soon)} properties with contracts expiring {now}-{now + 4}; "
      f"elderly-serving units {sum(m['units'] or 0 for m in H['mf'] if m['county'] == home and m['group'] == 'Elderly')}")
    li = [l for l in H["lihtc"] if l["county"] == home and l["yr"]]
    if li: p(f"- LIHTC in {G[home]}: {sum(l['li'] or 0 for l in li if l['yr'] >= now - 10)} LI units placed in service in the last 10 years; latest year {max(l['yr'] for l in li)}")
    for x in H["phas"]: p(f"- PHA {x['name']} ({G.get(x['county'], x['county'])}): PH {x['ph']}, vouchers {x['hcv']}, occupancy {x['occ']}%, {x['phas']}")
    for f in H.get("fmr", []): p(f"- FMR {f['area']}: 2BR ${f['fmr'][2]} -> housing wage ${f['housing_wage']}/hr; metro median wage ${f['median_wage']}/hr")
print("\n".join(out))
