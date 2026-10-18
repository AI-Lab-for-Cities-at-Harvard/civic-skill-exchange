#!/usr/bin/env python3
"""Validate a dashboard config and print the exact data-pull plan.

Usage:
  python3 config.py check  <run_dir>            # validate config.json, fill derived codes, write it back
  python3 config.py plan   <run_dir> census     # Census calls (connector or pull_census.py)
  python3 config.py plan   <run_dir> trend      # ACS 1-year trend calls (run after the snapshot is assembled)
  python3 config.py plan   <run_dir> hud        # HUD ArcGIS queries (connector or pull_hud.py)
  python3 config.py plan   <run_dir> bls        # BLS series and QCEW/OEWS areas (pull_bls.py)

The plan is JSON so both the connector path (the assistant executes each call) and the
direct-API scripts consume the same list, and raw files land under the same names.
"""
import json, os, sys, datetime

# ---- ACS variable batches (<= 49 variables + NAME per call) ----------------------------
V_CORE = ["B01003_001", "B01002_001", "B11001_001", "B25001_001", "B25002_002", "B25002_003",
          *[f"B25004_{i:03d}" for i in range(1, 9)], "B25003_001", "B25003_002", "B25003_003",
          "B25003H_001", "B25003H_002", "B25003B_001", "B25003B_002", "B25003I_001", "B25003I_002", "B19013_001"]
V_COST = ["B25119_002", "B25119_003", "B25064_001", "B25077_001", "B25088_002",
          "B25070_001", "B25070_007", "B25070_008", "B25070_009", "B25070_010", "B25070_011",
          "B25091_002", "B25091_008", "B25091_009", "B25091_010", "B25091_011", "B25091_012",
          "B25091_013", "B25091_019", "B25091_020", "B25091_021", "B25091_022", "B25091_023", "B25010_002"]
V_AGE = ["B25010_003", *[f"B25007_{i:03d}" for i in range(2, 22)], "B17001_001", "B17001_002",
         "B25014_001", "B25014_005"]
V_STOCK = ["B25014_006", "B25014_007", "B25014_011", "B25014_012", "B25014_013",
           *[f"B25024_{i:03d}" for i in range(2, 12)], *[f"B25034_{i:03d}" for i in range(2, 12)]]
V_TREND = ["B01003_001E", "B11001_001E", "B25003_001E", "B25003_002E", "B25003_003E", "B25064_001E", "B25077_001E",
           "B19013_001E", "B25002_003E", "B25070_001E", "B25070_007E", "B25070_008E", "B25070_009E", "B25070_010E"]

STATE_REGION = {  # Census region -> BLS CPI area code
    **{s: "0100" for s in ["09", "23", "25", "33", "34", "36", "42", "44", "50"]},
    **{s: "0200" for s in ["17", "18", "19", "20", "26", "27", "29", "31", "38", "39", "46", "55"]},
    **{s: "0300" for s in ["01", "05", "10", "11", "12", "13", "21", "22", "24", "28", "37", "40", "45", "47", "48", "51", "54"]},
    **{s: "0400" for s in ["02", "04", "06", "08", "15", "16", "30", "32", "35", "41", "49", "53", "56"]},
}
REGION_NAME = {"0100": "Northeast", "0200": "Midwest", "0300": "South", "0400": "West"}
ROLES = {"focus", "home_county", "peer_place", "ring_county", "state", "nation"}

HUD = {
    "mf": {"id": "f4721da932a94b218bdb5a861fd7429e", "title": "Multifamily Properties - Assisted",
           "service": "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/MULTIFAMILY_PROPERTIES_ASSISTED/FeatureServer/0",
           "fields": "OBJECTID,PROPERTY_ID,PROPERTY_NAME_TEXT,STD_CITY,COUNTY_LEVEL,PLACE_LEVEL,TOTAL_ASSISTED_UNIT_COUNT,TOTAL_UNIT_COUNT,CLIENT_GROUP_TYPE,PROGRAM_TYPE1,EXPIRATION_DATE1,IS_202_811_IND,REAC_LAST_INSPECTION_SCORE,HH_INCOME,RENT_PER_MONTH,LAT,LON",
           "county_field": "COUNTY_LEVEL"},
    "lihtc": {"id": "810ccb34dd464ec4ad4697d35fff21a5", "title": "Low-Income Housing Tax Credit Properties",
              "service": "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/LIHTC/FeatureServer/0",
              "fields": "OBJECTID,HUD_ID,PROJECT,PROJ_CTY,COUNTY_LEVEL,N_UNITS,LI_UNITS,YR_PIS,NON_PROF,QCT,LAT,LON",
              "county_field": "COUNTY_LEVEL"},
    "phd": {"id": "5c96143f79c940a0a8cedae99a1ac562", "title": "Public Housing Developments",
            "service": "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0",
            "fields": "OBJECTID,PARTICIPANT_CODE,FORMAL_PARTICIPANT_NAME,PROJECT_NAME,STD_CITY,COUNTY_LEVEL,TOTAL_DWELLING_UNITS,ACC_UNITS,PCT_OCCUPIED,HH_INCOME,LAT,LON",
            "county_field": "COUNTY_LEVEL"},
    "pha": {"id": "3d6ef39026b94eb59ddb7ce28eb0b692", "title": "Public Housing Authorities",
            "service": "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Authorities/FeatureServer/0",
            "fields": "OBJECTID,PARTICIPANT_CODE,FORMAL_PARTICIPANT_NAME,STD_CITY,COUNTY_LEVEL,PHAS_DESIGNATION,HA_PROGRAM_TYPE,ACC_UNITS,SECTION8_UNITS_CNT,PCT_OCCUPIED",
            "county_field": "COUNTY_LEVEL"},
    "hcv": {"id": "8d45c34f7f64433586ef6a448d00ca12", "title": "Housing Choice Vouchers by Tract",
            "service": "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Housing_Choice_Vouchers_by_Tract/FeatureServer/0",
            "fields": "OBJECTID,GEOID,HCV_PUBLIC,HCV_PUBLIC_PCT", "county_field": None},
    "fmr": {"id": "12d2516901f947b5bb4da4e780e35f07", "title": "Fair Market Rents",
            "service": "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Fair_Market_Rents/FeatureServer/0",
            "fields": "OBJECTID,FMR_CODE,FMR_AREANAME,FMR_0BDR,FMR_1BDR,FMR_2BDR,FMR_3BDR,FMR_4BDR", "county_field": None},
}

PPI = [("WPUIP231100", "Inputs to new residential construction"), ("WPU0811", "Softwood lumber"), ("WPU083", "Plywood"),
       ("WPU1333", "Ready-mix concrete"), ("WPU137", "Gypsum products"), ("WPU1017", "Steel mill products"),
       ("WPU1074", "Structural & architectural metal"), ("WPU102502", "Copper & brass mill shapes"),
       ("WPU1361", "Asphalt roofing & siding"), ("WPU1392", "Insulation materials"), ("WPU0721", "Plastic construction products"),
       ("WPU1311", "Flat glass"), ("WPU0621", "Prepared paint"), ("WPUFD4", "Final demand")]


def load(run):
    return json.load(open(os.path.join(run, "config.json")))


def ucgid(g):
    if g["kind"] == "nation": return "0100000US"
    if g["kind"] == "state": return f"0400000US{g['id']}"
    if g["kind"] == "county": return f"0500000US{g['id']}"
    if g["kind"] == "place": return f"1600000US{g['id']}"
    raise ValueError(g)


def acs_years(today=None):
    t = today or datetime.date.today()
    latest5 = t.year - 1 if (t.month == 12 and t.day >= 15) else t.year - 2
    latest1 = t.year - 1 if (t.month > 9 or (t.month == 9 and t.day >= 20)) else t.year - 2
    return latest5, latest1


def check(run):
    c = load(run); errs = []
    ids = [g["id"] for g in c["geos"]]
    if len(ids) != len(set(ids)): errs.append("duplicate geo ids")
    for g in c["geos"]:
        if g.get("role") not in ROLES: errs.append(f"{g['id']}: bad role {g.get('role')}")
        if g["kind"] == "place" and len(g["id"]) != 7: errs.append(f"{g['id']}: place id must be 7 digits (state+place)")
        if g["kind"] == "county" and len(g["id"]) != 5: errs.append(f"{g['id']}: county id must be 5 digits")
        g.setdefault("state", g["id"][:2] if g["kind"] != "nation" else None)
    roles = [g["role"] for g in c["geos"]]
    for r in ["focus", "state", "nation"]:
        if roles.count(r) != 1: errs.append(f"need exactly one {r}")
    if "ring_county" not in roles: errs.append("need at least one ring_county")
    focus = next(g for g in c["geos"] if g["role"] == "focus")
    if focus["kind"] == "place" and "home_county" not in roles: errs.append("a place focus needs a home_county")
    # derived codes
    l5, l1 = acs_years()
    c.setdefault("acs", {})
    c["acs"].setdefault("latest5", l5); c["acs"].setdefault("prior5", c["acs"]["latest5"] - 5)
    c["acs"].setdefault("latest1", l1)
    st = next(g for g in c["geos"] if g["role"] == "state")
    c["cpi_region"] = STATE_REGION.get(st["id"], "0000"); c["cpi_region_name"] = REGION_NAME.get(c["cpi_region"], "U.S.")
    c["counties"] = [g["id"] for g in c["geos"] if g["kind"] == "county"]
    for g in c["geos"]:
        if g["kind"] == "county": g["laus"] = f"LAUCN{g['id']}0000000003"
        elif g["kind"] == "place" and g.get("laus_city", True): g["laus"] = f"LAUCT{g['id']}00000003"
        elif g["kind"] == "state": g["laus"] = f"LASST{g['id']}0000000000003"
        elif g["kind"] == "nation": g["laus"] = "LNU04000000"
    c.setdefault("metros", [])
    for m in c["metros"]:
        m["ces"] = [f"SMU{m['state']}{m['cbsa']}2000000001", f"SMU{m['state']}{m['cbsa']}1500000001"]
    c.setdefault("title", f"{focus['name']} Housing Dashboard")
    c.setdefault("slug", os.path.basename(os.path.abspath(run)))
    if errs:
        print("CONFIG ERRORS:\n  " + "\n  ".join(errs)); sys.exit(1)
    json.dump(c, open(os.path.join(run, "config.json"), "w"), indent=1)
    print(f"ok: {len(c['geos'])} geographies, {len(c['counties'])} counties, {len(c['metros'])} metros; ACS 5-year {c['acs']['latest5']} vs {c['acs']['prior5']}, 1-year through {c['acs']['latest1']}")


def plan_census(c):
    ug = ",".join(ucgid(g) for g in c["geos"])
    calls = []
    for i, batch in enumerate([V_CORE, V_COST, V_AGE, V_STOCK], 1):
        ids = (["NAME"] if i == 1 else []) + [v + s for v in batch for s in ("E", "M")]
        # split to <= 50 ids
        for j in range(0, len(ids), 50):
            calls.append({"file": f"census/raw/a{c['acs']['latest5']}_b{i}{'abc'[j // 50]}.json", "dataset": "acs/acs5",
                          "year": c["acs"]["latest5"], "ids": ids[j:j + 50], "ucgid": ug})
    est = ["NAME"] + [v + "E" for b in (V_CORE, V_COST, V_AGE, V_STOCK) for v in b]
    for j in range(0, len(est), 50):
        calls.append({"file": f"census/raw/a{c['acs']['prior5']}_p{j // 50 + 1}.json", "dataset": "acs/acs5",
                      "year": c["acs"]["prior5"], "ids": est[j:j + 50], "ucgid": ug})
    return calls


def plan_trend(run, c):
    snap = os.path.join(run, "data/census/acs5_snapshot.json")
    if not os.path.exists(snap): sys.exit("assemble the snapshot first (assemble_census.py)")
    s = json.load(open(snap))["vintages"][str(c["acs"]["latest5"])]
    geos = [g for g in c["geos"] if g["role"] in ("focus", "home_county", "state", "nation")
            and (s[g["id"]]["vars"].get("B01003_001E") or 0) >= 65000]
    ug = ",".join(ucgid(g) for g in geos)
    return [{"file": f"census/raw/t{y}.json", "dataset": "acs/acs1", "year": y, "ids": ["NAME"] + V_TREND, "ucgid": ug}
            for y in range(c["acs"]["latest1"] - 12, c["acs"]["latest1"] + 1) if y != 2020]


def plan_hud(c):
    # HUD layers disagree on leading zeros: LIHTC stores Denver County as '8031', the others as '08031'.
    # Query both spellings so states with FIPS codes below 10 (AL, AK, AZ, AR, CA, CO, CT, DE, DC) are not missed.
    codes = []
    for x in c["counties"]:
        codes += [x] + ([x.lstrip("0")] if x.startswith("0") else [])
    cl = ",".join(f"'{x}'" for x in codes)
    out = []
    for k in ["mf", "lihtc", "phd", "pha"]:
        d = HUD[k]; out.append({"key": k, "dataset_id": d["id"], "title": d["title"], "service": d["service"],
                                "where": f"{d['county_field']} IN ({cl})", "out_fields": d["fields"]})
    by_state = {}
    for cty in c["counties"]: by_state.setdefault(cty[:2], []).append(cty[2:])
    w = " OR ".join(f"(GEOID LIKE '{s}{x}%')" for s, xs in by_state.items() for x in xs)
    out.append({"key": "hcv", "dataset_id": HUD["hcv"]["id"], "title": HUD["hcv"]["title"], "service": HUD["hcv"]["service"],
                "where": w, "out_fields": HUD["hcv"]["fields"]})
    parts = []
    for g in c["geos"]:
        if g["kind"] != "county": continue
        m = next((m for m in c["metros"] if g["id"] in m.get("counties", [])), None)
        parts.append(f"FMR_CODE LIKE 'METRO{m['cbsa']}%'" if m else f"FMR_CODE LIKE 'NCNTY{g['id']}%'")
    out.append({"key": "fmr", "dataset_id": HUD["fmr"]["id"], "title": HUD["fmr"]["title"], "service": HUD["fmr"]["service"],
                "where": " OR ".join(sorted(set(parts))), "out_fields": HUD["fmr"]["fields"]})
    return out


def plan_bls(c):
    series = {sid: f"PPI: {lab}" for sid, lab in PPI}
    series.update({"CEU2000000001": "CES: Construction employment, U.S.", "CEU2000000003": "CES: Avg hourly earnings, construction, U.S.",
                   "CEU0500000003": "CES: Avg hourly earnings, total private, U.S."})
    st = next(g for g in c["geos"] if g["role"] == "state")
    series[f"SMU{st['id']}000002000000001"] = f"CES: Construction employment, {st['name']}"
    for m in c["metros"]:
        for sid in m["ces"]: series[sid] = f"CES: {'Construction' if '20000000' in sid else 'Mining, logging & construction'} employment, {m['name']}"
    for g in c["geos"]:
        if g.get("laus"): series[g["laus"]] = f"LAUS: Unemployment rate, {g['name']}"
    r = c["cpi_region"]
    series.update({"CUUR0000SA0": "CPI-U: All items, U.S.", "CUUR0000SAH1": "CPI-U: Shelter, U.S.", "CUUR0000SEHA": "CPI-U: Rent of primary residence, U.S."})
    if r != "0000":
        series.update({f"CUUR{r}SAH1": f"CPI-U: Shelter, {c['cpi_region_name']}", f"CUUR{r}SEHA": f"CPI-U: Rent of primary residence, {c['cpi_region_name']}"})
    qcew = [g["id"] for g in c["geos"] if g["kind"] == "county"] + [st["id"] + "000", "US000"]
    oews = [m["cbsa"] for m in c["metros"]] + [st["id"], "99"]
    return {"series": series, "qcew_areas": qcew, "oews_areas": oews, "state": st["id"]}


if __name__ == "__main__":
    cmd, run = sys.argv[1], sys.argv[2]
    if cmd == "check": check(run)
    elif cmd == "plan":
        c = load(run); what = sys.argv[3]
        p = {"census": lambda: plan_census(c), "trend": lambda: plan_trend(run, c), "hud": lambda: plan_hud(c), "bls": lambda: plan_bls(c)}[what]()
        json.dump(p, sys.stdout, indent=1); print()
