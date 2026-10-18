#!/usr/bin/env python3
"""Render the dashboard HTML from build/dashboard_data.json (+ build/findings.json) into <run_dir>/<slug>.html.
Usage: python3 render.py <run_dir> [--desc "one sentence"] [--lede "masthead paragraph"]"""
import json, os, sys, datetime, argparse, subprocess
ap = argparse.ArgumentParser(); ap.add_argument("run"); ap.add_argument("--desc"); ap.add_argument("--lede"); a = ap.parse_args()
here = os.path.dirname(os.path.abspath(__file__)); assets = os.path.join(here, "..", "assets")
subprocess.run([sys.executable, f"{here}/build_data.py", a.run], check=True)
D = json.load(open(os.path.join(a.run, "build/dashboard_data.json")))
G = {g["id"]: g for g in D["geos"]}
focus, home = G[D["focus"]]["name"], G[D["home"]]["name"] if D.get("home") else G[D["focus"]]["name"]
lede = a.lede or D["findings"].get("lede") or (f"Who needs housing, what it costs to build, and how much federally assisted housing exists in {focus}"
        + (f", {home}" if home != focus else "") + " and the surrounding region. Every number comes from the Census Bureau, the Bureau of Labor Statistics or HUD, and each chart names its source.")
desc = a.desc or f"Housing demand, construction economics and federally assisted housing for {focus} and its region, from Census, BLS and HUD open data."
E = D.get("econ", {})
sub = {"TITLE": D["title"], "DESC": desc, "LEDE": lede, "FOCUS": focus, "HOME": home,
       "BUILT": datetime.date.today().strftime("%B %-d, %Y"),
       "L5": f"{D['acs']['latest5'] - 4}–{D['acs']['latest5']}", "P5": f"{D['acs']['prior5'] - 4}–{D['acs']['prior5']}",
       "QY": str(E.get("qcew", {}).get("latest_year", "")), "QY0": str((E.get("qcew", {}).get("years") or [""])[0]),
       "OY": str(E.get("oews", {}).get("latest", "")), "OY0": str(E.get("oews", {}).get("prior", ""))}
t = open(os.path.join(assets, "template.html")).read()
for k, v in sub.items():
    t = t.replace("{{" + k + "}}", v.replace("&", "&amp;").replace("<", "&lt;") if k not in ("DATA", "JS") else v)
t = t.replace("{{DATA}}", json.dumps(D, separators=(",", ":")).replace("</", "<\\/")).replace("{{JS}}", open(os.path.join(assets, "app.js")).read())
assert "{{" not in t.split('<script id="data"')[0], "unfilled placeholder"
slug = json.load(open(os.path.join(a.run, "config.json"))).get("slug", "housing-dashboard")
out = os.path.join(a.run, f"{slug}.html"); open(out, "w").write(t)
print("wrote", out, len(t), "bytes")
