"""Layer L0 and L1 — structure and namespace ownership."""

from __future__ import annotations

import os

import pytest

import validate


def errors_for(skill_dir, categories, validator, author=None) -> list[str]:
    errs, _ = validate.validate_skill(skill_dir, categories, validator, author)
    return errs


def notes_for(skill_dir, categories, validator, author=None) -> list[str]:
    _, notes = validate.validate_skill(skill_dir, categories, validator, author)
    return notes


# --------------------------------------------------------------------------- #
# The happy path


def test_valid_skill_passes(make_skill, categories, validator):
    assert errors_for(make_skill(), categories, validator) == []


def test_valid_skill_passes_with_matching_author(make_skill, categories, validator):
    skill = make_skill(namespace="testuser")
    assert errors_for(skill, categories, validator, author="testuser") == []


def test_author_match_is_case_insensitive(make_skill, categories, validator):
    skill = make_skill(namespace="testuser")
    assert errors_for(skill, categories, validator, author="TestUser") == []


# --------------------------------------------------------------------------- #
# L1 — ownership


def test_namespace_must_match_pull_request_author(make_skill, categories, validator):
    skill = make_skill(namespace="alice")
    errs = errors_for(skill, categories, validator, author="mallory")
    assert any("does not match the pull request author" in e for e in errs)


def test_reserved_namespace_skips_the_author_check(make_skill, categories, validator):
    """CODEOWNERS gates reserved namespaces, which is a stronger control than a
    username match — so validate.py must not also demand one."""
    skill = make_skill(namespace="civic-skills")
    errs = errors_for(skill, categories, validator, author="anyone-at-all")
    assert not any("pull request author" in e for e in errs)


def test_ownership_is_not_checked_when_no_author_is_supplied(make_skill, categories, validator):
    skill = make_skill(namespace="alice")
    assert errors_for(skill, categories, validator, author=None) == []


# --------------------------------------------------------------------------- #
# L0 — structure


def test_missing_skill_md_fails(make_skill, categories, validator):
    skill = make_skill()
    (skill / "SKILL.md").unlink()
    assert any("SKILL.md is missing" in e for e in errors_for(skill, categories, validator))


def test_missing_frontmatter_fails(make_skill, categories, validator):
    skill = make_skill(raw="# No frontmatter here\n")
    assert any("no YAML frontmatter" in e for e in errors_for(skill, categories, validator))


def test_frontmatter_without_a_body_fails(make_skill, categories, validator):
    skill = make_skill(body="")
    assert any("no body" in e for e in errors_for(skill, categories, validator))


def test_name_must_match_the_directory(make_skill, categories, validator):
    skill = make_skill(name="one-name", overrides={"name": "a-different-name"})
    errs = errors_for(skill, categories, validator)
    assert any("does not match the directory" in e for e in errs)


def test_symlinks_are_rejected(make_skill, categories, validator, tmp_path):
    skill = make_skill()
    target = tmp_path / "outside.txt"
    target.write_text("secrets", encoding="utf-8")
    os.symlink(target, skill / "link.md")
    assert any("symlink" in e for e in errors_for(skill, categories, validator))


def test_disallowed_file_types_are_rejected(make_skill, categories, validator):
    skill = make_skill(files={"payload.exe": "MZ"})
    errs = errors_for(skill, categories, validator)
    assert any("not an allowed file type" in e for e in errs)


def test_oversized_files_are_rejected(make_skill, categories, validator):
    skill = make_skill(files={"big.md": "x" * (validate.MAX_FILE_BYTES + 1)})
    assert any("file cap" in e for e in errors_for(skill, categories, validator))


def test_nested_git_directories_are_rejected(make_skill, categories, validator):
    skill = make_skill()
    (skill / ".git").mkdir()
    assert any("nested git" in e for e in errors_for(skill, categories, validator))


# --------------------------------------------------------------------------- #
# YAML safety — the billion-laughs surface


def test_yaml_aliases_are_rejected():
    raw = "a: &anchor [1, 2]\nb: *anchor\n"
    errs = validate.check_yaml_safety(raw)
    assert any("aliases" in e for e in errs)


def test_oversized_frontmatter_is_rejected():
    errs = validate.check_yaml_safety("k: " + "v" * validate.MAX_FRONTMATTER_BYTES)
    assert any("exceeds" in e for e in errs)


def test_malformed_yaml_is_reported_not_raised():
    errs = validate.check_yaml_safety("key: [unclosed\n")
    assert errs and "not valid YAML" in errs[0]


def test_ordinary_frontmatter_passes_yaml_safety():
    assert validate.check_yaml_safety("name: a-skill\ndescription: something\n") == []


# --------------------------------------------------------------------------- #
# Schema


@pytest.mark.parametrize("field", ["name", "description", "license", "metadata"])
def test_required_fields_are_required(make_skill, categories, validator, field):
    skill = make_skill(overrides={field: None})
    assert errors_for(skill, categories, validator), f"{field} should be required"


@pytest.mark.parametrize(
    "civic_field",
    [
        "civic.category",
        "civic.jurisdiction",
        "civic.data-sensitivity",
        "civic.human-review",
        "civic.maintainer",
        "civic.contact",
    ],
)
def test_civic_metadata_fields_are_required(make_skill, categories, validator, civic_field):
    from conftest import VALID_FRONTMATTER

    metadata = {k: v for k, v in VALID_FRONTMATTER["metadata"].items() if k != civic_field}
    skill = make_skill(overrides={"metadata": metadata})
    assert errors_for(skill, categories, validator), f"{civic_field} should be required"


def test_unknown_category_is_rejected(make_skill, categories, validator):
    from conftest import VALID_FRONTMATTER

    metadata = dict(VALID_FRONTMATTER["metadata"], **{"civic.category": "not-a-category"})
    skill = make_skill(overrides={"metadata": metadata})
    errs = errors_for(skill, categories, validator)
    assert any("not in the vocabulary" in e for e in errs)


def test_every_category_in_the_vocabulary_is_accepted(make_skill, categories, validator):
    """The vocabulary and the schema must not drift apart."""
    from conftest import VALID_FRONTMATTER

    for category in sorted(categories):
        metadata = dict(VALID_FRONTMATTER["metadata"], **{"civic.category": category})
        skill = make_skill(name=f"cat-{category}", overrides={"metadata": metadata})
        assert errors_for(skill, categories, validator) == [], category


def test_invalid_data_sensitivity_is_rejected(make_skill, categories, validator):
    from conftest import VALID_FRONTMATTER

    metadata = dict(VALID_FRONTMATTER["metadata"], **{"civic.data-sensitivity": "maybe"})
    skill = make_skill(overrides={"metadata": metadata})
    assert errors_for(skill, categories, validator)


def test_uppercase_names_are_rejected(make_skill, categories, validator):
    skill = make_skill(name="Bad-Name")
    assert errors_for(skill, categories, validator)


# --------------------------------------------------------------------------- #
# Vendor extensions


def test_non_spec_fields_are_quarantined_not_rejected(make_skill, categories, validator):
    """Some tools accept fields beyond the spec's six. Rejecting those would reject
    otherwise-working skills, so they are relocated into metadata instead."""
    skill = make_skill(overrides={"argument-hint": "a file path"})
    errs, notes = validate.validate_skill(skill, categories, validator)
    assert errs == []
    assert any("argument-hint" in n for n in notes)


def test_quarantine_moves_the_field_under_an_ext_prefix():
    front = {"name": "x", "metadata": {}, "shell": "bash", "paths": "src/"}
    result, moved = validate.quarantine_extensions(front)
    assert moved == ["paths", "shell"]
    assert result["metadata"]["ext.shell"] == "bash"
    assert "shell" not in result
