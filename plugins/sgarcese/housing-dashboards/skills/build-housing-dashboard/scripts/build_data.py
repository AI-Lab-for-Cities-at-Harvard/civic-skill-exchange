#!/usr/bin/env python3
"""Turn a run's raw pulls into build/dashboard_data.json (every derived number the page shows).
Usage: python3 build_data.py <run_dir>
Reads config.json, data/census/*.json, data/bls/*.json, data/hud/raw/*.json. Tolerates missing BLS or HUD
pieces (the page hides panels whose data is absent) but requires the ACS snapshot."""
import json, math, re, os, sys, collections, datetime, subprocess

run = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(run, *a)
cfg = json.load(open(P("config.json")))
os.makedirs(P("build"), exist_ok=True)
def opt(path):
    return json.load(open(path)) if os.path.exists(path) else None
acs = json.load(open(P("data/census/acs5_snapshot.json")))
trend = opt(P("data/census/acs1_trend.json"))
bls = opt(P("data/bls/bls_timeseries.json"))
qcew = opt(P("data/bls/qcew.json"))
oews = opt(P("data/bls/oews.json"))
hud = {k: opt(P(f"data/hud/raw/{k}.json")) for k in ["mf", "lihtc", "phd", "pha", "hcv", "fmr"]}
L5, P5 = str(cfg["acs"]["latest5"]), str(cfg["acs"]["prior5"])
GEOS = cfg["geos"]; G = {g["id"]: g for g in GEOS}
role = lambda r: [g for g in GEOS if g["role"] == r]
FOCUS = role("focus")[0]
HOME = (role("home_county") or ([FOCUS] if FOCUS["kind"] == "county" else [None]))[0]
STATE, NATION = role("state")[0], role("nation")[0]
COUNTIES = [g["id"] for g in GEOS if g["kind"] == "county"]
ORDER = [FOCUS["id"]] + [g["id"] for g in role("peer_place")] + ([HOME["id"]] if HOME and HOME["id"] != FOCUS["id"] else []) + \
        [g["id"] for g in role("ring_county")] + [STATE["id"], NATION["id"]]

def r1(x, n=1): return None if x is None else round(x, n)
def moe_prop(num, mnum, den, mden):
    if None in (num, den, mnum, mden) or not den: return None
    p = num / den; rad = mnum ** 2 - p ** 2 * mden ** 2
    if rad < 0: rad = mnum ** 2 + p ** 2 * mden ** 2
    return math.sqrt(rad) / den
def moe_sum(ms):
    ms = [m for m in ms if m is not None]; return math.sqrt(sum(m * m for m in ms)) if ms else None
def div(a, b, k=100):
    return None if a is None or not b else a / b * k

def demand_metrics(v, with_moe):
    E = lambda c: v.get(c + "E"); M = (lambda c: v.get(c + "M")) if with_moe else (lambda c: None)
    s = lambda cs: sum(E(c) or 0 for c in cs)
    o = {}; occ, own, rent = E("B25003_001"), E("B25003_002"), E("B25003_003")
    o.update(pop=E("B01003_001"), hh=occ, units=E("B25001_001"), owners=own, renters=rent, med_age=E("B01002_001"))
    o["renter_share"] = div(rent, occ)
    m = moe_prop(rent, M("B25003_003"), occ, M("B25003_001")); o["renter_share_moe"] = r1(m * 100 if m else None)
    fr, rno, fs, sno = E("B25004_002"), E("B25004_003"), E("B25004_004"), E("B25004_005")
    o["rental_vacancy"] = div(fr, rent + fr + rno); o["owner_vacancy"] = div(fs, own + fs + sno)
    o["vacant_share"] = div(E("B25002_003"), E("B25001_001")); o["other_vacant_share"] = div(E("B25004_008"), E("B25001_001"))
    o["med_income"] = E("B19013_001"); o["med_income_moe"] = M("B19013_001")
    o["owner_income"] = E("B25119_002"); o["renter_income"] = E("B25119_003")
    o["med_rent"] = E("B25064_001"); o["med_rent_moe"] = M("B25064_001")
    o["med_value"] = E("B25077_001"); o["med_value_moe"] = M("B25077_001"); o["med_owner_cost_mort"] = E("B25088_002")
    rc = ["B25070_007", "B25070_008", "B25070_009", "B25070_010"]; rden = (E("B25070_001") or 0) - (E("B25070_011") or 0)
    o["rent_burden30"] = div(s(rc), rden); o["rent_burden50"] = div(E("B25070_010"), rden); o["rent_burdened_hh"] = s(rc)
    if with_moe:
        dm = moe_sum([M("B25070_001"), M("B25070_011")])
        m = moe_prop(s(rc), moe_sum([M(c) for c in rc]), rden, dm); o["rent_burden30_moe"] = r1(m * 100 if m else None)
    oc = ["B25091_008", "B25091_009", "B25091_010", "B25091_011", "B25091_019", "B25091_020", "B25091_021", "B25091_022"]
    oden = (E("B25091_002") or 0) - (E("B25091_012") or 0) + (E("B25091_013") or 0) - (E("B25091_023") or 0)
    o["owner_burden30"] = div(s(oc), oden)
    for k, t in (("white_nh", "H"), ("black", "B"), ("hisp", "I")):
        tot = E(f"B25003{t}_001"); o[f"{k}_hh"] = tot
        o[f"own_rate_{k}"] = div(E(f"B25003{t}_002"), tot) if (tot or 0) >= 300 else None  # suppress tiny groups
    o["poverty"] = div(E("B17001_002"), E("B17001_001"))
    o["crowded_renter"] = div(s(["B25014_011", "B25014_012", "B25014_013"]), rent)
    o["age_owner"] = [E(f"B25007_{i:03d}") for i in range(3, 12)]; o["age_renter"] = [E(f"B25007_{i:03d}") for i in range(13, 22)]
    u = [E(f"B25024_{i:03d}") or 0 for i in range(2, 12)]
    o["structure"] = [u[0], u[1], u[2] + u[3], u[4] + u[5], u[6] + u[7], u[8] + u[9]]
    yb = [E(f"B25034_{i:03d}") or 0 for i in range(2, 12)]  # newest -> oldest; _004 is always 2000-2009
    o["year_built"] = [yb[9], yb[8] + yb[7], yb[6] + yb[5], yb[4] + yb[3], yb[2] + yb[1] + yb[0]]
    return {k: (r1(x, 2) if isinstance(x, float) else x) for k, x in o.items()}

PREV_KEYS = ["pop", "hh", "units", "renter_share", "renters", "owners", "med_rent", "med_value", "med_income", "renter_income", "owner_income",
             "rent_burden30", "rent_burden50", "owner_burden30", "vacant_share", "other_vacant_share", "rental_vacancy", "poverty"]
demand = {}
for gid in ORDER:
    now = demand_metrics(acs["vintages"][L5][gid]["vars"], True)
    pv = acs["vintages"].get(P5, {}).get(gid)
    prev = demand_metrics(pv["vars"], False) if pv else {}
    demand[gid] = {"name": G[gid]["name"], "kind": G[gid]["kind"], "role": G[gid]["role"], "now": now, "prev": {k: prev.get(k) for k in PREV_KEYS}}

tr = {}
if trend:
    for gid, ys in trend["series"].items():
        rows = []
        for y, v in sorted(ys.items()):
            rows.append({"y": int(y), "rent": v.get("B25064_001E"), "value": v.get("B25077_001E"), "income": v.get("B19013_001E"),
                         "renter_share": r1(div(v.get("B25003_003E"), v.get("B25003_001E")), 2)})
        tr[gid] = rows

# ---------------- BLS ----------------
econ = {}
if bls:
    S = bls["series"]
    ser = lambda sid: [(d["date"], d["value"]) for d in S[sid]["data"]] if sid in S else []
    def idx(sid, base="2020-01"):
        s = ser(sid); d = dict(s)
        return [[t, r1(v / d[base] * 100, 2)] for t, v in s] if base in d else []
    def yago(dt): y, m = dt.split("-"); return f"{int(y) - 1}-{m}"
    ppi = []
    import importlib.util
    spec = importlib.util.spec_from_file_location("config", f"{here}/config.py"); cmod = importlib.util.module_from_spec(spec); spec.loader.exec_module(cmod)
    for sid, lab in cmod.PPI:
        s = ser(sid)
        if not s or sid == "WPUFD4": continue
        d = dict(s); dt, last = s[-1]; peak = max(s, key=lambda t: t[1])
        ppi.append({"id": sid, "label": lab, "last_date": dt, "since2020": r1((last / d["2020-01"] - 1) * 100), "yoy": r1((last / d[yago(dt)] - 1) * 100) if yago(dt) in d else None,
                    "peak_date": peak[0], "from_peak": r1((last / peak[1] - 1) * 100), "idx": [[t, r1(v / d["2020-01"] * 100)] for t, v in s]})
    econ["ppi"] = ppi
    econ["cost_vs_wage"] = {"ppi_inputs": idx("WPUIP231100"), "ahe_construction": idx("CEU2000000003"), "cpi_all": idx("CUUR0000SA0")}
    def yoy(sid):
        s = ser(sid); d = dict(s)
        return [s[-1][0], r1((s[-1][1] / d[yago(s[-1][0])] - 1) * 100)] if s and yago(s[-1][0]) in d else None
    r = cfg["cpi_region"]
    econ["cpi"] = {"region": cfg["cpi_region_name"], "shelter_us": yoy("CUUR0000SAH1"), "shelter_region": yoy(f"CUUR{r}SAH1"),
                   "rent_us": yoy("CUUR0000SEHA"), "rent_region": yoy(f"CUUR{r}SEHA"), "all_us": yoy("CUUR0000SA0")}
    def annual(sid, y):
        v = [x for t, x in ser(sid) if t.startswith(str(y))]; return sum(v) / len(v) if v else None
    def ces_rec(sid, name):
        s = ser(sid); d = dict(s); dt, v = s[-1]; a19 = annual(sid, 2019)
        return {"name": name, "series": sid, "title": S[sid]["title"], "last_date": dt, "last": v,
                "yoy": r1((v / d[yago(dt)] - 1) * 100) if yago(dt) in d else None,
                "vs2019": r1((sum(x for _, x in s[-12:]) / 12 / a19 - 1) * 100) if a19 else None}
    ces = []
    for m in cfg["metros"]:
        sid = next((x for x in m["ces"] if x in S), None)
        if sid: rec = ces_rec(sid, m["name"]); rec["counties"] = m.get("counties", []); rec["cbsa"] = m["cbsa"]; ces.append(rec)
    for sid, nm in ((f"SMU{STATE['id']}000002000000001", STATE["name"]), ("CEU2000000001", "United States")):
        if sid in S: ces.append(ces_rec(sid, nm))
    econ["ces"] = ces
    laus = {}
    for g in GEOS:
        s = ser(g.get("laus", ""))
        if s: laus[g["id"]] = {"last_date": s[-1][0], "last": s[-1][1], "avg12": r1(sum(v for _, v in s[-12:]) / min(12, len(s))), "avg2019": r1(annual(g["laus"], 2019))}
    econ["laus"] = laus

if qcew:
    Q = collections.defaultdict(dict)
    for r in qcew["rows"]: Q[(r["area"], r["own"], r["naics"])][r["year"]] = r
    yrs = sorted({r["year"] for r in qcew["rows"]}); LY = yrs[-1]
    def val(a, naics, y, f="emp", own="5"):
        r = Q[(a, own, naics)].get(y); return None if (r is None or r["disclosure"] == "N") else r[f]
    areas = [(c, G[c]["name"]) for c in COUNTIES] + [(STATE["id"] + "000", STATE["name"]), ("US000", "United States")]
    qa = []
    for a, nm in areas:
        rec = {"id": a, "geo": a[:5] if len(a) == 5 and a != "US000" else ("US" if a == "US000" else STATE["id"]), "name": nm,
               "emp236": [val(a, "236", y) for y in yrs]}
        rec["latest"] = {k: val(a, n, LY, f) for k, n, f in (("emp23", "23", "emp"), ("emp236", "236", "emp"), ("emp2361", "2361", "emp"), ("emp238", "238", "emp"),
                                                             ("wage23", "23", "avg_wkly_wage"), ("wage236", "236", "avg_wkly_wage"), ("lq236", "236", "lq_emp"), ("estabs236", "236", "estabs"))}
        rec["latest"]["wage_private"] = val(a, "10", LY, "avg_wkly_wage")
        w0, w1 = val(a, "236", yrs[0], "avg_wkly_wage"), val(a, "236", LY, "avg_wkly_wage")
        p0, p1 = val(a, "10", yrs[0], "avg_wkly_wage"), val(a, "10", LY, "avg_wkly_wage")
        rec["wage236_chg"] = r1((w1 / w0 - 1) * 100) if w0 and w1 else None
        rec["wage_private_chg"] = r1((p1 / p0 - 1) * 100) if p0 and p1 else None
        qa.append(rec)
    econ["qcew"] = {"years": yrs, "latest_year": LY, "areas": qa}

if oews:
    OCC = [("47-0000", "All construction & extraction"), ("11-9021", "Construction managers"), ("47-1011", "Construction supervisors"),
           ("47-2031", "Carpenters"), ("47-2061", "Construction laborers"), ("47-2111", "Electricians"), ("47-2152", "Plumbers & pipefitters"),
           ("47-2073", "Equipment operators"), ("47-2141", "Painters"), ("47-2181", "Roofers"), ("47-2051", "Cement masons"),
           ("47-2081", "Drywall installers"), ("49-9021", "HVAC mechanics"), ("00-0000", "All occupations")]
    I = {(r["area"], r["occ_code"], r["year"]): r for r in oews["rows"]}
    def num(x):
        try: return float(x)
        except (TypeError, ValueError): return None
    oa = [{"id": m["cbsa"], "name": m["name"]} for m in cfg["metros"]] + [{"id": STATE["id"], "name": STATE["name"]}, {"id": "99", "name": "United States"}]
    occs = []
    for code, lab in OCC:
        vals = []
        for a in oa:
            r = I.get((a["id"], code, oews["latest"])); p = I.get((a["id"], code, oews["prior"]))
            med = num(r["a_median"]) if r else None; med0 = num(p["a_median"]) if p else None
            vals.append({"emp": num(r["tot_emp"]) if r else None, "a_median": med, "h_median": num(r["h_median"]) if r else None,
                         "chg": r1((med / med0 - 1) * 100) if med and med0 else None})
        occs.append({"code": code, "label": lab, "vals": vals})
    econ["oews"] = {"latest": oews["latest"], "prior": oews["prior"], "areas": oa, "occs": occs}
    econ["_wage_lookup"] = {(a["id"]): {c["code"]: c["vals"][i] for c in occs} for i, a in enumerate(oa)}

# ---------------- HUD ----------------
H = {}
def fips5(v):
    """Normalize a county code to 5 digits: HUD's LIHTC layer drops the leading zero (8031 for 08031)."""
    v = str(v or "").split(".")[0].strip()
    return v.zfill(5) if v.isdigit() else v
for _k, _d in hud.items():
    for _r in (_d or {}).get("records", []):
        if "COUNTY_LEVEL" in _r: _r["COUNTY_LEVEL"] = fips5(_r["COUNTY_LEVEL"])
        if "GEOID" in _r and str(_r["GEOID"]).isdigit(): _r["GEOID"] = str(_r["GEOID"]).zfill(11)
recs = lambda k: (hud[k] or {}).get("records", []) if hud.get(k) else []
def ym(s):
    m = re.match(r"(\d{2})-([A-Z]{3})-(\d{2})", s or ""); return 2000 + int(m.group(3)) if m else None
def pos(x):
    try: return x if x is not None and float(x) > 0 else None
    except (TypeError, ValueError): return None
mf = recs("mf")
def mf_prog(r):
    return "202/811" if r.get("IS_202_811_IND") == "Y" or "811 PRA" in (r.get("PROGRAM_TYPE1") or "").upper() else "Section 8"
seen = {}
for r in recs("lihtc"):
    k = (re.sub(r"[^A-Z0-9]", "", (r.get("PROJECT") or "").upper()), (r.get("PROJ_CTY") or "").upper())
    cur = seen.get(k)
    if cur is None or (r.get("LI_UNITS") or 0) > (cur.get("LI_UNITS") or 0): seen[k] = r
lihtc = list(seen.values())
for r in lihtc:
    if r.get("LI_UNITS") and r.get("N_UNITS") and r["LI_UNITS"] > r["N_UNITS"]: r["LI_UNITS"] = r["N_UNITS"]
phd, hcv, pha = recs("phd"), recs("hcv"), recs("pha")
yr = lambda r: int(str(r["YR_PIS"])) if str(r.get("YR_PIS") or "").isdigit() and str(r["YR_PIS"]) != "8888" else None
counties = {}
if hud.get("mf") or hud.get("hcv"):
    for c in COUNTIES:
        ren = demand[c]["now"]["renters"]
        hv = [r for r in hcv if str(r["GEOID"]).startswith(c)]
        d = {"name": G[c]["name"], "renters": ren,
             "sec8": sum(r.get("TOTAL_ASSISTED_UNIT_COUNT") or 0 for r in mf if r["COUNTY_LEVEL"] == c and mf_prog(r) == "Section 8"),
             "prac": sum(r.get("TOTAL_ASSISTED_UNIT_COUNT") or 0 for r in mf if r["COUNTY_LEVEL"] == c and mf_prog(r) == "202/811"),
             "ph": sum(r.get("ACC_UNITS") or r.get("TOTAL_DWELLING_UNITS") or 0 for r in phd if r["COUNTY_LEVEL"] == c),
             "hcv": sum(r.get("HCV_PUBLIC") or 0 for r in hv), "hcv_tracts_reported": sum(1 for r in hv if r.get("HCV_PUBLIC") is not None), "tracts": len(hv),
             "hcv_pha": sum(r.get("SECTION8_UNITS_CNT") or 0 for r in pha if r["COUNTY_LEVEL"] == c),
             "lihtc": sum(r.get("LI_UNITS") or 0 for r in lihtc if r["COUNTY_LEVEL"] == c and yr(r)),
             "lihtc_projects": sum(1 for r in lihtc if r["COUNTY_LEVEL"] == c and yr(r)),
             "mf_props": sum(1 for r in mf if r["COUNTY_LEVEL"] == c), "ph_devs": sum(1 for r in phd if r["COUNTY_LEVEL"] == c)}
        d["federal_rental_assist"] = d["sec8"] + d["prac"] + d["ph"] + d["hcv"]
        d["per1000"] = {k: r1(div(d[k], ren, 1000)) for k in ["sec8", "prac", "ph", "hcv", "lihtc"]}
        d["share_renters_assisted"] = r1(div(d["federal_rental_assist"], ren))
        counties[c] = d
H["counties"] = counties
H["mf"] = [{"county": r["COUNTY_LEVEL"], "name": (r.get("PROPERTY_NAME_TEXT") or "").title(), "city": (r.get("STD_CITY") or "").title(),
            "units": r.get("TOTAL_ASSISTED_UNIT_COUNT"), "total": r.get("TOTAL_UNIT_COUNT"), "group": r.get("CLIENT_GROUP_TYPE") or "Unspecified",
            "program": r.get("PROGRAM_TYPE1"), "prog_class": mf_prog(r), "exp": r.get("EXPIRATION_DATE1"), "exp_year": ym(r.get("EXPIRATION_DATE1")),
            "reac": r.get("REAC_LAST_INSPECTION_SCORE"), "income": pos(r.get("HH_INCOME")), "rent": pos(r.get("RENT_PER_MONTH")),
            "lat": r.get("LAT"), "lon": r.get("LON")} for r in mf]
H["ph"] = [{"county": r["COUNTY_LEVEL"], "pha": r.get("FORMAL_PARTICIPANT_NAME"), "name": (r.get("PROJECT_NAME") or "").title(), "city": (r.get("STD_CITY") or "").title(),
            "units": r.get("ACC_UNITS") or r.get("TOTAL_DWELLING_UNITS"), "occ": r1(r.get("PCT_OCCUPIED")), "lat": r.get("LAT"), "lon": r.get("LON")} for r in phd]
H["lihtc"] = [{"county": r["COUNTY_LEVEL"], "name": (r.get("PROJECT") or "").title(), "city": (r.get("PROJ_CTY") or "").title(), "units": r.get("N_UNITS"),
               "li": r.get("LI_UNITS"), "yr": yr(r), "nonprofit": str(r.get("NON_PROF")) == "1", "lat": r.get("LAT"), "lon": r.get("LON")} for r in lihtc]
H["phas"] = [{"code": r["PARTICIPANT_CODE"], "name": r["FORMAL_PARTICIPANT_NAME"], "county": r["COUNTY_LEVEL"], "ph": r.get("ACC_UNITS") or 0,
              "hcv": r.get("SECTION8_UNITS_CNT") or 0, "occ": r1(r.get("PCT_OCCUPIED")), "phas": r.get("PHAS_DESIGNATION")} for r in pha]
fmr = []
wl = econ.get("_wage_lookup", {})
for c in COUNTIES:
    m = next((m for m in cfg["metros"] if c in m.get("counties", [])), None)
    cands = [r for r in recs("fmr") if (m and str(r["FMR_CODE"]).startswith(f"METRO{m['cbsa']}")) or str(r["FMR_CODE"]).startswith(f"NCNTY{c}")]
    best = next((r for r in cands if str(r["FMR_CODE"]).endswith(f"N{c}")), None) or next((r for r in cands if m and str(r["FMR_CODE"]).endswith(f"M{m['cbsa']}")), None) or (cands[0] if cands else None)
    if not best: continue
    hw = best["FMR_2BDR"] * 12 / 0.3 / 2080
    w = wl.get(m["cbsa"], {}) if m else {}
    fmr.append({"county": c, "area": best["FMR_AREANAME"], "code": best["FMR_CODE"], "fmr": [best[f"FMR_{i}BDR"] for i in range(5)],
                "housing_wage": r1(hw, 2), "median_wage": (w.get("00-0000") or {}).get("h_median"), "laborer_wage": (w.get("47-2061") or {}).get("h_median")})
H["fmr"] = fmr
econ.pop("_wage_lookup", None)

# ---------------- map ----------------
geo = None
pts = [{"k": k, "i": i, "lat": p["lat"], "lon": p["lon"]} for k in ("mf", "ph", "lihtc") for i, p in enumerate(H[k]) if p.get("lat") and p.get("lon")]
pts += [{"k": "label", "i": l["name"], "lat": l["lat"], "lon": l["lon"]} for l in cfg.get("map_labels", [])]
json.dump({"ring": COUNTIES, "focus": HOME["id"] if HOME else None, "points": pts}, open(P("build/geo_in.json"), "w"))
MOD = os.path.expanduser("~/.cache/housing-dashboards/node")
try:
    if not os.path.exists(f"{MOD}/node_modules/us-atlas"):
        os.makedirs(MOD, exist_ok=True)
        subprocess.run(["npm", "install", "--prefix", MOD, "--silent", "us-atlas@3", "topojson-client@3", "d3-geo@3"], check=True, capture_output=True, timeout=300)
    subprocess.run(["node", f"{here}/geo.mjs", P("build/geo_in.json"), P("build/geo_out.json"), f"{MOD}/node_modules"], check=True, capture_output=True, timeout=120)
    geo = json.load(open(P("build/geo_out.json")))
    for p in geo.pop("points"):
        if p["k"] in H: H[p["k"]][p["i"]]["x"], H[p["k"]][p["i"]]["y"] = p["x"], p["y"]
        else: geo.setdefault("labels", []).append({"name": p["i"], "x": p["x"], "y": p["y"]})
except Exception as e:
    print("map skipped:", e)
for k in ("mf", "ph", "lihtc"):
    for p in H[k]: p.pop("lat", None); p.pop("lon", None)

findings = opt(P("build/findings.json")) or {}
src = {"acs5": f"U.S. Census Bureau, ACS 5-year estimates {int(L5) - 4}–{L5} and {int(P5) - 4}–{P5} (retrieved {acs['retrieved']})"}
if trend: src["acs1"] = f"U.S. Census Bureau, ACS 1-year estimates (retrieved {trend['retrieved']}); no standard 2020 release"
if bls: src["bls"] = f"BLS Public Data API: PPI, CES, LAUS, CPI (retrieved {bls['retrieved']})"
if qcew: src["qcew"] = f"BLS QCEW annual averages, private ownership (retrieved {qcew['retrieved']})"
if oews: src["oews"] = f"BLS OEWS, May {oews['latest']} and May {oews['prior']} (retrieved {oews['retrieved']})"
for k, lab in (("mf", "HUD Multifamily Properties – Assisted"), ("lihtc", "HUD LIHTC database"), ("phd", "HUD Public Housing Developments"),
               ("pha", "HUD Public Housing Authorities"), ("hcv", "HUD Housing Choice Vouchers by Tract"), ("fmr", "HUD Fair Market Rents")):
    if hud.get(k): src["hud_" + k] = f"{lab}, {hud[k]['service']}"
out = {"built": datetime.date.today().isoformat(), "title": cfg["title"], "focus": FOCUS["id"], "home": HOME["id"] if HOME else None,
       "state": STATE["id"], "nation": NATION["id"], "order": ORDER, "geos": [{k: g.get(k) for k in ("id", "name", "kind", "role")} for g in GEOS],
       "metros": [{"cbsa": m["cbsa"], "name": m["name"], "counties": m.get("counties", [])} for m in cfg["metros"]],
       "acs": {"latest5": int(L5), "prior5": int(P5)}, "demand": demand, "trend": tr, "econ": econ, "hud": H, "geo": geo,
       "findings": findings, "sources": src, "notes": cfg.get("notes", [])}
os.makedirs(P("build"), exist_ok=True)
json.dump(out, open(P("build/dashboard_data.json"), "w"), separators=(",", ":"))
print("dashboard_data.json:", len(json.dumps(out)), "bytes; panels:", {"trend": bool(tr), "bls": bool(bls), "qcew": bool(qcew), "oews": bool(oews), "hud": bool(counties), "map": bool(geo)})
