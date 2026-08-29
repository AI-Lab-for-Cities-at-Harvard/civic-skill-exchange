#!/usr/bin/env python3
"""Structural and ownership validation for submitted skills — scan layers L0 and L1.

This checks that a skill is well-formed and that its author owns the namespace it
was written into. It does NOT verify that a skill is safe, correct, useful, or fit
for any purpose. Content security signatures live in scan.py; the only thing that
admits a skill to the Reviewed tier is a human working docs/REVIEW.md.

Usage:
    validate.py all
    validate.py skills/octocat/permit-status-explainer
    validate.py --changed changed.txt --author octocat

Exit code 0 if every checked skill passes, 1 otherwise.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "skills"

# Caps. A skill is instructions and small helpers; anything larger is a project.
MAX_FILE_BYTES = 100 * 1024
MAX_SKILL_BYTES = 1024 * 1024
MAX_FRONTMATTER_BYTES = 16 * 1024
MAX_YAML_NODES = 500
MAX_FILES_PER_SKILL = 60

# Allowlist, not a denylist. A denylist of binary types is always incomplete.
ALLOWED_SUFFIXES = {
    ".md", ".txt", ".yml", ".yaml", ".json", ".toml", ".csv", ".tsv",
    ".py", ".sh", ".bash", ".js", ".mjs", ".ts", ".sql", ".jinja", ".j2",
    ".html", ".css", ".xml", ".ini", ".cfg", ".env.example",
}

# The six fields of the Agent Skills specification. Anything else a vendor adds is
# quarantined into metadata rather than rejected, so skills using vendor extensions
# still validate here. See docs/ARCHITECTURE.md.
SPEC_FIELDS = {"name", "description", "license", "compatibility", "allowed-tools", "metadata"}

# Namespaces reserved for maintainer-seeded skills. The author check is skipped for
# these because CODEOWNERS gates them instead — a PR touching a reserved namespace
# needs maintainer approval, which is a stronger control than a username match.
RESERVED_NAMESPACES = {"civic-skills"}

# Deployment provenance. The enums live in the schema; these are the cross-field
# rules, which belong here because the error messages are better.
#
# ISO 3166 country, optional subdivision, optional locality: "US-MA / Boston".
DEPLOYED_IN_RE = re.compile(r"^[A-Z]{2}(-[A-Z0-9]{1,3})?( / .+)?$")
DEPLOYED_SINCE_RE = re.compile(r"^\d{4}(-(0[1-9]|1[0-2]))?$")
DEPLOYMENT_DETAILS = ("civic.deployed-at", "civic.deployed-in")


def check_provenance(meta: dict) -> list[str]:
    """A deployment claim must say where, and a non-claim must not imply one."""
    errors: list[str] = []
    deployment = meta.get("civic.deployment")

    if deployment == "none":
        for field in DEPLOYMENT_DETAILS:
            if meta.get(field):
                errors.append(
                    f"{field} is set, but civic.deployment: none says the skill has "
                    f"never been used. Remove {field}, or state where it was used."
                )
    elif deployment in ("personal", "team", "organization"):
        for field in DEPLOYMENT_DETAILS:
            if not meta.get(field):
                errors.append(
                    f"{field} is required when civic.deployment is '{deployment}'. "
                    f"A deployment claim has to name where."
                )

    deployed_in = meta.get("civic.deployed-in")
    if deployed_in and not DEPLOYED_IN_RE.match(deployed_in):
        errors.append(
            f"civic.deployed-in '{deployed_in}' is not in the expected form: an "
            f"ISO 3166 country code, optionally a subdivision, optionally ' / ' and "
            f"a locality. For example 'US-MA / Boston', 'GB', 'CA-ON / Toronto'."
        )

    since = meta.get("civic.deployed-since")
    if since and not DEPLOYED_SINCE_RE.match(since):
        errors.append(f"civic.deployed-since '{since}' is not YYYY or YYYY-MM.")

    return errors


FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*(?:\n|\Z)", re.DOTALL)


# --------------------------------------------------------------------------- #
# Loading


def load_categories() -> set[str]:
    doc = yaml.safe_load((ROOT / "registry" / "categories.yml").read_text(encoding="utf-8"))
    return {c["id"] for c in doc.get("categories", [])}


def load_validator() -> Draft202012Validator:
    schema = json.loads((ROOT / "schema" / "skill.schema.json").read_text(encoding="utf-8"))
    return Draft202012Validator(schema)


# --------------------------------------------------------------------------- #
# Frontmatter


def split_frontmatter(text: str) -> tuple[str | None, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None, text
    return m.group(1), text[m.end():]


def check_yaml_safety(raw: str) -> list[str]:
    """Reject frontmatter that is oversized, alias-bearing, or absurdly deep.

    YAML aliases are the billion-laughs vector. No skill has a legitimate use for
    them in sixteen kilobytes of frontmatter, so we reject them outright rather
    than trying to bound their expansion.
    """
    if len(raw.encode("utf-8")) > MAX_FRONTMATTER_BYTES:
        return [f"frontmatter exceeds {MAX_FRONTMATTER_BYTES} bytes"]

    try:
        root = yaml.compose(raw)
    except yaml.YAMLError as exc:
        return [f"frontmatter is not valid YAML: {exc}"]

    if root is None:
        return ["frontmatter is empty"]

    seen: set[int] = set()
    stack = [root]
    count = 0
    while stack:
        node = stack.pop()
        if id(node) in seen:
            return ["YAML anchors and aliases are not permitted in frontmatter"]
        seen.add(id(node))
        count += 1
        if count > MAX_YAML_NODES:
            return [f"frontmatter has more than {MAX_YAML_NODES} YAML nodes"]
        if isinstance(node, yaml.MappingNode):
            for key, value in node.value:
                stack.append(key)
                stack.append(value)
        elif isinstance(node, yaml.SequenceNode):
            stack.extend(node.value)
    return []


def quarantine_extensions(front: dict) -> tuple[dict, list[str]]:
    """Move non-spec top-level fields into metadata instead of failing the build.

    Some agent tools accept roughly twenty fields beyond the six in the spec.
    Rejecting those would reject otherwise-working skills, so we relocate them and
    report what moved. The contributor sees this in the PR comment.
    """
    extras = sorted(set(front) - SPEC_FIELDS)
    if not extras:
        return front, []

    metadata = dict(front.get("metadata") or {})
    for key in extras:
        metadata[f"ext.{key}"] = str(front.pop(key))
    front["metadata"] = metadata
    return front, extras


# --------------------------------------------------------------------------- #
# Structure


def check_structure(skill_dir: Path) -> list[str]:
    errors: list[str] = []
    total = 0
    files = 0

    for path in sorted(skill_dir.rglob("*")):
        rel = path.relative_to(skill_dir)

        if path.is_symlink():
            errors.append(f"{rel}: symlinks are not permitted")
            continue
        if path.is_dir():
            if path.name == ".git":
                errors.append(f"{rel}: nested git repositories are not permitted")
            continue

        files += 1
        size = path.stat().st_size
        total += size

        if size > MAX_FILE_BYTES:
            errors.append(f"{rel}: {size} bytes exceeds the {MAX_FILE_BYTES}-byte file cap")

        if path.suffix.lower() not in ALLOWED_SUFFIXES:
            errors.append(
                f"{rel}: '{path.suffix or path.name}' is not an allowed file type. "
                f"Allowed: {', '.join(sorted(ALLOWED_SUFFIXES))}"
            )
            continue

        try:
            path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            errors.append(f"{rel}: not valid UTF-8 text (binaries are not permitted)")

    if total > MAX_SKILL_BYTES:
        errors.append(f"skill directory is {total} bytes, over the {MAX_SKILL_BYTES}-byte cap")
    if files > MAX_FILES_PER_SKILL:
        errors.append(f"skill has {files} files, over the {MAX_FILES_PER_SKILL}-file cap")

    return errors


# --------------------------------------------------------------------------- #
# One skill


def validate_skill(
    skill_dir: Path,
    categories: set[str],
    validator: Draft202012Validator,
    author: str | None = None,
) -> tuple[list[str], list[str]]:
    """Return (errors, notes) for one skill directory."""
    errors: list[str] = []
    notes: list[str] = []

    try:
        namespace = skill_dir.parent.name
        skill_name = skill_dir.name
    except IndexError:
        return ([f"{skill_dir}: not in skills/{{namespace}}/{{skill-name}}/ form"], [])

    # L1 — ownership. Compare against the PR author, never the fork owner: an org
    # fork would otherwise let any member write into that org's namespace.
    if (
        author is not None
        and namespace.lower() not in RESERVED_NAMESPACES
        and namespace.lower() != author.lower()
    ):
        errors.append(
            f"namespace '{namespace}' does not match the pull request author "
            f"'{author}'. Submit under skills/{author}/"
        )

    errors.extend(check_structure(skill_dir))

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.is_file():
        errors.append("SKILL.md is missing")
        return errors, notes

    raw, body = split_frontmatter(skill_md.read_text(encoding="utf-8"))
    if raw is None:
        errors.append("SKILL.md has no YAML frontmatter block")
        return errors, notes

    yaml_errors = check_yaml_safety(raw)
    if yaml_errors:
        return errors + yaml_errors, notes

    front = yaml.safe_load(raw)
    if not isinstance(front, dict):
        errors.append("frontmatter must be a mapping")
        return errors, notes

    front, moved = quarantine_extensions(front)
    if moved:
        notes.append(f"moved non-spec fields into metadata: {', '.join(moved)}")

    for err in sorted(validator.iter_errors(front), key=lambda e: list(e.path)):
        location = ".".join(str(p) for p in err.path) or "(root)"
        errors.append(f"{location}: {err.message}")

    if front.get("name") != skill_name:
        errors.append(
            f"name '{front.get('name')}' does not match the directory '{skill_name}'"
        )

    errors.extend(check_provenance(front.get("metadata") or {}))

    category = (front.get("metadata") or {}).get("civic.category")
    if category and category not in categories:
        errors.append(
            f"civic.category '{category}' is not in the vocabulary. "
            f"One of: {', '.join(sorted(categories))}"
        )

    if not body.strip():
        errors.append("SKILL.md has frontmatter but no body")

    return errors, notes


# --------------------------------------------------------------------------- #
# Entry point


def discover(changed_file: Path) -> list[Path]:
    """Map a list of changed paths to the distinct skill directories they touch."""
    dirs: set[Path] = set()
    for line in changed_file.read_text(encoding="utf-8").splitlines():
        parts = Path(line.strip()).parts
        if len(parts) >= 3 and parts[0] == "skills":
            candidate = ROOT / parts[0] / parts[1] / parts[2]
            if candidate.is_dir():
                dirs.add(candidate)
    return sorted(dirs)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", nargs="?", help="'all', or a path to one skill directory")
    parser.add_argument("--changed", type=Path, help="file listing changed paths, one per line")
    parser.add_argument("--author", help="PR author's GitHub login, for the ownership check")
    args = parser.parse_args()

    if args.changed:
        targets = discover(args.changed)
    elif args.target == "all":
        targets = sorted(p for p in SKILLS_DIR.glob("*/*") if p.is_dir())
    elif args.target:
        targets = [Path(args.target).resolve()]
    else:
        parser.error("give a target, 'all', or --changed")

    if not targets:
        print("No skill directories to validate.")
        return 0

    categories = load_categories()
    validator = load_validator()
    failed = 0

    for skill_dir in targets:
        rel = skill_dir.relative_to(ROOT) if skill_dir.is_relative_to(ROOT) else skill_dir
        errors, notes = validate_skill(skill_dir, categories, validator, args.author)

        for note in notes:
            print(f"note  {rel}: {note}")

        if errors:
            failed += 1
            print(f"FAIL  {rel}")
            for err in errors:
                print(f"        {err}")
        else:
            print(f"ok    {rel}")

    print(f"\n{len(targets) - failed}/{len(targets)} skills passed structural validation.")
    if failed:
        print("Structural validation checks form and ownership only — never content safety.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
