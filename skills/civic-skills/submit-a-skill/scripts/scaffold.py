#!/usr/bin/env python3
"""Write a civic skill directory that needs no edits to pass the registry's checks.

This asks the registry what a submission needs instead of knowing the answer.
The frontmatter contract is `skill.schema.json` and the category vocabulary is
`categories.json`, both published artifacts, both fetched at runtime — so when
the required fields change or the categories are recut, this script changes
nothing and starts asking for the new thing.

That is not tidiness. A copy of the contract in here would go stale *silently*:
every test in the registry would still pass while every skill this wrote began
failing the pull request check for a reason nothing local could explain.

So there is no list of categories here, no list of required fields, and no
restatement of any rule. What there is instead is a reader for the part of JSON
Schema the contract uses — `KEYWORDS` names exactly that part, and a test in the
registry fails if the schema ever grows a keyword this does not read.

Standard library only. This runs wherever the author is writing their skill,
which is not a machine with the registry's dependencies installed.

Usage:
    scaffold.py --contract
        Print what a submission needs: every field, whether it is required,
        the values it permits, and what it means. Ask the author from this.

    scaffold.py --answers answers.json --into DIR [--body body.md]
                [--with-scripts] [--with-references]
        Write the skill directory. DIR is the namespace directory the skill
        goes into; the skill's own directory is created inside it, named after
        the skill. Refuses to write anything at all if an answer is missing.

    Both accept --schema and --categories, a path or a URL, for offline use
    against a checkout's own build output.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any

# The published artifacts. build.yml runs build_index.py with
# --out site/public/data and vite copies public/ into the deployed root.
_SITE = "https://ai-lab-for-cities-at-harvard.github.io/civic-skill-exchange"
SCHEMA_URL = f"{_SITE}/data/skill.schema.json"
CATEGORIES_URL = f"{_SITE}/data/categories.json"

MARKETPLACE_REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange"

#: Every JSON Schema keyword this script reads. The registry has a test that
#: fails if the contract uses one that is not here — without it, a rule could be
#: added to the schema and silently ignored by every skill this writes.
KEYWORDS = frozenset({
    # Annotations, carried through to the author or ignored.
    "$schema", "$id", "$comment", "$defs", "title", "description",
    # Structure.
    "type", "properties", "additionalProperties", "required", "items",
    # Values.
    "enum", "const", "minLength", "maxLength", "maxItems", "pattern",
    # Composition.
    "allOf", "anyOf", "oneOf", "if", "then", "not",
    # The registry's own: names a vocabulary published separately, because its
    # values change without the schema changing.
    "x-vocabulary",
})


class Incomplete(Exception):
    """The answers do not satisfy the contract, so nothing was written."""

    def __init__(self, problems: list[str]) -> None:
        super().__init__("\n".join(f"  - {p}" for p in problems))
        self.problems = problems


# --------------------------------------------------------------------------- #
# Loading the contract. A path or a URL; no bundled fallback, because a stale
# contract is the one failure mode this script exists to avoid.


def load(source: str | Path) -> Any:
    text = str(source)
    if text.startswith(("http://", "https://")):
        with urllib.request.urlopen(text, timeout=30) as response:  # noqa: S310
            return json.loads(response.read().decode("utf-8"))
    return json.loads(Path(text).read_text(encoding="utf-8"))


def load_categories(source: str | Path) -> list[dict]:
    """categories.json is `{"categories": [...]}`; a bare list is accepted too."""
    doc = load(source)
    return doc["categories"] if isinstance(doc, dict) else doc


# --------------------------------------------------------------------------- #
# Where an answer belongs. The schema decides, not the key's spelling: the spec
# fields are the top-level properties, and everything the registry adds is a
# property of `metadata`. A vendor extension with no dot would still be
# metadata if the schema said so.


def _metadata_properties(schema: dict) -> dict:
    return schema["properties"]["metadata"].get("properties", {})


def belongs_in_metadata(key: str, schema: dict) -> bool:
    if key in _metadata_properties(schema):
        return True
    if key in schema.get("properties", {}):
        return False
    # Unknown. `metadata` takes additional string properties; the top level does
    # not, so an unrecognized namespaced key belongs there.
    return "." in key


def nest(answers: dict, schema: dict) -> dict:
    """Turn a flat answer set into the frontmatter document, in schema order."""
    top_order = list(schema.get("properties", {}))
    meta_order = list(_metadata_properties(schema))

    metadata: dict = {}
    document: dict = {}
    for key, value in answers.items():
        if belongs_in_metadata(key, schema):
            metadata[key] = value
        else:
            document[key] = value

    def ordered(values: dict, order: list[str]) -> dict:
        known = [k for k in order if k in values]
        extra = sorted(k for k in values if k not in order)
        return {k: values[k] for k in known + extra}

    document = ordered(document, top_order)
    if metadata:
        document["metadata"] = ordered(metadata, meta_order)
    return document


# --------------------------------------------------------------------------- #
# Reading the contract.
#
# Plain names: the author answered a question, not a schema key, so a problem
# says "data sensitivity" and then names the key so an agent can act on it.


def plain(key: str) -> str:
    stem = key.split(".", 1)[-1].replace("-", " ")
    return stem if stem == key else f"{stem} ({key})"


def _conditionals(schema: dict) -> list[dict]:
    return schema["properties"]["metadata"].get("allOf", [])


def _trigger(rule: dict) -> dict[str, list[str]]:
    """The `if` of a conditional, as {field: permitted values}."""
    out: dict[str, list[str]] = {}
    for field, constraint in rule.get("if", {}).get("properties", {}).items():
        if "enum" in constraint:
            out[field] = list(constraint["enum"])
        elif "const" in constraint:
            out[field] = [constraint["const"]]
    return out


def _triggered(rule: dict, answers: dict) -> bool:
    trigger = rule.get("if", {})
    for field in trigger.get("required", []):
        if field not in answers:
            return False
    for field, permitted in _trigger(rule).items():
        if answers.get(field) not in permitted:
            return False
    return True


def contract(schema: dict, categories: list[dict]) -> list[dict]:
    """Every field a submission can carry, in the order to ask about them."""
    labels = {c["id"]: c["label"] for c in categories}
    required_top = set(schema.get("required", []))
    required_meta = set(schema["properties"]["metadata"].get("required", []))

    fields = []
    for key, spec in schema.get("properties", {}).items():
        if key == "metadata":
            continue
        fields.append((key, spec, key in required_top))
    for key, spec in _metadata_properties(schema).items():
        fields.append((key, spec, key in required_meta))

    out = []
    for key, spec, required in fields:
        options = list(spec.get("enum", []))
        field_labels: dict[str, str] = {}
        if spec.get("x-vocabulary") == "categories":
            options = [c["id"] for c in categories]
            field_labels = labels

        required_when: dict[str, list[str]] = {}
        forbidden_when: dict[str, list[str]] = {}
        constrained_to: list[str] = []
        for rule in _conditionals(schema):
            then = rule.get("then", {})
            if key in then.get("required", []):
                required_when.update(_trigger(rule))
            forbidden = [
                field
                for entry in then.get("not", {}).get("anyOf", [])
                for field in entry.get("required", [])
            ]
            if key in forbidden:
                forbidden_when.update(_trigger(rule))
            narrowed = then.get("properties", {}).get(key, {})
            if "enum" in narrowed:
                constrained_to = list(narrowed["enum"])

        out.append({
            "key": key,
            "plain": plain(key),
            "required": required,
            "options": options,
            "labels": field_labels,
            "meaning": spec.get("description", ""),
            "min_length": spec.get("minLength"),
            "max_length": spec.get("maxLength"),
            "pattern": spec.get("pattern"),
            "required_when": required_when,
            "forbidden_when": forbidden_when,
            "constrained_to": constrained_to,
        })
    return out


# --------------------------------------------------------------------------- #
# Checking the answers against it. Every message is generated from the schema,
# so nothing here restates a rule.


def _check_value(key: str, value: Any, spec: dict) -> list[str]:
    problems = []
    name = plain(key)
    if "enum" in spec and value not in spec["enum"]:
        problems.append(
            f"{name}: '{value}' is not one of {', '.join(spec['enum'])}")
    if "const" in spec and value != spec["const"]:
        problems.append(f"{name}: '{value}' must be '{spec['const']}'")
    if isinstance(value, str):
        low, high = spec.get("minLength"), spec.get("maxLength")
        if low is not None and len(value) < low:
            problems.append(f"{name} must be at least {low} characters")
        if high is not None and len(value) > high:
            problems.append(f"{name} must be {high} characters or fewer")
        if "pattern" in spec and not re.search(spec["pattern"], value):
            problems.append(f"{name}: '{value}' is not in the form {spec['pattern']}")
    return problems


def validate(answers: dict, schema: dict, categories: list[dict]) -> list[str]:
    """Plain-language problems, in the order a person would fix them."""
    problems: list[str] = []
    meta_props = _metadata_properties(schema)
    top_props = schema.get("properties", {})

    for key in schema.get("required", []):
        if key == "metadata":
            continue
        if not answers.get(key):
            problems.append(f"{plain(key)} is required")
    for key in schema["properties"]["metadata"].get("required", []):
        if not answers.get(key):
            problems.append(f"{plain(key)} is required")

    for key, value in answers.items():
        spec = meta_props.get(key) or top_props.get(key)
        if spec is None:
            continue
        if spec.get("x-vocabulary") == "categories":
            permitted = [c["id"] for c in categories]
            if value not in permitted:
                problems.append(
                    f"{plain(key)}: '{value}' is not in the vocabulary. "
                    f"One of {', '.join(sorted(permitted))}")
            continue
        problems.extend(_check_value(key, value, spec))

    for rule in _conditionals(schema):
        if not _triggered(rule, answers):
            continue
        then = rule.get("then", {})
        because = ", ".join(
            f"{field} is '{answers[field]}'" for field in _trigger(rule) if field in answers)
        for field in then.get("required", []):
            if not answers.get(field):
                problems.append(f"{plain(field)} is required when {because}")
        for entry in then.get("not", {}).get("anyOf", []):
            for field in entry.get("required", []):
                if answers.get(field):
                    problems.append(f"{plain(field)} cannot be set when {because}")
        for field, narrowed in then.get("properties", {}).items():
            if field in answers:
                problems.extend(_check_value(field, answers[field], narrowed))

    return problems


# --------------------------------------------------------------------------- #
# Emitting. Every scalar is double-quoted, which is why a colon or a hash in an
# answer cannot break the parse, and why this needs no YAML library: a JSON
# string is a valid YAML double-quoted scalar. Long values stay on one line
# rather than being folded, so what the author wrote is what the file says.


def _scalar(value: Any) -> str:
    return json.dumps(str(value), ensure_ascii=False)


def frontmatter(document: dict) -> str:
    lines = ["---"]
    for key, value in document.items():
        if isinstance(value, dict):
            lines.append(f"{key}:")
            for subkey, subvalue in value.items():
                lines.append(f"  {subkey}: {_scalar(subvalue)}")
        else:
            lines.append(f"{key}: {_scalar(value)}")
    lines.append("---")
    return "\n".join(lines) + "\n"


DEFAULT_BODY = """\
# {title}

{description}

## Steps

1. Replace these steps with what the skill actually does, in the order an
   agent should do it. Write for somebody who has never seen the task.

## Output

Say what the skill produces, and what it does not claim.
"""

SCRIPTS_NOTE = """\
# scripts/

Helper programs the skill runs. Keep them small, and keep what they do
visible from the skill's own steps — a reviewer reads this directory.
"""

REFERENCES_NOTE = """\
# references/

Longer material the skill points at rather than inlining: templates,
checklists, worked examples.
"""


def scaffold(
    answers: dict,
    into: Path,
    schema: dict,
    categories: list[dict],
    body: str | None = None,
    with_scripts: bool = False,
    with_references: bool = False,
) -> Path:
    """Write the skill directory inside `into`. Writes nothing if an answer is
    missing — a half-written skill is worse than none, because the author then
    has to work out which half is theirs."""
    problems = validate(answers, schema, categories)
    if problems:
        raise Incomplete(problems)

    document = nest(answers, schema)
    name = document["name"]
    if body is None:
        body = DEFAULT_BODY.format(
            title=name.replace("-", " ").title(),
            description=document["description"],
        )

    skill = Path(into) / name
    skill.mkdir(parents=True, exist_ok=True)
    (skill / "SKILL.md").write_text(frontmatter(document) + "\n" + body, encoding="utf-8")
    if with_scripts:
        (skill / "scripts").mkdir(exist_ok=True)
        (skill / "scripts" / "README.md").write_text(SCRIPTS_NOTE, encoding="utf-8")
    if with_references:
        (skill / "references").mkdir(exist_ok=True)
        (skill / "references" / "README.md").write_text(REFERENCES_NOTE, encoding="utf-8")
    return skill


# --------------------------------------------------------------------------- #
# Printing the contract, for the agent to ask from.


def render_contract(fields: list[dict]) -> str:
    lines = [
        "What a submission needs, read from the published schema and vocabulary.",
        "Ask about each field in plain language. Never read a key aloud.",
        "",
    ]
    for field in fields:
        mark = "required" if field["required"] else "optional"
        lines.append(f"{field['key']}  [{mark}]")
        if field["meaning"]:
            lines.append(f"    {field['meaning']}")
        if field["options"]:
            if field["labels"]:
                for option in field["options"]:
                    lines.append(f"    - {option}  — {field['labels'][option]}")
            else:
                lines.append(f"    one of: {', '.join(field['options'])}")
        for label, clause in (("required when", field["required_when"]),
                              ("cannot be set when", field["forbidden_when"])):
            for other, values in clause.items():
                lines.append(f"    {label} {other} is {' or '.join(values)}")
        if field["constrained_to"]:
            lines.append(f"    limited to {', '.join(field['constrained_to'])} in some cases")
        bounds = []
        if field["min_length"]:
            bounds.append(f"at least {field['min_length']} characters")
        if field["max_length"]:
            bounds.append(f"at most {field['max_length']} characters")
        if field["pattern"]:
            bounds.append(f"matching {field['pattern']}")
        if bounds:
            lines.append(f"    {'; '.join(bounds)}")
        lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contract", action="store_true",
                        help="print what a submission needs, and stop")
    parser.add_argument("--answers", type=Path, help="JSON object of answers, keyed by field")
    parser.add_argument("--into", type=Path,
                        help="the namespace directory to create the skill inside")
    parser.add_argument("--body", type=Path, help="the skill's body, as markdown")
    parser.add_argument("--with-scripts", action="store_true")
    parser.add_argument("--with-references", action="store_true")
    parser.add_argument("--schema", default=SCHEMA_URL, help="path or URL")
    parser.add_argument("--categories", default=CATEGORIES_URL, help="path or URL")
    args = parser.parse_args(argv)

    try:
        schema = load(args.schema)
        categories = load_categories(args.categories)
    except Exception as error:  # noqa: BLE001 - the message is the whole point
        print(f"Could not read the submission contract: {error}", file=sys.stderr)
        print("Nothing was written. There is no bundled copy to fall back to, "
              "because a stale contract would pass here and fail the pull "
              "request.", file=sys.stderr)
        return 2

    if args.contract:
        print(render_contract(contract(schema, categories)))
        return 0

    if not args.answers or not args.into:
        parser.error("--answers and --into are both required unless --contract is given")

    answers = json.loads(args.answers.read_text(encoding="utf-8"))
    body = args.body.read_text(encoding="utf-8") if args.body else None
    try:
        skill = scaffold(answers, args.into, schema, categories, body=body,
                         with_scripts=args.with_scripts,
                         with_references=args.with_references)
    except Incomplete as incomplete:
        print("Nothing was written. The answers do not satisfy the contract:",
              file=sys.stderr)
        for problem in incomplete.problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1

    print(f"Wrote {skill}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
