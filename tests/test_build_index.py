"""Tier derivation — the join between the attestation ledger and the actual tree.

This is the security-critical part of the build. A reviewer signs off on one commit
hash; anything that lets a skill wear the Reviewed badge without matching that hash
defeats the whole mechanism.
"""

from __future__ import annotations

import json
import zipfile
from datetime import date, timedelta

import pytest

import build_index
import conftest
from conftest import VALID_FRONTMATTER, inner

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
# The languages a reviewer verified (#146).
#
# "Verified in Spanish" can only honestly come from the reviewer (ADR 0004
# ruling 2), so this is derived under exactly the condition that yields
# tier: reviewed — a stale, expired, or unresolvable attestation gets null,
# never the languages it once verified.


def test_a_current_attestation_carries_the_languages_it_verified():
    result = build_index.resolve_tier("ns/example", SHA, attestation(languages=["en", "es"]))
    assert result["tier"] == "reviewed"
    assert result["verified_languages"] == ["en", "es"]


def test_a_stale_sha_yields_no_verified_languages():
    result = build_index.resolve_tier(
        "ns/example", OTHER_SHA, attestation(sha=SHA, languages=["en", "es"]))
    assert result["tier"] == "community"
    assert result["verified_languages"] is None


def test_an_expired_attestation_yields_no_verified_languages():
    result = build_index.resolve_tier(
        "ns/example", SHA, attestation(expires=PAST, languages=["en", "es"]))
    assert result["tier"] == "community"
    assert result["verified_languages"] is None


def test_no_languages_field_on_a_current_attestation_is_null_not_invented():
    """No `languages:` on the attestation means null, never the language the
    skill happens to be written in — that would be fabricating a verification
    nobody performed."""
    result = build_index.resolve_tier("ns/example", SHA, attestation())
    assert result["tier"] == "reviewed"
    assert result["verified_languages"] is None


def test_no_attestation_at_all_yields_no_verified_languages():
    result = build_index.resolve_tier("ns/example", SHA, None)
    assert result["verified_languages"] is None


# --------------------------------------------------------------------------- #
# Index entries


def test_allowed_tools_normalizes_a_comma_string():
    assert build_index.normalize_tools("Read, Grep , Write") == ["Read", "Grep", "Write"]


def test_allowed_tools_normalizes_a_list():
    assert build_index.normalize_tools(["Read", "Grep"]) == ["Read", "Grep"]


def test_allowed_tools_handles_absence():
    assert build_index.normalize_tools(None) == []


def test_no_contact_address_is_published(make_skill):
    """civic.contact is gone (#95), but a listing may still carry one while it
    is migrated — an unknown civic.* key is quarantined rather than rejected.
    Publishing it in a static JSON file would hand it to scrapers, so the index
    must not pick it up whatever a SKILL.md says."""
    skill = make_skill(overrides={"metadata": dict(
        conftest.VALID_FRONTMATTER["metadata"],
        **{"civic.contact": "harvest-me@example.gov"})})
    entry = build_index.build_entry(skill, {}, {})
    assert entry is not None
    assert "harvest-me@example.gov" not in str(entry)


def test_entry_carries_the_fields_the_site_filters_on(make_skill):
    entry = build_index.build_entry(make_skill(), {}, {})
    for field in ("category", "scope", "data_sensitivity", "human_review", "tier"):
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
    (inner(skill) / "evil.md").symlink_to("/etc/passwd")
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


def test_source_fields_reach_the_index(make_skill, monkeypatch):
    """#63: an imported skill records where the copy came from, and the site
    needs it to show the link. Nothing in the build resolves it — a listing
    stays valid when its upstream is deleted."""
    import build_index

    front = dict(VALID_FRONTMATTER)
    front["metadata"] = dict(front["metadata"])
    front["metadata"]["civic.source-repo"] = "sgarcese/Civic-Analytics-Agent-Workflow"
    front["metadata"]["civic.source-commit"] = "a" * 40
    skill_dir = make_skill(front=front)

    monkeypatch.setattr(build_index, "head_sha", lambda _: "b" * 40)
    entry = build_index.build_entry(skill_dir, {}, {})

    assert entry["source"] == {
        "repo": "sgarcese/Civic-Analytics-Agent-Workflow",
        "commit": "a" * 40,
    }


def test_a_skill_with_no_upstream_publishes_none(make_skill, monkeypatch):
    """Most skills are written here. `source` is absent rather than an object of
    nulls, so the site can test one thing."""
    import build_index

    monkeypatch.setattr(build_index, "head_sha", lambda _: "b" * 40)
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["source"] is None


# --------------------------------------------------------------------------- #
# The published contract.
#
# A skill that asks the registry what a submission needs
# rather than carrying a copy of the answer (#10). It runs on somebody else's
# machine, so "ask" means fetch a published file — the same way search-the-
# exchange reads index.json rather than the tree.


def test_the_schema_is_published_alongside_the_index(tmp_path, monkeypatch):
    out = tmp_path / "out"
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "empty")
    build_index.main_with(out)

    published = out / "skill.schema.json"
    assert published.is_file(), "the schema is not published, so nothing can read it"


def test_the_published_schema_is_the_repository_schema_byte_for_byte(tmp_path, monkeypatch):
    """A transformed copy is a second source of truth. This is the same file."""
    out = tmp_path / "out"
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "empty")
    build_index.main_with(out)

    source = build_index.ROOT / "schema" / "skill.schema.json"
    assert (out / "skill.schema.json").read_bytes() == source.read_bytes()


# --------------------------------------------------------------------------- #
# The second category (#102).
#
# index.json is a published API, so the field has to appear whether or not a
# skill sets it — a key that comes and goes makes every consumer defensive.


def test_the_entry_carries_the_secondary_category_when_declared(make_skill):
    skill = make_skill(overrides={"metadata": dict(
        conftest.VALID_FRONTMATTER["metadata"],
        **{"civic.category-secondary": "benefits-eligibility"})})
    entry = build_index.build_entry(skill, {}, {})
    assert entry["category"] == "finance"
    assert entry["category_secondary"] == "benefits-eligibility"


def test_the_entry_carries_the_key_even_when_absent(make_skill):
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["category_secondary"] is None


def test_the_plugin_manifest_takes_the_primary_only(make_skill):
    """A plugin manifest carries exactly one category, in Claude and in Codex."""
    skill = make_skill(overrides={"metadata": dict(
        conftest.VALID_FRONTMATTER["metadata"],
        **{"civic.category-secondary": "benefits-eligibility"})})
    import build_marketplace

    manifest = build_marketplace.codex_plugin(skill)
    assert manifest["interface"]["category"] == "Finance"


# --------------------------------------------------------------------------- #
# History, derived from git (#77).
#
# The declared version is a claim; this is a fact. An adopter reading a listing
# could not tell a skill maintained last week from one abandoned in March, and
# the history was already on disk — build.yml checks out with fetch-depth: 0
# because head_sha() needs it.
#
# Every value is null-safe. A shallow clone, a path outside the repository, or a
# skill whose directory git has never seen all return None rather than raising,
# because an index that cannot be built is worse than one that says it does not
# know.


@pytest.fixture
def git_skill(tmp_path, monkeypatch):
    """A skill with a real history: added, then touched twice."""
    import subprocess

    def run(*args):
        subprocess.run(["git", *args], cwd=tmp_path, check=True,
                       capture_output=True)

    skill = tmp_path / "skills" / "cityofx" / "permit-status-explainer"
    inner(skill).mkdir(parents=True)
    (inner(skill) / "SKILL.md").write_text(
        conftest.render_frontmatter(dict(
            conftest.VALID_FRONTMATTER, name="permit-status-explainer"))
        + "\n\nBody.\n", encoding="utf-8")
    run("init", "-q", "-b", "main")
    run("-c", "user.email=t@e.x", "-c", "user.name=T", "add", "-A")
    run("-c", "user.email=t@e.x", "-c", "user.name=T", "commit", "-q",
        "-m", "Add the permit explainer (#12)")
    for n in (1, 2):
        (inner(skill) / f"note{n}.md").write_text("x\n", encoding="utf-8")
        run("-c", "user.email=t@e.x", "-c", "user.name=T", "add", "-A")
        run("-c", "user.email=t@e.x", "-c", "user.name=T", "commit", "-q",
            "-m", f"Touch it again ({n})")

    monkeypatch.setattr(build_index, "ROOT", tmp_path)
    return skill


def test_the_entry_says_when_the_skill_arrived(git_skill):
    entry = build_index.build_entry(git_skill, {}, {})
    assert entry["history"]["first_seen"] is not None
    assert entry["history"]["first_seen"].startswith("20")


def test_the_entry_says_when_it_last_changed(git_skill):
    entry = build_index.build_entry(git_skill, {}, {})
    assert entry["history"]["last_changed"] is not None


def test_the_entry_counts_how_many_times_it_has_been_touched(git_skill):
    entry = build_index.build_entry(git_skill, {}, {})
    assert entry["history"]["commits"] == 3


def test_the_entry_carries_the_pull_request_that_introduced_it(git_skill):
    """This repository squash-merges and the merge subject ends (#N), so it can
    be read from the commit message. No network and no token — an index build
    that needed the GitHub API would fail differently, and more often."""
    entry = build_index.build_entry(git_skill, {}, {})
    assert entry["history"]["pull_request"] == 12


def test_history_is_null_safe_when_git_cannot_answer(make_skill):
    """make_skill builds outside any repository. Every value is None and the
    build completes — an index that cannot be built is worse than one that says
    it does not know."""
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["history"] == {
        "first_seen": None, "last_changed": None, "commits": None,
        "pull_request": None,
    }


def test_nothing_derived_here_can_influence_the_tier(git_skill):
    """Thirty commits means churn, not care. History must never reach tier."""
    entry = build_index.build_entry(git_skill, {}, {})
    assert entry["tier"] == "community"
    assert entry["history"]["commits"] == 3

    resolved = build_index.resolve_tier("cityofx/permit-status-explainer",
                                        entry["sha"], None)
    assert resolved["tier"] == "community"


def test_a_declared_version_is_published_as_the_authors_claim(make_skill):
    skill = make_skill(overrides={"metadata": dict(
        conftest.VALID_FRONTMATTER["metadata"], version="2.1")})
    entry = build_index.build_entry(skill, {}, {})
    assert entry["version"] == "2.1"


def test_a_missing_version_is_published_as_absent_rather_than_invented(make_skill):
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["version"] is None


def test_history_does_not_order_the_catalogue():
    """The index is sorted by id and nothing else. Ordering by recency would
    make the catalogue a leaderboard, which is the same thing #48 must not
    become and the same reason history may not reach tier."""
    import inspect

    source = inspect.getsource(build_index.main_with)
    ordering = [line for line in source.splitlines() if '"skills":' in line]
    assert ordering, "could not find where the index is ordered"
    assert 'key=lambda e: e["id"]' in ordering[0], ordering[0]
    for field in ("history", "first_seen", "last_changed", "commits", "version"):
        assert field not in ordering[0]


# --------------------------------------------------------------------------- #
# What runs rather than what is read (#151).
#
# `scripts/` is what a single skill runs. #151 also kept a root `.mcp.json`,
# when the skill directory was the Claude plugin root; in the nested layout it
# is not (ADR 0006), no client reads a server config inside skills/{name}/, and
# a skill with an MCP server is a plugin (decision 5).


def test_a_server_config_in_the_authors_directory_is_not_published_as_executed(make_skill):
    """L0 refuses it, and nothing launches it, so the page must not say the
    listing runs it."""
    skill = make_skill(files={".mcp.json": '{"mcpServers": {}}\n'})
    entry = build_index.build_entry(skill, {}, {})
    detail = build_index.build_detail(skill, entry)
    assert {f["path"]: f["executed"] for f in detail["files"]}[".mcp.json"] is False
    assert entry["script_files"] == []
    assert entry["has_scripts"] is False


def test_a_skill_that_runs_nothing_says_so(make_skill):
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["has_scripts"] is False
    assert entry["script_files"] == []


def test_an_mcp_config_below_the_root_is_documentation(make_skill):
    """A copy under references/ is an example, which nothing launches."""
    skill = make_skill(files={"references/.mcp.json": "{}\n"})
    entry = build_index.build_entry(skill, {}, {})
    detail = build_index.build_detail(skill, entry)
    assert entry["script_files"] == []
    executed = {f["path"]: f["executed"] for f in detail["files"]}
    assert executed["references/.mcp.json"] is False


def test_the_index_and_the_detail_agree_on_what_runs(make_skill):
    """Two lists of executed files would drift, and the page and the catalogue
    would then disagree about what a listing does."""
    skill = make_skill(files={
        "scripts/a.py": "a\n", "scripts/b.sh": "b\n", "references/b.md": "b\n",
    })
    entry = build_index.build_entry(skill, {}, {})
    detail = build_index.build_detail(skill, entry)
    assert sorted(f["path"] for f in detail["files"] if f["executed"]) == entry["script_files"]


# --------------------------------------------------------------------------- #
# #156: SHA drift demotes a listing silently as far as the build is concerned
# — the index still has to build, that is the point — but nothing downstream
# could act on it. `rescan.yml` opened an issue only on a validate or scan
# failure, so a re-scan that found nothing but a stale attestation reported
# nothing. `--drift-out` is the machine-readable half: a JSON document a
# workflow step can read without parsing build output.


def _drift_fixture(make_skill, tmp_path, monkeypatch, *, current_sha: str,
                    attested_sha: str = SHA):
    """One skill, with git resolution and the attestation ledger both faked so
    the test controls the join directly rather than needing a real repository
    and a real registry/reviewed.yml."""
    skill = make_skill(namespace="cityofx", name="permit-status-explainer",
                        front=dict(VALID_FRONTMATTER, name="permit-status-explainer"))
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "skills")
    monkeypatch.setattr(build_index, "head_sha", lambda _: current_sha)
    monkeypatch.setattr(
        build_index, "load_attestations",
        lambda: {"cityofx/permit-status-explainer": attestation(sha=attested_sha)},
    )
    return skill


def test_a_stale_attestation_builds_the_index_and_reports_the_drift(make_skill, tmp_path, monkeypatch):
    _drift_fixture(make_skill, tmp_path, monkeypatch, current_sha=OTHER_SHA, attested_sha=SHA)

    out = tmp_path / "out"
    drift_out = tmp_path / "drift.json"
    code = build_index.main_with(out, drift_out=drift_out)

    assert code == 0, "drift must not fail the build"

    index = json.loads((out / "index.json").read_text(encoding="utf-8"))
    entry = next(e for e in index["skills"] if e["id"] == "cityofx/permit-status-explainer")
    assert entry["tier"] == "community"

    drift = json.loads(drift_out.read_text(encoding="utf-8"))
    assert drift == [{"id": "cityofx/permit-status-explainer", "reason": entry["reason"]}]


def test_a_current_attestation_reports_no_drift(make_skill, tmp_path, monkeypatch):
    _drift_fixture(make_skill, tmp_path, monkeypatch, current_sha=SHA, attested_sha=SHA)

    out = tmp_path / "out"
    drift_out = tmp_path / "drift.json"
    build_index.main_with(out, drift_out=drift_out)

    index = json.loads((out / "index.json").read_text(encoding="utf-8"))
    entry = next(e for e in index["skills"] if e["id"] == "cityofx/permit-status-explainer")
    assert entry["tier"] == "reviewed"

    assert json.loads(drift_out.read_text(encoding="utf-8")) == []


def test_drift_out_is_written_even_when_not_asked_for_nothing_when_absent(make_skill, tmp_path, monkeypatch):
    """No `--drift-out` means no file — a caller that never passes the flag
    must not find one anyway, from a previous run or another test."""
    _drift_fixture(make_skill, tmp_path, monkeypatch, current_sha=SHA, attested_sha=SHA)

    out = tmp_path / "out"
    build_index.main_with(out)

    assert not (tmp_path / "drift.json").exists()


# --------------------------------------------------------------------------- #
# The declared language (#145)
#
# index.json is a published API, so both keys appear whether or not a listing
# fills them in — a key that comes and goes makes every consumer defensive.
# Neither is verification: languages_tested is the author's claim, and the
# reviewer's verified list lives on the attestation.


def _with_meta(make_skill, **extra):
    return make_skill(overrides={"metadata": dict(
        conftest.VALID_FRONTMATTER["metadata"], **extra)})


def test_the_entry_carries_the_language_the_listing_is_written_in(make_skill):
    skill = _with_meta(make_skill, **{"civic.language": "es"})
    entry = build_index.build_entry(skill, {}, {})
    assert entry["language"] == "es"


def test_the_language_key_is_present_even_when_the_listing_omits_it(make_skill):
    """A listing predating the field, or one that slipped past the validator.
    The site reads the key either way."""
    front = dict(VALID_FRONTMATTER)
    front["metadata"] = {
        k: v for k, v in VALID_FRONTMATTER["metadata"].items()
        if k != "civic.language"
    }
    entry = build_index.build_entry(make_skill(front=front), {}, {})
    assert entry["language"] is None


def test_the_tested_languages_are_published_as_a_list(make_skill):
    skill = _with_meta(
        make_skill, **{"civic.language": "en", "civic.languages-tested": "en, es"})
    entry = build_index.build_entry(skill, {}, {})
    assert entry["languages_tested"] == ["en", "es"]


def test_tested_languages_are_null_when_the_author_claimed_nothing(make_skill):
    """Null rather than an empty list: 'I did not answer' and 'I tested it in
    nothing' are different statements, and only one of them is honest."""
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["languages_tested"] is None


def test_a_single_tested_language_is_still_a_list(make_skill):
    skill = _with_meta(
        make_skill, **{"civic.language": "en", "civic.languages-tested": "en"})
    entry = build_index.build_entry(skill, {}, {})
    assert entry["languages_tested"] == ["en"]


def test_tested_languages_tolerate_the_spacing_an_author_used(make_skill):
    skill = _with_meta(
        make_skill, **{"civic.language": "en", "civic.languages-tested": "en,es"})
    entry = build_index.build_entry(skill, {}, {})
    assert entry["languages_tested"] == ["en", "es"]


def test_the_detail_payload_carries_both_language_fields(make_skill):
    skill = _with_meta(
        make_skill, **{"civic.language": "es", "civic.languages-tested": "es, en"})
    entry = build_index.build_entry(skill, {}, {})
    detail = build_index.build_detail(skill, entry)
    assert detail["language"] == "es"
    assert detail["languages_tested"] == ["es", "en"]


def test_the_declared_language_cannot_reach_the_tier(make_skill):
    """A language is metadata, not verification. ADR 0004."""
    skill = _with_meta(
        make_skill, **{"civic.language": "es", "civic.languages-tested": "es, en"})
    entry = build_index.build_entry(skill, {}, {})
    assert entry["tier"] == "community"
    assert entry["reason"] == "no review attestation"


# --------------------------------------------------------------------------- #
# The languages a reviewer verified, reaching the entry and the detail payload
# (#146). resolve_tier's own derivation is covered above; this is the join
# through build_entry, where the ledger is keyed by skill id.


def test_verified_languages_key_is_present_even_when_absent(make_skill):
    """Published API: the key is always there, just like languages_tested."""
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["verified_languages"] is None


def test_entry_carries_the_languages_a_reviewer_verified(make_skill, monkeypatch):
    skill = make_skill(namespace="cityofx", name="permit-status-explainer",
                        front=dict(VALID_FRONTMATTER, name="permit-status-explainer"))
    monkeypatch.setattr(build_index, "head_sha", lambda _: SHA)
    entry = build_index.build_entry(
        skill,
        {"cityofx/permit-status-explainer": attestation(
            skill="cityofx/permit-status-explainer", languages=["en", "es"])},
        {},
    )
    assert entry["tier"] == "reviewed"
    assert entry["verified_languages"] == ["en", "es"]


def test_the_detail_payload_carries_verified_languages(make_skill, monkeypatch):
    skill = make_skill(namespace="cityofx", name="permit-status-explainer",
                        front=dict(VALID_FRONTMATTER, name="permit-status-explainer"))
    monkeypatch.setattr(build_index, "head_sha", lambda _: SHA)
    entry = build_index.build_entry(
        skill,
        {"cityofx/permit-status-explainer": attestation(
            skill="cityofx/permit-status-explainer", languages=["en", "es"])},
        {},
    )
    detail = build_index.build_detail(skill, entry)
    assert detail["verified_languages"] == ["en", "es"]


# --------------------------------------------------------------------------- #
# The vocabulary in two languages (#150).
#
# ADR 0004 decision 4 puts the site in Spanish, and the category vocabulary is
# the one set of reader-facing strings that is not in the site's string table:
# registry/categories.yml is the single source of truth for it, and the site is
# held to that file rather than allowed to keep its own copy. So the Spanish
# labels go beside the English ones in the same file, and are published in the
# same categories.json — one vocabulary, two languages, not two vocabularies.


def _vocabulary() -> list[dict]:
    return build_index.load_categories()


def test_every_category_carries_a_spanish_label_and_description():
    missing = [
        c["id"] for c in _vocabulary()
        if not c.get("label_es") or not c.get("description_es")
    ]
    assert missing == [], (
        "these categories have no Spanish label or description in "
        "registry/categories.yml: " + ", ".join(missing)
    )


def test_the_english_label_and_description_are_still_there():
    """The Spanish keys are additive. build_marketplace.py reads `label`, the
    schema points at this file, and both manifests are generated from it — a
    rename here is a manifest rewrite, which is not what #150 is."""
    for c in _vocabulary():
        assert c.get("label"), c["id"]
        assert c.get("description"), c["id"]


def test_the_published_vocabulary_carries_both_languages(tmp_path, monkeypatch):
    """categories.json is what the browser reads. The About page's field tables
    render the reader's own language, so the published file has to carry it."""
    out = tmp_path / "out"
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "empty")
    build_index.main_with(out)

    published = json.loads((out / "categories.json").read_text(encoding="utf-8"))
    assert published["categories"] == _vocabulary(), (
        "categories.json is not the vocabulary file's own content — a "
        "transformed copy is a second source of truth"
    )
    for c in published["categories"]:
        assert c["label_es"], c["id"]
        assert c["description_es"], c["id"]


# --------------------------------------------------------------------------- #
# A locale reaches no skill archive (#150).
#
# ADR 0004 decision 5: a skill archive is byte-identical whether the site has
# one locale or five. Skills are what people download, and a zip that changed
# because somebody added a language would be a change nobody could explain.
#
# The guarantee is structural rather than a recorded hash: the archive is built
# from the skill directory, its entries carry a fixed timestamp, and this script
# reads no part of the site. So what is asserted is that last clause, which is
# the only one a future change could quietly break.


def test_the_build_reads_nothing_from_the_site():
    """Read as syntax, not as text: `--out` defaults to a directory under
    site/, which is where the build *writes*, and a grep for the word would
    flag it."""
    import ast

    tree = ast.parse((conftest.ROOT / "scripts" / "build_index.py").read_text(
        encoding="utf-8"))

    imported = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported += [a.name for a in node.names]
        elif isinstance(node, ast.ImportFrom):
            imported.append(node.module or "")
    assert [m for m in imported if "site" in m or "i18n" in m] == [], imported

    named = [
        node.value for node in ast.walk(tree)
        if isinstance(node, ast.Constant) and isinstance(node.value, str)
        and ("site/src" in node.value or "i18n" in node.value)
    ]
    assert named == [], (
        "build_index.py names something under site/src, so a change to the "
        "site could change a skill archive: " + " | ".join(named)
    )


def test_the_archive_is_built_from_the_skill_directory_alone(make_skill, tmp_path,
                                                             monkeypatch):
    """Two builds of the same skill produce the same bytes, and the only input
    is the directory. A wall-clock timestamp in the zip would fail this."""
    make_skill(files={"scripts/run.py": "print('hello')\n"})
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "skills")

    first, second = tmp_path / "one", tmp_path / "two"
    build_index.main_with(first)
    build_index.main_with(second)

    archives = sorted(p.relative_to(first) for p in first.rglob("*.zip"))
    assert archives, "no archive was written, so this test is checking nothing"
    for name in archives:
        assert (first / name).read_bytes() == (second / name).read_bytes(), name


# --------------------------------------------------------------------------- #
# Plugins (ADR 0005)


def test_a_plugin_entry_describes_its_skills_and_servers(make_plugin):
    plugin = make_plugin(manifest={"version": "0.2.0", "keywords": ["housing"]},
                         files={"skills/build-dashboard/scripts/render.py": "print(1)\n"})
    entry = build_index.build_plugin_entry(plugin, {}, {})
    assert entry["kind"] == "plugin"
    assert entry["id"] == "testuser/housing-dashboards"
    assert entry["version"] == "0.2.0"
    assert entry["maintainer"] == "Plugin Maintainer"
    assert [s["name"] for s in entry["skills"]] == ["build-dashboard", "write-brief"]
    assert entry["categories"] == ["finance"]
    assert entry["mcp_servers"] == [
        {"name": "census", "type": "streamable-http", "target": "census.example.org"}]
    assert entry["script_files"] == ["mcp.json", "skills/build-dashboard/scripts/render.py"]
    assert entry["path"] == "plugins/testuser/housing-dashboards"
    assert entry["tier"] == "community"


def test_a_plugin_reports_its_most_sensitive_skill(make_plugin):
    plugin = make_plugin(skills=["a", "b"])
    path = plugin / "skills/b/SKILL.md"
    path.write_text(path.read_text(encoding="utf-8").replace(
        'civic.data-sensitivity: "none"', 'civic.data-sensitivity: "pii"'), encoding="utf-8")
    assert build_index.build_plugin_entry(plugin, {}, {})["data_sensitivity"] == "pii"


def test_a_plugin_is_reviewed_only_by_a_plugin_attestation(make_plugin, monkeypatch):
    plugin = make_plugin()
    monkeypatch.setattr(build_index, "head_sha", lambda _: "a" * 40)
    attestation = {"sha": "a" * 40, "expires": "2999-01-01", "reviewed": "2026-01-01"}
    as_skill = {"testuser/housing-dashboards": attestation}
    as_plugin = {build_index.plugin_key("testuser/housing-dashboards"): attestation}
    assert build_index.build_plugin_entry(plugin, as_skill, {})["tier"] == "community"
    assert build_index.build_plugin_entry(plugin, as_plugin, {})["tier"] == "reviewed"


def test_the_ledger_files_a_plugin_attestation_apart(monkeypatch, tmp_path):
    ledger = tmp_path / "registry" / "reviewed.yml"
    ledger.parent.mkdir()
    ledger.write_text(
        "attestations:\n"
        " - skill: \"a/b\"\n   sha: \"1\"\n"
        " - plugin: \"a/b\"\n   sha: \"2\"\n", encoding="utf-8")
    monkeypatch.setattr(build_index, "ROOT", tmp_path)
    ledger_by_key = build_index.load_attestations()
    assert ledger_by_key["a/b"]["sha"] == "1"
    assert ledger_by_key["plugin:a/b"]["sha"] == "2"


def test_a_plugin_without_a_readable_manifest_or_skill_is_skipped(make_plugin):
    plugin = make_plugin(skills=[])
    assert build_index.build_plugin_entry(plugin, {}, {}) is None
    other = make_plugin(name="other")
    (other / "plugin.json").write_text("{", encoding="utf-8")
    assert build_index.build_plugin_entry(other, {}, {}) is None


def test_the_plugin_detail_leaves_out_what_the_registry_generated(make_plugin):
    plugin = make_plugin(files={".mcp.json": "{}", ".claude-plugin/plugin.json": "{}"})
    entry = build_index.build_plugin_entry(plugin, {}, {})
    paths = [f["path"] for f in build_index.build_plugin_detail(plugin, entry)["files"]]
    assert ".mcp.json" not in paths and ".claude-plugin/plugin.json" not in paths
    assert "mcp.json" in paths


def test_plugins_are_published_beside_skills_not_among_them(make_skill, make_plugin,
                                                          monkeypatch, tmp_path):
    skill = make_skill()
    make_plugin()
    monkeypatch.setattr(build_index, "SKILLS_DIR", skill.parents[1])
    out = tmp_path / "out"
    build_index.main_with(out)
    index = json.loads((out / "index.json").read_text(encoding="utf-8"))
    assert [e["id"] for e in index["skills"]] == ["testuser/example-skill"]
    assert [e["id"] for e in index["plugins"]] == ["testuser/housing-dashboards"]
    assert index["counts"]["total"] == 1 and index["counts"]["plugins"] == 1
    assert (out / "plugins" / "testuser" / "housing-dashboards.json").is_file()
    assert (out / "plugins" / "testuser" / "housing-dashboards.zip").is_file()


def test_a_plugin_publishes_its_own_provenance_and_fit(make_plugin):
    """Declared once, in plugin.json (ADR 0005), and published the way a
    skill's are: self-reported, and never a factor in tier."""
    entry = build_index.build_plugin_entry(make_plugin(), {}, {})
    assert entry["provenance"] == {
        "self_reported": True, "affiliation": "government",
        "deployment": "organization", "deployed_at": "City of Example",
        "deployed_in": None, "deployed_since": None,
    }
    assert entry["use_when"] == "A city wants its housing picture in one place."
    assert entry["avoid_when"] is None


# --------------------------------------------------------------------------- #
# #267: which AI models a listing was tried with — the author's claim
# (`civic.models-tested`) and the reviewer's verified list (`models:` on the
# attestation), kept apart the way the two language fields are.


def test_a_current_attestation_carries_the_models_it_verified():
    result = build_index.resolve_tier(
        "ns/example", SHA, attestation(models=["Claude Opus 5.5", "Claude Sonnet 5"]))
    assert result["tier"] == "reviewed"
    assert result["verified_models"] == ["Claude Opus 5.5", "Claude Sonnet 5"]


def test_a_stale_or_expired_attestation_yields_no_verified_models():
    stale = build_index.resolve_tier(
        "ns/example", OTHER_SHA, attestation(sha=SHA, models=["Claude Sonnet 5"]))
    expired = build_index.resolve_tier(
        "ns/example", SHA, attestation(expires=PAST, models=["Claude Sonnet 5"]))
    assert stale["verified_models"] is None
    assert expired["verified_models"] is None
    assert build_index.resolve_tier("ns/example", SHA, None)["verified_models"] is None


def test_no_models_field_on_a_current_attestation_is_null():
    assert build_index.resolve_tier("ns/example", SHA, attestation())["verified_models"] is None


def test_the_models_an_author_tried_are_published_as_a_list(make_skill):
    skill = _with_meta(
        make_skill, **{"civic.models-tested": "Claude Opus 5.5, Claude Sonnet 5"})
    entry = build_index.build_entry(skill, {}, {})
    assert entry["models_tested"] == ["Claude Opus 5.5", "Claude Sonnet 5"]
    assert build_index.build_detail(skill, entry)["models_tested"] == [
        "Claude Opus 5.5", "Claude Sonnet 5"]


def test_models_tested_is_null_when_the_author_claimed_nothing(make_skill):
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["models_tested"] is None
    assert entry["verified_models"] is None


def test_a_plugin_publishes_the_models_its_author_tried(make_plugin):
    from build_index import REGISTRY_EXTENSION
    plugin = make_plugin(manifest={"extensions": {REGISTRY_EXTENSION: {
        "civic.maintainer": "Plugin Maintainer", "civic.affiliation": "government",
        "civic.deployment": "none",
        "civic.models-tested": "Claude Sonnet 5, ChatGPT 5.6-Terra",
    }}})
    entry = build_index.build_plugin_entry(plugin, {}, {})
    assert entry["models_tested"] == ["Claude Sonnet 5", "ChatGPT 5.6-Terra"]
    assert entry["verified_models"] is None


# --------------------------------------------------------------------------- #
# Nested single skills (ADR 0006, #274)
#
# Everything the author wrote is one level down in skills/{name}/, with only
# generated files beside it; the flat layout, SKILL.md at the listing root, is
# retired (step 4). Every reader goes through build_index.skill_dir_of, so a
# listing whose SKILL.md can't be found fails the build instead of dropping out
# of it.


def generated_manifests(listing):
    """What build_marketplace writes at a listing's root."""
    for rel in (".codex-plugin/plugin.json", ".claude-plugin/plugin.json"):
        path = listing / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('{"name": "generated"}\n', encoding="utf-8")


def test_a_nested_listing_is_built_from_its_inner_skill_md(make_skill):
    listing = make_skill(name="example-skill", namespace="cityofx")
    entry = build_index.build_entry(listing, {}, {})
    assert entry is not None
    assert entry["id"] == "cityofx/example-skill"
    assert entry["description"].startswith("An example skill")
    assert entry["category"] == "finance"


def test_a_nested_entry_keeps_path_and_adds_skill_path(make_skill):
    listing = make_skill(name="example-skill", namespace="cityofx")
    entry = build_index.build_entry(listing, {}, {})
    assert entry["path"] == "skills/cityofx/example-skill"
    assert entry["skill_path"] == "skills/cityofx/example-skill/skills/example-skill"
    assert entry["download"].endswith("/tree/main/skills/cityofx/example-skill")


def test_a_flat_listing_fails_the_build_and_says_where_skill_md_goes(make_skill):
    listing = make_skill(namespace="cityofx")
    (inner(listing) / "SKILL.md").rename(listing / "SKILL.md")
    with pytest.raises(build_index.NoSkillMd,
                       match="skills/cityofx/example-skill/skills/example-skill/SKILL.md"):
        build_index.build_entry(listing, {}, {})


def test_a_listing_with_no_skill_md_fails_the_build_rather_than_vanishing(make_skill):
    listing = make_skill(name="example-skill", namespace="cityofx")
    (inner(listing) / "SKILL.md").unlink()
    with pytest.raises(build_index.NoSkillMd, match="example-skill"):
        build_index.build_entry(listing, {}, {})


def test_main_fails_when_a_listing_has_no_skill_md(make_skill, tmp_path, monkeypatch):
    """The index must not come out with fewer skills and a warning."""
    make_skill(name="good", namespace="cityofx")
    broken = make_skill(name="broken", namespace="cityofx")
    (inner(broken) / "SKILL.md").unlink()
    (inner(broken) / "notes.md").write_text("x\n", encoding="utf-8")
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "skills")
    with pytest.raises(build_index.NoSkillMd):
        build_index.main_with(tmp_path / "out")
    assert not (tmp_path / "out" / "index.json").exists()


def test_main_indexes_every_listing_with_its_skill_path(make_skill, tmp_path, monkeypatch):
    make_skill(name="one", namespace="cityofx")
    make_skill(name="two", namespace="cityofx")
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "skills")
    out = tmp_path / "out"
    build_index.main_with(out)
    index = json.loads((out / "index.json").read_text(encoding="utf-8"))
    paths = {e["id"]: (e["path"], e["skill_path"]) for e in index["skills"]}
    assert paths == {
        "cityofx/one": ("skills/cityofx/one", "skills/cityofx/one/skills/one"),
        "cityofx/two": ("skills/cityofx/two", "skills/cityofx/two/skills/two"),
    }


def test_main_fails_on_a_flat_listing_beside_a_nested_one(make_skill, tmp_path, monkeypatch):
    """The index must not come out with the flat one quietly missing."""
    make_skill(name="nested-one", namespace="cityofx")
    flat = make_skill(name="flat-one", namespace="cityofx")
    (inner(flat) / "SKILL.md").rename(flat / "SKILL.md")
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "skills")
    with pytest.raises(build_index.NoSkillMd, match="flat-one"):
        build_index.main_with(tmp_path / "out")
    assert not (tmp_path / "out" / "index.json").exists()


def test_a_nested_detail_lists_the_authors_files_relative_to_skill_path(make_skill):
    listing = make_skill(name="example-skill", namespace="cityofx", files={
        "references/notes.md": "n\n", "scripts/run.py": "x = 1\n"})
    generated_manifests(listing)
    detail = build_index.build_detail(listing, build_index.build_entry(listing, {}, {}))
    assert [f["path"] for f in detail["files"]] == [
        "SKILL.md", "references/notes.md", "scripts/run.py"]


def test_a_nested_listings_scripts_are_executed_so_has_scripts_stays_true(make_skill):
    listing = make_skill(files={"scripts/run.py": "x = 1\n",
                                "references/notes.md": "n\n"})
    entry = build_index.build_entry(listing, {}, {})
    assert entry["has_scripts"] is True
    assert entry["script_files"] == ["scripts/run.py"]
    detail = build_index.build_detail(listing, entry)
    assert {f["path"]: f["executed"] for f in detail["files"]}["scripts/run.py"] is True


def test_a_nested_listing_without_scripts_has_none(make_skill):
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["has_scripts"] is False and entry["script_files"] == []


def test_the_executed_rule_follows_skills_star_scripts():
    """The plugin rule, applied to a path relative to the listing: a nested
    listing's scripts are skills/{name}/scripts/."""
    assert build_index.is_executed("skills/example/scripts/run.py")
    assert build_index.is_executed("scripts/run.py")
    assert not build_index.is_executed("skills/example/references/notes.md")
    assert not build_index.is_executed("skills/example/scripts")


def test_a_nested_archive_is_rooted_at_the_authors_directory(make_skill, tmp_path):
    listing = make_skill(name="example-skill", namespace="cityofx",
                         files={"references/notes.md": "hi\n"})
    generated_manifests(listing)
    out = tmp_path / "out"
    entry = build_index.build_entry(listing, {}, {})
    build_index.write_outputs(listing, entry, out)

    with zipfile.ZipFile(out / "skills" / "cityofx" / "example-skill.zip") as z:
        names = sorted(z.namelist())
    assert names == ["example-skill/SKILL.md", "example-skill/references/notes.md"]


def test_the_nested_detail_payload_states_its_skill_path(make_skill, tmp_path):
    listing = make_skill(name="example-skill", namespace="cityofx")
    out = tmp_path / "out"
    detail = build_index.write_outputs(listing, build_index.build_entry(listing, {}, {}), out)
    written = json.loads((out / "skills" / "cityofx" / "example-skill.json")
                         .read_text(encoding="utf-8"))
    assert written["skill_path"] == detail["skill_path"] == (
        "skills/cityofx/example-skill/skills/example-skill")


def test_the_attestation_sha_of_a_nested_listing_is_its_root_commits(tmp_path, monkeypatch):
    """The pin stays at the listing directory, not the inner one: a change to a
    generated manifest beside the inner skill is a change to the listing."""
    import subprocess

    def run(*args):
        return subprocess.run(
            ["git", "-c", "user.email=t@e.x", "-c", "user.name=T", *args],
            cwd=tmp_path, check=True, capture_output=True, text=True).stdout.strip()

    listing = tmp_path / "skills" / "cityofx" / "permit-status-explainer"
    inner = listing / "skills" / "permit-status-explainer"
    inner.mkdir(parents=True)
    (inner / "SKILL.md").write_text(
        conftest.render_frontmatter(dict(
            conftest.VALID_FRONTMATTER, name="permit-status-explainer"))
        + "\n\nBody.\n", encoding="utf-8")
    run("init", "-q", "-b", "main")
    run("add", "-A")
    run("commit", "-q", "-m", "Add it")
    first = run("rev-parse", "HEAD")
    (listing / ".codex-plugin").mkdir()
    (listing / ".codex-plugin" / "plugin.json").write_text("{}\n", encoding="utf-8")
    run("add", "-A")
    run("commit", "-q", "-m", "Regenerate the manifest")
    head = run("rev-parse", "HEAD")
    monkeypatch.setattr(build_index, "ROOT", tmp_path)

    entry = build_index.build_entry(listing, {}, {})
    assert entry["sha"] == head == build_index.head_sha(listing)
    assert build_index.head_sha(inner) == first


# --------------------------------------------------------------------------- #
# A nested listing holds the author's files in skills/{name}/ and the generated
# manifests, and nothing else. L0 refuses a stray file; the build does not rely
# on that alone, because a stray .mcp.json or scripts/ at the listing root would
# otherwise be built and published with no "executed" signal.


@pytest.mark.parametrize("stray", [".mcp.json", "hooks/hooks.json", "scripts/run.py",
                                   "README.md", "skills/other/SKILL.md",
                                   ".claude-plugin/hooks.json"])
def test_a_stray_file_in_a_nested_listing_fails_the_index_and_names_it(
        make_skill, tmp_path, monkeypatch, stray):
    listing = make_skill(name="example-skill", namespace="cityofx")
    generated_manifests(listing)
    path = listing / stray
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("{}\n", encoding="utf-8")

    with pytest.raises(build_index.StrayListingFile, match=stray.replace(".", r"\.")):
        build_index.build_entry(listing, {}, {})
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "skills")
    with pytest.raises(build_index.StrayListingFile):
        build_index.main_with(tmp_path / "out")


def test_the_generated_manifests_are_not_stray(make_skill):
    listing = make_skill(name="example-skill", namespace="cityofx")
    generated_manifests(listing)
    assert build_index.build_entry(listing, {}, {}) is not None


def test_the_archive_and_detail_never_include_a_path_that_resolves_outside(
        make_skill, tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "secret.md").write_text("s\n", encoding="utf-8")
    listing = make_skill(name="example-skill", namespace="cityofx")
    (inner(listing) / "linked").symlink_to(outside, target_is_directory=True)
    (inner(listing) / "file.md").symlink_to(outside / "secret.md")

    entry = build_index.build_entry(listing, {}, {})
    detail = build_index.build_detail(listing, entry)
    assert [f["path"] for f in detail["files"]] == ["SKILL.md"]
    out = tmp_path / "out"
    build_index.write_outputs(listing, entry, out)
    with zipfile.ZipFile(out / "skills" / "cityofx" / "example-skill.zip") as z:
        assert z.namelist() == ["example-skill/SKILL.md"]


# --------------------------------------------------------------------------- #
# Collections (#209, ADR 0008 decisions 7-9).
#
# registry/collections.yml is a maintainer's grouping of listings. The build
# publishes it as `collections`, members as {kind, id} only, and fails rather
# than publish a collection with a hole in it. It is read from beside the
# registry being built, as plugins/ is, so a throwaway tree never picks up the
# repository's real file.

COLLECTION = {
    "slug": "permits-start-to-finish",
    "title": "A permit, start to finish",
    "title_es": "Un permiso, de principio a fin",
    "note": "The steps of one permit,\n  in order.\n",
    "note_es": "Los pasos de un permiso,\n  en orden.\n",
    "featured": True,
    "listings": [
        {"kind": "skill", "id": "testuser/example-skill"},
        {"kind": "plugin", "id": "testuser/housing-dashboards"},
    ],
}

KNOWN_SKILLS = [{"id": "testuser/example-skill"}]
KNOWN_PLUGINS = [{"id": "testuser/housing-dashboards"}]


def write_collections(root, doc):
    import yaml

    path = root / "registry" / "collections.yml"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(doc if isinstance(doc, str) else yaml.safe_dump(doc, allow_unicode=True),
                    encoding="utf-8")
    return path


def collection(**over) -> dict:
    """COLLECTION with fields replaced; a field set to `...` is left out."""
    out = {**COLLECTION, **over}
    return {k: v for k, v in out.items() if v is not ...}


def load(tmp_path, *entries):
    path = write_collections(tmp_path, {"collections": list(entries)})
    return build_index.load_collections(path, KNOWN_SKILLS, KNOWN_PLUGINS)


def test_a_collection_is_published_with_its_members_as_kind_and_id(tmp_path):
    assert load(tmp_path, collection()) == [{
        "slug": "permits-start-to-finish",
        "title": "A permit, start to finish",
        "title_es": "Un permiso, de principio a fin",
        "note": "The steps of one permit, in order.",
        "note_es": "Los pasos de un permiso, en orden.",
        "featured": True,
        "listings": [
            {"kind": "skill", "id": "testuser/example-skill"},
            {"kind": "plugin", "id": "testuser/housing-dashboards"},
        ],
    }]


def test_collections_keep_the_order_the_file_gives(tmp_path):
    second = collection(slug="second", featured=False)
    assert [c["slug"] for c in load(tmp_path, second, collection())] == [
        "second", "permits-start-to-finish"]


def test_an_empty_file_publishes_no_collections(tmp_path):
    path = write_collections(tmp_path, "# nothing yet\ncollections: []\n")
    assert build_index.load_collections(path, [], []) == []


def test_no_file_publishes_no_collections(tmp_path):
    missing = tmp_path / "registry" / "collections.yml"
    assert build_index.load_collections(missing, [], []) == []


def test_a_member_that_does_not_exist_fails_and_names_the_collection_and_listing(tmp_path):
    gone = collection(listings=[{"kind": "skill", "id": "testuser/gone"}])
    with pytest.raises(build_index.BadCollections,
                       match=r"permits-start-to-finish.*skill testuser/gone"):
        load(tmp_path, gone)


def test_a_skill_id_does_not_answer_for_a_plugin_of_the_same_name(tmp_path):
    """The kinds are kept apart, as an attestation's are."""
    wrong = collection(listings=[{"kind": "plugin", "id": "testuser/example-skill"}])
    with pytest.raises(build_index.BadCollections, match=r"plugin testuser/example-skill"):
        load(tmp_path, wrong)


def test_a_kind_that_is_neither_skill_nor_plugin_fails(tmp_path):
    odd = collection(listings=[{"kind": "bundle", "id": "testuser/example-skill"}])
    with pytest.raises(build_index.BadCollections, match=r"permits-start-to-finish.*bundle"):
        load(tmp_path, odd)


def test_a_member_listed_twice_fails(tmp_path):
    twice = collection(listings=[{"kind": "skill", "id": "testuser/example-skill"}] * 2)
    with pytest.raises(build_index.BadCollections,
                       match=r"permits-start-to-finish.*skill testuser/example-skill.*twice"):
        load(tmp_path, twice)


def test_a_collection_with_no_listings_fails(tmp_path):
    with pytest.raises(build_index.BadCollections, match=r"permits-start-to-finish.*listings"):
        load(tmp_path, collection(listings=[]))


def test_a_duplicated_slug_fails_and_names_it(tmp_path):
    with pytest.raises(build_index.BadCollections,
                       match=r"permits-start-to-finish.*more than once"):
        load(tmp_path, collection(), collection(featured=False))


@pytest.mark.parametrize("slug", ["Permits", "permits_start", "-permits", "permits-",
                                  "permits--start", "", "permits/start", 7])
def test_a_malformed_slug_fails_and_names_it(tmp_path, slug):
    with pytest.raises(build_index.BadCollections, match=r"slug"):
        load(tmp_path, collection(slug=slug))


@pytest.mark.parametrize("field", ["slug", "title", "title_es", "note", "note_es",
                                   "featured", "listings"])
def test_a_missing_field_fails_and_names_it(tmp_path, field):
    with pytest.raises(build_index.BadCollections, match=rf"`{field}`"):
        load(tmp_path, collection(**{field: ...}))


@pytest.mark.parametrize("field", ["title_es", "note_es"])
def test_a_blank_translation_fails_rather_than_publishing_english_alone(tmp_path, field):
    with pytest.raises(build_index.BadCollections,
                       match=rf"permits-start-to-finish.*`{field}`"):
        load(tmp_path, collection(**{field: "  "}))


def test_featured_must_be_true_or_false(tmp_path):
    with pytest.raises(build_index.BadCollections, match=r"`featured`"):
        load(tmp_path, collection(featured="yes please"))


def test_an_unknown_field_fails_so_a_typo_is_not_silently_dropped(tmp_path):
    with pytest.raises(build_index.BadCollections, match=r"`titel_es`"):
        load(tmp_path, collection(titel_es="Un permiso"))


@pytest.mark.parametrize("doc", ["collections:[]\n", "- slug: x\n",
                                 "collections: {slug: x}\n",
                                 "collections:\n  - just a string\n"])
def test_a_malformed_file_fails_and_names_it(tmp_path, doc):
    path = write_collections(tmp_path, doc)
    with pytest.raises(build_index.BadCollections, match=r"registry/collections\.yml"):
        build_index.load_collections(path, [], [])


def test_the_index_carries_the_collections_read_from_beside_the_tree(
        make_skill, make_plugin, tmp_path, monkeypatch):
    make_skill()
    make_plugin()
    write_collections(tmp_path, {"collections": [collection()]})
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "skills")

    out = tmp_path / "out"
    assert build_index.main_with(out) == 0
    index = json.loads((out / "index.json").read_text(encoding="utf-8"))
    assert [c["slug"] for c in index["collections"]] == ["permits-start-to-finish"]
    assert index["collections"][0]["listings"][1] == {
        "kind": "plugin", "id": "testuser/housing-dashboards"}


def test_a_tree_with_no_collections_file_publishes_an_empty_list(tmp_path, monkeypatch):
    """The key is always there: a key that comes and goes makes every consumer
    defensive. And the repository's real file is not read for a throwaway tree."""
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "skills")
    out = tmp_path / "out"
    build_index.main_with(out)
    index = json.loads((out / "index.json").read_text(encoding="utf-8"))
    assert index["collections"] == []


def test_the_build_fails_on_a_stale_member_with_a_message_not_a_traceback(
        make_skill, tmp_path, monkeypatch, capsys):
    make_skill()
    write_collections(tmp_path, {"collections": [collection()]})  # its plugin is not there
    monkeypatch.setattr(build_index, "SKILLS_DIR", tmp_path / "skills")
    monkeypatch.setattr("sys.argv", ["build_index.py", "--out", str(tmp_path / "out")])

    assert build_index.main() == 1
    err = capsys.readouterr().err
    assert "registry/collections.yml" in err
    assert "permits-start-to-finish" in err and "plugin testuser/housing-dashboards" in err
    assert not (tmp_path / "out" / "index.json").exists()


def test_the_repositorys_own_file_is_a_list_of_collections():
    """Shipped empty (#209): which collections exist is the owner's content.
    Whatever it comes to hold, it parses into the shape the loader reads."""
    import yaml

    doc = yaml.safe_load((build_index.ROOT / "registry" / "collections.yml")
                         .read_text(encoding="utf-8"))
    assert isinstance(doc, dict) and isinstance(doc.get("collections"), list)
