"""Tier derivation — the join between the attestation ledger and the actual tree.

This is the security-critical part of the build. A reviewer signs off on one commit
hash; anything that lets a skill wear the Reviewed badge without matching that hash
defeats the whole mechanism.
"""

from __future__ import annotations

import zipfile
from datetime import date, timedelta

import build_index
from conftest import VALID_FRONTMATTER

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


def test_entry_carries_fit_guidance_when_declared(make_skill):
    """The landing page stopped rendering the skill body, so use-when and
    avoid-when reach a reader only if the index carries them."""
    front = dict(VALID_FRONTMATTER)
    front["metadata"] = {
        **VALID_FRONTMATTER["metadata"],
        "civic.use-when": "A resident asks why their permit is stuck.",
        "civic.avoid-when": "Notices already filled with a specific person's data.",
    }
    entry = build_index.build_entry(make_skill(front=front), {}, {})
    assert entry["use_when"] == "A resident asks why their permit is stuck."
    assert entry["avoid_when"] == "Notices already filled with a specific person's data."


def test_entry_carries_fit_guidance_keys_even_when_absent(make_skill):
    """Both are optional. The site reads the keys either way, so they are always
    present and simply null — never missing."""
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["use_when"] is None
    assert entry["avoid_when"] is None


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


# --------------------------------------------------------------------------- #
# The downloadable archive
#
# The point of these is a person with a browser and nothing else: no git, no
# Node, no GitHub account. They download one file and upload it to claude.ai.


def test_archive_is_written_next_to_the_detail_payload(make_skill, tmp_path):
    skill = make_skill(files={"scripts/helper.py": "import os\n"})
    out = tmp_path / "out"
    entry = build_index.build_entry(skill, {}, {})
    build_index.write_outputs(skill, entry, out)

    archive = out / "skills" / entry["namespace"] / f"{entry['name']}.zip"
    assert archive.is_file(), "no archive written"


def test_archive_roots_at_the_skill_directory(make_skill, tmp_path):
    """Zipping a folder is what a person does by hand, and it is what unpacks
    cleanly on the other end — so the archive carries the skill directory as its
    top level rather than loose files."""
    skill = make_skill(name="example-skill", files={"references/notes.md": "hi\n"})
    out = tmp_path / "out"
    entry = build_index.build_entry(skill, {}, {})
    build_index.write_outputs(skill, entry, out)

    with zipfile.ZipFile(out / "skills" / entry["namespace"] / "example-skill.zip") as z:
        names = sorted(z.namelist())
    assert names == [
        "example-skill/SKILL.md",
        "example-skill/references/notes.md",
    ]


def test_archive_holds_exactly_what_the_detail_payload_lists(make_skill, tmp_path):
    """A file in one and not the other means the page describes something the
    download does not contain."""
    skill = make_skill(files={"scripts/a.py": "a\n", "references/b.md": "b\n"})
    out = tmp_path / "out"
    entry = build_index.build_entry(skill, {}, {})
    detail = build_index.write_outputs(skill, entry, out)

    with zipfile.ZipFile(out / "skills" / entry["namespace"] / f"{entry['name']}.zip") as z:
        in_zip = sorted(n.split("/", 1)[1] for n in z.namelist())
    assert in_zip == sorted(f["path"] for f in detail["files"])


def test_archive_content_survives_the_round_trip(make_skill, tmp_path):
    skill = make_skill(files={"scripts/helper.py": "print('hello')\n"})
    out = tmp_path / "out"
    entry = build_index.build_entry(skill, {}, {})
    build_index.write_outputs(skill, entry, out)

    with zipfile.ZipFile(out / "skills" / entry["namespace"] / f"{entry['name']}.zip") as z:
        got = z.read(f"{entry['name']}/scripts/helper.py").decode("utf-8")
    assert got == "print('hello')\n"


def test_archive_is_byte_identical_across_builds(make_skill, tmp_path):
    """A zip that embeds wall-clock timestamps changes on every build, which
    churns the Pages artifact and makes the download's bytes unstable for no
    reason. Fixed timestamps, sorted entries."""
    skill = make_skill(files={"scripts/helper.py": "import os\n"})
    entry = build_index.build_entry(skill, {}, {})

    first = tmp_path / "one"
    second = tmp_path / "two"
    build_index.write_outputs(skill, entry, first)
    build_index.write_outputs(skill, entry, second)

    a = (first / "skills" / entry["namespace"] / f"{entry['name']}.zip").read_bytes()
    b = (second / "skills" / entry["namespace"] / f"{entry['name']}.zip").read_bytes()
    assert a == b


def test_detail_reports_the_archive_so_the_page_can_state_its_size(make_skill, tmp_path):
    skill = make_skill()
    out = tmp_path / "out"
    entry = build_index.build_entry(skill, {}, {})
    detail = build_index.write_outputs(skill, entry, out)

    archive = out / "skills" / entry["namespace"] / f"{entry['name']}.zip"
    assert detail["archive"]["path"] == f"data/skills/{entry['namespace']}/{entry['name']}.zip"
    assert detail["archive"]["size"] == archive.stat().st_size


def test_archive_skips_symlinks_like_the_detail_payload_does(make_skill, tmp_path):
    skill = make_skill()
    (skill / "evil.md").symlink_to("/etc/passwd")
    out = tmp_path / "out"
    entry = build_index.build_entry(skill, {}, {})
    build_index.write_outputs(skill, entry, out)

    with zipfile.ZipFile(out / "skills" / entry["namespace"] / f"{entry['name']}.zip") as z:
        assert not any(n.endswith("evil.md") for n in z.namelist())


# --------------------------------------------------------------------------- #
# The documented payload
#
# docs/ARCHITECTURE.md prints a worked index entry. It drifted badly once —
# showing provenance fields that never existed and missing several that did —
# because nothing checked it. Now something does.


def _documented_entry() -> dict:
    """The JSON block under 'An index entry' in docs/ARCHITECTURE.md."""
    import json
    import re

    doc = (build_index.ROOT / "docs" / "ARCHITECTURE.md").read_text(encoding="utf-8")
    after = doc.split("An index entry", 1)[1]
    block = re.search(r"```json\n(.*?)```", after, re.DOTALL)
    assert block, "no JSON block found under 'An index entry'"
    # The example uses a typographic ellipsis inside strings, which is fine JSON.
    return json.loads(block.group(1))


def test_the_documented_index_entry_shows_every_field_the_build_emits(make_skill):
    real = build_index.build_entry(make_skill(), {}, {})
    documented = _documented_entry()

    # 'reviewed' only appears on a Reviewed listing, and the example is one.
    missing = set(real) - set(documented)
    assert not missing, f"docs/ARCHITECTURE.md omits emitted fields: {sorted(missing)}"


def test_the_documented_index_entry_invents_nothing(make_skill):
    real = build_index.build_entry(make_skill(), {}, {})
    documented = _documented_entry()

    # Fields only a Reviewed listing carries. Everything else must be real.
    tier_only = {"reviewed", "drift"}
    invented = set(documented) - set(real) - tier_only
    assert not invented, f"docs/ARCHITECTURE.md shows fields the build never emits: {sorted(invented)}"


def test_the_documented_provenance_block_matches(make_skill):
    real = build_index.build_entry(make_skill(), {}, {})
    documented = _documented_entry()
    assert set(documented["provenance"]) == set(real["provenance"])
