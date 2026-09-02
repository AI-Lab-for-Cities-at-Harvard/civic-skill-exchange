"""submit-a-skill — the skill that writes a skill and opens the pull request.

Two rules shape every test here (#10).

**The contract is read, never copied.** The skill runs on an author's machine,
where the validator does not exist, so it fetches the published schema and the
published category vocabulary and asks *them* what a submission needs. A second
copy of the required list, the enums or the vocabulary would go stale the moment
#95 drops a field or #102 recuts the categories — and go stale silently, because
every test in this repository would still pass. So the tests below feed the
scripts a schema and a vocabulary they have never seen and check that the answer
changes.

**The namespace is the authenticated user's, and nothing else.** The registry's
one ownership control is that a skill's namespace matches the pull request
author. A skill that could submit under a name its user does not own would hand
anybody a way past that check, so `submit.py` takes the login from `gh api user`
and offers no way to say otherwise.

These modules live under the skill's own scripts/ directory, not the top-level
scripts/ that pytest.ini puts on the path, so they are imported by path.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SKILL = ROOT / "skills" / "civic-skills" / "submit-a-skill"
sys.path.insert(0, str(SKILL / "scripts"))

import scaffold  # noqa: E402
import submit  # noqa: E402

SCHEMA = ROOT / "schema" / "skill.schema.json"
CATEGORIES = ROOT / "registry" / "categories.yml"


# --------------------------------------------------------------------------- #
# Fixtures. A complete answer set, and the two published artifacts as the skill
# receives them — JSON, because that is what is published.


def answers(**overrides) -> dict:
    base = {
        "name": "permit-status-explainer",
        "description": (
            "Explains why a municipal building permit is stuck, in plain language, "
            "from the status codes a permitting system reports."
        ),
        "license": "CC0-1.0",
        "allowed-tools": "Read, Grep",
        "civic.category": "permitting-licensing",
        "civic.jurisdiction": "us-local",
        "civic.data-sensitivity": "none",
        "civic.human-review": "advisory-only",
        "civic.maintainer": "City of Example",
        "civic.contact": "permits@example.gov",
        "civic.affiliation": "government",
        "civic.deployment": "none",
    }
    base.update(overrides)
    return {k: v for k, v in base.items() if v is not None}


@pytest.fixture
def schema() -> dict:
    return json.loads(SCHEMA.read_text(encoding="utf-8"))


@pytest.fixture
def categories() -> list[dict]:
    """The published shape: categories.json, not the YAML it is built from."""
    import yaml

    return yaml.safe_load(CATEGORIES.read_text(encoding="utf-8"))["categories"]


@pytest.fixture
def build(tmp_path, schema, categories):
    """Scaffold into a throwaway tree and return the skill directory."""

    def _build(given=None, namespace="octocat", **kwargs):
        into = tmp_path / "skills" / namespace
        return scaffold.scaffold(
            answers=given if given is not None else answers(),
            into=into,
            schema=schema,
            categories=categories,
            **kwargs,
        )

    return _build


# --------------------------------------------------------------------------- #
# The headline acceptance criterion: what comes out needs no edits.


def test_a_scaffolded_skill_passes_the_real_validator(build):
    skill = build()
    result = subprocess.run(
        ["npx", "tsx", str(ROOT / "validator" / "src" / "cli.ts"), str(skill),
         "--author", "octocat"],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_a_scaffolded_skill_passes_the_signature_scan(build):
    skill = build()
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "scan.py"), str(skill)],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_the_directory_is_named_after_the_skill(build):
    assert build().name == "permit-status-explainer"


def test_the_body_is_the_authors_own_and_is_not_rewritten(build):
    body = "# Permits\n\nWhat this does, in the author's own words.\n"
    skill = build(body=body)
    assert body in (skill / "SKILL.md").read_text(encoding="utf-8")


def test_scripts_and_references_are_created_only_when_asked(build):
    plain = build()
    assert not (plain / "scripts").exists()
    assert not (plain / "references").exists()


def test_a_skill_with_scripts_and_references_still_passes_both_layers(
    tmp_path, schema, categories,
):
    skill = scaffold.scaffold(
        answers=answers(), into=tmp_path / "skills" / "octocat",
        schema=schema, categories=categories,
        with_scripts=True, with_references=True,
    )
    assert (skill / "scripts").is_dir() and (skill / "references").is_dir()

    validator = subprocess.run(
        ["npx", "tsx", str(ROOT / "validator" / "src" / "cli.ts"), str(skill),
         "--author", "octocat"],
        cwd=ROOT, capture_output=True, text=True,
    )
    scan = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "scan.py"), str(skill)],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert validator.returncode == 0, validator.stdout + validator.stderr
    assert scan.returncode == 0, scan.stdout + scan.stderr


# --------------------------------------------------------------------------- #
# Refusing to write something that will fail.


def test_a_missing_required_field_is_named_in_plain_words(schema, categories):
    problems = scaffold.validate(answers(**{"civic.category": None}), schema, categories)
    assert len(problems) == 1
    assert "category" in problems[0]
    # A submitter should not have to learn the schema to read the message.
    assert "required" in problems[0].lower()


def test_nothing_is_written_when_an_answer_is_missing(tmp_path, schema, categories):
    into = tmp_path / "skills" / "octocat"
    with pytest.raises(scaffold.Incomplete):
        scaffold.scaffold(
            answers=answers(**{"civic.maintainer": None}),
            into=into, schema=schema, categories=categories,
        )
    assert not into.exists(), "a half-written skill is worse than none"


def test_a_value_outside_an_enum_is_reported_with_the_permitted_values(schema, categories):
    problems = scaffold.validate(
        answers(**{"civic.jurisdiction": "mars"}), schema, categories)
    assert len(problems) == 1
    assert "us-local" in problems[0]


def test_a_description_too_short_to_route_on_is_reported(schema, categories):
    problems = scaffold.validate(answers(description="Explains permits."), schema, categories)
    assert len(problems) == 1
    assert "40" in problems[0]


# --------------------------------------------------------------------------- #
# The contract is read, not copied. Each of these hands the scripts a schema or
# a vocabulary that disagrees with the repository's, and checks the answer
# follows the artifact rather than something baked in.


def test_the_category_vocabulary_comes_from_the_published_file(schema):
    invented = [{"id": "moon-permits", "label": "Moon Permits"}]
    assert scaffold.validate(
        answers(**{"civic.category": "moon-permits"}), schema, invented) == []
    problems = scaffold.validate(
        answers(**{"civic.category": "permitting-licensing"}), schema, invented)
    assert len(problems) == 1
    assert "moon-permits" in problems[0]


def test_the_required_list_comes_from_the_published_schema(schema, categories):
    """#95 drops civic.contact. When it does, the schema changes and the skill
    stops asking — with no edit here."""
    trimmed = json.loads(json.dumps(schema))
    trimmed["properties"]["metadata"]["required"].remove("civic.contact")
    assert scaffold.validate(
        answers(**{"civic.contact": None}), trimmed, categories) == []
    assert scaffold.validate(
        answers(**{"civic.contact": None}), schema, categories) != []


def test_the_organizational_deployment_rule_comes_from_the_schemas_conditional(
    schema, categories,
):
    incomplete = answers(**{"civic.deployment": "team"})
    problems = scaffold.validate(incomplete, schema, categories)
    assert [p for p in problems if "deployed-at" in p], problems

    without = json.loads(json.dumps(schema))
    without["properties"]["metadata"].pop("allOf")
    assert scaffold.validate(incomplete, without, categories) == []


def test_the_never_deployed_prohibition_comes_from_the_same_place(schema, categories):
    contradiction = answers(**{"civic.deployment": "none", "civic.deployed-at": "City of Example"})
    assert [p for p in scaffold.validate(contradiction, schema, categories)
            if "deployed-at" in p]


def test_personal_use_needs_no_organization(schema, categories):
    """The field is 'the organization where it was used', and somebody using
    their own skill has none — see rules.ts. The schema says so; this proves the
    skill reads it that way and does not push for a filled-in junk value."""
    assert scaffold.validate(
        answers(**{"civic.deployment": "personal"}), schema, categories) == []


# --------------------------------------------------------------------------- #
# The reader is a partial JSON Schema implementation, which is only safe while
# the schema stays inside the part it implements.


def test_every_keyword_the_schema_uses_is_one_the_reader_implements(schema):
    """The failure this prevents: a rule is added to the schema, the skill
    silently ignores it, and a scaffolded skill starts failing CI for a reason
    nothing local can see."""
    used = set()

    def walk(node, in_properties=False):
        if isinstance(node, dict):
            for key, value in node.items():
                if not in_properties:
                    used.add(key)
                walk(value, in_properties=(key in {"properties", "$defs"}))
        elif isinstance(node, list):
            for item in node:
                walk(item, in_properties=False)

    walk(schema)
    unhandled = used - scaffold.KEYWORDS
    assert unhandled == set(), (
        f"the schema uses {sorted(unhandled)}, which scaffold.py does not read"
    )


@pytest.mark.parametrize("given", [
    answers(),
    answers(**{"civic.deployment": "personal"}),
    answers(**{"civic.deployment": "team", "civic.deployed-at": "City of Example",
               "civic.deployed-in": "US-MA / Boston"}),
    answers(**{"civic.deployment": "team"}),
    answers(**{"civic.deployment": "none", "civic.deployed-in": "US-MA"}),
    answers(**{"civic.category": None}),
    answers(**{"civic.jurisdiction": "mars"}),
    answers(description="short"),
    answers(name="Not A Slug"),
    answers(**{"civic.localization": "generalized"}),
    answers(**{"civic.source-commit": "abc"}),
])
def test_the_reader_agrees_with_a_real_json_schema_implementation(given, schema, categories):
    """scaffold.py cannot depend on `jsonschema` — it ships to machines with a
    bare Python. This test can, and holds the hand-rolled reader to it."""
    jsonschema = pytest.importorskip("jsonschema")

    document = scaffold.nest(given, schema)
    real = jsonschema.Draft202012Validator(schema).is_valid(document)
    # The vocabulary is the one thing the schema cannot state, so give the real
    # implementation the same answer the skill would reach for it.
    ours = scaffold.validate(given, schema, categories)
    vocabulary_only = ours and all("category" in p for p in ours)
    assert real == (not ours) or vocabulary_only, (
        f"jsonschema says valid={real}, scaffold.py says {ours}")


def test_the_scripts_carry_no_copy_of_the_vocabulary_or_the_rules(schema, categories):
    """A copy is how the contract goes stale silently."""
    source = "\n".join(
        p.read_text(encoding="utf-8") for p in sorted((SKILL / "scripts").glob("*.py")))
    for category in categories:
        assert category["id"] not in source, f"{category['id']} is hardcoded"
    for field in schema["properties"]["metadata"]["required"]:
        assert field not in source, f"{field} is hardcoded"


# --------------------------------------------------------------------------- #
# --contract: what the agent asks the author, taken from the artifacts.


def test_the_contract_names_every_required_field(schema, categories):
    fields = {f["key"] for f in scaffold.contract(schema, categories) if f["required"]}
    # `metadata` is the container the civic fields sit in, not a question.
    expected = (set(schema["required"]) - {"metadata"}) | set(
        schema["properties"]["metadata"]["required"])
    assert expected <= fields


def test_the_contract_carries_the_options_for_a_field_that_has_them(schema, categories):
    fields = {f["key"]: f for f in scaffold.contract(schema, categories)}
    assert fields["civic.jurisdiction"]["options"] == [
        "us-local", "us-state", "us-federal", "intl", "generic"]


def test_the_contract_fills_the_category_options_from_the_vocabulary(schema, categories):
    fields = {f["key"]: f for f in scaffold.contract(schema, categories)}
    assert fields["civic.category"]["options"] == [c["id"] for c in categories]
    assert fields["civic.category"]["labels"] == {c["id"]: c["label"] for c in categories}


def test_the_contract_says_when_a_conditional_field_becomes_required(schema, categories):
    fields = {f["key"]: f for f in scaffold.contract(schema, categories)}
    required_when = fields["civic.deployed-at"]["required_when"]
    assert required_when == {"civic.deployment": ["team", "organization"]}


def test_the_contract_says_when_a_field_is_forbidden(schema, categories):
    fields = {f["key"]: f for f in scaffold.contract(schema, categories)}
    assert fields["civic.deployed-at"]["forbidden_when"] == {"civic.deployment": ["none"]}


# --------------------------------------------------------------------------- #
# The frontmatter it emits.


def test_civic_fields_are_nested_under_metadata_and_spec_fields_are_not(schema):
    document = scaffold.nest(answers(), schema)
    assert document["name"] == "permit-status-explainer"
    assert document["metadata"]["civic.category"] == "permitting-licensing"
    assert "civic.category" not in document


def test_where_a_field_belongs_is_decided_by_the_schema_not_the_prefix(schema):
    """An 'ext.*' field is metadata too, and a future spec field would not be."""
    moved = json.loads(json.dumps(schema))
    moved["properties"]["metadata"]["properties"]["vendor.thing"] = {"type": "string"}
    document = scaffold.nest({"vendor.thing": "yes"}, moved)
    assert document["metadata"]["vendor.thing"] == "yes"


def test_a_colon_in_an_answer_cannot_break_the_parse(build):
    skill = build(answers(**{"civic.maintainer": "Example: the city"}))
    import yaml

    text = (skill / "SKILL.md").read_text(encoding="utf-8")
    front = yaml.safe_load(text.split("---")[1])
    assert front["metadata"]["civic.maintainer"] == "Example: the city"


def test_a_long_answer_is_not_folded_into_something_else(build):
    long = "A permit explainer. " * 20
    skill = build(answers(**{"civic.use-when": long.strip()}))
    import yaml

    text = (skill / "SKILL.md").read_text(encoding="utf-8")
    front = yaml.safe_load(text.split("---")[1])
    assert front["metadata"]["civic.use-when"] == long.strip()


# --------------------------------------------------------------------------- #
# submit.py — the pull request.
#
# The registry's ownership control is that a skill's namespace matches the pull
# request author (rules.ts). Everything below exists to make that check
# unbypassable from here: the login comes from the authenticated session, and
# there is no way to say otherwise.


@pytest.fixture
def fake_gh(tmp_path, monkeypatch):
    """A `gh` on PATH that reports a login and records what it was asked."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    log = tmp_path / "gh.log"
    (bin_dir / "gh").write_text(textwrap.dedent(f"""\
        #!/bin/sh
        printf '%s\\n' "$*" >> {log}
        case "$1 $2" in
          "api user") echo octocat ;;
          "auth status") exit 0 ;;
          *) echo "https://github.com/example/pull/1" ;;
        esac
        """), encoding="utf-8")
    (bin_dir / "gh").chmod(0o755)
    monkeypatch.setenv("PATH", f"{bin_dir}{os.pathsep}{os.environ['PATH']}")
    return log


def test_the_namespace_is_the_authenticated_users_login(fake_gh):
    assert submit.author_login() == "octocat"
    assert "api user" in fake_gh.read_text(encoding="utf-8")


def test_there_is_no_way_to_submit_under_another_name():
    """A flag for this would be a way straight past the ownership check."""
    parser = submit.build_parser()
    for forbidden in ["--namespace", "--author", "--login", "--as", "--user"]:
        with pytest.raises(SystemExit):
            parser.parse_args([forbidden, "somebody-else", "--dir", "x"])


def test_the_skill_lands_under_the_authenticated_users_namespace():
    steps = submit.plan("octocat", "permit-status-explainer", "add-permit-status-explainer")
    assert steps.destination == Path("skills/octocat/permit-status-explainer")


def test_the_branch_is_cut_from_the_registrys_main_not_from_the_fork():
    """A fork that has drifted behind would otherwise put unrelated commits in
    the pull request, and a stale one would put the skill on top of old code."""
    steps = submit.plan("octocat", "permit-status-explainer", "add-permit-status-explainer")
    clone = next(c for c in steps.commands if c[:2] == ["git", "clone"])
    assert submit.MARKETPLACE_REPO in " ".join(clone)
    assert "octocat/civic-skill-exchange" not in " ".join(clone)


def test_the_branch_is_pushed_to_the_authors_own_fork():
    steps = submit.plan("octocat", "permit-status-explainer", "add-permit-status-explainer")
    push = next(c for c in steps.commands if c[:2] == ["git", "push"])
    assert "octocat/civic-skill-exchange" in " ".join(push)


def test_the_pull_request_opens_against_the_registry_from_that_branch():
    steps = submit.plan("octocat", "permit-status-explainer", "add-permit-status-explainer")
    create = next(c for c in steps.commands if c[:3] == ["gh", "pr", "create"])
    assert "--repo" in create and submit.MARKETPLACE_REPO in create
    assert "octocat:add-permit-status-explainer" in create


def test_a_skill_whose_name_disagrees_with_its_directory_is_refused(tmp_path):
    """The validator rejects it, and it is a plain mistake to fix before a pull
    request rather than after one."""
    skill = tmp_path / "permits"
    skill.mkdir()
    (skill / "SKILL.md").write_text('---\nname: "something-else"\n---\n\nBody.\n',
                                    encoding="utf-8")
    with pytest.raises(submit.Refused) as refused:
        submit.read_name(skill)
    assert "something-else" in str(refused.value)


def test_a_directory_with_no_skill_md_is_refused(tmp_path):
    empty = tmp_path / "permits"
    empty.mkdir()
    with pytest.raises(submit.Refused):
        submit.read_name(empty)


def test_the_dry_run_prints_the_commands_and_touches_nothing(tmp_path, fake_gh, capsys):
    skill = tmp_path / "permit-status-explainer"
    skill.mkdir()
    (skill / "SKILL.md").write_text('---\nname: "permit-status-explainer"\n---\n\nBody.\n',
                                    encoding="utf-8")
    assert submit.main(["--dir", str(skill), "--dry-run"]) == 0
    printed = capsys.readouterr().out
    assert "git clone" in printed and "gh pr create" in printed
    assert "skills/octocat/permit-status-explainer" in printed
    # Nothing but `gh api user` was run.
    assert fake_gh.read_text(encoding="utf-8").strip() == "api user --jq .login"


# --------------------------------------------------------------------------- #
# Where the skill sits while it is being written.
#
# The namespace is the parent directory, so a skill scaffolded straight into a
# directory called `skills/` reads as namespace `skills` — and a local check
# then reports a namespace mismatch, which is not the author's problem and not
# what is wrong. submit.py places the skill under the right namespace whatever
# the working path was, so the path only ever misleads.


def test_the_working_path_is_reported_along_with_where_submitting_puts_it(
    tmp_path, schema, categories, capsys,
):
    answers_file = tmp_path / "answers.json"
    answers_file.write_text(json.dumps(answers()), encoding="utf-8")
    code = scaffold.main([
        "--answers", str(answers_file), "--into", str(tmp_path / "work"),
        "--schema", str(SCHEMA), "--categories", str(_categories_json(tmp_path)),
    ])
    assert code == 0
    printed = capsys.readouterr().out
    assert "submit.py" in printed, "nothing tells the author what to do next"


def test_scaffolding_into_a_directory_called_skills_says_what_that_will_look_like(
    tmp_path, schema, categories, capsys,
):
    answers_file = tmp_path / "answers.json"
    answers_file.write_text(json.dumps(answers()), encoding="utf-8")
    scaffold.main([
        "--answers", str(answers_file), "--into", str(tmp_path / "skills"),
        "--schema", str(SCHEMA), "--categories", str(_categories_json(tmp_path)),
    ])
    printed = capsys.readouterr().out + capsys.readouterr().err
    assert "namespace" in printed.lower(), (
        "a check run against this path reports a namespace mismatch, and "
        "nothing warned about it")


def _categories_json(tmp_path: Path) -> Path:
    import yaml

    out = tmp_path / "categories.json"
    out.write_text(json.dumps(yaml.safe_load(CATEGORIES.read_text(encoding="utf-8"))),
                   encoding="utf-8")
    return out
