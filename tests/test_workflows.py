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


# --------------------------------------------------------------------------- #
# #154: L1 promises a submission "touches nothing outside skills/{that-user}/",
# and the validator could only see paths that survived the diff. Two halves fix
# that: the changed-path list has to carry deletions and both sides of a move,
# and the maintainer exemption has to be resolved here rather than in the
# validator.

CHANGED_PATHS_STEP = [
    line for line in VALIDATE_YML.splitlines() if "git diff --name-only" in line
]


def test_the_changed_paths_step_lists_deletions_and_both_sides_of_a_move() -> None:
    """A deleted skill is the case the ownership check exists for, and `git
    diff --name-only` prints a rename as the destination alone — so the old
    path, the one in somebody else's namespace, never reached the validator."""
    assert CHANGED_PATHS_STEP, "no `git diff --name-only` in validate.yml"
    for line in CHANGED_PATHS_STEP:
        assert "--no-renames" in line, (
            "without --no-renames a rename appears as its destination only, so "
            "the namespace it was moved out of is invisible to L1"
        )
        filters = re.findall(r"--diff-filter=(\S+)", line)
        for spec in filters:
            assert "D" in spec, (
                f"--diff-filter={spec} drops deletions from changed.txt"
            )


def test_maintainer_status_is_resolved_in_the_workflow() -> None:
    """Who maintains the exchange is a fact about the organization, not about a
    skill. Hardcoding it in the validator would put an access-control list in a
    module the submission page also runs."""
    assert re.search(r"^\s+id: maintainer\s*$", VALIDATE_YML, re.M), (
        "validate.yml has no step resolving maintainer status"
    )
    assert "steps.maintainer.outputs" in VALIDATE_YML, (
        "the resolution step's result is never read"
    )
    assert "--maintainer" in VALIDATE_YML, (
        "the result is never passed to the validator, so the exemption cannot "
        "apply"
    )


def test_the_maintainers_list_is_read_from_the_base_branch() -> None:
    """The job checks out the pull request head. Reading the list from there
    would let a contributor add their own login in the same pull request that
    deletes somebody else's skill, and grant themselves the exemption."""
    assert 'git show "origin/$BASE_REF:.github/maintainers.yml"' in VALIDATE_YML, (
        "the maintainers list must come from the base branch, never the head"
    )


def test_the_maintainers_list_is_codeowner_gated() -> None:
    """It is an access-control list. What makes it trustworthy is that changing
    it needs the review that CODEOWNERS requires on `.github/`."""
    listing = ROOT / ".github" / "maintainers.yml"
    assert listing.is_file(), "the maintainer exemption resolves against nothing"
    codeowners = (ROOT / ".github" / "CODEOWNERS").read_text(encoding="utf-8")
    assert re.search(r"^/\.github/\s+@\S+", codeowners, re.M), (
        "nothing gates the maintainers list"
    )


def test_the_scanning_job_still_holds_no_credential() -> None:
    """Resolving maintainer status wanted an org-membership API call, and this
    is the job whose whole purpose is reading attacker-controlled content. See
    docs/SECURITY.md — the split with report.yml only works while this side
    holds nothing."""
    body = "\n".join(
        line for line in VALIDATE_YML.splitlines() if not line.lstrip().startswith("#")
    )
    for forbidden in ("secrets.", "github.token", "GITHUB_TOKEN"):
        assert forbidden not in body, (
            f"validate.yml reads {forbidden} — this job may hold no credential"
        )


# --------------------------------------------------------------------------- #
# #160: build.yml used to deploy on every push to main with no dependency on
# Checks (test.yml). On 2026-09-05 a direct push failed pytest on both Python
# versions and Build and deploy published it anyway. It now runs only after
# Checks completes successfully on main, and checks out the exact commit
# Checks passed rather than whatever main is at run time.

BUILD_YML = (ROOT / ".github" / "workflows" / "build.yml").read_text(encoding="utf-8")
TEST_YML = (ROOT / ".github" / "workflows" / "test.yml").read_text(encoding="utf-8")
DEVELOPMENT_MD = (ROOT / "docs" / "DEVELOPMENT.md").read_text(encoding="utf-8")


def _on_block(text: str) -> str:
    match = re.search(r"^on:\n((?:  .*\n|\n)+)", text, re.M)
    assert match, "no top-level `on:` block found in the expected shape"
    return match.group(1)


def _job_block(text: str, job: str) -> str:
    """The body of one top-level job, from its `  <job>:` line up to (but not
    including) the next top-level job or end of file."""
    match = re.search(
        rf"^  {job}:\n((?:    .*\n|\n)+)",
        text,
        re.M,
    )
    assert match, f"no {job!r} job found in the expected shape"
    return match.group(1)


def test_build_yml_has_no_push_trigger() -> None:
    on_block = _on_block(BUILD_YML)
    assert not re.search(r"^\s*push:\s*$", on_block, re.M), (
        "build.yml still triggers on push — a red main could deploy again"
    )


def test_build_yml_triggers_on_a_completed_checks_run() -> None:
    on_block = _on_block(BUILD_YML)
    assert re.search(r"workflow_run:\s*\n\s*workflows:\s*\[Checks\]", on_block), (
        "build.yml must trigger on workflow_run of the Checks workflow"
    )
    assert re.search(r"workflow_run:.*?types:\s*\[completed\]", on_block, re.S), (
        "build.yml's workflow_run trigger must fire on completed, not in_progress"
    )


def test_build_yml_keeps_workflow_dispatch() -> None:
    assert re.search(r"^\s*workflow_dispatch:", _on_block(BUILD_YML), re.M), (
        "build.yml should keep a manual re-deploy path"
    )


def test_build_job_only_runs_after_a_green_checks_run_on_main() -> None:
    build_job = _job_block(BUILD_YML, "build")
    assert re.search(
        r"if:\s*.*conclusion\s*==\s*'success'.*head_branch\s*==\s*'main'",
        build_job,
        re.S,
    ), (
        "the build job must guard on "
        "github.event.workflow_run.conclusion == 'success' and "
        "github.event.workflow_run.head_branch == 'main'"
    )


def test_deploy_job_only_runs_after_a_green_checks_run_on_main() -> None:
    deploy_job = _job_block(BUILD_YML, "deploy")
    assert re.search(
        r"if:\s*.*conclusion\s*==\s*'success'.*head_branch\s*==\s*'main'",
        deploy_job,
        re.S,
    ), (
        "the deploy job must guard on "
        "github.event.workflow_run.conclusion == 'success' and "
        "github.event.workflow_run.head_branch == 'main', not just inherit "
        "the build job's skip"
    )


def test_build_job_checks_out_the_commit_checks_actually_passed() -> None:
    build_job = _job_block(BUILD_YML, "build")
    assert re.search(
        r"ref:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha", build_job
    ), (
        "the build job must check out github.event.workflow_run.head_sha, so "
        "the deployed tree is exactly the commit Checks passed, not whatever "
        "main is at run time"
    )


def test_pages_and_id_token_permissions_are_scoped_to_the_deploy_job() -> None:
    build_job = _job_block(BUILD_YML, "build")
    deploy_job = _job_block(BUILD_YML, "deploy")
    workflow_preamble = BUILD_YML.split("\njobs:", 1)[0]
    match = re.search(r"^permissions:\n((?:  .*\n|\n)+)", workflow_preamble, re.M)
    workflow_level = match.group(1) if match else ""

    for scope in (build_job, workflow_level):
        assert "pages: write" not in scope, (
            "pages: write must not sit on the build job or workflow-level "
            "permissions — only the deploy job needs it"
        )
        assert "id-token: write" not in scope, (
            "id-token: write must not sit on the build job or workflow-level "
            "permissions — only the deploy job needs it"
        )

    assert "pages: write" in deploy_job, "the deploy job needs pages: write"
    assert "id-token: write" in deploy_job, "the deploy job needs id-token: write"
    assert "contents: read" in build_job, "the build job needs contents: read"


def test_development_md_names_checks_as_the_deploy_gate() -> None:
    """The doc used to say only that main was "protected" in the abstract. It
    must now say what actually gates a deploy: a green run of the Checks
    workflow on main, not merely a merged pull request."""
    assert "Checks" in DEVELOPMENT_MD, (
        "DEVELOPMENT.md must name the Checks workflow as what a deploy waits on"
    )
    assert re.search(r"direct push(es)? to `?main`? (are|is) rejected", DEVELOPMENT_MD) or (
        "no direct pushes" in DEVELOPMENT_MD and "ruleset" in DEVELOPMENT_MD
    ), "DEVELOPMENT.md must say direct pushes to main are rejected, not just discouraged"


def test_development_md_counts_ci_gates_from_the_workflows_not_memory() -> None:
    """Gate 1 is validate.yml's single job. test.yml, named Checks, holds the
    rest. Whatever DEVELOPMENT.md claims the total is, it must match."""
    # validate.yml has exactly one job; test.yml (Checks) holds the others.
    validate_jobs = len(re.findall(r"^  \w+:\n", VALIDATE_YML.split("jobs:", 1)[1], re.M))
    checks_jobs = len(re.findall(r"^  \w+:\n", TEST_YML.split("jobs:", 1)[1], re.M))
    total_gates = validate_jobs + checks_jobs

    assert f"The {_number_word(total_gates)} CI gates" in DEVELOPMENT_MD or (
        f"gets {_number_word(total_gates)} checks" in DEVELOPMENT_MD
    ), (
        f"validate.yml has {validate_jobs} job(s) and test.yml (Checks) has "
        f"{checks_jobs} job(s) — DEVELOPMENT.md must say {total_gates}, not "
        "assert a stale number"
    )


def _number_word(n: int) -> str:
    words = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six"}
    return words.get(n, str(n))


# #153: validate.yml runs on `pull_request`, so a fork controls every byte it
# uploads — including the file that used to name the pull request to comment on.
# report.yml holds `pull-requests: write`, so trusting that file let a fork put
# a clean "no signatures matched" report on any pull request or issue in the
# repository. `safe()` stops markdown injection; it cannot stop misattribution.
# The privileged job now resolves the pull request itself, from the head SHA the
# workflow_run event gives it, and posts only to what it resolved.

RESOLVER = (ROOT / "validator" / "src" / "resolve-pr.ts").read_text(encoding="utf-8")


def _script_bodies(text: str) -> list[tuple[str, str]]:
    """Every `run:` and `script:` body in a workflow, as (key, body) pairs.

    Both are code the runner executes. A `${{ }}` in either is substituted into
    the source before anything runs, so a branch name carrying a quote or a
    backtick escapes the string it was meant to sit in.
    """
    bodies: list[tuple[str, str]] = []
    lines = text.splitlines()
    key = re.compile(r"^(\s*)(?:-\s*)?(run|script):\s*(.*)$")
    i = 0
    while i < len(lines):
        m = key.match(lines[i])
        i += 1
        if not m:
            continue
        indent, name, rest = m.group(1), m.group(2), m.group(3).strip()
        if rest and rest[0] not in "|>":
            bodies.append((name, rest))
            continue
        block: list[str] = []
        while i < len(lines):
            line = lines[i]
            if line.strip() and len(line) - len(line.lstrip()) <= len(indent):
                break
            block.append(line)
            i += 1
        bodies.append((name, "\n".join(block)))
    return bodies


def test_the_report_resolves_the_pull_request_from_the_runs_head_sha() -> None:
    """The head SHA is the one thing about the pull request that the event
    carries and a fork cannot forge: it is what the run actually ran on."""
    assert re.search(r"HEAD_SHA:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha", REPORT_YML), (
        "report.yml must take the head SHA from the workflow_run event"
    )
    assert "resolve-pr-cli.ts" in REPORT_YML, (
        "report.yml must resolve the pull request through the tested resolver"
    )
    assert "pulls.list" in REPORT_YML, (
        "the resolution has to ask the API which pull request has that head"
    )


def test_the_pull_request_is_resolved_before_the_comment_is_posted() -> None:
    assert REPORT_YML.index("resolve-pr-cli.ts") < REPORT_YML.index("createComment"), (
        "the resolution step must come before the step that posts"
    )


def test_the_comment_goes_only_to_the_pull_request_that_was_resolved() -> None:
    """`workflow_run.pull_requests[]` is empty for forks, and the artifact is
    the fork's to write, so neither may name the number that gets commented on."""
    assert "pr-number.txt" not in REPORT_YML, (
        "report.yml is trusting a pull request number from the artifact again"
    )
    assert "workflow_run.pull_requests" not in REPORT_YML, (
        "the event's pull_requests list is empty for forks; resolve instead"
    )
    assert "resolved-pr.txt" in REPORT_YML, (
        "the post step must read the number the resolver wrote, and nothing else"
    )


def test_validate_yml_publishes_no_pull_request_number() -> None:
    """A file a fork writes cannot be a cross-check on anything. Removing it is
    one fewer thing for the privileged job to be tempted by."""
    assert "pr-number.txt" not in VALIDATE_YML, (
        "validate.yml is uploading a pull request number again — the reporting "
        "job resolves it now, and an attacker-authored copy is only a trap"
    )


def test_the_resolver_matches_on_the_head_sha_and_insists_on_exactly_one() -> None:
    """The unit tests in validator/src/resolve-pr.test.ts own the behaviour.
    This keeps the two properties the trust boundary rests on visible here: the
    comparison is against the run's head SHA, and anything other than a single
    match resolves to nothing."""
    assert "headSha" in RESOLVER, "the resolver does not look at a head SHA"
    assert re.search(r"matched\.length\s*(?:!==\s*1|>\s*1|===\s*0)", RESOLVER), (
        "the resolver must count its matches and refuse any count but one"
    )
    assert "pr: null" in RESOLVER, "there is no no-pull-request outcome to return"


@pytest.mark.parametrize("wf", ["report.yml", "validate.yml"], ids=lambda n: n)
def test_no_workflow_expression_is_substituted_into_a_script(wf: str) -> None:
    """Branch and repository names are contributor-controlled data. Through
    `env` they are data; through `${{ }}` they are source, in a shell or in the
    JavaScript of a github-script step."""
    text = (ROOT / ".github" / "workflows" / wf).read_text(encoding="utf-8")
    for key, body in _script_bodies(text):
        assert "${{" not in body, (
            f"{wf}: a {key}: block interpolates a workflow expression. Pass the "
            "value through env: and read it from the environment."
        )


def test_the_untrusted_event_fields_arrive_through_the_environment() -> None:
    assert "process.env.HEAD_REPO" in REPORT_YML and "process.env.HEAD_BRANCH" in REPORT_YML, (
        "the head repository and branch must be read from the environment"
    )


def test_the_report_job_holds_no_more_permission_than_before() -> None:
    """#153 is about what the existing token may be pointed at, not about
    needing a bigger one. Resolving the pull request reads public metadata that
    `contents: read` already covers."""
    block = re.search(r"^permissions:\n((?:[ \t]+\S.*\n|[ \t]*#.*\n|\n)+)", REPORT_YML, re.M)
    assert block, "report.yml declares no permissions block"
    granted = set(re.findall(r"^\s+([\w-]+):\s*(\w+)\s*$", block.group(1), re.M))
    assert granted == {
        ("contents", "read"),
        ("pull-requests", "write"),
        ("actions", "read"),
    }, f"report.yml's permissions changed: {sorted(granted)}"
