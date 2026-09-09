"""The plugin marketplace manifest.

`/plugin marketplace add owner/repo` reads the *repository*, not the published
site, so unlike the index this file has to be committed. That is the whole
reason it is generated and checked rather than built: a hand-maintained copy
drifts the first time somebody merges a skill, and a build output would never be
seen by the client that needs it.

Every test builds a throwaway tree. A test that reads skills/ breaks the moment
someone lists a second skill.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

import build_marketplace


def test_one_plugin_per_skill(make_skill):
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    make_skill(name="beta", namespace="cityofx")
    manifest = build_marketplace.build(root)
    assert [p["name"] for p in manifest["plugins"]] == [
        "cityofx-alpha", "cityofx-beta",
    ]


def test_source_points_at_the_skill_directory(make_skill):
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    plugin = build_marketplace.build(root)["plugins"][0]
    assert plugin["source"] == "./skills/cityofx/alpha"


def test_plugin_name_carries_the_namespace_so_it_cannot_collide(make_skill):
    """Two namespaces may hold the same skill name. Plugin names are unique
    across a marketplace, so the namespace goes in the name — always, not only
    on collision, because a name that changes when a stranger submits would
    break an install command somebody already wrote down."""
    root = make_skill(name="permit-status", namespace="cityofx").parents[2]
    make_skill(name="permit-status", namespace="cityofy")
    names = [p["name"] for p in build_marketplace.build(root)["plugins"]]
    assert names == ["cityofx-permit-status", "cityofy-permit-status"]
    assert len(set(names)) == len(names)


def test_description_comes_from_the_skill(make_skill):
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    plugin = build_marketplace.build(root)["plugins"][0]
    assert plugin["description"].startswith("An example skill")


def test_marketplace_identity_is_stable(make_skill):
    root = make_skill().parents[2]
    manifest = build_marketplace.build(root)
    assert manifest["name"] == "civic-skill-exchange"
    assert manifest["owner"]["name"]


def test_a_skill_with_unreadable_frontmatter_is_left_out(make_skill):
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    make_skill(name="broken", namespace="cityofx", raw="---\nnot: [valid")
    assert [p["name"] for p in build_marketplace.build(root)["plugins"]] == [
        "cityofx-alpha",
    ]


def test_write_then_check_agrees(make_skill, tmp_path):
    root = make_skill().parents[2]
    target = root / ".claude-plugin" / "marketplace.json"
    build_marketplace.write(root, target)
    assert build_marketplace.is_current(root, target)


def test_check_fails_when_the_committed_copy_is_stale(make_skill):
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    target = root / ".claude-plugin" / "marketplace.json"
    build_marketplace.write(root, target)
    make_skill(name="beta", namespace="cityofx")
    assert not build_marketplace.is_current(root, target)


def test_check_fails_when_the_file_is_missing(make_skill):
    root = make_skill().parents[2]
    assert not build_marketplace.is_current(root, root / ".claude-plugin" / "marketplace.json")


def test_duplicate_plugin_name_fails_the_build(make_skill):
    """`civic` submitting `skills-plain-language-notice-rewriter` joins to the
    same plugin name as `civic-skills`'s `plain-language-notice-rewriter` — two
    different namespace/name splits, one joined string. Silently listing
    whichever sorts first would let a later submission shadow an existing one,
    including the Reviewed skill it collides with here."""
    root = make_skill(name="skills-plain-language-notice-rewriter", namespace="civic").parents[2]
    make_skill(name="plain-language-notice-rewriter", namespace="civic-skills")
    with pytest.raises(build_marketplace.DuplicatePluginName) as exc:
        build_marketplace.build(root)
    message = str(exc.value)
    assert "civic/skills-plain-language-notice-rewriter" in message
    assert "civic-skills/plain-language-notice-rewriter" in message


def test_duplicate_plugin_name_fails_the_codex_build_too(make_skill):
    root = make_skill(name="skills-plain-language-notice-rewriter", namespace="civic").parents[2]
    make_skill(name="plain-language-notice-rewriter", namespace="civic-skills")
    with pytest.raises(build_marketplace.DuplicatePluginName):
        build_marketplace.build_codex(root)


def test_duplicate_plugin_name_fails_write_all(make_skill):
    root = make_skill(name="skills-plain-language-notice-rewriter", namespace="civic").parents[2]
    make_skill(name="plain-language-notice-rewriter", namespace="civic-skills")
    with pytest.raises(build_marketplace.DuplicatePluginName):
        build_marketplace.write_all(root)


def test_duplicate_plugin_name_fails_all_current(make_skill):
    """`all_current` backs `--check`. A tree that cannot even be built is not
    current — it has to fail loudly rather than report a stale-but-fixable
    manifest."""
    root = make_skill(name="skills-plain-language-notice-rewriter", namespace="civic").parents[2]
    make_skill(name="plain-language-notice-rewriter", namespace="civic-skills")
    with pytest.raises(build_marketplace.DuplicatePluginName):
        build_marketplace.all_current(root)


def test_main_check_fails_on_a_duplicate_plugin_name(make_skill, monkeypatch, capsys):
    """The acceptance criterion is `--check` itself, not just the functions
    behind it. `main()` reads the module-level ROOT, so the tree it walks is
    swapped out here rather than passed as an argument."""
    root = make_skill(name="skills-plain-language-notice-rewriter", namespace="civic").parents[2]
    make_skill(name="plain-language-notice-rewriter", namespace="civic-skills")
    monkeypatch.setattr(build_marketplace, "ROOT", root)
    monkeypatch.setattr("sys.argv", ["build_marketplace.py", "--check"])
    assert build_marketplace.main() != 0
    err = capsys.readouterr().err
    assert "civic/skills-plain-language-notice-rewriter" in err
    assert "civic-skills/plain-language-notice-rewriter" in err


def test_main_build_fails_on_a_duplicate_plugin_name(make_skill, monkeypatch, capsys):
    root = make_skill(name="skills-plain-language-notice-rewriter", namespace="civic").parents[2]
    make_skill(name="plain-language-notice-rewriter", namespace="civic-skills")
    monkeypatch.setattr(build_marketplace, "ROOT", root)
    monkeypatch.setattr("sys.argv", ["build_marketplace.py"])
    assert build_marketplace.main() != 0
    err = capsys.readouterr().err
    assert "civic/skills-plain-language-notice-rewriter" in err
    assert "civic-skills/plain-language-notice-rewriter" in err


def test_no_collision_when_namespace_and_name_both_differ(make_skill):
    """The ordinary case — two entirely different listings — must not trip the
    duplicate check."""
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    make_skill(name="beta", namespace="cityofy")
    assert build_marketplace.build(root)["plugins"]


def test_output_is_deterministic(make_skill):
    """Written to git, so an unstable ordering would produce a diff on every
    build and make the staleness check useless."""
    root = make_skill(name="beta", namespace="cityofy").parents[2]
    make_skill(name="alpha", namespace="cityofx")
    first = json.dumps(build_marketplace.build(root))
    second = json.dumps(build_marketplace.build(root))
    assert first == second
    assert [p["name"] for p in build_marketplace.build(root)["plugins"]] == [
        "cityofx-alpha", "cityofy-beta",
    ]


# The committed manifest is deliberately NOT asserted here any more (#90).
#
# It was a property of the checkout rather than of the code, and it failed on
# every branch that added a skill — which is exactly the friction #87 hit. The
# pull request that adds or changes a skill carries the regenerated manifest
# now (#170), checked by validate.yml's `build_marketplace.py --check` step;
# the generator's own unit tests above are what protect the output.


# --------------------------------------------------------------------------- #
# #98 — the Codex marketplace.
#
# Verified against Codex itself rather than its documentation: a plugin is
# discovered from `.agents/plugins/marketplace.json`, a SKILL.md at the plugin
# root loads with `"skills": "./"`, and `version` is optional — a manifest
# without one installs, landing under `local` instead of a version directory.
#
# One plugin per skill, matching the Claude marketplace, so the install command
# reads the same in both tools.


def test_a_codex_plugin_for_every_skill(make_skill):
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    make_skill(name="beta", namespace="cityofx")
    manifest = build_marketplace.build_codex(root)
    assert [p["name"] for p in manifest["plugins"]] == [
        "cityofx-alpha", "cityofx-beta",
    ]


def test_the_two_marketplaces_list_the_same_skills(make_skill):
    """They disagree about nothing. A skill in one and not the other is a bug
    somebody would find by installing from the wrong tool."""
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    make_skill(name="beta", namespace="cityofy")
    claude = {p["name"] for p in build_marketplace.build(root)["plugins"]}
    codex = {p["name"] for p in build_marketplace.build_codex(root)["plugins"]}
    assert claude == codex


def test_the_source_is_a_relative_local_path(make_skill):
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    plugin = build_marketplace.build_codex(root)["plugins"][0]
    assert plugin["source"] == {"source": "local", "path": "./skills/cityofx/alpha"}


def test_every_entry_carries_the_policy_codex_requires(make_skill):
    root = make_skill().parents[2]
    plugin = build_marketplace.build_codex(root)["plugins"][0]
    assert plugin["policy"] == {"installation": "AVAILABLE", "authentication": "ON_USE"}


def test_the_category_is_the_readable_label(make_skill):
    """Codex shows this to a person. registry/categories.yml already holds the
    label, so it is read rather than restated."""
    root = make_skill().parents[2]
    plugin = build_marketplace.build_codex(root)["plugins"][0]
    assert plugin["category"] == "Finance"


def test_a_skill_with_no_category_still_lists(make_skill):
    front = dict(build_marketplace_front())
    front["metadata"] = {k: v for k, v in front["metadata"].items()
                         if k != "civic.category"}
    root = make_skill(front=front).parents[2]
    plugin = build_marketplace.build_codex(root)["plugins"][0]
    assert plugin["category"]


# --- the per-skill plugin manifest ---------------------------------------- #


def test_the_plugin_manifest_points_at_the_skill_root(make_skill):
    """SKILL.md sits at the top of a skill directory, not under skills/, and
    Codex loads it from there when told where to look."""
    skill = make_skill(name="alpha", namespace="cityofx")
    m = build_marketplace.codex_plugin(skill)
    assert m["skills"] == "./"
    assert m["name"] == "cityofx-alpha"


def test_the_plugin_manifest_carries_what_codex_shows(make_skill):
    skill = make_skill(name="alpha", namespace="cityofx")
    m = build_marketplace.codex_plugin(skill)
    assert m["description"].startswith("An example skill")
    assert m["license"] == "MIT"
    assert m["interface"]["displayName"]
    assert m["interface"]["category"] == "Finance"


def test_no_version_is_invented(make_skill):
    """Codex accepts a manifest without one. Writing 1.0.0 would assert a
    stability nobody claimed, and deriving one from the date would rewrite the
    file on every build."""
    skill = make_skill()
    assert "version" not in build_marketplace.codex_plugin(skill)


def test_a_declared_version_is_used(make_skill):
    front = dict(build_marketplace_front())
    front["metadata"] = {**front["metadata"], "version": "2.1"}
    skill = make_skill(front=front)
    assert build_marketplace.codex_plugin(skill)["version"] == "2.1"


def test_the_maintainer_becomes_the_author(make_skill):
    skill = make_skill()
    assert build_marketplace.codex_plugin(skill)["author"]["name"] == "Test Suite"


# --- writing and checking both --------------------------------------------- #


def test_write_produces_both_marketplaces_and_every_plugin_manifest(make_skill):
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    make_skill(name="beta", namespace="cityofy")
    build_marketplace.write_all(root)
    assert (root / ".claude-plugin" / "marketplace.json").is_file()
    assert (root / ".agents" / "plugins" / "marketplace.json").is_file()
    for ns, name in [("cityofx", "alpha"), ("cityofy", "beta")]:
        assert (root / "skills" / ns / name / ".codex-plugin" / "plugin.json").is_file()


def test_the_check_notices_a_stale_codex_manifest(make_skill):
    root = make_skill(name="alpha", namespace="cityofx").parents[2]
    build_marketplace.write_all(root)
    assert build_marketplace.all_current(root)
    make_skill(name="beta", namespace="cityofx")
    assert not build_marketplace.all_current(root)


def test_the_check_notices_a_missing_plugin_manifest(make_skill):
    skill = make_skill(name="alpha", namespace="cityofx")
    root = skill.parents[2]
    build_marketplace.write_all(root)
    (skill / ".codex-plugin" / "plugin.json").unlink()
    assert not build_marketplace.all_current(root)


def build_marketplace_front() -> dict:
    from conftest import VALID_FRONTMATTER
    return {k: (dict(v) if isinstance(v, dict) else v)
            for k, v in VALID_FRONTMATTER.items()}


def test_the_short_description_does_not_cut_mid_word(make_skill):
    front = dict(build_marketplace_front())
    front["description"] = (
        "Fits a generalized skill to one organization and writes its local "
        "values back in, producing a self-contained skill that runs without a "
        "context file")
    skill = make_skill(front=front)
    s = build_marketplace.codex_plugin(skill)["interface"]["shortDescription"]
    assert not s.rstrip("…").endswith(" ")
    assert s.endswith("…")
    assert s.rstrip("…").split()[-1] in front["description"].split()


def test_a_one_sentence_description_is_used_whole(make_skill):
    front = dict(build_marketplace_front())
    front["description"] = "Rewrites a permit notice in plain language. It does nothing else."
    skill = make_skill(front=front)
    assert (build_marketplace.codex_plugin(skill)["interface"]["shortDescription"]
            == "Rewrites a permit notice in plain language")


# --------------------------------------------------------------------------- #
# Generated is not the same as committed.
#
# `.gitignore` ignored `.agents/` as contributor tooling long before #98 put a
# published manifest under it. So the Codex marketplace was generated, passed
# every `--check`, and was silently never committed — leaving `codex plugin
# marketplace add` finding nothing, which is the bug #98 existed to fix.
#
# `--check` reads the working tree, so a generated file that exists on disk
# but was never committed still reports "current" — exactly the way #98's
# Codex manifest went missing. These ask git instead, and ask only
# `generated(ROOT)`, so a future output of the generator is covered
# automatically rather than by a second, driftable copy of its path list.


def _is_tracked_by_git(repo_root: Path, rel_path: str) -> bool:
    """True if `rel_path` (relative to `repo_root`) is tracked by git there —
    i.e. `git ls-files --error-unmatch` finds it. A file can be untracked
    without being gitignored (nobody ran `git add`), so this is the direct
    question rather than the proxy `git check-ignore` was answering."""
    out = subprocess.run(
        ["git", "ls-files", "--error-unmatch", rel_path],
        cwd=repo_root, capture_output=True, text=True)
    return out.returncode == 0


def test_is_tracked_by_git_reports_an_untracked_file(tmp_path):
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    (tmp_path / "example.txt").write_text("hello", encoding="utf-8")
    assert not _is_tracked_by_git(tmp_path, "example.txt")


def test_is_tracked_by_git_reports_a_tracked_file(tmp_path):
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    (tmp_path / "example.txt").write_text("hello", encoding="utf-8")
    subprocess.run(["git", "add", "example.txt"], cwd=tmp_path, check=True)
    assert _is_tracked_by_git(tmp_path, "example.txt")


def test_every_generated_file_is_tracked_by_git():
    """The general form, against the real registry. A generated path that a
    clone would not have — gitignored, or simply never committed — fails here
    rather than in somebody's agent."""
    root = build_marketplace.ROOT
    for path in build_marketplace.generated(root):
        rel = path.relative_to(root).as_posix()
        assert _is_tracked_by_git(root, rel), (
            f"{rel} is generated but not tracked by git — a clone would not "
            f"have it.")
