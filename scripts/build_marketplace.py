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

import yaml

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


class DuplicatePluginName(Exception):
    """Two listings under skills/ joined namespace and name into the same
    plugin name.

    `namespace-name` is not injective: `civic` submitting
    `skills-plain-language-notice-rewriter` joins to the same string as
    `civic-skills`'s `plain-language-notice-rewriter`. Nothing upstream of
    this generator can catch that — the registry's real identity is the
    namespace/name pair, and the join is a lossy projection of it done only
    here, at marketplace-manifest time."""


def _assert_unique_plugin_names(entries: list[tuple[str, str]]) -> None:
    """`entries` is `(namespace, name)` per listing, in the order they will be
    written. Raises naming both listings on the first collision found."""
    seen: dict[str, tuple[str, str]] = {}
    for namespace, name in entries:
        name_joined = plugin_name(namespace, name)
        other = seen.get(name_joined)
        if other is not None:
            raise DuplicatePluginName(
                f"duplicate plugin name '{name_joined}': "
                f"skills/{other[0]}/{other[1]} and skills/{namespace}/{name} "
                "both produce it. Plugin names must be unique across the "
                "marketplace.")
        seen[name_joined] = (namespace, name)


# --------------------------------------------------------------------------- #
# Codex (#98).
#
# Verified against Codex itself rather than its documentation:
#
#   - a marketplace is read from `.agents/plugins/marketplace.json`, and Codex
#     does not read Claude's file — pointing it at this repository before this
#     existed registered a marketplace that surfaced nothing;
#   - a `SKILL.md` at the plugin root loads with `"skills": "./"`;
#   - `version` is optional. A manifest without one installs, landing under
#     `local` rather than a version directory.
#
# One plugin per skill, matching the Claude marketplace, so the install command
# reads the same in both tools. That costs a manifest inside every skill
# directory, which was the trade taken deliberately.

CODEX_POLICY = {"installation": "AVAILABLE", "authentication": "ON_USE"}

# Codex shows this to a person, so it is the label rather than the id.
FALLBACK_CATEGORY = "Civic"


def category_labels(root: Path = ROOT) -> dict[str, str]:
    """The readable label per category id, from the vocabulary that already
    holds it. Restating them here would drift the first time one is added.

    Falls back to the repository's own file when `root` has none — the
    vocabulary is a property of the registry, not of whichever tree is being
    walked, which is what lets a test build a skill in a temporary directory."""
    for candidate in (root / "registry" / "categories.yml",
                      ROOT / "registry" / "categories.yml"):
        if candidate.is_file():
            data = yaml.safe_load(candidate.read_text(encoding="utf-8"))
            return {c["id"]: c["label"] for c in (data or {}).get("categories", [])}
    return {}


def short(description: str, limit: int = 120) -> str:
    """A one-line summary Codex can show beside the plugin name.

    The first sentence where there is one, and otherwise a word boundary — a cut
    mid-word reads as a bug rather than as brevity."""
    first = description.split(". ")[0].rstrip(".")
    if first and len(first) <= limit:
        return first
    clipped = description[:limit].rsplit(" ", 1)[0].rstrip(" ,;:")
    return f"{clipped}…" if clipped else description[:limit]


def codex_plugin(skill_dir: Path, labels: dict[str, str] | None = None) -> dict:
    """The `.codex-plugin/plugin.json` for one skill."""
    root = skill_dir.parents[2]
    labels = category_labels(root) if labels is None else labels
    front = read_frontmatter(skill_dir / "SKILL.md") or {}
    meta = front.get("metadata") or {}
    namespace, name = skill_dir.parent.name, skill_dir.name
    label = labels.get(str(meta.get("civic.category")), FALLBACK_CATEGORY)
    description = (front.get("description") or "").strip()

    manifest = {
        "name": plugin_name(namespace, name),
        "description": description,
        # Codex accepts a manifest with no version. Writing 1.0.0 would assert a
        # stability nobody claimed, and deriving one from the date would rewrite
        # this file on every build. An author who declares one gets it published.
        **({"version": str(meta["version"])} if meta.get("version") else {}),
        "author": {"name": str(meta.get("civic.maintainer") or namespace)},
        "license": str(front.get("license") or ""),
        # SKILL.md sits at the top of a skill directory, not under skills/.
        "skills": "./",
        "interface": {
            "displayName": name.replace("-", " ").title(),
            "shortDescription": short(description),
            "category": label,
        },
    }
    return {k: v for k, v in manifest.items() if v not in ("", None)}


def build_codex(root: Path = ROOT) -> dict:
    labels = category_labels(root)
    plugins = []
    entries = []
    for skill_dir in sorted(p for p in (root / "skills").glob("*/*") if p.is_dir()):
        front = read_frontmatter(skill_dir / "SKILL.md")
        if not front:
            continue
        meta = front.get("metadata") or {}
        namespace, name = skill_dir.parent.name, skill_dir.name
        entries.append((namespace, name))
        plugins.append({
            "name": plugin_name(namespace, name),
            "source": {"source": "local", "path": f"./skills/{namespace}/{name}"},
            "policy": dict(CODEX_POLICY),
            "category": labels.get(str(meta.get("civic.category")), FALLBACK_CATEGORY),
        })
    _assert_unique_plugin_names(entries)
    return {"name": MARKETPLACE_NAME, "plugins": plugins}


# --------------------------------------------------------------------------- #
# Claude (#183).
#
# A plugin with a SKILL.md at its root, no `skills/` subdirectory and no
# `skills` manifest field is loaded by Claude Code as a single-skill plugin —
# documented, and the CLI installs this registry that way with no manifest at
# all. The desktop app's plugin browser shows nothing from this marketplace and
# reports no error, and the hypothesis under test here is that it wants
# `.claude-plugin/plugin.json` in every plugin.
#
# Metadata only, and deliberately: `hooks`, `mcpServers`, `commands`, `agents`
# and the rest are honoured by code rather than by a model, which is why L0
# refuses an author's plugin-level files at all (#151). This file is allowed
# inside a skill directory only because the generator produces it and
# `build_marketplace.py --check` blocks a pull request whose copy differs, so
# nothing an author writes here survives.
#
# No `skills` field. `"skills": "./"` is what the Codex manifest needs, and
# setting it here would take away the very root-SKILL.md path that loads the
# skill.


def claude_plugin(skill_dir: Path) -> dict:
    """The `.claude-plugin/plugin.json` for one skill."""
    front = read_frontmatter(skill_dir / "SKILL.md") or {}
    meta = front.get("metadata") or {}
    namespace, name = skill_dir.parent.name, skill_dir.name

    manifest = {
        # The marketplace entry's plugin name, so the plugin a client installs
        # and the plugin it loads are the same one.
        "name": plugin_name(namespace, name),
        "description": (front.get("description") or "").strip(),
        # Same reasoning as the Codex manifest: no version is invented, and a
        # declared one is published. `claude plugin validate --strict` warns
        # without it, which is a warning the registry accepts rather than
        # answering with a made-up number.
        **({"version": str(meta["version"])} if meta.get("version") else {}),
        # `--strict` treats a missing author as an error.
        "author": {"name": str(meta.get("civic.maintainer") or namespace)},
    }
    return {k: v for k, v in manifest.items() if v not in ("", None)}


def build(root: Path = ROOT) -> dict:
    plugins = []
    entries = []
    for skill_dir in sorted(p for p in (root / "skills").glob("*/*") if p.is_dir()):
        front = read_frontmatter(skill_dir / "SKILL.md")
        if not front:
            # Same posture as the index build: an unreadable skill is skipped
            # rather than allowed to break the manifest. L0 fails it in CI.
            continue
        namespace, name = skill_dir.parent.name, skill_dir.name
        entries.append((namespace, name))
        plugins.append({
            "name": plugin_name(namespace, name),
            "source": f"./skills/{namespace}/{name}",
            "description": (front.get("description") or "").strip(),
        })

    _assert_unique_plugin_names(entries)
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


# --------------------------------------------------------------------------- #
# Both marketplaces, from one walk of the tree, so they cannot disagree about
# what is listed.

CLAUDE_MANIFEST = Path(".claude-plugin") / "marketplace.json"
CODEX_MANIFEST = Path(".agents") / "plugins" / "marketplace.json"


def generated(root: Path) -> dict[Path, str]:
    """Every file this script owns, and what it should contain."""
    out = {
        root / CLAUDE_MANIFEST: render(build(root)),
        root / CODEX_MANIFEST: render(build_codex(root)),
    }
    labels = category_labels(root)
    for skill_dir in sorted(p for p in (root / "skills").glob("*/*") if p.is_dir()):
        if not read_frontmatter(skill_dir / "SKILL.md"):
            continue
        out[skill_dir / ".codex-plugin" / "plugin.json"] = render(
            codex_plugin(skill_dir, labels))
        out[skill_dir / ".claude-plugin" / "plugin.json"] = render(
            claude_plugin(skill_dir))
    return out


def write_all(root: Path = ROOT) -> list[Path]:
    written = []
    for path, content in generated(root).items():
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.is_file() or path.read_text(encoding="utf-8") != content:
            path.write_text(content, encoding="utf-8")
            written.append(path)
    return written


def all_current(root: Path = ROOT) -> bool:
    return all(p.is_file() and p.read_text(encoding="utf-8") == c
               for p, c in generated(root).items())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="exit non-zero if the committed manifest is stale")
    parser.add_argument("--paths", action="store_true",
                        help="print the paths this script owns, one per line, "
                             "relative to the repository root, and write "
                             "nothing")
    args = parser.parse_args()

    # The generator is the only authority on which files it owns. Anything that
    # stages, checks or exempts them asks this rather than keeping a second copy
    # of the list: the post-merge regeneration job named one manifest path and
    # left two behind for a day (#188).
    if args.paths:
        try:
            paths = list(generated(ROOT))
        except DuplicatePluginName as exc:
            print(f"error {exc}", file=sys.stderr)
            return 1
        for path in paths:
            print(path.relative_to(ROOT).as_posix())
        return 0

    if args.check:
        try:
            stale = [p for p, c in generated(ROOT).items()
                     if not p.is_file() or p.read_text(encoding="utf-8") != c]
        except DuplicatePluginName as exc:
            print(f"error {exc}", file=sys.stderr)
            return 1
        if not stale:
            print(f"ok    both marketplace manifests are current")
            return 0
        for path in stale:
            print(f"stale {path.relative_to(ROOT)}", file=sys.stderr)
        print("      Run: python scripts/build_marketplace.py", file=sys.stderr)
        return 1

    try:
        written = write_all(ROOT)
        count = len(build(ROOT)["plugins"])
    except DuplicatePluginName as exc:
        print(f"error {exc}", file=sys.stderr)
        return 1
    print(f"{len(written)} file{'' if len(written) == 1 else 's'} written — "
          f"{count} plugin{'' if count == 1 else 's'} in each marketplace")
    for path in written:
        print(f"  {path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
