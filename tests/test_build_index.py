"""Tier derivation — the join between the attestation ledger and the actual tree.

This is the security-critical part of the build. A reviewer signs off on one commit
hash; anything that lets a skill wear the Reviewed badge without matching that hash
defeats the whole mechanism.
"""

from __future__ import annotations

from datetime import date, timedelta

import build_index

SHA = "a" * 40
OTHER_SHA = "b" * 40

FUTURE = (date.today() + timedelta(days=365)).isoformat()
PAST = (date.today() - timedelta(days=1)).isoformat()


def attestation(**overrides) -> dict:
    base = {
        "skill": "ns/example",
        "sha": SHA,
        "reviewers": ["alice", "bob"],
        "reviewed": "2026-01-01",
        "expires": FUTURE,
        "notes": "Read-only.",
    }
    base.update(overrides)
    return base


# --------------------------------------------------------------------------- #


def test_no_attestation_means_community():
    result = build_index.resolve_tier("ns/example", SHA, None)
    assert result["tier"] == "community"
    assert "no review attestation" in result["reason"]


def test_matching_sha_and_unexpired_means_reviewed():
    result = build_index.resolve_tier("ns/example", SHA, attestation())
    assert result["tier"] == "reviewed"
    assert result["reviewed"]["reviewers"] == ["alice", "bob"]


def test_expired_attestation_demotes():
    result = build_index.resolve_tier("ns/example", SHA, attestation(expires=PAST))
    assert result["tier"] == "community"
    assert "expired" in result["reason"]


def test_content_drift_demotes_and_is_marked():
    """The point of the whole design: content changed after review, so the
    attestation stops applying without anyone having to notice."""
    result = build_index.resolve_tier("ns/example", OTHER_SHA, attestation(sha=SHA))
    assert result["tier"] == "community"
    assert result["drift"] is True
    assert "content changed since review" in result["reason"]


def test_unverifiable_sha_demotes_rather_than_trusting():
    """If we cannot determine the skill's current commit, we cannot confirm the
    attestation still applies. Fail closed — an unverifiable Reviewed badge is
    worse than no badge, because people act on it."""
    result = build_index.resolve_tier("ns/example", None, attestation())
    assert result["tier"] == "community"


def test_expiry_is_checked_before_drift():
    """An attestation that is both expired and drifted should report as expired —
    the older, more fundamental reason."""
    result = build_index.resolve_tier("ns/example", OTHER_SHA, attestation(expires=PAST))
    assert "expired" in result["reason"]


def test_expiry_accepts_a_parsed_date_object():
    """PyYAML parses unquoted YYYY-MM-DD into a date, so both forms reach here."""
    parsed = date.fromisoformat(FUTURE)
    result = build_index.resolve_tier("ns/example", SHA, attestation(expires=parsed))
    assert result["tier"] == "reviewed"


# --------------------------------------------------------------------------- #
# Index entries


def test_allowed_tools_normalizes_a_comma_string():
    assert build_index.normalize_tools("Read, Grep , Write") == ["Read", "Grep", "Write"]


def test_allowed_tools_normalizes_a_list():
    assert build_index.normalize_tools(["Read", "Grep"]) == ["Read", "Grep"]


def test_allowed_tools_handles_absence():
    assert build_index.normalize_tools(None) == []


def test_contact_is_not_published_in_the_index(make_skill):
    """civic.contact exists so a maintainer can be reached about a security report.
    Publishing it in a static JSON file is handing it to scrapers."""
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry is not None
    assert "test@example.com" not in str(entry)


def test_entry_carries_the_fields_the_site_filters_on(make_skill):
    entry = build_index.build_entry(make_skill(), {}, {})
    for field in ("category", "jurisdiction", "data_sensitivity", "human_review", "tier"):
        assert entry[field] is not None, field


def test_skill_without_frontmatter_is_skipped_not_fatal(make_skill):
    assert build_index.build_entry(make_skill(raw="# nothing\n"), {}, {}) is None


# --------------------------------------------------------------------------- #
# Detail payload — structure only


def test_detail_lists_bundled_files(make_skill):
    skill = make_skill(files={"scripts/helper.py": "import os\n"})
    detail = build_index.build_detail(skill, build_index.build_entry(skill, {}, {}))
    assert any(f["path"] == "scripts/helper.py" for f in detail["files"])


def test_detail_includes_skill_md_in_the_structure(make_skill):
    """The page shows what the skill is made of, and SKILL.md is part of that."""
    detail = build_index.build_detail(make_skill(), build_index.build_entry(make_skill(), {}, {}))
    assert any(f["path"] == "SKILL.md" for f in detail["files"])


def test_detail_marks_which_files_are_executed(make_skill):
    """Anything under scripts/ is run by the agent, not read by the model. The
    page has to be able to say so."""
    skill = make_skill(files={
        "scripts/helper.py": "x = 1\n",
        "references/notes.md": "# Notes\n",
    })
    detail = build_index.build_detail(skill, build_index.build_entry(skill, {}, {}))
    executed = {f["path"]: f["executed"] for f in detail["files"]}
    assert executed["scripts/helper.py"] is True
    assert executed["references/notes.md"] is False


def test_detail_reports_file_sizes(make_skill):
    skill = make_skill(files={"scripts/helper.py": "x" * 128})
    detail = build_index.build_detail(skill, build_index.build_entry(skill, {}, {}))
    assert next(f for f in detail["files"] if f["path"].endswith("helper.py"))["size"] == 128


def test_detail_files_are_sorted(make_skill):
    skill = make_skill(files={"scripts/b.py": "b\n", "scripts/a.py": "a\n"})
    detail = build_index.build_detail(skill, build_index.build_entry(skill, {}, {}))
    paths = [f["path"] for f in detail["files"]]
    assert paths == sorted(paths)


def test_detail_carries_no_file_contents(make_skill):
    """The load-bearing one. Rendering submitter-authored content on our origin
    is a stored XSS surface, so the payload must not carry any of it — a future
    change that starts shipping content would be caught here."""
    skill = make_skill(files={"scripts/helper.py": "SENTINEL_STRING\n"})
    detail = build_index.build_detail(skill, build_index.build_entry(skill, {}, {}))
    assert "SENTINEL_STRING" not in str(detail)
    assert "body" not in detail
    for f in detail["files"]:
        assert "content" not in f
