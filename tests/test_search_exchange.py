"""search-the-exchange — the skill that queries the published index.

The rule that matters most (#9): a Community listing is never presented as
vetted. `tier_line` carries that statement, and `format_entry` never drops it —
a result gets quoted on its own, so the disclaimer travels with every single
entry, not with the list it came from.

This module lives under skills/civic-skills/search-the-exchange/scripts/, not
the top-level scripts/ pytest.ini already puts on the path, so it is imported
by path here.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SKILL_SCRIPTS = ROOT / "skills" / "civic-skills" / "search-the-exchange" / "scripts"
sys.path.insert(0, str(SKILL_SCRIPTS))

import search_exchange as se  # noqa: E402


# --------------------------------------------------------------------------- #
# Fixtures — shaped exactly like build_index.py's entries, not invented fields.


def community_entry(**overrides) -> dict:
    base = {
        "id": "cityofx/permit-status-explainer",
        "name": "permit-status-explainer",
        "namespace": "cityofx",
        "description": "Explains the status of a municipal building permit in plain language.",
        "category": "permitting-licensing",
        "jurisdiction": "us-local",
        "use_when": "A resident asks why their permit is stuck.",
        "avoid_when": "Not for appeals or variance questions.",
        "source": None,
        "tier": "community",
        "reason": "no review attestation",
        "download": "https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/tree/main/skills/cityofx/permit-status-explainer",
        "scan": {"last_run": "2026-08-01T00:00:00+00:00", "blocking": 0, "flags": 0, "signatures": []},
    }
    base.update(overrides)
    return base


def reviewed_entry(**overrides) -> dict:
    base = community_entry(
        tier="reviewed",
        reason="attestation matches current content",
        reviewed={
            "date": "2026-01-01",
            "expires": "2027-01-01",
            "reviewers": ["AI Lab for Cities at Harvard"],
            "notes": "Read-only. No network egress.",
        },
    )
    base.update(overrides)
    return base


# --------------------------------------------------------------------------- #
# Tier disclaimer — the rule that matters most.


def test_community_listing_says_nobody_has_reviewed_it():
    line = se.tier_line(community_entry())
    assert "nobody has reviewed" in line.lower()


def test_community_listing_carries_its_reason():
    line = se.tier_line(community_entry(reason="attestation expired 2026-01-01"))
    assert "attestation expired 2026-01-01" in line


def test_community_listing_is_never_called_vetted_or_verified():
    line = se.tier_line(community_entry()).lower()
    for word in ("vetted", "verified", "endorsed", "certified", "guarantee"):
        assert word not in line, f"community tier line must not say '{word}'"


def test_reviewed_listing_is_also_never_called_vetted_or_verified():
    """Per ADR 0001/0002: Reviewed is one party's attestation, not an
    independent audit. It must not be oversold either."""
    line = se.tier_line(reviewed_entry()).lower()
    for word in ("vetted", "verified", "endorsed", "certified", "independent audit passed"):
        assert word not in line, f"reviewed tier line must not say '{word}'"
    assert "not an independent audit" in line


def test_reviewed_listing_names_the_reviewers_and_the_pinned_commit_date():
    line = se.tier_line(reviewed_entry())
    assert "AI Lab for Cities at Harvard" in line
    assert "2026-01-01" in line


def test_a_result_quoted_on_its_own_still_carries_its_disclaimer():
    """format_entry is what gets relayed for a single result — the disclaimer
    must be inside it, not bolted on separately by a caller who might forget."""
    entry = community_entry()
    assert se.tier_line(entry) in se.format_entry(entry)


def test_every_entry_in_a_list_carries_its_own_disclaimer_not_one_shared_one():
    entries = [community_entry(id="a/one"), community_entry(id="a/two"), reviewed_entry(id="a/three")]
    rendered = se.format_results(entries)
    assert rendered.count("nobody has reviewed") == 2
    assert "not an independent audit" in rendered


def test_format_entry_fails_if_disclaimer_is_missing():
    """A regression guard: if format_entry ever stops including tier_line's
    text, this must fail loudly rather than silently rendering a bare result."""
    entry = community_entry()
    rendered = se.format_entry(entry)
    assert "Tier" in rendered
    assert se.tier_line(entry) in rendered


# --------------------------------------------------------------------------- #
# Scan status


def test_scan_status_reports_flags_and_when_it_ran():
    entry = community_entry(scan={
        "last_run": "2026-08-01T00:00:00+00:00", "blocking": 0, "flags": 2,
        "signatures": ["external-url", "network-in-script"],
    })
    line = se.scan_line(entry)
    assert "2" in line
    assert "2026-08-01" in line
    assert "external-url" in line


def test_scan_status_handles_missing_scan_data_honestly():
    entry = community_entry(scan={"last_run": None, "blocking": None, "flags": None, "signatures": []})
    line = se.scan_line(entry)
    assert "no scan data" in line.lower()


def test_scan_status_calls_out_blocking_findings_defensively():
    entry = community_entry(scan={
        "last_run": "2026-08-01T00:00:00+00:00", "blocking": 1, "flags": 0, "signatures": [],
    })
    line = se.scan_line(entry)
    assert "blocking" in line.lower()


# --------------------------------------------------------------------------- #
# Filtering


def test_filter_by_category():
    skills = [community_entry(id="a/one", category="permitting-licensing"),
              community_entry(id="a/two", category="budget-finance")]
    result = se.filter_skills(skills, category="budget-finance")
    assert [e["id"] for e in result] == ["a/two"]


def test_filter_by_jurisdiction_is_case_insensitive():
    skills = [community_entry(id="a/one", jurisdiction="us-local"),
              community_entry(id="a/two", jurisdiction="generic")]
    result = se.filter_skills(skills, jurisdiction="US-LOCAL")
    assert [e["id"] for e in result] == ["a/one"]


def test_filter_by_need_matches_description():
    skills = [
        community_entry(id="a/one", name="one", description="Explains permit status.",
                         use_when=None, avoid_when=None),
        community_entry(id="a/two", name="two", description="Rewrites a budget memo.",
                         use_when=None, avoid_when=None),
    ]
    result = se.filter_skills(skills, need="permit")
    assert [e["id"] for e in result] == ["a/one"]


def test_filter_by_need_matches_avoid_when_too():
    skills = [community_entry(id="a/one", avoid_when="Not for immigration cases."),
              community_entry(id="a/two", avoid_when="Not for budget appeals.")]
    result = se.filter_skills(skills, need="immigration")
    assert [e["id"] for e in result] == ["a/one"]


def test_filters_combine_with_and_not_or():
    skills = [community_entry(id="a/one", category="permitting-licensing", jurisdiction="us-local"),
              community_entry(id="a/two", category="permitting-licensing", jurisdiction="generic")]
    result = se.filter_skills(skills, category="permitting-licensing", jurisdiction="generic")
    assert [e["id"] for e in result] == ["a/two"]


def test_no_matches_returns_empty_list_not_an_error():
    assert se.filter_skills([community_entry()], category="nothing-like-this") == []


# --------------------------------------------------------------------------- #
# Source provenance, when present


def test_source_is_surfaced_when_present():
    entry = community_entry(source={"repo": "originalorg/original-skill", "commit": "a" * 40})
    rendered = se.format_entry(entry)
    assert "originalorg/original-skill" in rendered


def test_source_absent_produces_no_source_line():
    entry = community_entry(source=None)
    rendered = se.format_entry(entry)
    assert "originalorg" not in rendered


# --------------------------------------------------------------------------- #
# Category vocabulary — read at runtime, never restated. #102 is about to
# change registry/categories.yml, so a hardcoded list here would be a bug the
# moment it lands.


def test_categories_help_reflects_exactly_what_it_was_given():
    """Feeding a vocabulary the real registry does not have proves nothing is
    hardcoded inside this module — whatever categories.json says, is what
    shows."""
    made_up = [{"id": "invented-category", "label": "Invented Category"}]
    help_text = se.categories_help(made_up)
    assert "invented-category" in help_text
    assert "Invented Category" in help_text
    # And nothing from the real vocabulary leaked in from a bundled copy.
    assert "permitting-licensing" not in help_text


def test_filtering_works_against_whatever_category_the_index_holds():
    """The filter itself never validates against a fixed list — that check, if
    any, happens one layer up against the live vocabulary, not here."""
    skills = [community_entry(id="a/one", category="invented-category")]
    assert se.filter_skills(skills, category="invented-category") == [
        skills[0]
    ]


# --------------------------------------------------------------------------- #
# End-to-end: load_json works against a local file (no network needed for
# tests), and run() wires filtering, vocabulary-checking and rendering together.


def test_load_json_reads_a_local_file(tmp_path):
    path = tmp_path / "index.json"
    path.write_text(json.dumps({"skills": [community_entry()]}), encoding="utf-8")
    data = se.load_json(str(path))
    assert data["skills"][0]["id"] == "cityofx/permit-status-explainer"


def test_run_reports_unknown_category_against_the_live_vocabulary(tmp_path):
    index_path = tmp_path / "index.json"
    categories_path = tmp_path / "categories.json"
    index_path.write_text(json.dumps({"skills": [community_entry()]}), encoding="utf-8")
    categories_path.write_text(
        json.dumps({"categories": [{"id": "permitting-licensing", "label": "Permitting & Licensing"}]}),
        encoding="utf-8",
    )
    args = se.build_parser().parse_args([
        "--category", "not-a-real-category",
        "--index", str(index_path),
        "--categories", str(categories_path),
    ])
    output = se.run(args)
    assert "not-a-real-category" in output
    assert "permitting-licensing" in output


def test_run_returns_matching_results_with_disclaimers(tmp_path):
    index_path = tmp_path / "index.json"
    categories_path = tmp_path / "categories.json"
    index_path.write_text(
        json.dumps({"skills": [community_entry(), reviewed_entry(id="cityofx/other")]}),
        encoding="utf-8",
    )
    categories_path.write_text(
        json.dumps({"categories": [{"id": "permitting-licensing", "label": "Permitting & Licensing"}]}),
        encoding="utf-8",
    )
    args = se.build_parser().parse_args([
        "--category", "permitting-licensing",
        "--index", str(index_path),
        "--categories", str(categories_path),
    ])
    output = se.run(args)
    assert "cityofx/permit-status-explainer" in output
    assert "cityofx/other" in output
    assert output.count("nobody has reviewed") == 1
    assert "not an independent audit" in output


def test_run_with_no_matches_says_so_and_does_not_invent_a_result(tmp_path):
    index_path = tmp_path / "index.json"
    index_path.write_text(json.dumps({"skills": [community_entry()]}), encoding="utf-8")
    args = se.build_parser().parse_args([
        "--need", "something no skill describes",
        "--index", str(index_path),
    ])
    output = se.run(args)
    assert "cityofx/permit-status-explainer" not in output
    assert "no" in output.lower()


def test_list_categories_flag_does_not_touch_the_index(tmp_path):
    categories_path = tmp_path / "categories.json"
    categories_path.write_text(
        json.dumps({"categories": [{"id": "budget-finance", "label": "Budget & Finance"}]}),
        encoding="utf-8",
    )
    args = se.build_parser().parse_args([
        "--list-categories",
        "--categories", str(categories_path),
        "--index", "https://should-not-be-fetched.invalid/index.json",
    ])
    output = se.run(args)
    assert "budget-finance" in output


# --------------------------------------------------------------------------- #
# The published artifacts are under /data/. This was wrong on the first pass —
# the URLs used the bare filenames, which 404 against the live site while every
# test using a local path still passed.


def test_the_default_urls_point_at_what_is_actually_published() -> None:
    import re
    source = (ROOT / "skills" / "civic-skills" / "search-the-exchange"
              / "scripts" / "search_exchange.py").read_text(encoding="utf-8")
    for name, expected in [("INDEX_URL", "/data/index.json"),
                           ("CATEGORIES_URL", "/data/categories.json")]:
        line = next(l for l in source.split("\n") if l.startswith(f"{name} ="))
        assert expected in line, f"{name} must end in {expected}, got: {line}"


def test_the_build_really_writes_to_that_path() -> None:
    """Pins the other half: if the deploy stops writing into site/public/data,
    the URLs above become wrong and this says so."""
    build = (ROOT / ".github" / "workflows" / "build.yml").read_text(encoding="utf-8")
    assert "--out site/public/data" in build


def test_a_result_offers_both_marketplaces() -> None:
    """The registry publishes a Claude and a Codex marketplace (#98) with the
    same plugin name in each. A result that names only one sends half the
    audience to the wrong tool."""
    sys.path.insert(0, str(SKILL_SCRIPTS))
    import search_exchange

    lines = search_exchange.install_lines(
        {"namespace": "cityofx", "name": "permit-status", "download": "https://example.test"})
    joined = "\n".join(lines)
    assert "/plugin install cityofx-permit-status@" in joined
    assert "codex plugin add cityofx-permit-status@" in joined
