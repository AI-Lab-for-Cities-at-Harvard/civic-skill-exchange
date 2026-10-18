#!/usr/bin/env python3
"""Direct ArcGIS REST path for HUD open data. Executes the hud plan from config.py and writes
data/hud/raw/<key>.json as {"dataset_id","title","service","where","records":[...]}.
Usage: python3 pull_hud.py <run_dir>     (needs network access to services.arcgis.com)"""
import json, os, sys, subprocess, urllib.request, urllib.parse
run = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
plan = json.loads(subprocess.check_output([sys.executable, f"{here}/config.py", "plan", run, "hud"]))
os.makedirs(os.path.join(run, "data/hud/raw"), exist_ok=True)
for p in plan:
    recs, off = [], 0
    while True:
        q = {"where": p["where"], "outFields": p["out_fields"], "returnGeometry": "false", "orderByFields": "OBJECTID",
             "resultOffset": off, "resultRecordCount": 1000, "f": "json"}
        url = p["service"] + "/query?" + urllib.parse.urlencode(q)
        d = json.load(urllib.request.urlopen(url, timeout=90))
        if "error" in d: sys.exit(f"{p['key']}: {d['error']}")
        feats = [f["attributes"] for f in d.get("features", [])]
        recs += feats; off += len(feats)
        if not d.get("exceededTransferLimit") or not feats: break
    json.dump({**{k: p[k] for k in ("key", "dataset_id", "title", "service", "where")}, "server_count": len(recs), "records": recs},
              open(os.path.join(run, f"data/hud/raw/{p['key']}.json"), "w"), indent=1)
    print(p["key"], len(recs), "records")
