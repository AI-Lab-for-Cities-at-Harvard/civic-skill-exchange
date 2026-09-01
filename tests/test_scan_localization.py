"""#89: external-url means opposite things depending on civic.localization.

A localized skill *is* one jurisdiction's forms, deadlines and portals, so an
external URL in one is the skill working. A generalized skill carrying a
jurisdiction URL is a real finding, because removing exactly that is what
generalization is for.

Flagging both identically is how a maintainer learns that flags are ignorable.
"""

from __future__ import annotations

import scan


def urls_in(result: dict) -> list[dict]:
    return [f for f in result["flags"] if f["signature"] == "external-url"]


def test_a_localized_skill_is_not_flagged_for_its_own_jurisdiction(make_skill):
    front = dict(scan_front(localization="localized"))
    skill = make_skill(front=front, body="See https://data.brooklinema.gov for the feed.\n")
    assert urls_in(scan.scan_skill(skill)) == []


def test_a_generalized_skill_carrying_a_city_url_is_flagged(make_skill):
    skill = make_skill(
        front=dict(scan_front(localization="generalized")),
        body="See https://data.brooklinema.gov for the feed.\n",
    )
    found = urls_in(scan.scan_skill(skill))
    assert len(found) == 1
    assert "generali" in found[0]["explanation"].lower()


def test_an_undeclared_skill_behaves_as_before(make_skill):
    skill = make_skill(
        front=dict(scan_front(localization=None)),
        body="See https://data.brooklinema.gov for the feed.\n",
    )
    assert len(urls_in(scan.scan_skill(skill))) == 1


def test_the_allowlist_still_applies_to_a_generalized_skill(make_skill):
    skill = make_skill(
        front=dict(scan_front(localization="generalized")),
        body="See https://github.com/example/repo for the source.\n",
    )
    assert urls_in(scan.scan_skill(skill)) == []


def test_a_localized_skill_is_still_scanned_for_everything_else(make_skill):
    """Suppressing one soft signature must not quieten the hard ones."""
    skill = make_skill(
        front=dict(scan_front(localization="localized")),
        overrides={"allowed-tools": "Bash( * )"},
        body="Body.\n",
    )
    result = scan.scan_skill(skill)
    assert [f["signature"] for f in result["blocking"]] == ["wildcard-bash-grant"]


def test_localization_is_read_from_the_skill_not_guessed(make_skill):
    """A skill with no readable frontmatter must not crash the scan, and must
    fall back to flagging — the safe direction."""
    skill = make_skill(raw="not frontmatter at all\n\nhttps://data.brooklinema.gov\n")
    assert len(urls_in(scan.scan_skill(skill))) == 1


def scan_front(localization: str | None) -> dict:
    from conftest import VALID_FRONTMATTER

    front = {k: v for k, v in VALID_FRONTMATTER.items() if k != "metadata"}
    meta = dict(VALID_FRONTMATTER["metadata"])
    if localization is None:
        meta.pop("civic.localization", None)
    else:
        meta["civic.localization"] = localization
    front["metadata"] = meta
    return front
