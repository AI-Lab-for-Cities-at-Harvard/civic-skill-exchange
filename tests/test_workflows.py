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


# --------------------------------------------------------------------------- #
# The pull request comment, which is rendered across four files: report.yml
# fetches and posts, report.ts writes the words, check.ts prints the same words
# locally, and validate.yml owns the step names both of them quote.

RENDERER = (ROOT / "validator" / "src" / "report.ts").read_text(encoding="utf-8")
REPORT_YML = (ROOT / ".github" / "workflows" / "report.yml").read_text(encoding="utf-8")
VALIDATE_YML = (ROOT / ".github" / "workflows" / "validate.yml").read_text(encoding="utf-8")
LOCAL_CHECK = (ROOT / "validator" / "src" / "check.ts").read_text(encoding="utf-8")


# #88: the checks comment used to announce a failure it could not attribute,
# beside findings it had just described as harmless. It now reads the run's own
# step conclusions, which needs a permission it did not have.


def test_report_can_read_which_step_failed() -> None:
    assert "listJobsForWorkflowRun" in REPORT_YML, (
        "report.yml must read step conclusions rather than guessing at the cause")
    assert "actions: read" in REPORT_YML, (
        "reading job steps needs actions: read")


def test_report_says_the_flags_are_not_the_cause() -> None:
    assert "not** the cause" in RENDERER


def test_report_still_fences_everything_it_interpolates() -> None:
    """The privileged job's whole discipline, now that the renderer holds it.
    Step names are ours, not a contributor's — but the next person editing this
    should not have to know which strings are trusted."""
    assert ".map(safe)" in RENDERER


# #8: the comment's wording lived only inside report.yml, so nothing outside CI
# could produce it and any local reproduction would drift from it. It moved to
# validator/src/report.ts, which the local check calls too. These keep the move
# from quietly coming undone.


@pytest.mark.parametrize(
    "wording",
    [
        "## Automated checks",
        "### Blocking",
        "### Flagged for review",
        "No signatures matched",
        "not** the cause",
        "docs/SECURITY.md",
    ],
)
def test_report_yml_composes_no_part_of_the_comment(wording: str) -> None:
    """A second copy of a sentence is a second copy that drifts. report.yml
    fetches, asks which step failed, renders and posts; the words are the
    renderer's. Comments in the file are prose about the move, not output."""
    body = "\n".join(
        line for line in REPORT_YML.splitlines() if not line.lstrip().startswith("#")
    )
    assert wording not in body, (
        f"report.yml is composing {wording!r} again — it must call "
        "validator/src/report.ts, not restate it"
    )


def test_the_local_check_names_the_same_steps_ci_does() -> None:
    """The report names the step that failed. A local failure and a pull request
    failure have to name the same one, or the sections match and the sentence
    above them does not."""
    ci_steps = set(re.findall(r"^\s*-?\s*name:\s*(.+?)\s*$", VALIDATE_YML, re.M))
    local_steps = re.findall(r'^const STEP_\w+ = "(.+)";$', LOCAL_CHECK, re.M)
    assert local_steps, "no step names found in check.ts — has the shape changed?"
    for step in local_steps:
        assert step in ci_steps, (
            f"check.ts reports {step!r}, which is not a step name in validate.yml"
        )


def test_report_yml_never_checks_out_the_pull_request_head() -> None:
    """workflow_run runs the workflow definition from the default branch, so a
    fork cannot edit what executes beside `pull-requests: write`. Checking out
    the triggering run's head hands that straight back: the renderer this job
    executes would then be the contributor's copy of it."""
    for ref in re.findall(r"^\s*ref:\s*(.+?)\s*$", REPORT_YML, re.M):
        assert "head" not in ref, (
            f"report.yml checks out {ref!r}. This job holds a token; it may only "
            "take the default branch."
        )


def test_the_manifest_job_stages_everything_the_generator_writes() -> None:
    """It named .claude-plugin/marketplace.json explicitly, and #98 gave the
    generator two more kinds of file to write — so a merged skill updated the
    Claude marketplace and left the Codex side stale on main, silently."""
    wf = (ROOT / ".github" / "workflows" / "manifest.yml").read_text(encoding="utf-8")
    assert "git add -A .claude-plugin .agents skills" in wf, (
        "the commit step must stage every path build_marketplace.py owns")
    assert "git diff --cached --quiet" in wf, (
        "the has-it-changed guard must ask git, not name one file")


def test_something_checks_main_itself() -> None:
    """manifest.yml repairs drift on merge, and the bug it was written to fix
    was that same job succeeding while leaving half the manifests stale. So it
    asserts its own outcome, and the weekly re-scan checks main independently —
    a failure there means the automation did not work, not that somebody
    forgot."""
    manifest = (ROOT / ".github" / "workflows" / "manifest.yml").read_text(encoding="utf-8")
    rescan = (ROOT / ".github" / "workflows" / "rescan.yml").read_text(encoding="utf-8")
    assert manifest.count("build_marketplace.py --check") == 1, (
        "the repair job must verify its own outcome")
    assert "build_marketplace.py --check" in rescan, (
        "something has to check main when the repair job never ran")
