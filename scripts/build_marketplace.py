#!/usr/bin/env python3
"""Generate the Claude Code plugin marketplace manifest.

Every skill in the registry is already a valid Agent Skill — a directory with
SKILL.md at its top level — which is exactly what Claude Code loads as a
single-skill plugin. So this file makes the registry installable without moving
anything: each plugin entry names its own `source`, and a relative path resolves
from the repository root, so the `{namespace}/` directory between `skills/` and
the skill is invisible to the client. The namespace stays where it is, doing the
ownership work rules.ts checks it for.

**Why this is committed and not built.** `/plugin marketplace add owner/repo`
reads the repository, not the published site. index.json can be a build output
served from Pages; this cannot. So it is generated from the tree and CI fails
when the committed copy is stale — the same bargain any generated-and-committed
file makes.

Deliberately not in build_index.py: that script produces build outputs into
--out and should not write into the working tree during a deploy.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from build_index import read_frontmatter

ROOT = Path(__file__).resolve().parent.parent

MARKETPLACE_NAME = "civic-skill-exchange"
OWNER = {
    "name": "AI Lab for Cities at Harvard",
    "url": "https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange",
}


def plugin_name(namespace: str, name: str) -> str:
    """`{namespace}-{name}`, always.

    Plugin names must be unique across a marketplace, and two submitters may
    each publish `permit-status-explainer` — the registry's own identity is
    `namespace/name` for exactly that reason.

    Qualifying only on collision would be prettier and is wrong: the first
    submitter's install command would change the day a stranger submits the same
    name, and somebody has already written it down. Unconditional beats
    retroactive.
    """
    return f"{namespace}-{name}"


def build(root: Path = ROOT) -> dict:
    plugins = []
    for skill_dir in sorted(p for p in (root / "skills").glob("*/*") if p.is_dir()):
        front = read_frontmatter(skill_dir / "SKILL.md")
        if not front:
            # Same posture as the index build: an unreadable skill is skipped
            # rather than allowed to break the manifest. L0 fails it in CI.
            continue
        namespace, name = skill_dir.parent.name, skill_dir.name
        plugins.append({
            "name": plugin_name(namespace, name),
            "source": f"./skills/{namespace}/{name}",
            "description": (front.get("description") or "").strip(),
        })

    return {"name": MARKETPLACE_NAME, "owner": OWNER, "plugins": plugins}


def render(manifest: dict) -> str:
    return json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"


def write(root: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(render(build(root)), encoding="utf-8")


def is_current(root: Path, target: Path) -> bool:
    if not target.is_file():
        return False
    return target.read_text(encoding="utf-8") == render(build(root))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="exit non-zero if the committed manifest is stale")
    args = parser.parse_args()

    target = ROOT / ".claude-plugin" / "marketplace.json"

    if args.check:
        if is_current(ROOT, target):
            print(f"ok    {target.relative_to(ROOT)} is current")
            return 0
        print(f"stale {target.relative_to(ROOT)} does not match skills/.\n"
              f"      Run: python scripts/build_marketplace.py", file=sys.stderr)
        return 1

    write(ROOT, target)
    count = len(build(ROOT)["plugins"])
    print(f"wrote {target.relative_to(ROOT)} — {count} plugin"
          f"{'' if count == 1 else 's'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
