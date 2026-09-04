"""The contract between generalize-skill and localize-skill, held to itself.

Its own second paragraph says why:

    The contract lives in two copies, in two skills, that will sit on different
    machines at different versions. […] it has to change in both places at
    once, or one side will write a file the other cannot read.

Two copies with nothing holding them together is the failure this repository has
already had four times in other forms. So these pin them (#13).

**Why the copies are not merged into one file.** Each skill ships to an adopter
as a self-contained directory: `localize-skill` installed on its own has to
carry the contract it reads, and a reference to a file in this repository would
be a reference to something the adopter does not have. The duplication is
deliberate; what was missing is the check.

**Why this may read a listing, when tests/test_no_listing_coupling.py forbids
it.** It skips rather than fails when either skill is absent — the pin applies
while both exist and stops applying when one does not, which is the behaviour
that rule is protecting. The paths are built rather than written out so the
checker sees no literal.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent

CONTRACTS = {
    name: ROOT.joinpath(*["skills", "civic-skills", name, "references", "contract.md"])
    for name in ("generalize-skill", "localize-skill")
}

#: The one shared heading allowed to differ. Each skill introduces the contract
#: in its own voice — generalize writes the file, localize fills it and adds one
#: of its own — and the introduction says which side the reader is on.
EXEMPT_HEADING = "# The context file"

#: Sections only one skill carries, and which one. `<org>.profile.yml` is
#: localize's own output; generalize never writes it.
ASYMMETRIC = {"## `<org>.profile.yml` — the same shape, one level up": "localize-skill"}

pytestmark = pytest.mark.skipif(
    not all(p.is_file() for p in CONTRACTS.values()),
    reason="both skills must be listed for their shared contract to be pinned",
)


def sections(path: Path) -> dict[str, str]:
    parts = re.split(r"^(#+ .*)$", path.read_text(encoding="utf-8"), flags=re.MULTILINE)
    return {
        parts[i].strip(): parts[i + 1].strip()
        for i in range(1, len(parts), 2)
    }


def both() -> tuple[dict[str, str], dict[str, str]]:
    return sections(CONTRACTS["generalize-skill"]), sections(CONTRACTS["localize-skill"])


def test_the_contract_has_sections_to_compare():
    """A parse that silently found nothing is a pin that always passes."""
    g, l = both()
    assert len(g) > 8 and len(l) > 8, (len(g), len(l))


def test_every_shared_section_is_identical():
    """Byte for byte. A reworded explanation in one copy is how the two drift
    apart while both still look right on their own."""
    g, l = both()
    shared = [h for h in g if h in l and h != EXEMPT_HEADING]
    assert shared, "no shared sections found — the parse or the files changed shape"

    drifted = [h for h in shared if g[h] != l[h]]
    assert not drifted, (
        "these sections differ between the two copies of the contract:\n  "
        + "\n  ".join(drifted)
        + "\nThe contract says it has to change in both places at once."
    )


def test_only_the_expected_sections_are_asymmetric():
    """Catches the other direction: shared material added to one copy only."""
    g, l = both()
    only_generalize = {h for h in g if h not in l}
    only_localize = {h for h in l if h not in g}

    expected_localize = {h for h, who in ASYMMETRIC.items() if who == "localize-skill"}
    expected_generalize = {h for h, who in ASYMMETRIC.items() if who == "generalize-skill"}

    assert only_generalize == expected_generalize, sorted(only_generalize)
    assert only_localize == expected_localize, sorted(only_localize)


def test_both_copies_declare_the_same_contract_version():
    """The number is the whole mechanism — a reader compares it against the file
    it was handed. Two copies claiming different versions would make every
    adopter's check meaningless."""
    versions = {}
    for name, path in CONTRACTS.items():
        text = path.read_text(encoding="utf-8")
        found = re.findall(r"^contract_version:\s*(\d+)\s*$", text, re.MULTILINE)
        assert found, f"{name} states no contract_version"
        versions[name] = set(found)
    assert len(set(map(frozenset, versions.values()))) == 1, versions


def test_the_documentation_points_at_the_contract_rather_than_restating_it():
    """A third copy in docs/ would be a third thing to keep in step. The doc
    says where the contract is and what the version means; the contract says
    what the shape is."""
    doc = (ROOT / "docs" / "LOCALIZATION.md").read_text(encoding="utf-8")
    assert "contract.md" in doc, "LOCALIZATION.md does not say where the contract lives"
    assert "contract_version" in doc

    # The shape itself stays in the skills. If the doc grows the slot keys, it
    # has become the third copy.
    for key in ("exact", "what", "slots:"):
        assert f"`{key}`" not in doc or "contract.md" in doc
