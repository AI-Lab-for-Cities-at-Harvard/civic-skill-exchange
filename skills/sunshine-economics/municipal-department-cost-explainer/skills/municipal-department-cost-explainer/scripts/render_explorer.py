#!/usr/bin/env python3
"""Validate reviewed budget evidence and render an offline, standalone explorer.

No packages, network calls, credentials, PDF extraction, or automatic publication.
Amounts are integer whole USD dollars. Classification remains a human task.
"""
import argparse
import datetime
import json
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
MAX_SAFE = 9_007_199_254_740_991
TREATMENTS = {
    "headline", "component", "allocation_out", "addition", "duplicate",
    "revenue", "transfer", "excluded", "unresolved",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value, field):
    require(isinstance(value, str) and 0 < len(value.strip()) <= 4000,
            f"{field}: expected nonempty text of at most 4,000 characters")


def amount(value, field, nullable=False):
    require((nullable and value is None) or
            (type(value) is int and abs(value) <= MAX_SAFE),
            f"{field}: expected integer whole dollars within JavaScript's safe range")


def unique(items, field):
    require(len(items) == len(set(items)), f"{field}: duplicate identifier")


def validate(data):
    require(isinstance(data, dict) and type(data.get("schemaVersion")) is int and data.get("schemaVersion") == 1,
            "schemaVersion must be 1")
    cases = data.get("cases")
    require(isinstance(cases, list) and 1 <= len(cases) <= 50, "cases: expected 1–50 cases")
    case_ids = []
    for case in cases:
        require(isinstance(case, dict), "case must be an object")
        for field in ("id", "city", "department", "period", "status", "basis",
                      "scope", "headlineLabel", "resultLabel", "summary", "provenance"):
            text(case.get(field), field)
        case_ids.append(case["id"])
        require(case.get("currency") == "USD" and case.get("unit") == "whole dollars",
                "Version 1 supports USD whole dollars only; normalize and document first")
        require(case["status"] in ("final", "adopted", "amended", "recommended", "proposed", "synthetic"),
                "status: unsupported budget status")
        require(type(case.get("synthetic")) is bool, "synthetic must be explicit")
        require(case["status"] != "synthetic" or case["synthetic"], "Synthetic status requires synthetic=true")
        for field in ("startDate", "endDate", "snapshotDate"):
            text(case.get(field), field)
            datetime.date.fromisoformat(case[field])
        require(case["startDate"] <= case["endDate"], "Fiscal dates are reversed")
        for field in ("limits", "questions"):
            require(isinstance(case.get(field), list) and 1 <= len(case[field]) <= (3 if field == "questions" else 12),
                    f"{field}: expected a nonempty bounded list")
            for entry in case[field]:
                text(entry, field)
        sources = case.get("sources")
        require(isinstance(sources, list) and 1 <= len(sources) <= 50, "sources required")
        source_ids = []
        for source in sources:
            require(isinstance(source, dict), "source must be an object")
            for field in ("id", "publisher", "title"):
                text(source.get(field), "source." + field)
            source_ids.append(source["id"])
            url = source.get("url")
            if case["synthetic"] and url is None:
                continue
            text(url, "source.url")
            parsed = urlsplit(url)
            require(parsed.scheme == "https" and parsed.hostname and not parsed.username
                    and not parsed.password and not any(ord(c) < 33 for c in url),
                    "source.url must be a plain HTTPS citation without credentials")
        unique(source_ids, "sources")
        rows = case.get("rows")
        require(isinstance(rows, list) and 1 <= len(rows) <= 250, "rows: expected 1–250 rows")
        row_ids = []
        for row in rows:
            require(isinstance(row, dict), "row must be an object")
            for field in ("id", "label", "fund", "reason", "location", "column"):
                text(row.get(field), "row." + field)
            row_ids.append(row["id"])
            kind = row.get("treatment")
            require(kind in TREATMENTS, "Unknown row treatment")
            amount(row.get("amount"), row["id"], nullable=kind in ("unresolved", "excluded"))
            require(row.get("sourceId") in source_ids, "Row must reference a known source")
            require(row.get("period") == case["period"] and row.get("status") == case["status"],
                    "Mixed periods or budget statuses: use separate cases")
            require(row.get("basis") == case["basis"], "Mixed accounting bases: use separate cases")
            require(type(row.get("verified")) is bool, "row.verified must be explicit")
            if kind not in ("unresolved", "excluded"):
                require(row["verified"], "Unverified extraction may only be unresolved or excluded")
            if kind == "allocation_out":
                require(row["amount"] <= 0, "allocation_out must retain its reported negative sign")
            if kind == "duplicate":
                require(row["amount"] >= 0, "duplicate is the positive amount to remove")
            if kind in ("allocation_out", "addition", "duplicate"):
                require(row.get("scopeConfirmed") is True,
                        "Adjustments require an explicit scope/non-overlap confirmation")
        unique(row_ids, "rows")
        require(sum(row["treatment"] == "headline" for row in rows) == 1, "Exactly one headline required")
        # Guard every intermediate operation, not only the final subtotal.
        total = next(row["amount"] for row in rows if row["treatment"] == "headline")
        for row in rows:
            if row["treatment"] in ("allocation_out", "duplicate"):
                total -= row["amount"]
            elif row["treatment"] == "addition":
                total += row["amount"]
            amount(total, "reconciliation subtotal")
        checks = case.get("checks", [])
        require(isinstance(checks, list) and len(checks) <= 25, "checks: expected a bounded list")
        by_id = {r["id"]: r for r in rows}
        for check in checks:
            require(isinstance(check, dict), "check must be an object")
            text(check.get("label"), "check.label")
            ids = check.get("rowIds")
            require(isinstance(ids, list) and ids and all(i in by_id for i in ids), "Unknown check row")
            unique(ids, "check.rowIds")
            require(all(by_id[i]["verified"] and by_id[i]["amount"] is not None for i in ids),
                    "Checks require verified numeric rows")
            amount(check.get("reported"), "check.reported")
            text(check.get("location"), "check.location")
            calculated = 0
            for i in ids:
                calculated += by_id[i]["amount"]
                amount(calculated, "check subtotal")
            amount(calculated - check["reported"], "check discrepancy")
        net = case.get("netFunding")
        if net is not None:
            require(isinstance(net, dict), "netFunding must be null or an object")
            text(net.get("label"), "netFunding.label")
            text(net.get("reason"), "netFunding.reason")
            require(net.get("scopeConfirmed") is True, "Net funding requires confirmed attribution")
            ids = net.get("revenueIds")
            require(isinstance(ids, list) and ids and all(i in by_id for i in ids), "Unknown net revenue row")
            unique(ids, "netFunding.revenueIds")
            require(all(by_id[i]["treatment"] == "revenue" for i in ids), "Only revenue can offset net funding")
            revenue = 0
            for i in ids:
                revenue += by_id[i]["amount"]
                amount(revenue, "revenue subtotal")
                total -= by_id[i]["amount"]
                amount(total, "net funding subtotal")
    unique(case_ids, "cases")
    return data


def render(data):
    validate(data)
    # Escaping '<' prevents user data from closing the inert JSON script element.
    payload = json.dumps(data, ensure_ascii=True, allow_nan=False).replace("<", "\\u003c")
    template = (ROOT / "assets/explorer.html").read_text(encoding="utf-8")
    return (template.replace("/* EXPLORER_CSS */", (ROOT / "assets/explorer.css").read_text(encoding="utf-8"))
            .replace("/* EXPLORER_JS */", (ROOT / "assets/explorer.js").read_text(encoding="utf-8"))
            .replace("EXPLORER_DATA", payload))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--demo", action="store_true", help="Use fixed, illustrative budget snapshots")
    source.add_argument("--input", type=Path, help="Reviewed JSON in the documented data contract")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--force", action="store_true", help="Explicitly replace an existing output")
    args = parser.parse_args()
    path = ROOT / "references/example-data.json" if args.demo else args.input
    try:
        require(path.stat().st_size <= 2 * 1024 * 1024, "Input exceeds 2 MB")
        require(path.resolve() != args.output.resolve(), "Output must not replace input")
        require(ROOT not in args.output.resolve().parents, "Write generated HTML outside the submitted skill")
        data = json.loads(path.read_text(encoding="utf-8"))
        html = render(data)
        with args.output.open("w" if args.force else "x", encoding="utf-8") as handle:
            handle.write(html)
    except (OSError, ValueError, TypeError, KeyError) as error:
        parser.exit(2, f"Could not render: {error}\n")
    print(f"Created {args.output} ({len(data['cases'])} evidence cases). Open it in a browser.")


if __name__ == "__main__":
    main()
