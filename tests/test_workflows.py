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


def _without_comments(text: str) -> str:
    """A workflow's executable half. These files explain in prose what they no
    longer do, and a sentence naming `pr-number.txt` is not a use of it."""
    return "\n".join(
        line for line in text.splitlines() if not line.lstrip().startswith("#")
    )


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
    body = _without_comments(REPORT_YML)
    assert "pr-number.txt" not in body, (
        "report.yml is trusting a pull request number from the artifact again"
    )
    assert "workflow_run.pull_requests" not in body, (
        "the event's pull_requests list is empty for forks; resolve instead"
    )
    assert "resolved-pr.txt" in body, (
        "the post step must read the number the resolver wrote, and nothing else"
    )


def test_validate_yml_publishes_no_pull_request_number() -> None:
    """A file a fork writes cannot be a cross-check on anything. Removing it is
    one fewer thing for the privileged job to be tempted by."""
    assert "pr-number.txt" not in _without_comments(VALIDATE_YML), (
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


@pytest.mark.parametrize(
    "wf", ["report.yml", "validate.yml", "manifest.yml"], ids=lambda n: n
)
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


# --------------------------------------------------------------------------- #
# #157: pip installs were unpinned (`pip install pyyaml`, `pip install pyyaml
# pytest jsonschema`, ...), so an unrelated pytest release could flip every
# workflow red with no code change here. `requirements-dev.txt` pins exact
# versions; every workflow step now installs from it instead of naming
# packages inline. dependabot.yml is widened from github-actions alone to also
# watch pip and npm, since pins without an update path just go stale. The site
# workspace's duplicate lockfile is dropped in favour of the root one, which
# `npm ci` at the workspace root already resolves from.

REQUIREMENTS_DEV = ROOT / "requirements-dev.txt"

PIP_INSTALL_BARE = re.compile(r"pip install(?!\s+-r\s)[^\n]*\S")


@pytest.mark.parametrize("wf", WORKFLOWS, ids=lambda p: p.name)
def test_no_workflow_pip_installs_a_bare_package_name(wf: Path) -> None:
    """An unpinned `pip install pytest` (or pyyaml, or jsonschema) can resolve a
    new release on any run. `tests/test_no_listing_coupling.py` hit exactly
    this: an unpinned pytest was scheduled to turn a return-value warning into
    a collection error. Every install must instead reference
    requirements-dev.txt, which pins versions."""
    text = wf.read_text(encoding="utf-8")
    for line in text.splitlines():
        if "pip install" not in line:
            continue
        assert "-r requirements-dev.txt" in line or "-r  requirements-dev.txt" in line, (
            f"{wf.name}: {line.strip()!r} installs a bare package name instead "
            "of `pip install -r requirements-dev.txt`"
        )


def test_requirements_dev_txt_exists_and_is_exactly_pinned() -> None:
    """No hash pinning, no ranges, no comments to skip past — every line is a
    plain `name==version` pin, the same discipline test_workflows.py already
    holds actions/checkout to."""
    assert REQUIREMENTS_DEV.is_file(), (
        "requirements-dev.txt is missing — nothing pins the Python dependencies"
    )
    lines = [
        line for line in REQUIREMENTS_DEV.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    assert lines, "requirements-dev.txt has no dependencies pinned"
    for line in lines:
        assert re.match(r"^[A-Za-z][A-Za-z0-9_.-]*==[0-9][0-9A-Za-z_.+-]*$", line), (
            f"requirements-dev.txt: {line!r} is not a plain name==version pin"
        )


def test_requirements_dev_txt_covers_what_the_tests_import() -> None:
    """pyyaml, pytest and jsonschema are what test.yml installed by name before
    this change. Losing one silently would only surface as an ImportError deep
    in CI."""
    names = {
        line.split("==")[0].lower()
        for line in REQUIREMENTS_DEV.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }
    for required in ("pytest", "pyyaml", "jsonschema"):
        assert required in names, (
            f"requirements-dev.txt no longer pins {required}"
        )


def test_all_workflows_use_the_same_checkout_sha() -> None:
    """Dependabot bumps every `actions/checkout` pin together because they are
    grouped, but nothing enforced that a workflow could not be left on an
    older pin by hand."""
    pins = set()
    for wf in WORKFLOWS:
        pins.update(
            re.findall(r"actions/checkout@([0-9a-f]{40})", wf.read_text(encoding="utf-8"))
        )
    assert len(pins) == 1, (
        f"actions/checkout is pinned to {len(pins)} different SHAs across "
        f"workflows, not one: {pins}"
    )


def test_dependabot_also_watches_pip_and_npm() -> None:
    """github-actions alone leaves the new requirements-dev.txt pins, and the
    root package-lock.json, to go stale silently — the exact failure mode
    pinning without an update path was already flagged for."""
    config = (ROOT / ".github" / "dependabot.yml").read_text(encoding="utf-8")
    ecosystems = re.findall(r'package-ecosystem:\s*"?([\w-]+)"?', config)
    assert "github-actions" in ecosystems
    assert "pip" in ecosystems, "dependabot.yml does not watch pip"
    assert "npm" in ecosystems, "dependabot.yml does not watch npm"


def test_site_package_lock_json_is_gone() -> None:
    """The workspace root's package-lock.json already carries site/'s tree —
    npm ci at the root resolves it. The site copy is a stale duplicate that
    only test.yml's cache key was still reading."""
    assert not (ROOT / "site" / "package-lock.json").exists(), (
        "site/package-lock.json still exists; delete it, the root lockfile "
        "already covers the site workspace"
    )


@pytest.mark.parametrize("wf", WORKFLOWS, ids=lambda p: p.name)
def test_no_workflow_references_the_site_lockfile(wf: Path) -> None:
    text = wf.read_text(encoding="utf-8")
    assert "site/package-lock.json" not in text, (
        f"{wf.name} still references site/package-lock.json"
    )


# --------------------------------------------------------------------------- #
# #188: the manifests are regenerated AFTER merge again, by `manifest.yml`,
# which pushes to main as an organization-owned GitHub App.
#
# #170 had deleted that job and made validate.yml's manifest check blocking, on
# the reading that nothing could push to main at all. The first fork-shaped
# submission (#187) then failed that check and the tracked-files test, because
# a folder uploaded in a browser cannot carry a generated file — and a
# maintainer had to check the branch out, regenerate and push. A contributor
# working in a browser cannot perform that step, so the registry performs it.
#
# The App is what makes the push legitimate: a ruleset on main refuses the
# built-in Actions app as a bypass actor, and an App installed on this
# repository with contents:write is a distinct actor that can be allowed one.
# Its token is minted per run, so there is no long-lived credential. The job
# reads only content that has already merged under a required review, and
# writes only what the generator writes.

MANIFEST_YML_PATH = ROOT / ".github" / "workflows" / "manifest.yml"

APP_TOKEN_ACTION = (
    "actions/create-github-app-token@"
    "bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0"
)


def test_manifest_yml_exists() -> None:
    """Guards every test below: a missing file reads as a passing assertion."""
    assert MANIFEST_YML_PATH.is_file(), (
        "there is no .github/workflows/manifest.yml — nothing regenerates the "
        "manifests after merge, and a browser submission cannot carry them"
    )


MANIFEST_YML = MANIFEST_YML_PATH.read_text(encoding="utf-8") if (
    MANIFEST_YML_PATH.is_file()) else ""


def test_exactly_one_workflow_pushes_and_it_is_manifest_yml() -> None:
    """A push from CI is a real privilege. One job has it, and its name is the
    answer to "what wrote this commit to main"."""
    pushers = [wf.name for wf in WORKFLOWS if "git push" in wf.read_text(encoding="utf-8")]
    assert pushers == ["manifest.yml"], (
        f"workflows running `git push`: {pushers}. Exactly one may push, and it "
        "is manifest.yml — the post-merge regeneration job"
    )


def test_manifest_yml_triggers_on_a_completed_checks_run() -> None:
    on_block = _on_block(MANIFEST_YML)
    assert re.search(r"workflow_run:\s*\n\s*workflows:\s*\[Checks\]", on_block), (
        "manifest.yml must trigger on workflow_run of the Checks workflow, so "
        "it regenerates a commit that passed rather than whatever just landed"
    )
    assert re.search(r"workflow_run:.*?types:\s*\[completed\]", on_block, re.S), (
        "manifest.yml's workflow_run trigger must fire on completed"
    )


def test_manifest_yml_never_triggers_on_a_pull_request() -> None:
    """This job holds a token that can write to main. It must never run in a
    context a contributor supplies, and `pull_request_target` in particular is
    forbidden repository-wide."""
    on_block = _on_block(MANIFEST_YML)
    assert "pull_request" not in on_block, (
        "manifest.yml triggers on a pull request event — the job that pushes to "
        "main may not run against contributor-chosen input"
    )
    assert "pull_request_target" not in MANIFEST_YML


def test_the_regeneration_job_only_runs_after_a_green_checks_run_on_main() -> None:
    """build.yml's guard, exactly: a red main must never be regenerated over,
    and a workflow_run of Checks fires for every branch."""
    job = _job_block(MANIFEST_YML, "regenerate")
    assert "github.event.workflow_run.conclusion == 'success'" in job, (
        "the regeneration job must re-check the Checks conclusion itself"
    )
    assert "github.event.workflow_run.head_branch == 'main'" in job, (
        "the regeneration job must run only for a Checks run on main"
    )


def test_the_regeneration_job_mints_a_github_app_token() -> None:
    """Pinned, and reading the two named secrets. The App is org-owned and
    installed on this repository alone; the token lives for the run."""
    assert APP_TOKEN_ACTION in MANIFEST_YML, (
        "manifest.yml must mint its token with the pinned "
        f"{APP_TOKEN_ACTION.split('@')[0]} action"
    )
    assert "app-id: ${{ secrets.MANIFEST_APP_ID }}" in MANIFEST_YML
    assert "private-key: ${{ secrets.MANIFEST_APP_PRIVATE_KEY }}" in MANIFEST_YML


def test_the_app_secrets_are_read_only_where_actions_take_inputs() -> None:
    """A secret belongs in `with:` or `env:`. Substituted into a `run:` body it
    is source, and a private key in particular must never be shell text."""
    for key, body in _script_bodies(MANIFEST_YML):
        assert "secrets." not in body, (
            f"manifest.yml: a {key}: block reads a secret. Secrets go through "
            "with: or env:, never into a script body"
        )


def test_the_checkout_uses_the_app_token() -> None:
    """Without `token:`, checkout persists the run's GITHUB_TOKEN and the push
    is refused by the ruleset — the failure #170 read as "nothing can push"."""
    assert "token: ${{ steps.app-token.outputs.token }}" in MANIFEST_YML, (
        "manifest.yml's checkout must use the App token, not the run's "
        "GITHUB_TOKEN"
    )


def test_the_persisted_credential_is_deliberate_and_unique_to_this_job() -> None:
    """Every other checkout in this repository sets persist-credentials: false.
    This one is the documented exception, because the push needs the
    credential — so the exception is asserted, not left to a reader to notice."""
    assert re.search(r"persist-credentials:\s*true", MANIFEST_YML), (
        "manifest.yml's checkout must persist the App credential — the push "
        "below uses it"
    )
    for wf in WORKFLOWS:
        if wf.name == "manifest.yml":
            continue
        assert not re.search(
            r"persist-credentials:\s*true", wf.read_text(encoding="utf-8")), (
            f"{wf.name} persists checkout credentials — only manifest.yml may")


def test_the_regeneration_job_stages_what_the_generator_reports() -> None:
    """Not a path list restated in YAML. The deleted job named
    .claude-plugin/marketplace.json alone and left two manifests stale."""
    assert "build_marketplace.py --paths" in MANIFEST_YML, (
        "manifest.yml must ask the generator which paths it owns "
        "(`build_marketplace.py --paths`) rather than naming them"
    )
    assert "--pathspec-from-file" in MANIFEST_YML, (
        "the staged set must come from the generator's list, not from a "
        "pathspec written out here"
    )
    # The comments may recount which path the deleted job named; nothing the
    # runner executes may name one.
    executed = "\n".join(line for line in MANIFEST_YML.splitlines()
                         if not line.lstrip().startswith("#"))
    for restated in (".claude-plugin/marketplace.json",
                     ".agents/plugins/marketplace.json",
                     ".codex-plugin/plugin.json"):
        assert restated not in executed, (
            f"manifest.yml names {restated} — ask the generator instead")


def test_the_regeneration_job_is_a_no_op_when_nothing_changed() -> None:
    """It runs after every green Checks run on main, which includes its own
    push. Nothing to commit must be an ordinary, quiet outcome."""
    assert "git diff --cached --quiet" in MANIFEST_YML, (
        "manifest.yml must check whether the regeneration changed anything "
        "before committing"
    )


def test_the_regeneration_job_rebases_before_it_pushes() -> None:
    """main may have moved between the Checks run and this job. A push that
    has not rebased is rejected, and rejected silently is how the manifests
    stopped tracking the catalogue the first time."""
    body = "\n".join(b for _, b in _script_bodies(MANIFEST_YML))
    rebase = body.find("git pull --rebase")
    push = body.find("git push")
    assert rebase != -1, "manifest.yml must rebase on origin/main before pushing"
    assert push != -1 and rebase < push, (
        "manifest.yml pushes before it rebases"
    )


def test_the_regeneration_job_retries_the_rebase_and_push_once() -> None:
    """Two merges in quick succession race for the same files. One retry turns
    the loser into a second attempt rather than into a stale manifest that only
    the weekly re-scan will mention.

    Written out twice, or a shell function called more than once — both are a
    retry. A single unconditional attempt is not."""
    body = "\n".join(b for _, b in _script_bodies(MANIFEST_YML))
    if body.count("git pull --rebase") >= 2:
        return
    function = re.search(r"^\s*(\w+)\s*\(\)\s*\{", body, re.M)
    assert function, (
        "manifest.yml attempts the rebase-and-push exactly once — a race "
        "between two merges has to become a second attempt"
    )
    name = function.group(1)
    # The definition plus two calls.
    assert len(re.findall(rf"\b{re.escape(name)}\b", body)) >= 3, (
        f"manifest.yml defines {name}() but calls it once — that is not a retry"
    )


def test_the_regeneration_job_commits_as_the_app() -> None:
    """The commit on main says which actor wrote it. The App's slug comes from
    the token action, so it cannot drift from whichever App is installed, and
    it reaches the shell through env rather than `${{ }}`."""
    assert "app-slug" in MANIFEST_YML, (
        "manifest.yml must take the committing identity from the token "
        "action's app-slug output"
    )
    assert re.search(r"APP_SLUG:\s*\$\{\{\s*steps\.app-token\.outputs\.app-slug",
                     MANIFEST_YML), (
        "the App slug must reach the shell through env:, not by expression "
        "substitution into the script"
    )
    assert "git config user.name" in MANIFEST_YML
    assert "git config user.email" in MANIFEST_YML


def test_the_regeneration_commit_closes_nothing() -> None:
    """It lands directly on the default branch, where GitHub parses closing
    keywords and issue references."""
    body = "\n".join(b for _, b in _script_bodies(MANIFEST_YML))
    commit = re.search(r"git commit[^\n]*", body)
    assert commit, "manifest.yml never commits"
    message = commit.group(0)
    for keyword in ("closes", "fixes", "resolves", "#"):
        assert keyword not in message.lower(), (
            f"the regeneration commit message contains {keyword!r} — a commit "
            "on main must reference no issue and close none")


def test_the_regeneration_job_holds_exactly_contents_write() -> None:
    """The App token carries the real write. The run's own token is kept at the
    one scope it could plausibly need and nothing else — no packages, no
    pull requests, no id-token."""
    job = _job_block(MANIFEST_YML, "regenerate")
    block = re.search(r"^    permissions:\n((?:      \S.*\n|\s*#.*\n)+)", job, re.M)
    assert block, "the regeneration job declares no permissions block"
    granted = set(re.findall(r"^\s+([\w-]+):\s*(\w+)\s*$", block.group(1), re.M))
    assert granted == {("contents", "write")}, (
        f"the regeneration job's permissions are {sorted(granted)} — exactly "
        "contents: write, and nothing else"
    )


def test_the_regeneration_job_asserts_its_own_outcome() -> None:
    """The job that repairs drift is the job that can fail to. It once reported
    success while leaving half the manifests stale."""
    assert "build_marketplace.py --check" in MANIFEST_YML, (
        "manifest.yml must verify nothing is still stale after it pushes"
    )


# --------------------------------------------------------------------------- #
# validate.yml's manifest step: a signal to the maintainer, not a demand on the
# submitter.


def test_the_validate_manifest_step_is_a_warning_again() -> None:
    """A submission uploaded in a browser cannot carry a generated file. The
    check still runs — it tells a maintainer this merge will trigger a
    regeneration — but it may not block the merge."""
    lines = VALIDATE_YML.splitlines()
    for i, line in enumerate(lines):
        if "build_marketplace.py --check" in line:
            window = "\n".join(lines[max(0, i - 8):i + 3])
            assert "continue-on-error: true" in window, (
                "the marketplace manifest step in validate.yml must carry "
                "continue-on-error: true — the registry regenerates these "
                "files after merge, so a stale manifest is not the "
                "submitter's problem"
            )
            return
    pytest.fail("validate.yml no longer runs build_marketplace.py --check")


def _steps_with_comments(text: str) -> list[str]:
    """Every step of a one-job workflow, each with the comment lines directly
    above it. The comment is the half a maintainer reads, so an assertion about
    what a step says has to see it."""
    return re.findall(
        r"((?:^      #[^\n]*\n)*^      - name:[^\n]*\n(?:[ ]{8}[^\n]*\n|\n)*)",
        text,
        re.M,
    )


def test_the_validate_manifest_step_asks_the_submitter_for_nothing() -> None:
    """The step's comment and log line are read by the person who submitted.
    Neither may tell them to run a generator or commit its output."""
    steps = [s for s in _steps_with_comments(VALIDATE_YML)
             if "build_marketplace.py --check" in s]
    assert len(steps) == 1, (
        f"expected one manifest step in validate.yml, found {len(steps)}"
    )
    text = steps[0].lower()
    for demand in ("and commit", "commit the result", "a maintainer will do that",
                   "run `python scripts/build_marketplace.py`"):
        assert demand not in text, (
            f"validate.yml's manifest step still says {demand!r} — nothing is "
            "needed from the submitter; the registry regenerates after merge")
    assert "regenerat" in text, (
        "validate.yml's manifest step must say the registry regenerates these "
        "files after merge"
    )
    assert "manifest.yml" in text, (
        "validate.yml's manifest step must name the workflow that does the "
        "regeneration, so a maintainer can look it up"
    )


# --------------------------------------------------------------------------- #
# The docs describe what is (#188). `manifest.yml` exists again, so the docs
# that describe how manifests reach main must name it — the inverse of the
# assertion that stood while it was deleted.

MANIFEST_DOCS = [
    ROOT / "docs" / "ARCHITECTURE.md",
    ROOT / "docs" / "DEVELOPMENT.md",
    ROOT / "docs" / "SECURITY.md",
]


@pytest.mark.parametrize("path", MANIFEST_DOCS, ids=lambda p: str(p.relative_to(ROOT)))
def test_the_docs_name_the_regeneration_job(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    assert "manifest.yml" in text, (
        f"{path.relative_to(ROOT)} describes the manifests without naming "
        "manifest.yml, the workflow that regenerates them after merge"
    )


@pytest.mark.parametrize(
    "path",
    [ROOT / "docs" / "DEVELOPMENT.md", ROOT / "docs" / "SUBMITTING.md"],
    ids=lambda p: str(p.relative_to(ROOT)),
)
def test_no_doc_asks_a_submitter_to_carry_the_manifests(path: Path) -> None:
    """The regeneration is the registry's job again. A doc still describing the
    maintainer's by-hand repair, or warning a submitter that the check fails,
    describes something that no longer happens."""
    text = path.read_text(encoding="utf-8")
    for gone in (
        "Merging a submission with a stale manifest",
        "The marketplace manifest check will fail",
        "nothing regenerates it",
        "Check out the contributor's branch",
    ):
        assert gone not in text, (
            f"{path.relative_to(ROOT)} still says {gone!r} — the post-merge job "
            "regenerates the manifests, so nothing is asked of a submitter or "
            "of the maintainer merging one")


def test_rescan_still_checks_the_manifests_on_its_own() -> None:
    """The weekly re-scan checks main directly. It never repairs anything, so a
    failure there means the regeneration job did not run or did not succeed."""
    assert "build_marketplace.py --check" in RESCAN_YML, (
        "rescan.yml must still run build_marketplace.py --check"
    )


def test_the_rescan_report_blames_the_regeneration_job() -> None:
    """A stale manifest on main is no longer somebody forgetting a step. The
    issue body has to say that and name the workflow, or a maintainer reads the
    failure as a submission problem and goes looking on a branch."""
    report = (ROOT / "validator" / "src" / "report.ts").read_text(encoding="utf-8")
    assert "manifest.yml" in report, (
        "the re-scan issue body must name the workflow whose failure a stale "
        "manifest on main implies"
    )


# #156: rescan.yml's issue-opening step used to run only when the validate or
# scan step failed. The marketplace-manifest check sits before it with no
# continue-on-error, so that step failing alone aborted the job and skipped
# the issue step entirely — a stale manifest was never reported. Separately,
# build_index.py returns 0 when a listing is demoted for attestation drift,
# so that never surfaced either. Both are fixed here: the issue step runs on
# `always()` and its condition now covers the manifest and drift checks too,
# and the log excerpts it posts are rendered through report.ts's fencing
# rule rather than embedded raw.

RESCAN_YML = (ROOT / ".github" / "workflows" / "rescan.yml").read_text(encoding="utf-8")


def _rescan_step(name: str) -> str:
    """One step's YAML, from its `- name: <name>` line up to the next step at
    the same indentation or end of file."""
    match = re.search(
        rf"^(\s*)- name:\s*{re.escape(name)}\s*\n((?:\1  .*\n|\n)*)",
        RESCAN_YML,
        re.M,
    )
    assert match, f"no step named {name!r} in rescan.yml"
    return match.group(0)


def test_the_manifest_check_step_is_still_present() -> None:
    """Re-scoped from the original issue: manifest.yml is unaffected here, and
    the standing re-scan's own manifest check — the backstop that catches main
    itself drifting — must not be removed while fixing what runs after it."""
    assert "build_marketplace.py --check" in RESCAN_YML


def test_the_issue_step_runs_on_always() -> None:
    """Without this, the manifest check step (no continue-on-error) failing
    on its own aborts the job and skips the issue step — a stale manifest is
    never reported, which is the bug this fixes."""
    step = _rescan_step("Open an issue on new findings")
    assert re.search(r"if:\s*[>|]?-?\s*\n?\s*always\(\)", step), (
        "the issue step's `if:` must start with always(), or it is skipped "
        "whenever an earlier step without continue-on-error fails"
    )


def test_the_issue_condition_covers_the_manifest_and_drift_checks() -> None:
    """The original condition named only validate and scan. A manifest
    failure or a drifted attestation must open the issue too."""
    step = _rescan_step("Open an issue on new findings")
    assert "steps.manifest.outcome" in step, (
        "the issue condition does not reference the manifest check's outcome"
    )
    assert "steps.drift" in step, (
        "the issue condition does not reference the drift check at all"
    )


def test_the_drift_step_has_an_id_the_issue_condition_can_read() -> None:
    step = _rescan_step("Check attestation drift")
    assert re.search(r"^\s*id:\s*drift\s*$", step, re.M), (
        "the drift step needs an id so a later step's `if:` can read its "
        "outcome or outputs"
    )


def test_the_manifest_step_has_an_id_the_issue_condition_can_read() -> None:
    step = _rescan_step("Marketplace manifests match the catalogue")
    assert re.search(r"^\s*id:\s*manifest\s*$", step, re.M), (
        "the manifest step needs an id so a later step's `if:` can read its "
        "outcome"
    )


def test_build_index_is_invoked_with_drift_out() -> None:
    """build_index.py's machine-readable drift report has to actually be
    asked for, or nothing downstream can read it."""
    step = _rescan_step("Check attestation drift")
    assert "--drift-out" in step, (
        "rescan.yml never asks build_index.py for --drift-out, so the issue "
        "condition and body have nothing to read"
    )


def test_the_rescan_job_still_holds_only_the_declared_permissions() -> None:
    """#156 adds no capability the job did not already have — issues: write
    was already there for the step that opens one."""
    block = re.search(r"^permissions:\n((?:[ \t]+\S.*\n|[ \t]*#.*\n|\n)+)", RESCAN_YML, re.M)
    assert block, "rescan.yml declares no permissions block"
    granted = set(re.findall(r"^\s+([\w-]+):\s*(\w+)\s*$", block.group(1), re.M))
    assert granted == {("contents", "read"), ("issues", "write")}, (
        f"rescan.yml's permissions changed: {sorted(granted)}"
    )


def test_the_issue_body_is_rendered_through_report_ts_not_embedded_raw() -> None:
    """The bug this half of #156 fixes: validate.log and scan.log are raw
    output from a run over skills/, embedded directly inside triple-backtick
    fences with no escaping. A matched excerpt containing three backticks
    could close the fence early. The fix routes them through report.ts's
    safe()-based renderRescanReport instead of composing markdown inline."""
    assert "report-cli.ts" in RESCAN_YML, (
        "rescan.yml must render its issue body through report-cli.ts, which "
        "calls report.ts's fencing rule, rather than composing it inline"
    )
    assert "--rescan" in RESCAN_YML

    issue_step = _rescan_step("Open an issue on new findings")
    # The step that posts must not itself be reading raw log files into the
    # comment body — that is exactly the unescaped embedding this fixes.
    for raw_log in ("validate.log", "scan.log"):
        assert raw_log not in issue_step, (
            f"the issue-posting step still reads {raw_log!r} directly; route "
            "it through report-cli.ts --rescan instead"
        )


def test_no_workflow_expression_is_substituted_into_a_rescan_script() -> None:
    """Same discipline as validate.yml and report.yml: an outcome or an
    output belongs in `env:`, not spliced into a `run:` body by `${{ }}`."""
    for _key, body in _script_bodies(RESCAN_YML):
        assert "${{" not in body, (
            "rescan.yml interpolates a workflow expression into a run/script "
            "body. Pass it through env: instead."
        )


# --------------------------------------------------------------------------- #
# #190: a fork pull request whose branch is named `main` produced a Checks run
# with head_branch == 'main', and both workflow_run consumers took it for a
# push to this repository. The deploy started in a privileged context against
# fork code and actions/checkout refused it; the manifest job was a no-op only
# because it checks out `main` by name. Every workflow_run guard also requires
# the triggering event to be a push, and the head repository to be this one.


@pytest.mark.parametrize("wf_name", ["build.yml", "manifest.yml"])
def test_workflow_run_guards_require_a_push_to_this_repository(wf_name: str) -> None:
    text = (ROOT / ".github" / "workflows" / wf_name).read_text(encoding="utf-8")
    guards = re.findall(r"if:\s*>-\n((?:\s+.*\n)+?)(?=\s+\S+:)", text)
    assert guards, f"{wf_name} has no folded `if: >-` guard"
    for guard in guards:
        assert "github.event.workflow_run.event == 'push'" in guard, (
            f"{wf_name}: a workflow_run guard does not require the triggering "
            "event to be a push — a fork pull request on a branch named main "
            "would pass it (#190)")
        assert ("github.event.workflow_run.head_repository.full_name == "
                "github.repository") in guard, (
            f"{wf_name}: a workflow_run guard does not require the head "
            "repository to be this one (#190)")
