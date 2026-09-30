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


def _assert_unique_plugin_names(entries: list[tuple[str, ...]]) -> None:
    """`entries` is `(namespace, name)` per listing, in the order they will be
    written, or `(namespace, name, tree)` when the listing is not under
    `skills/`. Raises naming both listings on the first collision found.

    Skills and plugins share one marketplace, so they share one name space:
    `skills/alice/housing` and `plugins/alice/housing` would both install as
    `alice-housing` (ADR 0005)."""
    seen: dict[str, str] = {}
    for namespace, name, *rest in entries:
        tree = rest[0] if rest else "skills"
        name_joined = plugin_name(namespace, name)
        here = f"{tree}/{namespace}/{name}"
        other = seen.get(name_joined)
        if other is not None:
            raise DuplicatePluginName(
                f"duplicate plugin name '{name_joined}': "
                f"{other} and {here} "
                "both produce it. Plugin names must be unique across the "
                "marketplace.")
        seen[name_joined] = here


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
    for plugin_dir in plugin_dirs(root):
        namespace, name = plugin_dir.parent.name, plugin_dir.name
        entries.append((namespace, name, "plugins"))
        plugins.append({
            "name": plugin_name(namespace, name),
            "source": {"source": "local", "path": f"./plugins/{namespace}/{name}"},
            "policy": dict(CODEX_POLICY),
            "category": labels.get(str(plugin_category(plugin_dir)), FALLBACK_CATEGORY),
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
    for plugin_dir in plugin_dirs(root):
        namespace, name = plugin_dir.parent.name, plugin_dir.name
        entries.append((namespace, name, "plugins"))
        plugins.append({
            "name": plugin_name(namespace, name),
            "source": f"./plugins/{namespace}/{name}",
            "description": str(read_plugin_manifest(plugin_dir).get("description") or "").strip(),
        })

    _assert_unique_plugin_names(entries)
    return {"name": MARKETPLACE_NAME, "owner": OWNER, "plugins": plugins}


# --------------------------------------------------------------------------- #
# Plugins (ADR 0005).
#
# A plugin is several skills and, optionally, MCP servers, in the Agent Plugins
# 1.0.0 layout under `plugins/{namespace}/{name}/`. The author writes the two
# portable files, `plugin.json` and `mcp.json`, and Codex reads them as they
# are: an Agent Plugins manifest wins over `.codex-plugin/plugin.json`, so no
# Codex manifest is generated for a plugin.
#
# Claude Code reads neither. It wants `.claude-plugin/plugin.json` and a
# dotted `.mcp.json` whose remote transport is spelled `http` rather than
# `streamable-http`, and whose plugin-root variable is `CLAUDE_PLUGIN_ROOT`. So
# both are derived here, on the same terms as the per-skill manifests: the
# registry writes them, L0 allows them only at the plugin root, and
# `--check-in-skills` fails a copy the generator did not write. `skills/` is
# found by both clients without a manifest field.

#: What this script writes into a plugin directory. validator/src/skill.ts
#: exempts exactly these paths from the ownership check.
PLUGIN_GENERATED = (Path(".claude-plugin") / "plugin.json", Path(".mcp.json"))

#: The registry's own extension namespace in a plugin.json (ADR 0005), which
#: holds the metadata a plugin declares once for all of its skills.
REGISTRY_EXTENSION = "io.github.ai-lab-for-cities-at-harvard"

#: The specification's variables, as Claude Code spells them.
CLAUDE_VARIABLES = {
    "${PLUGIN_ROOT}": "${CLAUDE_PLUGIN_ROOT}",
    "${PLUGIN_DATA}": "${CLAUDE_PLUGIN_DATA}",
}


def read_plugin_manifest(plugin_dir: Path) -> dict:
    """The author's `plugin.json`, or `{}` when it is missing or unreadable —
    L0's to report, the same posture as an unreadable SKILL.md."""
    try:
        doc = json.loads((plugin_dir / "plugin.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return doc if isinstance(doc, dict) else {}


def plugin_civic(manifest: dict) -> dict:
    """The registry's metadata in a plugin manifest, or `{}`."""
    extensions = manifest.get("extensions")
    civic = extensions.get(REGISTRY_EXTENSION) if isinstance(extensions, dict) else None
    return civic if isinstance(civic, dict) else {}


def plugin_dirs(root: Path = ROOT) -> list[Path]:
    """Every listed plugin: a directory under plugins/*/* whose manifest reads."""
    return sorted(p for p in (root / "plugins").glob("*/*")
                  if p.is_dir() and read_plugin_manifest(p))


def plugin_skills(plugin_dir: Path) -> list[Path]:
    """The plugin's skills, where both clients look for them."""
    return sorted(p for p in (plugin_dir / "skills").glob("*")
                  if (p / "SKILL.md").is_file())


def plugin_category(plugin_dir: Path) -> str | None:
    """One category for a listing that carries several skills.

    The marketplace entry has room for exactly one. The category most of its
    skills declare, and the first skill's among equals — a plugin is usually
    one piece of work split into steps, which share a category anyway."""
    counts: dict[str, int] = {}
    for skill in plugin_skills(plugin_dir):
        meta = (read_frontmatter(skill / "SKILL.md") or {}).get("metadata") or {}
        category = meta.get("civic.category")
        if category:
            counts[str(category)] = counts.get(str(category), 0) + 1
    return max(counts, key=counts.get) if counts else None


def claude_plugin_for_plugin(plugin_dir: Path) -> dict:
    """The `.claude-plugin/plugin.json` for one plugin: the author's manifest,
    reduced to the same metadata a skill's carries.

    The name is the marketplace name, not whatever the author wrote. L0
    already requires the two to match, so this changes nothing for a listing
    that passes; for one that does not, it keeps the Claude side coherent."""
    manifest = read_plugin_manifest(plugin_dir)
    namespace, name = plugin_dir.parent.name, plugin_dir.name
    author = manifest.get("author") if isinstance(manifest.get("author"), dict) else {}
    civic = plugin_civic(manifest)
    out = {
        "name": plugin_name(namespace, name),
        "description": str(manifest.get("description") or "").strip(),
        **({"version": str(manifest["version"])} if manifest.get("version") else {}),
        # The exchange's maintainer, as a skill's manifest names it.
        "author": {"name": str(civic.get("civic.maintainer") or author.get("name")
                               or namespace)},
    }
    return {k: v for k, v in out.items() if v not in ("", None)}


def _claude_value(value: str) -> str:
    for spec, claude in CLAUDE_VARIABLES.items():
        value = value.replace(spec, claude)
    return value


def claude_mcp(plugin_dir: Path) -> dict | None:
    """The `.mcp.json` Claude Code reads, from the author's `mcp.json`, or None
    when the plugin declares no servers.

    Only servers the specification defines are carried over. L0 has already
    refused anything else, so a server dropped here is one that fails the pull
    request anyway, and passing an unknown shape through to a client is the
    wrong way to find out what it does with it."""
    path = plugin_dir / "mcp.json"
    if not path.is_file():
        return None
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    servers = doc.get("mcpServers") if isinstance(doc, dict) else None
    if not isinstance(servers, dict):
        return None

    out: dict[str, dict] = {}
    for name, server in servers.items():
        if not isinstance(server, dict):
            continue
        if server.get("type") == "streamable-http" and isinstance(server.get("url"), str):
            entry = {"type": "http", "url": server["url"]}
            if isinstance(server.get("headers"), dict):
                entry["headers"] = dict(server["headers"])
            out[str(name)] = entry
        elif server.get("type") == "stdio" and isinstance(server.get("command"), str):
            command = server["command"]
            # A ./ command is relative to the plugin in the specification, and
            # to wherever the client was started in Claude Code.
            if command.startswith("./"):
                command = "${CLAUDE_PLUGIN_ROOT}/" + command[2:]
            entry = {"type": "stdio", "command": command}
            if isinstance(server.get("args"), list):
                entry["args"] = [_claude_value(str(a)) for a in server["args"]]
            if isinstance(server.get("env"), dict):
                entry["env"] = {str(k): _claude_value(str(v))
                                for k, v in server["env"].items()}
            if isinstance(server.get("cwd"), str):
                cwd = server["cwd"]
                if cwd.startswith("./"):
                    cwd = "${CLAUDE_PLUGIN_ROOT}/" + cwd[2:]
                entry["cwd"] = _claude_value(cwd)
            out[str(name)] = entry
    return {"mcpServers": out}


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
    for plugin_dir in plugin_dirs(root):
        out[plugin_dir / ".claude-plugin" / "plugin.json"] = render(
            claude_plugin_for_plugin(plugin_dir))
        mcp = claude_mcp(plugin_dir)
        if mcp is not None:
            out[plugin_dir / ".mcp.json"] = render(mcp)
    return out


def foreign_generated_files(root: Path = ROOT) -> list[Path]:
    """Generated files inside skills/ or plugins/ that exist and are not the
    generator's.

    The root marketplaces may be stale on a pull request; that is a warning,
    and the post-merge job repairs them (#188). A generated file inside a
    skill directory is different: `.claude-plugin/plugin.json` can carry inline
    `hooks` and `mcpServers`, and it is allowed in a listing only because the
    registry writes it (#186). So inside skills/ the rule is absent, or exactly
    what the generator writes — and it blocks (#193). Absent is fine: the
    post-merge job will write it.
    """
    trees = (root / "skills", root / "plugins")
    owned = generated(root)
    foreign = {
        path for path, content in owned.items()
        if any(tree in path.parents for tree in trees) and path.is_file()
        and path.read_text(encoding="utf-8") != content
    }
    # A plugin with no mcp.json gets no generated .mcp.json, so a hand-written
    # one is not in `owned` to compare against — and Claude Code would launch
    # it all the same. Present and unowned is foreign too.
    for plugin_dir in plugin_dirs(root):
        for rel in PLUGIN_GENERATED:
            path = plugin_dir / rel
            if path.is_file() and path not in owned:
                foreign.add(path)
    return sorted(foreign)


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
    parser.add_argument("--check-in-skills", action="store_true",
                        help="exit non-zero if a generated file inside skills/ "
                             "or plugins/ "
                             "exists and is not what the generator writes; "
                             "absent files and stale root marketplaces pass")
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

    if args.check_in_skills:
        try:
            foreign = foreign_generated_files(ROOT)
        except DuplicatePluginName as exc:
            print(f"error {exc}", file=sys.stderr)
            return 1
        if not foreign:
            print("ok    every generated file inside skills/ and plugins/ is the generator's, or absent")
            return 0
        for path in foreign:
            print(f"FAIL  {path.relative_to(ROOT)}", file=sys.stderr)
        print("      This file is written by the registry, never by hand. Delete it;\n"
              "      the registry regenerates it after merge.", file=sys.stderr)
        return 1

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
