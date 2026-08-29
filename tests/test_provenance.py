"""Deployment provenance — self-reported context about whether a skill is in use.

Published as self-reported, and deliberately unable to affect tier.
"""

from __future__ import annotations

import build_index
import validate
from conftest import VALID_FRONTMATTER


def meta(**overrides) -> dict:
    """Frontmatter metadata with provenance fields, overridable per test."""
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
# Required fields


def test_affiliation_is_required(make_skill, categories, validator):
    skill = make_skill(overrides={"metadata": meta(affiliation=None)})
    assert errors_for(skill, categories, validator)


def test_deployment_is_required(make_skill, categories, validator):
    skill = make_skill(overrides={"metadata": meta(deployment=None)})
    assert errors_for(skill, categories, validator)


def test_valid_provenance_passes(make_skill, categories, validator):
    skill = make_skill(
        overrides={
            "metadata": meta(
                affiliation="government",
                deployment="organization",
                deployed_at="City of Example, Dept of Building Safety",
                deployed_in="US-MA / Boston",
                deployed_since="2026-03",
            )
        }
    )
    assert errors_for(skill, categories, validator) == []


def test_unknown_affiliation_is_rejected(make_skill, categories, validator):
    skill = make_skill(overrides={"metadata": meta(affiliation="wizard")})
    assert errors_for(skill, categories, validator)


def test_unknown_deployment_scope_is_rejected(make_skill, categories, validator):
    skill = make_skill(overrides={"metadata": meta(deployment="galaxy-wide")})
    assert errors_for(skill, categories, validator)


# --------------------------------------------------------------------------- #
# The cross-field rule: a deployment claim must name where


def test_claiming_deployment_requires_naming_the_organization(make_skill, categories, validator):
    """'Used organization-wide' with no organization named is not evidence."""
    skill = make_skill(
        overrides={"metadata": meta(deployment="organization", deployed_at=None)}
    )
    errs = errors_for(skill, categories, validator)
    assert any("civic.deployed-at" in e for e in errs)


def test_claiming_deployment_requires_naming_the_jurisdiction(make_skill, categories, validator):
    skill = make_skill(
        overrides={
            "metadata": meta(
                deployment="team", deployed_at="Some Agency", deployed_in=None
            )
        }
    )
    errs = errors_for(skill, categories, validator)
    assert any("civic.deployed-in" in e for e in errs)


def test_personal_use_also_requires_naming_where(make_skill, categories, validator):
    """Personal is still a deployment claim — it says a real person used this
    somewhere real."""
    skill = make_skill(overrides={"metadata": meta(deployment="personal", deployed_at=None)})
    assert errors_for(skill, categories, validator)


def test_claiming_no_deployment_forbids_deployment_details(make_skill, categories, validator):
    """A contradictory claim is worse than a missing one — it reads as evidence
    on the site while the author has said the skill was never used."""
    skill = make_skill(
        overrides={
            "metadata": meta(deployment="none", deployed_at="City of Example",
                             deployed_in="US-MA / Boston")
        }
    )
    errs = errors_for(skill, categories, validator)
    assert any("civic.deployment: none" in e for e in errs)


def test_never_deployed_is_a_valid_honest_answer(make_skill, categories, validator):
    skill = make_skill(overrides={"metadata": meta(deployment="none")})
    assert errors_for(skill, categories, validator) == []


# --------------------------------------------------------------------------- #
# Format checks


def test_deployed_in_requires_a_country_code(make_skill, categories, validator):
    skill = make_skill(
        overrides={
            "metadata": meta(deployment="team", deployed_at="Example Agency", deployed_in="Boston")
        }
    )
    assert errors_for(skill, categories, validator)


def test_deployed_in_accepts_country_only(make_skill, categories, validator):
    skill = make_skill(
        overrides={"metadata": meta(deployment="team", deployed_at="Example Agency", deployed_in="GB")}
    )
    assert errors_for(skill, categories, validator) == []


def test_deployed_in_accepts_country_subdivision_and_locality(make_skill, categories, validator):
    skill = make_skill(
        overrides={
            "metadata": meta(
                deployment="team", deployed_at="Example Agency", deployed_in="US-CA / San José"
            )
        }
    )
    assert errors_for(skill, categories, validator) == []


def test_deployed_since_rejects_a_free_text_date(make_skill, categories, validator):
    skill = make_skill(
        overrides={
            "metadata": meta(
                deployment="team", deployed_at="Example Agency", deployed_in="US-MA",
                deployed_since="last spring",
            )
        }
    )
    assert errors_for(skill, categories, validator)


def test_deployed_since_accepts_year_and_year_month(make_skill, categories, validator):
    for value in ("2025", "2026-03"):
        skill = make_skill(
            name=f"since-{value}",
            overrides={
                "metadata": meta(
                    deployment="team", deployed_at="Example Agency", deployed_in="US-MA",
                    deployed_since=value,
                )
            },
        )
        assert errors_for(skill, categories, validator) == [], value


# --------------------------------------------------------------------------- #
# What the index publishes


def test_provenance_is_published_and_marked_self_reported(make_skill):
    skill = make_skill(
        overrides={
            "metadata": meta(
                affiliation="government", deployment="organization",
                deployed_at="City of Example", deployed_in="US-MA / Boston",
            )
        }
    )
    entry = build_index.build_entry(skill, {}, {})
    prov = entry["provenance"]
    assert prov["self_reported"] is True
    assert prov["affiliation"] == "government"
    assert prov["deployment"] == "organization"
    assert prov["deployed_at"] == "City of Example"


def test_contact_address_is_still_never_published(make_skill):
    """Adding provenance must not leak the maintainer's contact address."""
    entry = build_index.build_entry(make_skill(), {}, {})
    assert "test@example.com" not in str(entry)


def test_deployment_evidence_does_not_change_tier(make_skill):
    """The load-bearing invariant. Deployment is evidence of function, never of
    safety — it must not be able to promote a skill on its own."""
    skill = make_skill(
        overrides={
            "metadata": meta(
                affiliation="government", deployment="organization",
                deployed_at="City of Example", deployed_in="US-MA / Boston",
            )
        }
    )
    entry = build_index.build_entry(skill, {}, {})
    assert entry["tier"] == "community"
