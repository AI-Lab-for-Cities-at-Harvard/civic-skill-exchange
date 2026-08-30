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
# Detail payload — what the landing page needs to answer "would I run this?"


def test_detail_carries_the_skill_body(make_skill):
    skill = make_skill(body="# Heading\n\nThe body of the skill.\n")
    detail = build_index.build_detail(skill, build_index.build_entry(skill, {}, {}))
    assert "The body of the skill." in detail["body"]


def test_detail_body_excludes_the_frontmatter(make_skill):
    """The frontmatter is already published as structured fields. Repeating it
    as raw YAML in the rendered body is noise."""
    detail = build_index.build_detail(make_skill(), build_index.build_entry(make_skill(), {}, {}))
    assert "civic.category" not in detail["body"]


def test_detail_carries_script_contents(make_skill):
    """The reviewer checklist says read every line of scripts/. Someone deciding
    whether to run a skill needs the same thing, without leaving the page."""
    skill = make_skill(files={"scripts/helper.py": "import os\nprint('hi')\n"})
    detail = build_index.build_detail(skill, build_index.build_entry(skill, {}, {}))
    files = {f["path"]: f["content"] for f in detail["files"]}
    assert files["scripts/helper.py"] == "import os\nprint('hi')\n"


def test_detail_carries_reference_files(make_skill):
    skill = make_skill(files={"references/notes.md": "# Notes\n"})
    detail = build_index.build_detail(skill, build_index.build_entry(skill, {}, {}))
    assert any(f["path"] == "references/notes.md" for f in detail["files"])


def test_detail_does_not_repeat_skill_md_as_a_file(make_skill):
    """SKILL.md is already the body. Listing it again is duplication."""
    detail = build_index.build_detail(make_skill(), build_index.build_entry(make_skill(), {}, {}))
    assert not any(f["path"] == "SKILL.md" for f in detail["files"])


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


def test_detail_files_are_sorted(make_skill):
    skill = make_skill(files={"scripts/b.py": "b\n", "scripts/a.py": "a\n"})
    detail = build_index.build_detail(skill, build_index.build_entry(skill, {}, {}))
    assert [f["path"] for f in detail["files"]] == ["scripts/a.py", "scripts/b.py"]


def test_detail_skips_a_file_too_large_to_show(make_skill):
    """A file over the display cap is named but its content withheld, so the
    page never has to render a megabyte of text."""
    skill = make_skill(files={"scripts/big.py": "x" * (build_index.MAX_DISPLAY_BYTES + 1)})
    detail = build_index.build_detail(skill, build_index.build_entry(skill, {}, {}))
    entry = next(f for f in detail["files"] if f["path"] == "scripts/big.py")
    assert entry["content"] is None
    assert entry["truncated"] is True
