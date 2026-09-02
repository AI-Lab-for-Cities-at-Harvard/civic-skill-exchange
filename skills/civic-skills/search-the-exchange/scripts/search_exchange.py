#!/usr/bin/env python3
"""Search the published civic-skill-exchange index for installable skills.

Reads `index.json` — the *published* artifact (the site's static JSON API, or a
local copy of it), never the repository tree — so this works the same whether
it runs inside a checkout or after being installed elsewhere as a plugin. See
README.md's "Explore" section for what the published API publishes.

The category vocabulary is never restated here. It is read at runtime from
`categories.json`, the same published artifact that carries it, so a change to
registry/categories.yml (see #102) needs no change to this script.

Every result states its own tier and disclaimer, because a result gets quoted
on its own — see docs/TIERS.md. A Community listing means nobody has reviewed
it; that statement is never left off a single result and never said only once
at the top of a list.

Usage:
    search_exchange.py [--category ID] [--jurisdiction ID] [--need TEXT]
                        [--index PATH-OR-URL] [--categories PATH-OR-URL]
                        [--list-categories]
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path
from typing import Any

# The published artifacts live under /data/. build.yml runs build_index.py with
# --out site/public/data, and vite copies public/ into the deployed root — so
# these are /data/index.json and /data/categories.json, not the bare names.
# Getting this wrong 404s at runtime while every local test still passes.
_SITE = "https://ai-lab-for-cities-at-harvard.github.io/civic-skill-exchange"
INDEX_URL = f"{_SITE}/data/index.json"
CATEGORIES_URL = f"{_SITE}/data/categories.json"

MARKETPLACE = "civic-skill-exchange"
MARKETPLACE_REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange"


# --------------------------------------------------------------------------- #
# Loading — the published artifact, over HTTPS by default. A local path works
# too, for offline use against a checkout's own build output. Either way, a
# failure raises rather than falling back to an invented or cached catalogue.


def load_json(source: str) -> dict[str, Any]:
    if source.startswith("http://") or source.startswith("https://"):
        with urllib.request.urlopen(source, timeout=20) as response:  # noqa: S310
            return json.loads(response.read().decode("utf-8"))
    return json.loads(Path(source).read_text(encoding="utf-8"))


# --------------------------------------------------------------------------- #
# Filtering. Plain AND semantics across whichever filters were given; none of
# them validate a value against a fixed vocabulary — that check, for category,
# happens one layer up in run(), against whatever categories.json says today.


def matches(entry: dict[str, Any], category: str | None, jurisdiction: str | None,
            need: str | None) -> bool:
    if category and (entry.get("category") or "").lower() != category.lower():
        return False
    if jurisdiction and (entry.get("jurisdiction") or "").lower() != jurisdiction.lower():
        return False
    if need:
        haystack = " ".join(
            str(entry.get(field) or "")
            for field in ("id", "name", "description", "use_when", "avoid_when")
        ).lower()
        if need.lower() not in haystack:
            return False
    return True


def filter_skills(skills: list[dict[str, Any]], category: str | None = None,
                   jurisdiction: str | None = None, need: str | None = None) -> list[dict[str, Any]]:
    return [entry for entry in skills if matches(entry, category, jurisdiction, need)]


# --------------------------------------------------------------------------- #
# Tier — the rule that matters most (#9). Never call a Community listing
# vetted, verified, or safe. Never call a Reviewed listing more than one
# party's attestation to one commit.

_COMMUNITY_DEFAULT_REASON = "no review attestation"


def tier_line(entry: dict[str, Any]) -> str:
    if entry.get("tier") == "reviewed":
        reviewed = entry.get("reviewed") or {}
        reviewers = ", ".join(reviewed.get("reviewers") or []) or "the AI Lab for Cities at Harvard"
        date = reviewed.get("date", "an unrecorded date")
        expires = reviewed.get("expires", "an unrecorded date")
        return (
            f"Tier: REVIEWED — {reviewers} read this exact commit against the published "
            f"review checklist and attested to it on {date} (expires {expires}). This is "
            "one party's attestation to one commit, not an independent audit, and it does "
            "not mean anyone outside the Lab looked. See docs/TIERS.md."
        )

    reason = entry.get("reason") or _COMMUNITY_DEFAULT_REASON
    return (
        f"Tier: COMMUNITY — nobody has reviewed this listing ({reason}). It means the "
        "skill is well-formed and nothing mechanical is wrong with it, nothing more. "
        "Automated checks can only ever say no; a pass is never a statement that this "
        "skill is safe, correct, or appropriate for your jurisdiction. Read it before you "
        "run it, the way you would any code found on the internet."
    )


def scan_line(entry: dict[str, Any]) -> str:
    scan = entry.get("scan") or {}
    last_run = scan.get("last_run")
    if not last_run:
        return "Scan: no scan data available."

    blocking = scan.get("blocking") or 0
    flags = scan.get("flags") or 0
    if blocking:
        return (
            f"Scan: {blocking} BLOCKING finding(s) as of {last_run} — a listed skill "
            "should never carry one of these; treat this result as untrustworthy and "
            "report it rather than installing it."
        )
    if flags:
        signatures = ", ".join(scan.get("signatures") or []) or "unspecified"
        return f"Scan: {flags} flag(s) for human review as of {last_run} ({signatures})."
    return f"Scan: clean as of {last_run} — no blocking findings, no flags."


# --------------------------------------------------------------------------- #
# Rendering. Each result is self-contained: tier line and scan line live
# inside format_entry, not appended once by a caller who might drop them when
# only one result is relayed.


def install_lines(entry: dict[str, Any]) -> list[str]:
    """Both marketplaces, because the registry publishes both (#98) and the
    plugin name is deliberately identical in each — so the only difference a
    reader has to notice is which command their tool takes."""
    plugin = f"{entry.get('namespace')}-{entry.get('name')}"
    return [
        f"Install (Claude Code): /plugin marketplace add {MARKETPLACE_REPO} "
        "--sparse .claude-plugin skills",
        f"                        /plugin install {plugin}@{MARKETPLACE}",
        f"Install (Codex):        codex plugin marketplace add {MARKETPLACE_REPO}",
        f"                        codex plugin add {plugin}@{MARKETPLACE}",
        f"Browse / download:      {entry.get('download')}",
    ]


def format_entry(entry: dict[str, Any]) -> str:
    lines = [
        f"### {entry.get('id')}",
        (entry.get("description") or "").strip(),
        f"Category: {entry.get('category')}    Jurisdiction: {entry.get('jurisdiction')}",
    ]

    use_when = entry.get("use_when")
    if use_when:
        lines.append(f"Use when: {use_when}")

    avoid_when = entry.get("avoid_when")
    if avoid_when:
        lines.append(f"Avoid when: {avoid_when}")

    source = entry.get("source")
    if source:
        repo = source.get("repo")
        commit = source.get("commit")
        suffix = f" @ {commit[:12]}" if commit else ""
        lines.append(f"Imported from: {repo}{suffix}")

    lines.append(tier_line(entry))
    lines.append(scan_line(entry))
    lines.extend(install_lines(entry))
    return "\n".join(lines)


def format_results(entries: list[dict[str, Any]]) -> str:
    if not entries:
        return (
            "No installable skills matched. Try a broader --need, drop a filter, or "
            "run with --list-categories to see the current category vocabulary."
        )
    header = f"{len(entries)} result(s):"
    return "\n\n".join([header] + [format_entry(e) for e in entries])


def categories_help(categories: list[dict[str, Any]]) -> str:
    if not categories:
        return "No category vocabulary available."
    lines = ["Current category vocabulary:"]
    for c in categories:
        lines.append(f"  {c.get('id')} — {c.get('label')}")
    return "\n".join(lines)


# --------------------------------------------------------------------------- #
# CLI


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--category", help="a category id from the current vocabulary")
    parser.add_argument("--jurisdiction",
                         help="us-local, us-state, us-federal, intl, or generic")
    parser.add_argument("--need", help="free-text search over description and fit fields")
    parser.add_argument("--index", default=INDEX_URL,
                         help="published index.json URL, or a local file path")
    parser.add_argument("--categories", default=CATEGORIES_URL,
                         help="published categories.json URL, or a local file path")
    parser.add_argument("--list-categories", action="store_true",
                         help="print the current category vocabulary and exit")
    return parser


def run(args: argparse.Namespace) -> str:
    if args.list_categories:
        catalogue = load_json(args.categories)
        return categories_help(catalogue.get("categories") or [])

    if args.category:
        catalogue = load_json(args.categories)
        known = {c.get("id") for c in (catalogue.get("categories") or [])}
        if args.category not in known:
            return (
                f"'{args.category}' is not a category in the current vocabulary.\n\n"
                + categories_help(catalogue.get("categories") or [])
            )

    index = load_json(args.index)
    skills = index.get("skills") or []
    results = filter_skills(skills, args.category, args.jurisdiction, args.need)
    return format_results(results)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    print(run(args))
    return 0


if __name__ == "__main__":
    sys.exit(main())
