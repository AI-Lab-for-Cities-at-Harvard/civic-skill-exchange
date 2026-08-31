"""CI runs what we pinned, not what a tag points at today.

A tag is mutable. Whoever controls it controls what runs in CI, and this
repository's workflows are not idle: `report.yml` holds `pull-requests: write`
and `build.yml` deploys the site. `docs/SECURITY.md` asks contributors to
declare least privilege in `allowed-tools`; this is the same argument applied to
our own supply chain.

The check is mechanical because the failure is silent — an unpinned `uses:`
looks exactly like a pinned one to a reader skimming a diff.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
WORKFLOWS = sorted((ROOT / ".github" / "workflows").glob("*.yml"))

# `uses: owner/repo@ref` or `uses: ./local/path`. Reusable local workflows and
# Docker actions are not tags and are out of scope.
USES = re.compile(r"^\s*(?:-\s*)?uses:\s*(\S+)", re.M)
PINNED = re.compile(r"^[\w.-]+/[\w./-]+@[0-9a-f]{40}$")


def test_there_are_workflows_to_check() -> None:
    """Guards the guard: a glob that matches nothing passes every test below."""
    assert WORKFLOWS, "no workflows found — has the path changed?"


@pytest.mark.parametrize("wf", WORKFLOWS, ids=lambda p: p.name)
def test_every_action_is_pinned_to_a_commit_sha(wf: Path) -> None:
    for ref in USES.findall(wf.read_text(encoding="utf-8")):
        if ref.startswith("./"):
            continue
        assert PINNED.match(ref), (
            f"{wf.name} uses {ref!r}, which is a mutable ref. Pin it to a "
            "40-character commit SHA with the version in a trailing comment."
        )


@pytest.mark.parametrize("wf", WORKFLOWS, ids=lambda p: p.name)
def test_every_pin_says_which_version_it_is(wf: Path) -> None:
    """A bare SHA is unreadable and unreviewable. The trailing comment is what
    lets a human see that a Dependabot bump went from v4.4.0 to v4.5.0 rather
    than to something unrelated."""
    for line in wf.read_text(encoding="utf-8").splitlines():
        if not re.match(r"^\s*(?:-\s*)?uses:\s*[\w.-]+/", line):
            continue
        assert re.search(r"@[0-9a-f]{40}\s+#\s*v\S+", line), (
            f"{wf.name}: {line.strip()!r} has no version comment"
        )


@pytest.mark.parametrize("wf", WORKFLOWS, ids=lambda p: p.name)
def test_no_workflow_still_defers_pinning(wf: Path) -> None:
    """Five workflows carried a TODO saying to pin before enabling. All five
    were enabled anyway, which made them unmet preconditions rather than future
    work. Fail if one comes back."""
    text = wf.read_text(encoding="utf-8")
    assert not re.search(r"TODO.*pin", text, re.I), (
        f"{wf.name} defers pinning in a comment"
    )


def test_dependabot_watches_the_actions() -> None:
    """Pinning without an update path trades a mutable ref for a stale one. The
    SHAs stop moving, and so do the security fixes."""
    config = ROOT / ".github" / "dependabot.yml"
    assert config.is_file(), "nothing keeps the pinned SHAs current"
    assert "github-actions" in config.read_text(encoding="utf-8")
