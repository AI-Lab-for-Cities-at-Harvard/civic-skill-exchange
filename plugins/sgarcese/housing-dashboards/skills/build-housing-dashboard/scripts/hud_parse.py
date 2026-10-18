#!/usr/bin/env python3
"""Connector path for HUD data. The HUD Open Data connector's arcgis__query_data tool prints records as text
("Record N:" followed by "  FIELD: value" lines) and shows only 10 records per call.
Save each call's printed output verbatim to data/hud/raw/<key>_pNN.txt, then run:
  python3 hud_parse.py <run_dir> <key> <server_count>
It parses every page, drops duplicates by OBJECTID, checks the total against the "Returned N record(s)"
count the tool reported, and writes data/hud/raw/<key>.json in the same format as pull_hud.py."""
import json, os, re, sys, glob, subprocess
run, key, expected = sys.argv[1], sys.argv[2], int(sys.argv[3])
here = os.path.dirname(os.path.abspath(__file__))
plan = {p["key"]: p for p in json.loads(subprocess.check_output([sys.executable, f"{here}/config.py", "plan", run, "hud"]))}[key]
num = re.compile(r"^-?\d+(\.\d+)?$")
recs = {}
for fn in sorted(glob.glob(os.path.join(run, f"data/hud/raw/{key}_p*.txt"))):
    cur = None
    for line in open(fn, encoding="utf-8"):
        if re.match(r"^\s*Record \d+:", line):
            cur = {}; recs_list = cur
            continue
        m = re.match(r"^\s+([A-Z0-9_]+):\s?(.*)$", line.rstrip("\n"))
        if m and cur is not None:
            k, v = m.group(1), m.group(2).strip()
            cur[k] = None if v in ("", "None", "null") else (float(v) if "." in v and num.match(v) else int(v) if num.match(v) and not (k.endswith("_ID") or k in ("GEOID", "COUNTY_LEVEL", "PLACE_LEVEL", "TRACT_LEVEL", "PROPERTY_ID", "YR_PIS", "HUD_ID")) else v)
            if k == "OBJECTID": recs[int(v)] = cur
records = [recs[k] for k in sorted(recs)]
status = "ok" if len(records) == expected else f"MISMATCH: parsed {len(records)} vs server {expected} - fetch the missing pages"
json.dump({**{k: plan[k] for k in ("key", "dataset_id", "title", "service", "where")}, "server_count": expected, "records": records},
          open(os.path.join(run, f"data/hud/raw/{key}.json"), "w"), indent=1)
print(key, len(records), "records;", status, "; last OBJECTID", records[-1]["OBJECTID"] if records else None)
