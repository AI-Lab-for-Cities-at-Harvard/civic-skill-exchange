#!/usr/bin/env python3
"""Compare two dashboard_data.json files (before/after a refresh) and list what changed.
Usage: python3 compare_runs.py <old dashboard_data.json> <new dashboard_data.json>"""
import json, sys
a, b = (json.load(open(p)) for p in sys.argv[1:3])
out = []
if a["acs"] != b["acs"]: out.append(f"ACS vintage: {a['acs']} -> {b['acs']}")
KEYS = ["pop", "hh", "renter_share", "med_income", "med_rent", "med_value", "rent_burden30", "rent_burden50", "other_vacant_share"]
for gid in b["order"]:
    if gid not in a["demand"]: continue
    o, n = a["demand"][gid]["now"], b["demand"][gid]["now"]
    ch = [f"{k} {o.get(k)} -> {n.get(k)}" for k in KEYS if o.get(k) != n.get(k)]
    if ch: out.append(f"{b['demand'][gid]['name']}: " + "; ".join(ch))
ea, eb = a.get("econ", {}), b.get("econ", {})
pa = {p["id"]: p for p in ea.get("ppi", [])}
for p in eb.get("ppi", []):
    q = pa.get(p["id"])
    if q and q["last_date"] != p["last_date"]:
        out.append(f"PPI {p['label']}: {q['last_date']} {q['since2020']}% -> {p['last_date']} {p['since2020']}% since Jan 2020 (y/y {p['yoy']}%)")
if ea.get("qcew", {}).get("latest_year") != eb.get("qcew", {}).get("latest_year"):
    out.append(f"QCEW latest year {ea.get('qcew', {}).get('latest_year')} -> {eb.get('qcew', {}).get('latest_year')}")
if ea.get("oews", {}).get("latest") != eb.get("oews", {}).get("latest"):
    out.append(f"OEWS latest {ea.get('oews', {}).get('latest')} -> {eb.get('oews', {}).get('latest')}")
for c, x in eb.get("hud", {}).get("counties", {}).items():
    y = a.get("hud", {}).get("counties", {}).get(c)
    if y:
        ch = [f"{k} {y[k]} -> {x[k]}" for k in ("sec8", "prac", "ph", "hcv", "lihtc", "federal_rental_assist") if y[k] != x[k]]
        if ch: out.append(f"HUD {x['name']}: " + "; ".join(ch))
fa = {f["county"]: f for f in a.get("hud", {}).get("fmr", [])}
for f in b.get("hud", {}).get("fmr", []):
    if f["county"] in fa and fa[f["county"]]["fmr"] != f["fmr"]:
        out.append(f"FMR {f['area']}: 2BR {fa[f['county']]['fmr'][2]} -> {f['fmr'][2]}")
print("\n".join(out) if out else "No changes in headline figures.")
