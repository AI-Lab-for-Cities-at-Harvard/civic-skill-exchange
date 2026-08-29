"""Where a skill sits on the jurisdiction axis.

A skill is `localized` when it carries one jurisdiction's specifics, `generalized`
when those have been lifted out into a context an adopter fills in. The field is
optional: plenty of skills have no jurisdiction-specific content at all, and
omitting it is the honest answer for those.
"""

from __future__ import annotations

import build_index
import validate
from conftest import VALID_FRONTMATTER


def meta(**overrides) -> dict:
    base = dict(VALID_FRONTMATTER["metadata"])
    for key, value in overrides.items():
        field = "civic." + key.replace("_", "-")
        if value is None:
            base.pop(field, None)
        else:
            base[field] = value
    return base


def errors_for(skill_dir, categories, validator) -> list[str]:
    errs, _ = validate.validate_skill(skill_dir, categories, validator)
    return errs


# --------------------------------------------------------------------------- #


def test_localization_is_optional(make_skill, categories, validator):
    """A skill with no jurisdiction-specific content should not have to pick a
    side. Omitting the field is the honest answer, not a gap to be filled."""
    skill = make_skill(overrides={"metadata": meta(localization=None)})
    assert errors_for(skill, categories, validator) == []


def test_generalized_is_accepted(make_skill, categories, validator):
    skill = make_skill(overrides={"metadata": meta(localization="generalized")})
    assert errors_for(skill, categories, validator) == []


def test_localized_is_accepted(make_skill, categories, validator):
    skill = make_skill(
        overrides={"metadata": meta(localization="localized", jurisdiction="us-state")}
    )
    assert errors_for(skill, categories, validator) == []


def test_an_invented_value_is_rejected(make_skill, categories, validator):
    skill = make_skill(overrides={"metadata": meta(localization="semi-portable")})
    assert errors_for(skill, categories, validator)


def test_a_generalized_skill_cannot_claim_a_specific_jurisdiction(
    make_skill, categories, validator
):
    """The contradiction that matters. 'Generalized' means the jurisdiction
    specifics were lifted out; claiming us-state in the same breath means one of
    the two fields is wrong, and an adopter cannot tell which."""
    skill = make_skill(
        overrides={"metadata": meta(localization="generalized", jurisdiction="us-state")}
    )
    errs = errors_for(skill, categories, validator)
    assert any("generalized" in e for e in errs)


def test_a_generalized_skill_may_declare_a_generic_jurisdiction(
    make_skill, categories, validator
):
    skill = make_skill(
        overrides={"metadata": meta(localization="generalized", jurisdiction="generic")}
    )
    assert errors_for(skill, categories, validator) == []


def test_a_generalized_skill_may_target_international_adopters(
    make_skill, categories, validator
):
    """'intl' says nothing about which jurisdiction, so it does not contradict."""
    skill = make_skill(
        overrides={"metadata": meta(localization="generalized", jurisdiction="intl")}
    )
    assert errors_for(skill, categories, validator) == []


# --------------------------------------------------------------------------- #
# What the index publishes


def test_localization_is_published(make_skill):
    skill = make_skill(overrides={"metadata": meta(localization="generalized")})
    assert build_index.build_entry(skill, {}, {})["localization"] == "generalized"


def test_localization_is_null_when_not_declared(make_skill):
    assert build_index.build_entry(make_skill(), {}, {})["localization"] is None
