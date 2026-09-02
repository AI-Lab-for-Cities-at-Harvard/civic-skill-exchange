"""The Reviewed claim, asserted once and guarded everywhere.

ADR 0001 made a Reviewed listing mean *the AI Lab for Cities read that exact
commit*. The old claim — two named people from different organizations — was
spread across eleven files, and copy spread that thin drifts back: somebody
writes "our two reviewers" into a new page a year from now and nothing catches
it, because nothing in the build reads the count.

This is that catch. It reads the shipped documentation and site copy, not the
history and not the reasoning: `docs/spikes/` and `docs/adr/` are excluded
deliberately, because a spike records the analysis behind a decision and an ADR
records what was superseded. Both must be free to quote the old rule.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

import build_index

ROOT = Path(__file__).resolve().parent.parent

# Where the claim is made to a reader. Everything here describes current
# behaviour, so everything here has to agree with ADR 0001.
SURFACES = [
    "README.md",
    "CONTRIBUTING.md",
    "docs/TIERS.md",
    "docs/REVIEW.md",
    "docs/SECURITY.md",
    "docs/ARCHITECTURE.md",
    "docs/README.md",
    "docs/DEVELOPMENT.md",
    "docs/LOCALIZATION.md",
    "registry/reviewed.yml",
    ".github/ISSUE_TEMPLATE/review-request.yml",
    ".github/ISSUE_TEMPLATE/submit-skill.yml",
    ".github/CODEOWNERS",
]

SURFACES += sorted(
    str(p.relative_to(ROOT))
    for p in (ROOT / "site" / "src").rglob("*.tsx")
    if not p.name.endswith(".test.tsx")
)

# Each pattern is one way of saying the thing that is no longer true. They are
# deliberately narrow: "reviewer" in the general sense is still a real role, and
# CONTRIBUTING.md's "the first two questions any government IT reviewer asks" is
# about somebody else's reviewer entirely.
FORBIDDEN = {
    "two named people": re.compile(r"\btwo named\b", re.I),
    "a reviewer count": re.compile(r"\btwo\b[^.\n]{0,30}\breviewers\b", re.I),
    "reviewers as a plural body": re.compile(r"\breviewers\b\s+(work|read|sign)", re.I),
    "cross-organization independence": re.compile(r"different organi[sz]ations?", re.I),
    "a two-handle ledger example": re.compile(r"reviewers\"?\s*:\s*\[[^\]\n]*,"),
}

# Independence is the one claim the documents have to be able to *deny*. ADR
# 0001 requires them to say the ledger PR is not a second pair of eyes, so the
# check looks at whether the phrase is negated rather than whether it appears.
INDEPENDENCE = re.compile(
    r"second pair of eyes|two[- ]person control"
    r"|independent (check|approval|review|audit|assessment|attestation)\b",
    re.I,
)
NEGATED = re.compile(r"\b(not|never|no|nor|nobody|rather than|instead of)\b", re.I)


def _text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def _unnegated(text: str, pattern: re.Pattern[str]) -> list[str]:
    """Matches that are being asserted rather than denied.

    Independence is the one claim these documents have to be able to *say the
    words of*: ADR 0001 requires them to state that the ledger pull request is
    not a second pair of eyes. So the check is whether the sentence negates the
    phrase, not whether the phrase occurs."""
    out = []
    for found in pattern.finditer(text):
        # Split on sentence ends and paragraph breaks, not on every newline —
        # these files are hand-wrapped, so "not an\nindependent audit" is one
        # sentence with the negation on the line above.
        before = text[max(0, found.start() - 200):found.start()]
        sentence = re.split(r"[.!?]\s|\n\s*\n", before)[-1]
        if not NEGATED.search(sentence):
            out.append(found.group(0))
    return out


@pytest.mark.parametrize("rel", SURFACES)
def test_no_surface_claims_more_review_than_happened(rel: str) -> None:
    """Nobody reading the site or the docs should believe a Reviewed listing
    was checked by someone other than the Lab."""
    text = _text(rel)
    for what, pattern in FORBIDDEN.items():
        found = pattern.search(text)
        assert found is None, (
            f"{rel} still asserts {what}: {found.group(0)!r}. "
            "ADR 0001: a Reviewed listing means the AI Lab for Cities read "
            "that exact commit."
        )

    for found in _unnegated(text, INDEPENDENCE):
        assert False, (
            f"{rel} claims independence: {found!r}, unnegated. "
            "ADR 0001, ruling 3: the reviewers team is one person across two "
            "accounts, and no document may describe it as an independent check."
        )


def test_the_definition_names_the_lab() -> None:
    """Removing the old claim is half the job — TIERS.md has to say what the
    badge means now, or the tier is defined by nothing at all."""
    assert re.search(r"AI Lab for Cities", _text("docs/TIERS.md"))


def test_review_md_keeps_the_checklist_and_drops_the_independence_rule() -> None:
    """The checklist itself is unchanged by ADR 0001. What went is the rule
    about independence *between* reviewers, which is meaningless with one."""
    text = _text("docs/REVIEW.md")
    assert "talked first" not in text
    assert re.search(r"civic", text, re.I), "the checklist itself should survive"


def test_the_ledger_pr_is_never_described_as_two_person_control() -> None:
    """ADR 0001, ruling 3: the repository's two review members are one person
    across two accounts. CODEOWNERS keeps the gate so the mechanism is right
    when a second person exists; saying it out loud is the part that is banned,
    and saying it is *not* two-person control is the part that is required."""
    control = re.compile(r"two[- ]person control", re.I)
    for rel in ("docs/SECURITY.md", "docs/TIERS.md", "docs/REVIEW.md", ".github/CODEOWNERS"):
        assert not _unnegated(_text(rel), control), rel


def test_the_waiting_period_records_its_exception() -> None:
    """ADR 0002 ruling 5: the Lab does not observe the 30-day period on
    `civic-skills`. TIERS.md has to state the period, the exception, and what
    the exception costs — an exception with no stated cost reads as a tidy-up
    rather than a trade."""
    text = _text("docs/TIERS.md")
    # In the paragraph that states the period, not merely somewhere in the file:
    # `civic-skills` is named elsewhere for self-review, and a match there would
    # pass this test while promotion step 2 still read as absolute.
    para = next(p for p in text.split("\n\n") if "30 days" in p)
    assert "civic-skills" in para, "the exempt namespace is not named beside the period"
    assert "re-scan" in para, "what the exception costs is not stated beside it"


def test_the_issue_template_does_not_ask_for_a_false_affirmation() -> None:
    """The period is a required checkbox, not enforced in code. A Lab submitter
    reviewing on day one would have to tick something untrue unless the label
    carries the exception."""
    text = _text(".github/ISSUE_TEMPLATE/review-request.yml")
    line = next(l for l in text.splitlines() if "30 days" in l)
    assert "civic-skills" in line, (
        f"the eligibility checkbox still reads {line.strip()!r} with no exception"
    )


def test_the_exception_is_confined_to_the_reserved_namespace() -> None:
    """It applies to the namespace the Lab controls and can re-scan on demand,
    and to nothing else."""
    for rel in ("docs/TIERS.md", ".github/ISSUE_TEMPLATE/review-request.yml"):
        for line in _text(rel).splitlines():
            if "30 days" in line and "civic-skills" in line:
                assert not re.search(r"any namespace|all namespaces|every namespace",
                                     line, re.I), rel


# --------------------------------------------------------------------------- #
# The guide has to name the command the build actually runs (#109).


def test_the_reviewer_guide_names_the_command_the_build_runs(monkeypatch):
    """A reviewer attests to whatever `head_sha` returns. If the guide tells
    them to obtain it some other way, they attest to a different value and the
    badge never appears — the hardest failure here to debug, because the
    attestation, the skill and the build all look right on their own."""
    captured: list[list[str]] = []

    class Result:
        returncode = 0
        stdout = "a" * 40

    def fake_run(command, **kwargs):
        captured.append(command)
        return Result()

    monkeypatch.setattr(build_index.subprocess, "run", fake_run)
    build_index.head_sha(build_index.ROOT / "skills" / "civic-skills" / "generalize-skill")

    # Everything but the path: the flags are what a reviewer has to type.
    flags = " ".join(captured[0][:captured[0].index("--") + 1])
    guide = (build_index.ROOT / "docs" / "REVIEW.md").read_text(encoding="utf-8")
    assert flags in guide, (
        f"docs/REVIEW.md does not tell a reviewer to run `{flags}`, which is "
        f"what build_index.py compares their attestation against")
