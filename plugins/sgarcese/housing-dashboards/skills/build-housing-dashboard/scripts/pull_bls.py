#!/usr/bin/env python3
"""Pull every BLS input for a dashboard run. Needs network access to api.bls.gov, data.bls.gov and www.bls.gov.
Usage: python3 pull_bls.py <run_dir> [api|qcew|oews|all]
  api  -> data/bls/bls_timeseries.json  (PPI national, CES, LAUS, CPI; monthly since 2016)
  qcew -> data/bls/qcew.json            (annual averages, private construction NAICS 23/236/2361/238 + all private)
  oews -> data/bls/oews.json            (latest May estimates + a pre-pandemic year, construction occupations)
Optional BLS_API_KEY env var raises limits (50 series/query, 500 queries/day). Without it: 25 series, 25 queries/day."""
import json, os, sys, io, csv, zipfile, subprocess, urllib.request, urllib.error, datetime
run = sys.argv[1]; what = sys.argv[2] if len(sys.argv) > 2 else "all"
here = os.path.dirname(os.path.abspath(__file__))
plan = json.loads(subprocess.check_output([sys.executable, f"{here}/config.py", "plan", run, "bls"]))
OUT = os.path.join(run, "data/bls"); os.makedirs(OUT, exist_ok=True)
CACHE = os.path.join(run, "data/bls/cache"); os.makedirs(CACHE, exist_ok=True)
CONTACT = os.environ.get("BLS_CONTACT_EMAIL", "")
# bls.gov refuses downloads without a descriptive User-Agent that includes contact information.
UA = os.environ.get("BLS_USER_AGENT") or f"housing-dashboards/0.1 (civic research; contact {CONTACT or 'unknown'})"
KEY = os.environ.get("BLS_API_KEY")
TODAY = datetime.date.today()

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=180).read()

def api():
    ids = list(plan["series"]); out = {}; per = 50 if KEY else 25; span = 20 if KEY else 10
    windows = [(y, min(y + span - 1, TODAY.year)) for y in range(2016, TODAY.year + 1, span)]
    for s, e in windows:
        for i in range(0, len(ids), per):
            body = {"seriesid": ids[i:i + per], "startyear": str(s), "endyear": str(e)}
            if KEY: body["registrationkey"] = KEY
            req = urllib.request.Request("https://api.bls.gov/publicAPI/v2/timeseries/data/", data=json.dumps(body).encode(),
                                         headers={"User-Agent": UA, "Content-Type": "application/json"})
            r = json.load(urllib.request.urlopen(req, timeout=120))
            if r["status"] != "REQUEST_SUCCEEDED": print("BLS API:", r["status"], r.get("message"))
            for ser in r.get("Results", {}).get("series", []):
                for d in ser["data"]:
                    if not d["period"].startswith("M") or d["period"] == "M13": continue
                    try: v = float(d["value"])
                    except ValueError: continue
                    out.setdefault(ser["seriesID"], []).append({"date": f"{d['year']}-{d['period'][1:]}", "value": v,
                        "prelim": any((f or {}).get("code") == "P" for f in d.get("footnotes", []))})
    res = {"retrieved": TODAY.isoformat(), "source": "BLS Public Data API v2", "series": {}, "missing": []}
    for sid, title in plan["series"].items():
        if sid in out and out[sid]: res["series"][sid] = {"title": title, "data": sorted(out[sid], key=lambda r: r["date"])}
        else: res["missing"].append(sid)
    json.dump(res, open(f"{OUT}/bls_timeseries.json", "w"))
    print("api:", len(res["series"]), "series; missing (expected for CES variants a metro does not publish):", res["missing"])

KEEP = {("0", "10"), ("5", "10"), ("5", "23"), ("5", "236"), ("5", "2361"), ("5", "238")}
def qcew():
    rows = []; last = None
    for y in range(TODAY.year - 11, TODAY.year):
        got = 0
        for a in plan["qcew_areas"]:
            try: txt = get(f"https://data.bls.gov/cew/data/api/{y}/a/area/{a}.csv").decode()
            except urllib.error.HTTPError: continue
            for r in csv.DictReader(io.StringIO(txt)):
                if (r["own_code"], r["industry_code"]) in KEEP and r["size_code"] == "0":
                    got += 1
                    rows.append({"area": a, "year": y, "own": r["own_code"], "naics": r["industry_code"],
                                 "estabs": int(r["annual_avg_estabs"]), "emp": int(r["annual_avg_emplvl"]),
                                 "avg_wkly_wage": int(r["annual_avg_wkly_wage"]), "lq_emp": float(r["lq_annual_avg_emplvl"] or 0),
                                 "disclosure": r["disclosure_code"]})
        if got: last = y
        print("qcew", y, got)
    json.dump({"retrieved": TODAY.isoformat(), "source": "BLS QCEW annual averages (data.bls.gov/cew/data/api)", "latest_year": last, "rows": rows},
              open(f"{OUT}/qcew.json", "w"))

OCCS = {"00-0000", "47-0000", "11-9021", "47-1011", "47-2031", "47-2061", "47-2111", "47-2152", "47-2073", "47-2141", "47-2181",
        "47-2051", "47-2081", "49-9021"}
def oews_year(year):
    import openpyxl
    yy = str(year)[2:]; rows = []; areas = set(plan["oews_areas"])
    for kind in ["ma", "st", "nat"]:
        fn = f"{CACHE}/oesm{yy}{kind}.zip"
        if not os.path.exists(fn): open(fn, "wb").write(get(f"https://www.bls.gov/oes/special-requests/oesm{yy}{kind}.zip"))
        z = zipfile.ZipFile(fn)
        for name in [n for n in z.namelist() if n.lower().endswith(".xlsx") and not any(s in n.lower() for s in ("field", "desc", "bos_"))]:
            ws = openpyxl.load_workbook(io.BytesIO(z.read(name)), read_only=True).worksheets[0]
            it = ws.iter_rows(values_only=True); hdr = [str(h).upper() for h in next(it)]; ix = {h: i for i, h in enumerate(hdr)}
            for r in it:
                area = str(r[ix["AREA"]]).lstrip("0") or "0"
                if kind == "st": area = str(r[ix["AREA"]]).zfill(2)
                if r[ix["OCC_CODE"]] in OCCS and area in areas:
                    if "I_GROUP" in ix and r[ix["I_GROUP"]] not in (None, "cross-industry"): continue
                    rec = {k.lower(): r[ix[k]] for k in ["AREA_TITLE", "OCC_CODE", "OCC_TITLE", "TOT_EMP", "A_MEDIAN", "H_MEDIAN"] if k in ix}
                    rec["area"] = area; rec["year"] = year; rows.append(rec)
    return rows

def oews():
    latest = None
    for y in (TODAY.year - 1, TODAY.year - 2):
        try: get(f"https://www.bls.gov/oes/special-requests/oesm{str(y)[2:]}nat.zip"); latest = y; break
        except Exception as e: print("OEWS", y, "not available:", e)
    if latest is None: sys.exit("OEWS files unreachable - set BLS_CONTACT_EMAIL (bls.gov blocks anonymous downloads) or check network")
    prior = latest - 6
    rows = oews_year(latest) + oews_year(prior)
    for f in os.listdir(CACHE): os.remove(os.path.join(CACHE, f))
    json.dump({"retrieved": TODAY.isoformat(), "source": f"BLS OEWS May {latest} and May {prior}", "latest": latest, "prior": prior, "rows": rows},
              open(f"{OUT}/oews.json", "w"), default=str)
    print("oews", latest, prior, len(rows), "rows")

if what in ("api", "all"): api()
if what in ("qcew", "all"): qcew()
if what in ("oews", "all"): oews()
