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
