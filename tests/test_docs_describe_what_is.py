"""Documentation drift, held to the tree it describes (#159).

CLAUDE.md's rule: a doc that has drifted is worse than none, because it is
trusted. These tests read a doc's claim and check it against the code,
workflow, or package script that actually governs the behaviour — the same
pattern `tests/test_workflows.py` and `tests/test_review_claim.py` use.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import yaml

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


def _plugin_level_refusals() -> set[str]:
    """The exact set of plugin-level paths L0 refuses, read from the
    validator rather than restated by hand (see docs/DEVELOPMENT.md's rule
    about never restating a generator's output)."""
    src = _text("validator/src/structure-core.ts")
    names: set[str] = set()
    for block in re.findall(r"new Map<string, string>\(\[(.*?)\]\);", src, re.S):
        names.update(re.findall(r'\["([^"]+)",', block))
    return names


def test_security_md_l0_refused_files_match_the_validator() -> None:
    refused = _plugin_level_refusals()
    assert refused == {"hooks", ".claude-plugin", "settings.json",
                        "settings.local.json", ".lsp.json"}, (
        "validator/src/structure-core.ts's refused plugin-level paths changed; "
        "update this test and docs/SECURITY.md together"
    )
    doc = _text("docs/SECURITY.md")
    for name in refused:
        assert name in doc, f"docs/SECURITY.md's L0 file table is missing {name!r}"
    assert ".mcp.json" in doc and "executed" in doc


def test_contributing_md_lists_the_same_refused_plugin_files() -> None:
    """CONTRIBUTING.md's own file rules (#151) should name the same set
    SECURITY.md and the validator agree on, not a stale subset."""
    refused = _plugin_level_refusals()
    doc = _text("CONTRIBUTING.md")
    for name in refused:
        assert name in doc, f"CONTRIBUTING.md's file rules are missing {name!r}"
    assert ".mcp.json" in doc


def test_security_md_rescan_section_names_the_manifest_check() -> None:
    """rescan.yml (#156) opens an issue on a stale marketplace manifest as
    well as SHA drift — SECURITY.md's L6 description should say both, not
    just the drift half."""
    rescan = _text(".github/workflows/rescan.yml")
    assert "build_marketplace.py --check" in rescan
    doc = _text("docs/SECURITY.md")
    l6 = doc.split("### L6", 1)[1].split("###", 1)[0]
    assert "manifest" in l6.lower(), (
        "docs/SECURITY.md's L6 section doesn't mention the manifest check "
        "rescan.yml actually runs and opens an issue on"
    )


def test_review_request_template_does_not_reference_the_removed_contact_field() -> None:
    """`civic.contact` was removed from the schema in #95 — REVIEW.md says
    plainly there is no contact field to check, reachability is the GitHub
    account L1 already proves ownership of. The review-request issue template
    used to ask a submitter to attest to a frontmatter field that no longer
    exists."""
    schema = _text("schema/skill.schema.json")
    assert "civic.contact" not in schema
    template = _text(".github/ISSUE_TEMPLATE/review-request.yml")
    assert "contact" not in template.lower() or "no separate contact field" in template.lower()
    assert "maintainer contact in the frontmatter" not in template.lower()


def test_submit_skill_template_offers_the_current_category_vocabulary() -> None:
    """`registry/categories.yml` is the single source of truth for the
    vocabulary (docs/ARCHITECTURE.md: "the list is not written down anywhere
    else"). The submit-skill issue form's category dropdown is a hand-written
    second copy the build does not generate, so it is exactly the kind of
    copy the project's own docs warn goes stale silently — and it had drifted
    to an entirely superseded twelve-category list from before the
    twelve-to-fifteen recut."""
    categories = yaml.safe_load(_text("registry/categories.yml"))["categories"]
    current_labels = [c["label"] for c in categories]

    form = yaml.safe_load(_text(".github/ISSUE_TEMPLATE/submit-skill.yml"))
    field = next(f for f in form["body"] if f.get("id") == "category")
    offered = field["attributes"]["options"]

    assert offered == current_labels, (
        "submit-skill.yml's category dropdown does not match "
        "registry/categories.yml — update the options list"
    )


def test_readme_does_not_repeat_the_project_board_line_twice() -> None:
    text = _text("README.md")
    count = text.count("What we're building next is on the [project board]")
    assert count == 1, (
        f"README.md repeats the project-board line {count} times; it should appear once"
    )


def _validate_yml_runs_l4() -> bool:
    """True only if validate.yml has an *active* (uncommented) L4 step."""
    active = "\n".join(
        line for line in _text(".github/workflows/validate.yml").splitlines()
        if not line.lstrip().startswith("#")
    )
    return bool(re.search(r"name:\s*L4", active))


def test_docs_do_not_describe_l4_as_running_while_the_workflow_comments_it_out() -> None:
    """SECURITY.md is the document a city IT director reads to decide what the
    Community tier's checks mean. L4, a purpose-built skill scanner, is a
    commented-out step in validate.yml and has never run. Until it does, every
    place that lists the layers says so, and nothing promises L4 results."""
    if _validate_yml_runs_l4():
        return
    security = _text("docs/SECURITY.md")
    assert "### L4 — Scanners (not yet running)" in security
    assert "L0–L3 fail" in security or "L0–L2 fail the build. L3 flags" in security
    assert "Weekly re-run of L0–L3" in security
    assert "L0–L4" not in _text("docs/TIERS.md")
    assert "L3–L4" not in _text("docs/TIERS.md")
    assert "not yet running" in _text("CONTRIBUTING.md")
