"""scripts/attestation.py — the block a reviewer pastes into reviewed.yml.

Reviewing a skill ends in one 40-character SHA. Getting it by hand meant
opening the skill on GitHub, reading blame, finding the commit and copying the
hash — four steps that all have to go right for a mechanism whose whole value is
that nobody has to remember to maintain it (#109).

This does not soften the requirement. The pin is what makes an amended skill
lose its badge automatically, so what is removed is the typing, not the check:
the SHA still comes from the same call the build compares against, and the
guards below refuse to emit one the build would reject.
"""

from __future__ import annotations

import subprocess
import sys
from datetime import date
from pathlib import Path

import pytest
import yaml

import attestation
import build_index

ROOT = Path(__file__).resolve().parent.parent
SKILL_ID = "civic-skills/generalize-skill"


@pytest.fixture
def repo(tmp_path):
    """A throwaway repository with one skill in it, committed."""
    skill = tmp_path / "skills" / "cityofx" / "permit-status-explainer"
    skill.mkdir(parents=True)
    (skill / "SKILL.md").write_text("---\nname: permit-status-explainer\n---\n\nBody.\n",
                                    encoding="utf-8")
    for command in (["git", "init", "-q", "-b", "main"],
                    ["git", "add", "-A"],
                    ["git", "-c", "user.email=t@e.x", "-c", "user.name=T",
                     "commit", "-q", "-m", "Add it"]):
        subprocess.run(command, cwd=tmp_path, check=True)
    return tmp_path


# --------------------------------------------------------------------------- #
# The value it emits is the value the build compares against.


def test_the_sha_is_the_one_the_build_derives():
    """Two implementations of "which commit" is how an attestation comes to be
    written against a value nothing checks."""
    emitted = attestation.skill_sha(ROOT / "skills" / "civic-skills" / "generalize-skill")
    assert emitted == build_index.head_sha(
        build_index.ROOT / "skills" / "civic-skills" / "generalize-skill")
    assert len(emitted) == 40


def test_the_block_it_prints_is_the_shape_reviewed_yml_documents():
    block = attestation.render(SKILL_ID, "a" * 40, notes="Read-only.")
    parsed = yaml.safe_load(block)
    assert isinstance(parsed, list) and len(parsed) == 1
    entry = parsed[0]
    assert entry["skill"] == SKILL_ID
    assert entry["sha"] == "a" * 40
    assert entry["reviewers"] == ["AI Lab for Cities at Harvard"]
    assert entry["notes"].strip() == "Read-only."


def test_the_attestation_expires_a_year_after_the_review():
    entry = yaml.safe_load(attestation.render(SKILL_ID, "a" * 40, notes="x"))[0]
    reviewed = entry["reviewed"]
    expires = entry["expires"]
    if isinstance(reviewed, str):
        reviewed, expires = date.fromisoformat(reviewed), date.fromisoformat(expires)
    assert reviewed == date.today()
    assert expires.year == reviewed.year + 1


def test_what_it_emits_actually_promotes_the_skill():
    """The end of the chain: paste this into reviewed.yml and the build derives
    Reviewed. Anything less proves only that a file was written."""
    skill = ROOT / "skills" / "civic-skills" / "generalize-skill"
    sha = attestation.skill_sha(skill)
    entry = yaml.safe_load(attestation.render(SKILL_ID, sha, notes="x"))[0]

    resolved = build_index.resolve_tier(SKILL_ID, sha, entry)
    assert resolved["tier"] == "reviewed", resolved["reason"]


# --------------------------------------------------------------------------- #
# Refusing to emit a SHA the build would reject. Each of these produced an
# attestation that looked right and granted no badge.


def test_it_refuses_when_the_skill_has_uncommitted_changes(repo):
    skill = repo / "skills" / "cityofx" / "permit-status-explainer"
    (skill / "SKILL.md").write_text("---\nname: permit-status-explainer\n---\n\nEdited.\n",
                                    encoding="utf-8")
    with pytest.raises(attestation.Unusable) as refused:
        attestation.check_clone(repo, skill)
    assert "uncommitted" in str(refused.value).lower()


def test_it_refuses_in_a_shallow_clone(repo, monkeypatch):
    """head_sha returns nothing when git cannot reach the commit, and the build
    treats that as unverifiable and demotes."""
    (repo / ".git" / "shallow").write_text("", encoding="utf-8")
    skill = repo / "skills" / "cityofx" / "permit-status-explainer"
    with pytest.raises(attestation.Unusable) as refused:
        attestation.check_clone(repo, skill)
    assert "shallow" in str(refused.value).lower()


def test_it_refuses_off_main_because_the_build_compares_against_main(repo):
    skill = repo / "skills" / "cityofx" / "permit-status-explainer"
    subprocess.run(["git", "checkout", "-q", "-b", "some-branch"], cwd=repo, check=True)
    with pytest.raises(attestation.Unusable) as refused:
        attestation.check_clone(repo, skill)
    assert "main" in str(refused.value)


def test_it_refuses_a_skill_that_is_not_there(repo):
    with pytest.raises(attestation.Unusable):
        attestation.check_clone(repo, repo / "skills" / "cityofx" / "nope")


def test_a_clean_checkout_of_main_is_accepted(repo):
    skill = repo / "skills" / "cityofx" / "permit-status-explainer"
    attestation.check_clone(repo, skill)  # raises on failure


# --------------------------------------------------------------------------- #


def test_the_reviewer_guide_names_the_helper():
    """A helper nothing points at is a helper nobody runs."""
    guide = (ROOT / "docs" / "REVIEW.md").read_text(encoding="utf-8")
    assert "scripts/attestation.py" in guide


def test_the_guide_gives_a_browser_route_too():
    """The reviewer who hit this was working on github.com, where a git command
    is no help. The path-filtered commit list is the two-click answer."""
    guide = (ROOT / "docs" / "REVIEW.md").read_text(encoding="utf-8")
    assert "/commits/main/skills/" in guide
