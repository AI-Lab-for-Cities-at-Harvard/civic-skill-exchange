"""Deployment provenance — self-reported evidence that a skill is actually in use.

The whole point is that real operational history is evidence reading cannot give
you. The whole risk is that it gets treated as a security signal, which it is not:
a compromised account at a real agency ships malware from a real agency.

These tests hold that line. Provenance is published, filterable, and always
labelled self-reported until a reviewer verifies it.
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
# The contact-domain signal
#
# A .gov address is a hint worth surfacing to a reviewer. It is NOT verification:
# anyone can type an address they do not control.


def test_government_contact_domain_is_classified():
    assert build_index.classify_contact_domain("digital@cityofx.gov") == "government"
    assert build_index.classify_contact_domain("x@agency.gov.uk") == "government"
    assert build_index.classify_contact_domain("x@dept.mil") == "government"


def test_academic_contact_domain_is_classified():
    assert build_index.classify_contact_domain("someone@harvard.edu") == "academic"


def test_ordinary_contact_domain_is_not_classified():
    assert build_index.classify_contact_domain("someone@gmail.com") == "unclassified"
    assert build_index.classify_contact_domain("someone@consultancy.io") == "unclassified"


def test_a_lookalike_government_domain_is_not_classified():
    """cityofx.gov.attacker.com must not read as government."""
    assert build_index.classify_contact_domain("x@cityofx.gov.attacker.com") == "unclassified"


def test_missing_contact_is_handled():
    assert build_index.classify_contact_domain(None) == "unclassified"
    assert build_index.classify_contact_domain("not-an-address") == "unclassified"


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


def test_provenance_is_unverified_until_a_reviewer_says_otherwise(make_skill):
    entry = build_index.build_entry(make_skill(), {}, {})
    assert entry["provenance"]["verified"] is None


def test_a_reviewer_can_verify_a_deployment_claim(make_skill):
    """Verification lives in the attestation ledger, which only reviewers write —
    never in submitter-controlled frontmatter."""
    skill = make_skill(
        namespace="ns", name="example",
        overrides={
            "metadata": meta(
                affiliation="government", deployment="organization",
                deployed_at="City of Example", deployed_in="US-MA / Boston",
            )
        },
    )
    attestations = {
        "ns/example": {
            "skill": "ns/example",
            "sha": "deadbeef",
            "reviewers": ["alice", "bob"],
            "reviewed": "2026-09-01",
            "expires": "2027-09-01",
            "provenance_verified": {
                "scope": "organization",
                "method": "Confirmed by reply from the named contact on a .gov domain",
                "by": "alice",
                "date": "2026-09-01",
            },
        }
    }
    entry = build_index.build_entry(skill, attestations, {})
    assert entry["provenance"]["verified"]["scope"] == "organization"


def test_contact_address_is_still_never_published(make_skill):
    """Adding provenance must not leak the contact the domain signal is derived
    from. The class is published; the address is not."""
    entry = build_index.build_entry(make_skill(), {}, {})
    assert "test@example.com" not in str(entry)
    assert entry["provenance"]["contact_domain"] == "unclassified"


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
