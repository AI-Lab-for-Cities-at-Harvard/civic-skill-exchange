#!/usr/bin/env python3
"""Print the attestation block for a reviewed skill, ready to paste.

A review ends in one 40-character SHA in registry/reviewed.yml. Getting it by
hand meant opening the skill on GitHub, reading blame, finding the commit and
copying the hash — four steps, each of which can go wrong quietly, for a
mechanism whose whole value is that nobody has to remember to maintain it.

This removes the typing, not the check. The SHA comes from the same call the
build compares against — `build_index.head_sha`, imported rather than
reimplemented — and the guards refuse to print a value the build would reject:
a dirty working tree, a shallow clone, or a branch that is not main. Each of
those produces an attestation that looks correct and grants no badge, which is
the hardest failure here to see, because the attestation, the skill and the
build all look right on their own.

What it does not do is decide anything. It writes no file, opens no pull
request, and leaves `notes` for the reviewer, because the note is the only part
of an attestation that carries judgment. See docs/REVIEW.md.

Usage:
    attestation.py civic-skills/plain-language-notice-rewriter
    attestation.py civic-skills/plain-language-notice-rewriter --notes "Read-only. No egress."
    attestation.py civic-skills/plain-language-notice-rewriter --reviewers "A N Other"
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import date
from pathlib import Path

from build_index import ROOT, head_sha

#: The attesting party, per ADR 0001. Overridable for when a second one exists.
DEFAULT_REVIEWERS = ["AI Lab for Cities at Harvard"]

#: docs/TIERS.md: one year, then re-review or demote.
TERM_YEARS = 1

NOTES_PLACEHOLDER = (
    "TODO — for the next reviewer, a year from now, with no memory of this "
    "review. What did you check especially closely? What would you look at "
    "first if it went wrong? If the Lab wrote the skill, say so."
)


class Unusable(Exception):
    """The clone cannot produce a SHA the build would accept."""


def skill_sha(skill: Path) -> str | None:
    """The commit the build will compare the attestation against."""
    return head_sha(skill)


def _git(args: list[str], cwd: Path) -> str:
    out = subprocess.run(["git", *args], cwd=cwd, capture_output=True,
                         text=True, check=False)
    return out.stdout.strip()


def check_clone(root: Path, skill: Path) -> None:
    """Refuse the four states that yield a SHA the build will not honour."""
    if not (skill / "SKILL.md").is_file():
        raise Unusable(
            f"{skill} has no SKILL.md — there is no skill there to attest to.")

    if _git(["rev-parse", "--is-shallow-repository"], root) == "true":
        raise Unusable(
            "This is a shallow clone, so git cannot reach the commit that last "
            "touched the skill. The build treats that as unverifiable and "
            "demotes. Clone again without --depth.")

    branch = _git(["rev-parse", "--abbrev-ref", "HEAD"], root)
    if branch != "main":
        raise Unusable(
            f"You are on '{branch}'. The build resolves the SHA on main, and "
            f"pull requests are squash-merged, so a commit from any other "
            f"branch will not exist there. Check out main and pull first.")

    if _git(["status", "--porcelain", "--", str(skill)], root):
        raise Unusable(
            f"{skill.name} has uncommitted changes, so the commit you would "
            f"attest to is not what is on disk in front of you. Commit or "
            f"discard them first.")


def behind_origin(root: Path) -> int:
    """How many commits main is behind its remote, or 0 if unknown.

    Not a refusal: this needs a fetch to be true, and a helper should not reach
    the network on its own. It is a warning, because a stale main gives an old
    SHA that the build will reject as drift.
    """
    count = _git(["rev-list", "--count", "HEAD..origin/main"], root)
    return int(count) if count.isdigit() else 0


def render(skill_id: str, sha: str, notes: str | None = None,
           reviewers: list[str] | None = None, today: date | None = None) -> str:
    """The YAML block, in the order reviewed.yml's own header documents."""
    reviewed = today or date.today()
    expires = reviewed.replace(year=reviewed.year + TERM_YEARS)
    names = ", ".join(f'"{r}"' for r in (reviewers or DEFAULT_REVIEWERS))
    body = (notes or NOTES_PLACEHOLDER).strip()
    return (
        f'- skill: "{skill_id}"\n'
        f'  sha: "{sha}"\n'
        f"  reviewers: [{names}]\n"
        f"  reviewed: {reviewed.isoformat()}\n"
        f"  expires: {expires.isoformat()}\n"
        f"  notes: >\n"
        + "".join(f"    {line}\n" for line in body.splitlines())
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skill", help="the listing id, {namespace}/{skill-name}")
    parser.add_argument("--notes", help="what the next reviewer needs to know")
    parser.add_argument("--reviewers", help="comma-separated attesting parties")
    args = parser.parse_args(argv)

    if "/" not in args.skill:
        parser.error("the skill id is {namespace}/{skill-name}, e.g. "
                     "civic-skills/plain-language-notice-rewriter")
    skill = ROOT / "skills" / args.skill

    try:
        check_clone(ROOT, skill)
    except Unusable as unusable:
        print(unusable, file=sys.stderr)
        return 1

    sha = skill_sha(skill)
    if not sha:
        print(f"git cannot resolve a commit for {args.skill}. The build treats "
              f"that as unverifiable and demotes.", file=sys.stderr)
        return 1

    behind = behind_origin(ROOT)
    if behind:
        print(f"warn  main is {behind} commit(s) behind origin/main, so this may "
              f"not be the newest commit touching the skill. `git pull` and run "
              f"this again.\n", file=sys.stderr)

    reviewers = ([r.strip() for r in args.reviewers.split(",")]
                 if args.reviewers else None)
    print(f"# Append to registry/reviewed.yml under `attestations:`\n"
          f"# Reviewed at https://github.com/AI-Lab-for-Cities-at-Harvard/"
          f"civic-skill-exchange/tree/{sha}/skills/{args.skill}\n")
    print(render(args.skill, sha, args.notes, reviewers), end="")

    if not args.notes:
        print("\n# Replace the notes before opening the pull request.",
              file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
