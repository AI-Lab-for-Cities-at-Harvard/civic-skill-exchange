"""Documentation drift, held to the tree it describes (#159).

CLAUDE.md's rule: a doc that has drifted is worse than none, because it is
trusted. These tests read a doc's claim and check it against the code,
workflow, or package script that actually governs the behaviour — the same
pattern `tests/test_workflows.py` and `tests/test_review_claim.py` use.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def test_development_md_accessibility_claim_is_current() -> None:
    """DEVELOPMENT.md once said accessibility checks "arrive with issue #6" —
    they have long since landed and run in CI (see the Accessibility section
    earlier in the same file). The stale forward-reference should be gone,
    and the tests it should instead point back to have to actually exist."""
    text = _text("docs/DEVELOPMENT.md")
    assert "issue #6" not in text, (
        "DEVELOPMENT.md still says accessibility checks arrive with issue #6; "
        "they exist and run in CI already — say what runs instead."
    )
    assert (ROOT / "site" / "src" / "App.a11y.test.tsx").exists()
    assert (ROOT / "site" / "src" / "components" / "a11y.test.tsx").exists()


def test_development_md_build_gate_command_is_runnable() -> None:
    """The pre-pull-request checklist tells a contributor to run
    `npm run build --workspaces`. The validator workspace has no `build`
    script, so that literal command exits non-zero — only the root script
    (which passes `--if-present`, as the lint/typecheck bullet right above it
    already explains) actually passes."""
    text = _text("docs/DEVELOPMENT.md")
    validator_pkg = json.loads(_text("validator/package.json"))
    assert "build" not in validator_pkg.get("scripts", {}), (
        "validator/package.json now has a build script — the --if-present "
        "caveat in DEVELOPMENT.md's checklist may no longer be needed"
    )
    assert "`npm run build --workspaces` passes" not in text, (
        "this command fails outright: the validator workspace has no build "
        "script and `--workspaces` alone (no --if-present) is not tolerant of that"
    )
    assert "npm run build --workspaces --if-present" in text


def test_readme_does_not_repeat_the_project_board_line_twice() -> None:
    text = _text("README.md")
    count = text.count("What we're building next is on the [project board]")
    assert count == 1, (
        f"README.md repeats the project-board line {count} times; it should appear once"
    )
