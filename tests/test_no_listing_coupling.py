"""No test may depend on a skill that is listed.

`tests/conftest.py` has said this since the beginning:

    Every test builds a throwaway skill on disk rather than reaching into
    skills/ — a test that depends on a real listing breaks the moment someone
    edits it.

It was written down and not enforced, so it was broken twice in two days and
each time `main` went red on a *deletion* (#116, #121). Delisting is a
documented, no-justification-needed operation: it should be `git rm -r` plus a
manifest regeneration, and nothing else.

**The coupling is reading from disk, not naming a listing.** A test that uses
`generalize-skill` as a fixture string passes whether or not the skill exists;
a test that resolves `ROOT / "skills" / "civic-skills" / "generalize-skill"`
and reads it does not. So what this looks for is a path built into `skills/`
with a **literal** segment after it.

The ledger check is exempt by construction rather than by name: it derives its
path from the attestation it is checking, so no literal follows `"skills"`. An
attestation naming a skill that is gone is a badge with nothing under it, and
failing is correct there.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent

#: What counts is a path rooted at the *repository* and naming a listing
#: literally. Three things are deliberately not matched, because none of them
#: breaks when a skill is deleted:
#:
#:   join(dir, "skills", "testuser", "x")   a throwaway tree — not ROOT
#:   ".../upload/main/skills/civic-skills"  a URL in an expectation, not a path
#:   ROOT / "skills" / entry["skill"]       derived from what is being checked
#:
#: The third is the ledger exemption, and it falls out of the pattern rather
#: than being listed by name.
PY_LITERAL = re.compile(r'\bROOT\s*/\s*"skills"\s*/\s*["\']')
TS_LITERAL = re.compile(r'\bROOT\s*,\s*"skills"\s*,\s*["\']')


#: This file quotes the patterns it looks for, so it would flag itself.
SELF = Path(__file__).name


def test_files() -> list[Path]:
    out: list[Path] = []
    out += sorted(p for p in ROOT.glob("tests/*.py") if p.name != SELF)
    for pattern in ("*.test.ts", "*.test.tsx", "*.a11y.test.tsx"):
        out += sorted(p for p in ROOT.glob(f"site/src/**/{pattern}"))
        out += sorted(p for p in ROOT.glob(f"validator/src/**/{pattern}"))
    return out


def test_there_are_test_files_to_check():
    """A glob that silently matches nothing is a check that always passes."""
    found = test_files()
    assert len(found) > 20, f"only found {len(found)} test files"


@pytest.mark.parametrize("path", test_files(), ids=lambda p: str(p.relative_to(ROOT)))
def test_no_test_reads_a_listed_skill_from_disk(path: Path):
    pattern = PY_LITERAL if path.suffix == ".py" else TS_LITERAL
    text = path.read_text(encoding="utf-8")

    offenders = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        if line.lstrip().startswith(("#", "*", "//", "/*")):
            continue  # prose about the rule is not a violation of it
        if pattern.search(line):
            offenders.append(f"{path.relative_to(ROOT)}:{line_number}  {line.strip()}")

    assert not offenders, (
        "a test reads a real listing from disk, so deleting that skill breaks "
        "the suite:\n  " + "\n  ".join(offenders) +
        "\nBuild a throwaway skill instead — see the `repo` fixture in "
        "tests/test_attestation.py or `make_skill` in tests/conftest.py."
    )
