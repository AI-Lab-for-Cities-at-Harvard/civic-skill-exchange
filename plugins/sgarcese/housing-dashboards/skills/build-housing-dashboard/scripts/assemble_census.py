#!/usr/bin/env python3
"""Assemble raw Census responses into data/census/acs5_snapshot.json and acs1_trend.json.
Raw files: data/census/raw/a<year>_*.json (5-year) and t<year>.json (1-year), each {"url","header","rows"}
exactly as returned by the Census connector (census_get_raw: data.header, data.rows, source.ids[0]) or pull_census.py.
Usage: python3 assemble_census.py <run_dir>"""
import json, glob, os, re, sys, datetime
run = sys.argv[1]
cfg = json.load(open(os.path.join(run, "config.json")))
RAW = os.path.join(run, "data/census/raw")
ANNOT = {"-111111111", "-222222222", "-333333333", "-444444444", "-555555555", "-666666666", "-888888888", "-999999999"}

def geoid(rec):
    if "ucgid" in rec:
        u = rec["ucgid"].split("US", 1)[1]; return u or "US"
    if "us" in rec: return "US"
    for lvl in ("place", "county"):
        if lvl in rec: return rec["state"] + rec[lvl]
    return rec["state"]

def conv(v):
    if v is None or str(v) in ANNOT: return None
    try: return int(v)
    except (TypeError, ValueError):
        try: return float(v)
        except (TypeError, ValueError): return v

def read(fn, notes):
    d = json.load(open(fn))
    if "data" in d and "header" in d["data"]:  # full connector envelope saved as-is
        d = {"url": (d.get("source", {}).get("ids") or [None])[0], "header": d["data"]["header"], "rows": d["data"]["rows"]}
    elif isinstance(d, list):  # bare API array, header row first
        d = {"url": None, "header": d[0], "rows": d[1:]}
    hdr = d["header"]; out = []
    for r in d["rows"]:
        if len(r) != len(hdr): sys.exit(f"{fn}: row length {len(r)} != header {len(hdr)}")
        rec = dict(zip(hdr, r)); g = geoid(rec); vals = {}
        for k, v in rec.items():
            if k in ("ucgid", "state", "county", "place", "us"): continue
            if k == "NAME": vals["NAME"] = v; continue
            if v is not None and str(v) in ANNOT and not k.endswith("M"): notes.append(f"{os.path.basename(fn)} {g} {k}={v} (Census annotation) stored as null")
            vals[k] = conv(v)
        out.append((g, vals))
    return d.get("url"), out

notes, urls, vint = [], [], {}
for yr in (cfg["acs"]["latest5"], cfg["acs"]["prior5"]):
    data = {}
    for fn in sorted(glob.glob(f"{RAW}/a{yr}_*.json")):
        u, rows = read(fn, notes); urls.append(u)
        for g, vals in rows:
            slot = data.setdefault(g, {"name": None, "vars": {}})
            if "NAME" in vals: slot["name"] = vals.pop("NAME")
            slot["vars"].update(vals)
    vint[str(yr)] = data
missing = [g["id"] for g in cfg["geos"] for y in vint if g["id"] not in vint[y]]
if missing: notes.append(f"geographies missing from a vintage: {missing}")
json.dump({"retrieved": datetime.date.today().isoformat(), "source": "U.S. Census Bureau, ACS 5-year, Census Data API",
           "products": {str(cfg['acs']['latest5']): f"ACS 5-year {cfg['acs']['latest5'] - 4}-{cfg['acs']['latest5']}",
                        str(cfg['acs']['prior5']): f"ACS 5-year {cfg['acs']['prior5'] - 4}-{cfg['acs']['prior5']}"},
           "vintages": vint, "api_urls": urls, "notes": notes}, open(os.path.join(run, "data/census/acs5_snapshot.json"), "w"), indent=1)
print("snapshot:", {y: len(v) for y, v in vint.items()}, "geos;", len(notes), "notes")

tfiles = sorted(glob.glob(f"{RAW}/t[0-9][0-9][0-9][0-9].json"))
if tfiles:
    series, tn, turls = {}, [], []
    for fn in tfiles:
        y = re.search(r"t(\d{4})", fn).group(1); u, rows = read(fn, tn); turls.append(u)
        for g, vals in rows:
            vals.pop("NAME", None); series.setdefault(g, {})[y] = vals
    json.dump({"retrieved": datetime.date.today().isoformat(), "source": "U.S. Census Bureau, ACS 1-year, Census Data API",
               "series": series, "api_urls": turls, "notes": tn}, open(os.path.join(run, "data/census/acs1_trend.json"), "w"), indent=1)
    print("trend:", {g: len(v) for g, v in series.items()}, "years")
# sanity checks
v = vint[str(cfg["acs"]["latest5"])]
bad = []
for g, s in v.items():
    x = s["vars"]
    try:
        if x["B25003_002E"] + x["B25003_003E"] != x["B25003_001E"]: bad.append(f"{g}: owner+renter != occupied")
        if x["B25002_002E"] + x["B25002_003E"] != x["B25001_001E"]: bad.append(f"{g}: occupied+vacant != units")
        if sum(x[f"B25024_{i:03d}E"] for i in range(2, 12)) != x["B25001_001E"]: bad.append(f"{g}: units-in-structure bands != units")
    except (KeyError, TypeError) as e: bad.append(f"{g}: missing {e}")
print("checks:", "all passed" if not bad else bad)
