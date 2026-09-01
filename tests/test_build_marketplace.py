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


def test_the_committed_manifest_is_current():
    """The real one, against the real tree. This is the test that fails when
    somebody merges a skill without regenerating."""
    root = build_marketplace.ROOT
    assert build_marketplace.is_current(
        root, root / ".claude-plugin" / "marketplace.json"), (
        "Run: python scripts/build_marketplace.py")
