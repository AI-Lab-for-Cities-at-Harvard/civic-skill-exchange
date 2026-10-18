#!/usr/bin/env python3
"""Direct Census Data API path. Executes the census (or trend) plan from config.py and writes raw files
in the same format the connector path produces: {"url", "header", "rows"}.
Usage: python3 pull_census.py <run_dir> census|trend
Needs network access to api.census.gov. Optional CENSUS_API_KEY env var."""
import json, os, sys, subprocess, urllib.request, urllib.parse, urllib.error
run, stage = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
plan = json.loads(subprocess.check_output([sys.executable, f"{here}/config.py", "plan", run, stage]))
key = os.environ.get("CENSUS_API_KEY")
for c in plan:
    q = {"get": ",".join(c["ids"]), "ucgid": c["ucgid"]}
    if key: q["key"] = key
    url = f"https://api.census.gov/data/{c['year']}/{c['dataset']}?" + urllib.parse.urlencode(q, safe=",:")
    try:
        data = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "housing-dashboards"}), timeout=90))
    except urllib.error.HTTPError as e:
        print(f"{c['file']}: HTTP {e.code} (vintage {c['year']} may not be released)"); continue
    out = os.path.join(run, "data", c["file"]); os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump({"url": url.split("&key=")[0], "header": data[0], "rows": data[1:]}, open(out, "w"))
    print(c["file"], len(data) - 1, "rows")
