#!/usr/bin/env python3
"""Connector fallback for BLS time series. Save each bls_get_raw response (the full JSON, as returned)
to data/bls/raw/<anything>.json, then run:
  python3 bls_from_raw.py <run_dir>
It finds every {"seriesID", "data"} block in the saved files and writes data/bls/bls_timeseries.json
in the same shape pull_bls.py produces. QCEW and OEWS still need pull_bls.py (direct download)."""
import json, os, sys, glob, subprocess, datetime
run = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
titles = json.loads(subprocess.check_output([sys.executable, f"{here}/config.py", "plan", run, "bls"]))["series"]
found = {}
def walk(x):
    if isinstance(x, dict):
        if "seriesID" in x and isinstance(x.get("data"), list): found.setdefault(x["seriesID"], []).extend(x["data"])
        for v in x.values(): walk(v)
    elif isinstance(x, list):
        for v in x: walk(v)
for fn in glob.glob(os.path.join(run, "data/bls/raw/*.json")): walk(json.load(open(fn)))
res = {"retrieved": datetime.date.today().isoformat(), "source": "BLS Public Data API v2 via BLS connector (bls_get_raw)", "series": {}, "missing": []}
for sid, title in titles.items():
    rows = {}
    for d in found.get(sid, []):
        if not str(d.get("period", "")).startswith("M") or d["period"] == "M13": continue
        try: v = float(d["value"])
        except (TypeError, ValueError): continue
        rows[f"{d['year']}-{d['period'][1:]}"] = {"date": f"{d['year']}-{d['period'][1:]}", "value": v,
            "prelim": any((f or {}).get("code") == "P" for f in d.get("footnotes", []))}
    if rows: res["series"][sid] = {"title": title, "data": sorted(rows.values(), key=lambda r: r["date"])}
    else: res["missing"].append(sid)
os.makedirs(os.path.join(run, "data/bls"), exist_ok=True)
json.dump(res, open(os.path.join(run, "data/bls/bls_timeseries.json"), "w"))
print(len(res["series"]), "series; missing:", res["missing"])
