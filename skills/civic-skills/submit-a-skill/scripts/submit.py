#!/usr/bin/env python3
"""Open the pull request that adds a skill to the civic-skill-exchange registry.

Does what a person with a GitHub account does by hand: fork the registry, put
the skill in their own namespace on a branch, push it, open the pull request.
The registry's four check layers then run on it and comment.

**The namespace is the authenticated user's login, and there is no way to say
otherwise.** The registry's one ownership control is that a skill's namespace
matches the pull request author, so a flag to override it here would be a way
straight past that check. The login comes from `gh api user`.

The branch is cut from the registry's own main, not from the fork. A fork that
has drifted puts unrelated commits in the pull request; a stale one puts the
skill on top of old code.

Standard library only, plus `git` and the GitHub CLI — `gh` is what carries the
author's credentials, so nothing here handles a token.

Usage:
    submit.py --dir path/to/my-skill [--dry-run] [--branch NAME] [--title TEXT]
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

MARKETPLACE_REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange"
REGISTRY_NAME = MARKETPLACE_REPO.split("/", 1)[1]

#: The frontmatter's own name, which has to match the directory the skill is in.
_NAME = re.compile(r"^name:\s*[\"']?([^\"'\n]+)", re.MULTILINE)


class Refused(Exception):
    """The submission would fail a check that is plainer to fix beforehand."""


@dataclass
class Plan:
    """What submitting runs, and where the skill lands. Separated out so it can
    be printed and checked without anything being pushed."""

    destination: Path
    commands: list[list[str]]


def run(command: list[str], cwd: Path | None = None, capture: bool = False) -> str:
    result = subprocess.run(command, cwd=cwd, text=True,
                            capture_output=capture, check=False)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise Refused(f"`{' '.join(command)}` failed. {detail}")
    return (result.stdout or "").strip() if capture else ""


def author_login() -> str:
    """Who GitHub says is signed in. The namespace, and the only source of it."""
    if shutil.which("gh") is None:
        raise Refused(
            "The GitHub CLI (`gh`) is not installed. It is what carries your "
            "GitHub credentials — install it from https://cli.github.com and "
            "run `gh auth login`.")
    login = run(["gh", "api", "user", "--jq", ".login"], capture=True)
    if not login:
        raise Refused("`gh` is installed but not signed in. Run `gh auth login`.")
    return login


def read_name(skill: Path) -> str:
    """The skill's name, refusing the two mismatches that fail the check for a
    reason the author cannot see in the pull request comment."""
    skill_md = Path(skill) / "SKILL.md"
    if not skill_md.is_file():
        raise Refused(
            f"{skill} has no SKILL.md, so it is not a skill directory yet. "
            f"Point --dir at the directory that contains SKILL.md.")
    match = _NAME.search(skill_md.read_text(encoding="utf-8"))
    if not match:
        raise Refused(f"{skill_md} has no `name:` in its frontmatter.")
    name = match.group(1).strip()
    if name != Path(skill).name:
        raise Refused(
            f"the frontmatter says name: {name}, but the directory is called "
            f"{Path(skill).name}. They have to match — rename one.")
    return name


def plan(login: str, name: str, branch: str, title: str | None = None) -> Plan:
    """Every command submitting runs, in order, with nothing run yet."""
    destination = Path("skills") / login / name
    upstream = f"https://github.com/{MARKETPLACE_REPO}.git"
    fork = f"https://github.com/{login}/{REGISTRY_NAME}.git"
    return Plan(
        destination=destination,
        commands=[
            ["gh", "repo", "fork", MARKETPLACE_REPO, "--clone=false"],
            # A partial clone rather than a shallow one: it keeps the commit
            # graph, so pushing the branch to the fork is an ordinary push, and
            # it still leaves the blobs on the server until something asks for
            # them.
            ["git", "clone", "--filter=blob:none", upstream, "."],
            ["git", "checkout", "-b", branch],
            ["git", "add", str(destination)],
            ["git", "commit", "-m", f"Add {login}/{name}"],
            ["git", "push", fork, f"HEAD:{branch}"],
            ["gh", "pr", "create",
             "--repo", MARKETPLACE_REPO,
             "--base", "main",
             "--head", f"{login}:{branch}",
             "--title", title or f"Add {login}/{name}",
             "--body-file", "-"],
        ],
    )


BODY = """\
Adds `{destination}`.

{summary}

I am the author of this skill and I am submitting it under my own namespace.
The registry's checks run on this pull request and comment with the result;
a pass is not a statement that the skill is safe or fit for any purpose.
"""


def summarize(skill: Path) -> str:
    """The description the author already wrote, not a new one."""
    text = (Path(skill) / "SKILL.md").read_text(encoding="utf-8")
    match = re.search(r"^description:\s*[\"']?(.+?)[\"']?\s*$", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def submit(skill: Path, branch: str | None = None, title: str | None = None) -> str:
    """Carry it out. Returns the pull request URL."""
    login = author_login()
    name = read_name(skill)
    steps = plan(login, name, branch or f"add-{name}", title)

    fork, clone, *rest = steps.commands
    run(fork)
    with tempfile.TemporaryDirectory() as work:
        workspace = Path(work)
        run(clone, cwd=workspace)
        run(rest[0], cwd=workspace)

        target = workspace / steps.destination
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            raise Refused(
                f"{steps.destination} already exists in the registry. To change "
                f"a skill you have already listed, edit it there instead.")
        shutil.copytree(skill, target)

        for command in rest[1:-1]:
            run(command, cwd=workspace)

        body = BODY.format(destination=steps.destination, summary=summarize(skill))
        create = subprocess.run(steps.commands[-1], cwd=workspace, input=body,
                                text=True, capture_output=True, check=False)
        if create.returncode != 0:
            raise Refused(
                "The branch is pushed, but opening the pull request failed: "
                f"{(create.stderr or create.stdout).strip()}\n"
                f"You can open it yourself at "
                f"https://github.com/{MARKETPLACE_REPO}/compare/main...{login}:{branch or f'add-{name}'}")
        return create.stdout.strip().splitlines()[-1]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", type=Path, required=True,
                        help="the skill directory, the one containing SKILL.md")
    parser.add_argument("--branch", help="branch name in your fork")
    parser.add_argument("--title", help="pull request title")
    parser.add_argument("--dry-run", action="store_true",
                        help="print what would run, and stop")
    # There is deliberately no flag for the namespace. See the module docstring.
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        login = author_login()
        name = read_name(args.dir)
        steps = plan(login, name, args.branch or f"add-{name}", args.title)
        if args.dry_run:
            print(f"The skill would land at {steps.destination}, "
                  f"in a pull request opened by {login}.\n")
            for command in steps.commands:
                print("  " + " ".join(command))
            return 0
        print(submit(args.dir, args.branch, args.title))
    except Refused as refused:
        print(str(refused), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
