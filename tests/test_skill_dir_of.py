"""Where a single skill's own SKILL.md lives (ADR 0006, decision 1).

During the move a listing is either nested, `skills/{ns}/{name}/skills/{name}/`,
or flat, with SKILL.md at the listing root. Every reader goes through one
function, so none of them can quietly return nothing when it can't find the
file: that is how a listing used to drop out of the index or lose its scan
without anything failing.
"""

from __future__ import annotations

import pytest

from build_index import NoSkillMd, skill_dir_of


def listing(tmp_path, name="example"):
    path = tmp_path / "skills" / "ns" / name
    path.mkdir(parents=True)
    return path


def test_a_nested_listing_reads_its_inner_directory(tmp_path):
    root = listing(tmp_path)
    inner = root / "skills" / "example"
    inner.mkdir(parents=True)
    (inner / "SKILL.md").write_text("---\nname: example\n---\n")
    assert skill_dir_of(root) == inner


def test_a_flat_listing_reads_its_root(tmp_path):
    root = listing(tmp_path)
    (root / "SKILL.md").write_text("---\nname: example\n---\n")
    assert skill_dir_of(root) == root


def test_no_skill_md_anywhere_raises(tmp_path):
    root = listing(tmp_path)
    with pytest.raises(NoSkillMd, match="example"):
        skill_dir_of(root)


def test_an_inner_directory_under_another_name_is_not_the_skill(tmp_path):
    root = listing(tmp_path)
    inner = root / "skills" / "other"
    inner.mkdir(parents=True)
    (inner / "SKILL.md").write_text("---\nname: other\n---\n")
    with pytest.raises(NoSkillMd):
        skill_dir_of(root)


def test_both_layouts_at_once_raises(tmp_path):
    root = listing(tmp_path)
    (root / "SKILL.md").write_text("---\nname: example\n---\n")
    inner = root / "skills" / "example"
    inner.mkdir(parents=True)
    (inner / "SKILL.md").write_text("---\nname: example\n---\n")
    with pytest.raises(NoSkillMd, match="both"):
        skill_dir_of(root)
