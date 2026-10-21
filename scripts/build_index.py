#!/usr/bin/env python3
"""Build the static JSON index that the site and any downstream consumer reads.

Tier is DERIVED here and nowhere else. A skill is Reviewed if and only if
registry/reviewed.yml holds an unexpired attestation whose sha matches the skill
directory's current commit. Everything else is Community.

That single join is what makes an attestation mean something: a reviewer signs off
on one content hash, so any later change silently drops the skill back to Community
without a maintainer having to notice. See docs/TIERS.md.

Usage:
    build_index.py --out site/data [--findings findings.json]
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "skills"

FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*(?:\n|\Z)", re.DOTALL)

#: The MCP server declaration Claude Code reads at a plugin's root, which the
#: registry generates from the author's `mcp.json` (ADR 0005). A single skill
#: has none: a skill with an MCP server is a plugin (ADR 0006, decision 5).
MCP_CONFIG = ".mcp.json"

REPO_URL = "https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange"




#: This repository squash-merges and GitHub writes the merge subject as
#: "Title (#N)", so the pull request that introduced a skill can be read from
#: its first commit. Parsed rather than fetched: an index build that needed the
#: GitHub API would need a token, would rate-limit, and would fail more often
#: than the thing it is describing.
_PULL_REQUEST = re.compile(r"\(#(\d+)\)\s*$")


def _git(args: list[str]) -> str | None:
    """Ask git, or return None. Never raises.

    A shallow clone, a path outside the repository, or a directory git has never
    seen all end here. An index that cannot be built is worse than one that says
    it does not know, so every caller treats None as "unknown" and publishes it.
    """
    try:
        out = subprocess.run(["git", *args], cwd=ROOT, capture_output=True,
                             text=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError, ValueError, OSError):
        return None
    return out.stdout.strip() or None


def history(path: Path) -> dict:
    """When a skill arrived, when it last changed, and how often — from git.

    The declared `version` is the author's claim. This is the fact, and it is
    the more useful half: an adopter could not otherwise tell a skill maintained
    last week from one abandoned in March.

    **Nothing here may reach `tier`.** Thirty commits means churn, not care, and
    a listing touched once may be finished rather than abandoned. The build
    keeps them apart and test_build_index.py asserts it.
    """
    unknown = {"first_seen": None, "last_changed": None, "commits": None,
               "pull_request": None}
    try:
        rel = str(path.relative_to(ROOT))
    except ValueError:
        return unknown

    first = _git(["log", "--reverse", "--diff-filter=A", "--format=%aI%x00%s",
                  "--", rel])
    last = _git(["log", "-1", "--format=%aI", "--", rel])
    count = _git(["rev-list", "--count", "HEAD", "--", rel])
    if first is None and last is None and count is None:
        return unknown

    first_line = first.splitlines()[0] if first else ""
    first_date, _, subject = first_line.partition("\x00")
    match = _PULL_REQUEST.search(subject) if subject else None

    return {
        "first_seen": first_date or None,
        "last_changed": last,
        "commits": int(count) if count and count.isdigit() else None,
        "pull_request": int(match.group(1)) if match else None,
    }


def head_sha(path: Path) -> str | None:
    """The commit that last touched this directory."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%H", "--", str(path.relative_to(ROOT))],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, ValueError):
        # ValueError: the path is outside the repository, so git cannot tell us
        # anything about it. Callers must treat None as "unverifiable".
        return None
    return out.stdout.strip() or None


#: The same conservative BCP 47 shape as civic.language (validator/src/rules.ts
#: LANGUAGE_PATTERN), reimplemented rather than shared: this is Python, that is
#: TypeScript, and the tag itself — not a runtime dependency — is the contract
#: between them.
LANGUAGE_TAG_RE = re.compile(
    r"^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$")


def _validate_languages(entry: dict, path: Path) -> None:
    """The optional `languages:` field on an attestation — the reviewer's
    verified list, same shape as civic.language (ADR 0004 ruling 2).

    Validated at load, alongside the rest of the ledger's shape, so a malformed
    entry fails the build loudly rather than silently publishing a
    verification nobody performed. Omitted entirely is fine — it means the
    reviewer verified nothing beyond content. A string, a non-tag entry, and an
    empty list are the three ways to say "some language" without naming one,
    so all three are rejected.
    """
    if "languages" not in entry:
        return
    languages = entry["languages"]
    skill = entry.get("skill") or entry.get("plugin", "?")
    if not isinstance(languages, list) or not languages:
        raise ValueError(
            f"{path.relative_to(ROOT)}: {skill}'s `languages` must be a "
            f"non-empty list of BCP 47 tags, not {languages!r}.")
    for tag in languages:
        if not isinstance(tag, str) or not LANGUAGE_TAG_RE.match(tag):
            raise ValueError(
                f"{path.relative_to(ROOT)}: {skill}'s `languages` contains "
                f"{tag!r}, which is not a BCP 47 tag.")


MODEL_NAME_MAX = 60


def _validate_models(entry: dict, path: Path) -> None:
    """The optional `models:` field on an attestation (#267): the AI models the
    reviewer ran the listing with. Free text, so only the shape is guarded —
    a non-empty list of names, none blank and none over 60 characters. A bare
    string and an empty list are rejected for the same reason as on
    `languages:`: each says "some model" without naming one."""
    if "models" not in entry:
        return
    models = entry["models"]
    listing = entry.get("skill") or entry.get("plugin", "?")
    if not isinstance(models, list) or not models:
        raise ValueError(
            f"{path.relative_to(ROOT)}: {listing}'s `models` must be a non-empty "
            f"list of model names, not {models!r}.")
    for name in models:
        if not isinstance(name, str) or not name.strip() or len(name) > MODEL_NAME_MAX:
            raise ValueError(
                f"{path.relative_to(ROOT)}: {listing}'s `models` contains {name!r}; "
                f"each is a model's name, 1 to {MODEL_NAME_MAX} characters.")


def load_attestations() -> dict[str, dict]:
    """The review ledger, keyed by skill id.

    Raises rather than returning nothing when the file is malformed. `-> {}` on a
    parse failure would demote every reviewed skill silently, which is the one
    outcome worse than the build stopping: the badge is meant to disappear when
    content changes, not when somebody mistypes this file.

    `attestations:[]` — one missing space — parses as a plain string and used to
    raise `AttributeError: 'str' object has no attribute 'get'`, naming neither
    the file nor the mistake.
    """
    path = ROOT / "registry" / "reviewed.yml"
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(doc, dict):
        raise ValueError(
            f"{path.relative_to(ROOT)} is not a mapping — it parsed as "
            f"{type(doc).__name__}. The usual cause is a missing space after a "
            f"colon: `attestations:[]` is one string, `attestations: []` is an "
            f"empty list.")
    entries = doc.get("attestations") or []
    if not isinstance(entries, list):
        raise ValueError(
            f"{path.relative_to(ROOT)}: `attestations` must be a list, not "
            f"{type(entries).__name__}.")
    out: dict[str, dict] = {}
    for entry in entries:
        _validate_languages(entry, path)
        _validate_models(entry, path)
        # A plugin's attestation names it with `plugin:` rather than `skill:`
        # (ADR 0005), and is keyed apart so neither kind can pick up the
        # other's: an attestation is to one listing, not to a namespace/name.
        if "plugin" in entry:
            out[plugin_key(str(entry["plugin"]))] = entry
        else:
            out[entry["skill"]] = entry
    return out


def plugin_key(plugin_id: str) -> str:
    """Where a plugin's attestation is filed in `load_attestations`."""
    return f"plugin:{plugin_id}"


def load_categories() -> list[dict]:
    doc = yaml.safe_load((ROOT / "registry" / "categories.yml").read_text(encoding="utf-8"))
    return doc.get("categories", [])


class BadCollections(ValueError):
    """registry/collections.yml names something that is not there, or is not
    in the shape the site reads."""


#: A collection's URL is `#/collection/{slug}`.
COLLECTION_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
#: Every field a collection has, and all of them required: a title or a note
#: in one language only would leave the other locale's page half-written.
COLLECTION_TEXT = ("title", "title_es", "note", "note_es")
COLLECTION_FIELDS = ("slug", *COLLECTION_TEXT, "featured", "listings")
LISTING_KINDS = ("skill", "plugin")


def load_collections(path: Path, skills: list[dict], plugins: list[dict]) -> list[dict]:
    """A maintainer's groupings of listings (#209, ADR 0008 decision 7),
    checked against what this build found.

    Raises rather than publishing a collection with a hole in it, the posture
    `load_attestations` takes with a malformed ledger: a listing that is removed
    must take its collections' pull request with it, not leave a gap on the
    page. Members are published as kind and id only, since the index already
    carries every listing. No file at all is no collections, so a throwaway
    tree in a test builds without one.
    """
    if not path.is_file():
        return []
    shown = _shown(path)
    doc = yaml.safe_load(path.read_text(encoding="utf-8"))
    entries = doc.get("collections") if isinstance(doc, dict) else None
    if not isinstance(entries, list):
        raise BadCollections(
            f"{shown} must be a mapping whose `collections` is a list. The usual "
            f"cause is a missing space after a colon: `collections:[]` is one "
            f"string, `collections: []` is an empty list.")

    known = {("skill", s["id"]) for s in skills} | {("plugin", p["id"]) for p in plugins}
    out: list[dict] = []
    slugs: set[str] = set()
    for n, entry in enumerate(entries, start=1):
        if not isinstance(entry, dict):
            raise BadCollections(f"{shown}: collection {n} is not a mapping of fields.")
        slug = entry.get("slug")
        name = f'collection "{slug}"' if isinstance(slug, str) and slug else f"collection {n}"
        missing = [f for f in COLLECTION_FIELDS if f not in entry]
        if missing:
            raise BadCollections(
                f"{shown}: {name} has no " + ", ".join(f"`{f}`" for f in missing) + ".")
        unknown = sorted(set(entry) - set(COLLECTION_FIELDS))
        if unknown:
            raise BadCollections(
                f"{shown}: {name} has " + ", ".join(f"`{f}`" for f in unknown)
                + ", which is not a collection's field. The fields are "
                + ", ".join(f"`{f}`" for f in COLLECTION_FIELDS) + ".")
        if not isinstance(slug, str) or not COLLECTION_SLUG.match(slug):
            raise BadCollections(
                f"{shown}: the slug of {name} is not lowercase letters, digits and "
                f"single hyphens. It is the collection's URL, #/collection/{{slug}}.")
        if slug in slugs:
            raise BadCollections(f'{shown}: the slug "{slug}" is used more than once.')
        slugs.add(slug)
        for field in COLLECTION_TEXT:
            if not isinstance(entry[field], str) or not entry[field].strip():
                raise BadCollections(f"{shown}: {name} has an empty `{field}`.")
        if not isinstance(entry["featured"], bool):
            raise BadCollections(
                f"{shown}: `featured` must be true or false in {name}, "
                f"not {entry['featured']!r}.")

        listings = entry["listings"]
        if not isinstance(listings, list) or not listings:
            raise BadCollections(f"{shown}: {name} has no `listings`.")
        members: list[dict] = []
        for item in listings:
            kind = item.get("kind") if isinstance(item, dict) else None
            lid = item.get("id") if isinstance(item, dict) else None
            if kind not in LISTING_KINDS or not isinstance(lid, str):
                raise BadCollections(
                    f"{shown}: {name} lists {item!r}; a listing is "
                    f"{{kind: skill or plugin, id: namespace/name}}.")
            member = {"kind": kind, "id": lid}
            if (kind, lid) not in known:
                raise BadCollections(
                    f"{shown}: {name} lists {kind} {lid}, which is not in the "
                    f"registry. Remove it from the collection, or check its kind and id.")
            if member in members:
                raise BadCollections(f"{shown}: {name} lists {kind} {lid} twice.")
            members.append(member)

        out.append({
            "slug": slug,
            # A folded `>` note keeps its line breaks' spaces and a trailing
            # newline; what is published is the sentence.
            **{field: " ".join(entry[field].split()) for field in COLLECTION_TEXT},
            "featured": entry["featured"],
            "listings": members,
        })
    return out


def _shown(path: Path) -> str:
    """A path as a message should print it: from the registry's root, which is
    the repository's or a test's throwaway tree."""
    for base in (SKILLS_DIR.parent, ROOT):
        try:
            return str(path.relative_to(base))
        except ValueError:
            continue
    return str(path)


def read_frontmatter(skill_md: Path) -> dict | None:
    m = FRONTMATTER_RE.match(skill_md.read_text(encoding="utf-8"))
    if not m:
        return None
    front = yaml.safe_load(m.group(1))
    return front if isinstance(front, dict) else None


class NoSkillMd(ValueError):
    """A single-skill listing whose own SKILL.md can't be found."""


def nested_skill_md(listing: Path) -> str:
    """Where a single skill's SKILL.md goes, relative to the repository."""
    return f"skills/{listing.parent.name}/{listing.name}/skills/{listing.name}/SKILL.md"


def skill_dir_of(listing: Path) -> Path:
    """The directory holding a single skill's own SKILL.md: `skills/{name}/`
    inside the listing (ADR 0006).

    A SKILL.md at the listing root is the retired flat layout. No client loads
    it, so it is refused with the path it belongs at rather than read. Raises
    rather than returning None, so a reader can't drop the listing without
    saying so.
    """
    inner = listing / "skills" / listing.name
    # The index reads and archives what this returns before L0's symlink rule
    # runs, so a link on the way to SKILL.md must not lead outside the listing.
    for path in (listing / "skills", inner, inner / "SKILL.md", listing / "SKILL.md"):
        if path.is_symlink():
            raise NoSkillMd(f"{path} is a symlink; a skill's own files must be in the listing.")
    if (listing / "SKILL.md").exists():
        raise NoSkillMd(
            f"{listing} has a SKILL.md at its root, where no client loads it. A "
            f"single skill's files go one level down: move them to "
            f"{nested_skill_md(listing).removesuffix('/SKILL.md')}/, so its "
            f"SKILL.md is {nested_skill_md(listing)} (ADR 0006).")
    if not (inner / "SKILL.md").is_file():
        raise NoSkillMd(f"{listing} has no SKILL.md: it goes at {nested_skill_md(listing)}.")
    return inner


class StrayListingFile(ValueError):
    """A listing holds a file that is neither the author's (inside
    skills/{name}/) nor one the registry generates."""


#: What build_marketplace.py writes at a single skill's listing root.
LISTING_GENERATED = {".claude-plugin/plugin.json", ".codex-plugin/plugin.json"}


def checked_skill_dir(listing: Path) -> Path:
    """`skill_dir_of`, plus: the listing may hold nothing else.

    Everything the index and the archive publish is read from the inner
    directory, so a file beside it (a root `.mcp.json`, `hooks/`, `scripts/`)
    would be built into the listing and published with no "executed" signal.
    L0 refuses such files; the build does not rely on that alone.
    """
    skill_dir = skill_dir_of(listing)
    for path in sorted(listing.rglob("*")):
        if path.is_dir() and not path.is_symlink():
            continue
        if path == skill_dir or skill_dir in path.parents:
            continue
        rel = path.relative_to(listing).as_posix()
        if rel not in LISTING_GENERATED:
            raise StrayListingFile(
                f"{listing}: {rel} is in the listing but is neither in "
                f"skills/{listing.name}/ nor a file the registry generates.")
    return skill_dir


def author_files(skill_dir: Path):
    """Every regular file under the author's directory, in order. Symlinks are
    dropped, and a path that resolves outside the directory is an error rather
    than something to publish or zip."""
    base = skill_dir.resolve()
    for path in sorted(skill_dir.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        if not path.resolve().is_relative_to(base):
            raise StrayListingFile(f"{path} resolves outside {skill_dir}.")
        yield path


def build_provenance(meta: dict) -> dict:
    """Self-reported deployment context, published as such.

    Useful for someone deciding whether to adopt a skill. Not a security signal —
    it plays no part in deriving tier.
    """
    return {
        "self_reported": True,
        "affiliation": meta.get("civic.affiliation"),
        "deployment": meta.get("civic.deployment"),
        "deployed_at": meta.get("civic.deployed-at"),
        "deployed_in": meta.get("civic.deployed-in"),
        "deployed_since": meta.get("civic.deployed-since"),
    }


def source_of(meta: dict) -> dict | None:
    """The upstream a copy was taken from, or None when there is not one.

    A commit without a repository is dropped rather than published: it names a
    point in a history nobody can find. rules.ts rejects that combination, so
    reaching here means the skill predates the rule or was written by hand.
    """
    repo = meta.get("civic.source-repo")
    if not repo:
        return None
    commit = meta.get("civic.source-commit")
    return {"repo": repo, "commit": commit} if commit else {"repo": repo, "commit": None}


def languages_tested_of(meta: dict) -> list[str] | None:
    """The author's claim about which languages they tried the skill in.

    `metadata` values are strings per the Agent Skills spec, so the field is one
    comma-separated string; the index publishes it split, because a consumer
    should not have to reimplement the delimiter. validator/src/rules.ts rejects
    a ragged list, so anything reaching here has already been checked.

    None rather than `[]` when the author claimed nothing: "did not answer" and
    "tried it in no language" are different statements, and only one is honest.
    Nothing verifies the claim — the reviewer's verified list is `languages:` on
    the attestation in registry/reviewed.yml. See ADR 0004.
    """
    raw = meta.get("civic.languages-tested")
    if not isinstance(raw, str) or not raw.strip():
        return None
    return [tag.strip() for tag in raw.split(",") if tag.strip()]


def models_tested_of(meta: dict) -> list[str] | None:
    """The author's claim about which AI models they tried the listing with
    (#267), split from its comma-separated string the way the tested languages
    are. None rather than `[]` when the author claimed nothing. Nothing verifies
    it — the reviewer's verified list is `models:` on the attestation."""
    raw = meta.get("civic.models-tested")
    if not isinstance(raw, str) or not raw.strip():
        return None
    return [name.strip() for name in raw.split(",") if name.strip()]


def is_executed(rel: str) -> bool:
    """Does the agent run this file rather than read it?

    `scripts/` is the skill's own code. The detail page and the index derive
    their lists from this one predicate so they cannot come to disagree about
    what a listing does. A server config is not on the list: no client reads
    one inside a skill's own directory, and a skill with an MCP server is a
    plugin (ADR 0006, decision 5).
    """
    parts = rel.split("/")
    # `skills/*/scripts/` is the same rule a plugin applies (below), for a path
    # taken relative to a listing rather than to the skill inside it.
    in_listed_skill = len(parts) > 3 and parts[0] == "skills" and parts[2] == "scripts"
    return rel.startswith("scripts/") or in_listed_skill


def executed_files(skill_dir: Path) -> list[str]:
    """Every file in the skill the agent runs, sorted, relative to its root."""
    return sorted(
        rel for rel in (
            p.relative_to(skill_dir).as_posix() for p in author_files(skill_dir)
        ) if is_executed(rel)
    )


def normalize_tools(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value]
    return [part.strip() for part in str(value).split(",") if part.strip()]


def resolve_tier(skill_id: str, sha: str | None, attestation: dict | None) -> dict:
    """Derive tier, and say plainly why — the reason is published in the index.

    `verified_languages`, and `verified_models` with it (#267), ride along on
    exactly the same condition as
    `tier: reviewed` — a stale, expired, or unresolvable attestation yields
    null, never the languages it once verified. Fabricating a verification
    that no longer holds would be worse than publishing nothing (#146,
    ADR 0004 ruling 2).
    """
    if not attestation:
        return {"tier": "community", "reason": "no review attestation",
                 "verified_languages": None, "verified_models": None}

    expires = attestation.get("expires")
    if isinstance(expires, str):
        expires = date.fromisoformat(expires)
    if expires and expires < date.today():
        return {"tier": "community", "reason": f"attestation expired {expires.isoformat()}",
                 "verified_languages": None, "verified_models": None}

    # Fail closed. If we cannot resolve the skill's current commit we cannot confirm
    # the attestation still applies, and an unverifiable Reviewed badge is worse
    # than no badge — people act on it.
    if sha is None:
        return {
            "tier": "community",
            "reason": "cannot resolve the skill's current commit, so the attestation "
                      "cannot be verified",
            "verified_languages": None,
            "verified_models": None,
        }

    if attestation.get("sha") != sha:
        return {
            "tier": "community",
            "reason": "content changed since review — attestation covers "
                      f"{str(attestation.get('sha'))[:12]}, current is {sha[:12]}",
            "drift": True,
            "verified_languages": None,
            "verified_models": None,
        }

    return {
        "tier": "reviewed",
        "reason": "attestation matches current content",
        "verified_languages": attestation.get("languages"),
        "verified_models": attestation.get("models"),
        "reviewed": {
            "date": str(attestation.get("reviewed")),
            "expires": str(attestation.get("expires")),
            "reviewers": attestation.get("reviewers", []),
            "notes": attestation.get("notes", ""),
        },
    }


def skill_path_of(listing: Path) -> str:
    """Where the author's files are, relative to the repository:
    `skills/{ns}/{name}/skills/{name}`. NoSkillMd when SKILL.md isn't there."""
    skill_dir_of(listing)
    return nested_skill_md(listing).removesuffix("/SKILL.md")


def build_entry(listing: Path, attestations: dict, scans: dict) -> dict | None:
    """One single-skill listing's index entry.

    Raises NoSkillMd when the listing's SKILL.md can't be found. Returning None
    for that would publish an index with one skill fewer and a warning, which is
    how a listing used to drop out unseen; None is only for frontmatter that
    doesn't parse, which L0 fails in CI."""
    skill_dir = checked_skill_dir(listing)
    front = read_frontmatter(skill_dir / "SKILL.md")
    if not front:
        return None

    namespace = listing.parent.name
    name = listing.name
    skill_id = f"{namespace}/{name}"
    meta = front.get("metadata") or {}
    # The listing, not the inner directory: the attestation pins the last
    # commit to touch anything the listing holds, generated manifests included.
    sha = head_sha(listing)
    runs = executed_files(skill_dir)

    entry = {
        "id": skill_id,
        "name": name,
        "namespace": namespace,
        "description": front.get("description", "").strip(),
        "license": front.get("license"),
        "compatibility": front.get("compatibility"),
        "allowed_tools": normalize_tools(front.get("allowed-tools")),
        "category": meta.get("civic.category"),
        # The other axis, when the author named one. Always present, because
        # index.json is a published API and a key that comes and goes makes
        # every consumer defensive. See #102.
        "category_secondary": meta.get("civic.category-secondary"),
        # The author's claim about their own version, published as one. The site
        # renders it as self-reported, the footing `provenance` already sits on.
        # It must never order the catalogue: `version: 4.0` means somebody typed
        # 4.0.
        "version": meta.get("version"),
        # What kind of body, and which place — kept apart since #67. scope is
        # a closed vocabulary and is what the site facets on; jurisdiction is a
        # place and is unbounded, so it is shown and never faceted.
        "scope": meta.get("civic.scope"),
        "scope_secondary": meta.get("civic.scope-secondary"),
        "jurisdiction": meta.get("civic.jurisdiction"),
        "localization": meta.get("civic.localization"),
        # What language the listing is written in, and what its author says
        # they tried it in (#145). The first is a required declaration and is
        # what the catalogue facets on; the second is a claim nothing checks,
        # and the site renders it as one. Both keys are always present.
        "language": meta.get("civic.language"),
        "languages_tested": languages_tested_of(meta),
        # The models the author says they tried it with (#267). A claim, like
        # the line above; the reviewer's list rides on the tier below.
        "models_tested": models_tested_of(meta),
        "data_sensitivity": meta.get("civic.data-sensitivity"),
        "human_review": meta.get("civic.human-review"),
        # Plain text, never rendered as markdown. The detail page stopped
        # publishing the skill body, so these two are the only way it can tell
        # a reader whether a skill fits their situation. Always present, null
        # when the author did not answer — the site reads the keys either way.
        "use_when": meta.get("civic.use-when"),
        "avoid_when": meta.get("civic.avoid-when"),
        "maintainer": meta.get("civic.maintainer"),
        # Where an imported copy came from (#63). An object or null, rather than
        # two keys that are usually null, so the site tests one thing.
        #
        # Published, never resolved. The registry holds the content — that is
        # what the SHA pin, the weekly re-scan and the archive all work against
        # — and a listing stays valid when its upstream is deleted or renamed.
        "source": source_of(meta),
        "sha": sha,
        "history": history(listing),
        # What the agent runs: scripts/. Both keys are derived from one list,
        # so they cannot disagree.
        "has_scripts": bool(runs),
        "script_files": runs,
        "path": f"skills/{namespace}/{name}",
        # Where SKILL.md and the rest of the author's files are: skills/{name}/
        # inside the listing (ADR 0006). `path` stays the listing, which is
        # what the marketplaces install and the attestation pins.
        "skill_path": skill_path_of(listing),
        "download": f"{REPO_URL}/tree/main/skills/{namespace}/{name}",
    }

    entry["provenance"] = build_provenance(meta)
    entry.update(resolve_tier(skill_id, sha, attestations.get(skill_id)))

    scan = scans.get(skill_id)
    entry["scan"] = {
        "last_run": scans.get("_generated"),
        "blocking": len(scan["blocking"]) if scan else None,
        "flags": len(scan["flags"]) if scan else None,
        "signatures": sorted({f["signature"] for f in (scan or {}).get("flags", [])}),
    } if scan else {"last_run": None, "blocking": None, "flags": None, "signatures": []}

    # Nothing here is withheld. civic.contact used to be — it existed so a
    # security report could land, and publishing it in a static JSON file was
    # handing it to scrapers — and #95 removed the field instead: the namespace
    # is a GitHub account, so the route to a maintainer is already public and
    # already unharvestable.
    return entry


def build_detail(listing: Path, entry: dict) -> dict:
    """The per-skill payload the landing page reads.

    Structure only — the file tree with sizes, and which files the agent
    executes rather than reads. Deliberately NOT the skill body or any file
    contents: rendering submitter-authored markdown on our origin is a stored
    XSS surface, and the page does not need it to describe a skill. Anyone
    reading the actual code should read it on GitHub, where they get the real
    thing rather than our rendering of it.

    Files are the author's, relative to `skill_path`. That leaves out the
    manifests the registry generates beside the inner directory, which the
    author did not write and which are not in the archive.
    """
    skill_dir = checked_skill_dir(listing)
    files = []
    for path in author_files(skill_dir):
        rel = path.relative_to(skill_dir).as_posix()
        files.append({
            "path": rel,
            "size": path.stat().st_size,
            # Run, not read — scripts/. The page says so.
            "executed": is_executed(rel),
        })

    return {**entry, "files": files}


# --------------------------------------------------------------------------- #
# Plugins (ADR 0005).
#
# A plugin is published beside the skills rather than among them: `plugins` in
# index.json, never inside `skills`. The skill list is a published API with a
# fixed shape per entry, and a plugin does not have that shape — it has several
# skills, each with its own category and scope, and servers a skill never has.
# Folding it in would change what every consumer of `skills` can assume.
#
# Tier is derived exactly as for a skill: an unexpired attestation, filed under
# `plugin:` in registry/reviewed.yml, whose sha is the plugin directory's
# current commit. Any change to any of its skills demotes the whole plugin,
# which is right — it installs as one thing, so it is reviewed as one thing.

PLUGIN_MANIFEST = "plugin.json"
PLUGIN_MCP_CONFIG = "mcp.json"
#: Where a plugin declares what it says once for all of its skills: who
#: maintains it, where it has been used, when it fits (ADR 0005).
REGISTRY_EXTENSION = "io.github.ai-lab-for-cities-at-harvard"
#: What build_marketplace.py writes into a plugin for Claude Code.
PLUGIN_GENERATED = {".claude-plugin/plugin.json", ".mcp.json"}


def read_plugin_manifest(plugin_dir: Path) -> dict | None:
    try:
        doc = json.loads((plugin_dir / PLUGIN_MANIFEST).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return doc if isinstance(doc, dict) else None


def is_executed_in_plugin(rel: str) -> bool:
    """`is_executed`, for a plugin: each skill's `scripts/`, and the MCP
    configuration — the author's `mcp.json` and the `.mcp.json` Claude Code
    reads, which launch the same servers."""
    parts = rel.split("/")
    in_skill_scripts = len(parts) > 3 and parts[0] == "skills" and parts[2] == "scripts"
    return in_skill_scripts or rel in (PLUGIN_MCP_CONFIG, MCP_CONFIG)


def plugin_servers(plugin_dir: Path) -> list[dict]:
    """Every MCP server the plugin declares: its name, its transport, and where
    it goes — the host for a remote server, the command for a local one. The
    catalogue shows these, because which servers a plugin talks to is the first
    thing an adopter's security team will ask."""
    try:
        doc = json.loads((plugin_dir / PLUGIN_MCP_CONFIG).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    servers = doc.get("mcpServers") if isinstance(doc, dict) else None
    if not isinstance(servers, dict):
        return []
    out = []
    for name, server in sorted(servers.items()):
        if not isinstance(server, dict):
            continue
        url = server.get("url")
        target = (re.sub(r"^[a-z]+://", "", url).split("/")[0] if isinstance(url, str)
                  else str(server.get("command") or ""))
        out.append({"name": str(name), "type": str(server.get("type") or ""),
                    "target": target})
    return out


def plugin_skill_summary(skill_dir: Path) -> dict | None:
    """One skill inside a plugin: what the catalogue needs to describe it, from
    the same frontmatter fields a listed skill publishes."""
    front = read_frontmatter(skill_dir / "SKILL.md") if (skill_dir / "SKILL.md").is_file() else None
    if not front:
        return None
    meta = front.get("metadata") or {}
    return {
        "name": skill_dir.name,
        "description": str(front.get("description") or "").strip(),
        "allowed_tools": normalize_tools(front.get("allowed-tools")),
        "category": meta.get("civic.category"),
        "category_secondary": meta.get("civic.category-secondary"),
        "scope": meta.get("civic.scope"),
        "jurisdiction": meta.get("civic.jurisdiction"),
        "localization": meta.get("civic.localization"),
        "language": meta.get("civic.language"),
        "data_sensitivity": meta.get("civic.data-sensitivity"),
        "human_review": meta.get("civic.human-review"),
        "use_when": meta.get("civic.use-when"),
        "avoid_when": meta.get("civic.avoid-when"),
    }


#: Ordered most to least sensitive, so a plugin reports the most sensitive
#: thing any one of its skills handles — an adopter needs the ceiling.
_SENSITIVITY_ORDER = ["protected", "pii", "none"]


def build_plugin_entry(plugin_dir: Path, attestations: dict, scans: dict) -> dict | None:
    manifest = read_plugin_manifest(plugin_dir)
    if manifest is None:
        return None
    skills = [s for s in (plugin_skill_summary(d) for d in
                          sorted(p for p in (plugin_dir / "skills").glob("*") if p.is_dir()))
              if s]
    if not skills:
        return None

    namespace, name = plugin_dir.parent.name, plugin_dir.name
    plugin_id = f"{namespace}/{name}"
    sha = head_sha(plugin_dir)
    runs = sorted(
        rel for rel in (p.relative_to(plugin_dir).as_posix()
                        for p in plugin_dir.rglob("*") if p.is_file() and not p.is_symlink())
        if is_executed_in_plugin(rel))
    categories = sorted({c for s in skills for c in (s["category"], s["category_secondary"]) if c})
    sensitivities = {s["data_sensitivity"] for s in skills}
    author = manifest.get("author") if isinstance(manifest.get("author"), dict) else {}
    extensions = manifest.get("extensions") if isinstance(manifest.get("extensions"), dict) else {}
    civic = extensions.get(REGISTRY_EXTENSION)
    civic = civic if isinstance(civic, dict) else {}

    entry = {
        "kind": "plugin",
        "id": plugin_id,
        "name": name,
        "namespace": namespace,
        "description": str(manifest.get("description") or "").strip(),
        "license": manifest.get("license"),
        "version": manifest.get("version"),
        "maintainer": civic.get("civic.maintainer") or author.get("name"),
        "keywords": manifest.get("keywords") or [],
        # The plugin's own, declared once in plugin.json — never a skill's.
        "use_when": civic.get("civic.use-when"),
        "avoid_when": civic.get("civic.avoid-when"),
        "models_tested": models_tested_of(civic),
        "provenance": build_provenance(civic),
        "categories": categories,
        "languages": sorted({s["language"] for s in skills if s["language"]}),
        "data_sensitivity": next((level for level in _SENSITIVITY_ORDER
                                  if level in sensitivities), None),
        "skills": skills,
        "mcp_servers": plugin_servers(plugin_dir),
        "sha": sha,
        "history": history(plugin_dir),
        "has_scripts": bool(runs),
        "script_files": runs,
        "path": f"plugins/{namespace}/{name}",
        "download": f"{REPO_URL}/tree/main/plugins/{namespace}/{name}",
    }
    entry.update(resolve_tier(plugin_id, sha, attestations.get(plugin_key(plugin_id))))

    scan = scans.get(plugin_id)
    entry["scan"] = {
        "last_run": scans.get("_generated"),
        "blocking": len(scan["blocking"]),
        "flags": len(scan["flags"]),
        "signatures": sorted({f["signature"] for f in scan.get("flags", [])}),
    } if scan else {"last_run": None, "blocking": None, "flags": None, "signatures": []}
    return entry


def build_plugin_detail(plugin_dir: Path, entry: dict) -> dict:
    """`build_detail`, for a plugin: structure only, never contents. The files
    the registry generates are left out — they are derived, and listing them
    would describe the plugin as something its author did not write."""
    files = []
    for path in sorted(plugin_dir.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        rel = path.relative_to(plugin_dir).as_posix()
        if rel in PLUGIN_GENERATED:
            continue
        files.append({"path": rel, "size": path.stat().st_size,
                      "executed": is_executed_in_plugin(rel)})
    return {**entry, "files": files}


# A fixed timestamp for every archive entry. A zip that embeds wall-clock time
# changes on every build even when the skill has not, which churns the Pages
# artifact and makes the bytes a person downloads unstable for no reason.
ZIP_EPOCH = (1980, 1, 1, 0, 0, 0)


def write_archive(skill_dir: Path, entry: dict, files: list[dict], target: Path) -> int:
    # `skill_dir` is the directory the file paths are relative to: the author's
    # own, which for a single skill is skills/{name}/ rather than the listing.
    """Write the downloadable archive and return its size in bytes.

    This exists for the person with a browser and nothing else — no git, no
    Node, no GitHub account. They download one file and upload it to an agent
    tool that expects an archive.

    Entries are rooted at the skill directory, because that is what zipping a
    folder produces by hand and what unpacks cleanly on the other end.

    The file list is the one build_detail already computed, so the archive and
    the page describing it cannot disagree — including about symlinks, which
    that traversal already drops.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for item in files:
            info = zipfile.ZipInfo(f"{entry['name']}/{item['path']}", date_time=ZIP_EPOCH)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, (skill_dir / item["path"]).read_bytes())
    return target.stat().st_size


def write_outputs(skill_dir: Path, entry: dict, out: Path) -> dict:
    """Write one skill's detail payload and its archive. Returns the detail.

    The archive is written first because the payload states its size, and a page
    that tells someone how large a download is before they start it is worth the
    ordering constraint.
    """
    # "skills" or "plugins", from the listing's own path, so the two kinds of
    # listing cannot overwrite each other's payloads.
    tree = entry["path"].split("/")[0]
    directory = out / tree / entry["namespace"]
    directory.mkdir(parents=True, exist_ok=True)

    is_plugin = entry.get("kind") == "plugin"
    detail = (build_plugin_detail(skill_dir, entry) if is_plugin
              else build_detail(skill_dir, entry))
    name = entry["name"]
    # Rooted at the author's directory, so a single skill unzips to
    # {name}/SKILL.md, the plain skill folder every upload path expects.
    archive_root = skill_dir if is_plugin else checked_skill_dir(skill_dir)
    size = write_archive(archive_root, entry, detail["files"], directory / f"{name}.zip")
    detail["archive"] = {
        "path": f"data/{tree}/{entry['namespace']}/{name}.zip",
        "size": size,
    }

    (directory / f"{name}.json").write_text(json.dumps(detail, indent=2) + "\n",
                                            encoding="utf-8")
    return detail


def write_drift_report(drifted: list[dict], drift_out: Path) -> None:
    """The machine-readable half of SHA-drift demotion.

    `main_with`'s print-to-stdout list is for a human reading the build log.
    Nothing could act on it: `rescan.yml` opens an issue only when the validate
    or scan step fails, so a demotion that leaves the build green — which is
    the whole point, "the index must still build when drift is present" — was
    never reported (#156). This is the other consumer: a small, typed document
    a workflow step can read without parsing prose.

    Written unconditionally when `drift_out` is given, empty list included, so
    a caller never has to tell "no drift" apart from "the file did not exist".
    """
    drift_out.parent.mkdir(parents=True, exist_ok=True)
    drift_out.write_text(
        json.dumps(
            [{"id": e["id"], "reason": e["reason"]} for e in drifted], indent=2
        ) + "\n",
        encoding="utf-8",
    )


def main_with(out: Path, findings: Path | None = None, drift_out: Path | None = None) -> int:
    attestations = load_attestations()
    categories = load_categories()

    scans: dict = {}
    if findings and findings.is_file():
        payload = json.loads(findings.read_text(encoding="utf-8"))
        scans = dict(payload.get("results", {}))
        scans["_generated"] = payload.get("generated")

    entries = []
    for skill_dir in sorted(p for p in SKILLS_DIR.glob("*/*") if p.is_dir()):
        # NoSkillMd is not caught: a listing with no SKILL.md fails the build.
        entry = build_entry(skill_dir, attestations, scans)
        if entry:
            entries.append(entry)
        else:
            print(f"warn  skipped {skill_dir.relative_to(ROOT)}: unreadable frontmatter",
                  file=sys.stderr)

    # Beside whichever skills/ is being read, rather than a second constant: a
    # test that points SKILLS_DIR at a throwaway tree must not pick up the
    # repository's real plugins (test_no_listing_coupling.py).
    plugins_dir = SKILLS_DIR.parent / "plugins"
    plugins = []
    for plugin_dir in sorted(p for p in plugins_dir.glob("*/*") if p.is_dir()):
        entry = build_plugin_entry(plugin_dir, attestations, scans)
        if entry:
            plugins.append(entry)
        else:
            print(f"warn  skipped {plugin_dir.relative_to(ROOT)}: unreadable plugin.json "
                  "or no readable skill", file=sys.stderr)

    # Beside the tree too, for the same reason; and before anything is written,
    # so a stale member stops the build rather than leaving a half-built out/.
    collections = load_collections(SKILLS_DIR.parent / "registry" / "collections.yml",
                                   entries, plugins)

    drifted = [e for e in [*entries, *plugins] if e.get("drift")]
    reviewed = [e for e in entries if e["tier"] == "reviewed"]

    index = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "repo": REPO_URL,
        "counts": {
            "total": len(entries),
            "reviewed": len(reviewed),
            "community": len(entries) - len(reviewed),
            # Plugins are counted apart: `total` has always meant skills, and a
            # consumer that sums it should not start counting something else.
            "plugins": len(plugins),
        },
        "disclaimer": (
            "Inclusion in this registry does not constitute endorsement, verification, "
            "or any guarantee regarding a skill's quality, functionality, security, or "
            "fitness for any purpose. Automated checks can only reject; a pass is never "
            "a statement that a skill is safe."
        ),
        "skills": sorted(entries, key=lambda e: e["id"]),
        "plugins": sorted(plugins, key=lambda e: e["id"]),
        # In the file's order, which is the order the browse page shows them.
        "collections": collections,
    }

    out.mkdir(parents=True, exist_ok=True)
    (out / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
    (out / "categories.json").write_text(json.dumps({"categories": categories}, indent=2) + "\n",
                                         encoding="utf-8")

    # The frontmatter contract, published so a program can read it. Copied byte
    # for byte rather than rebuilt: a transformed copy would be a second source
    # of truth, and the point of publishing it is that there is only one.
    shutil.copyfile(ROOT / "schema" / "skill.schema.json", out / "skill.schema.json")

    for entry in entries:
        write_outputs(SKILLS_DIR / entry["namespace"] / entry["name"], entry, out)
    for entry in plugins:
        write_outputs(plugins_dir / entry["namespace"] / entry["name"], entry, out)

    print(f"Wrote {len(entries)} skills to {out} "
          f"({len(reviewed)} reviewed, {len(entries) - len(reviewed)} community)"
          f" and {len(plugins)} plugin{'' if len(plugins) == 1 else 's'}.")

    if drifted:
        print(f"\n{len(drifted)} skill(s) demoted for SHA drift — open an issue for each:")
        for entry in drifted:
            print(f"  {entry['id']}: {entry['reason']}")

    if drift_out:
        write_drift_report(drifted, drift_out)

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "site" / "data")
    parser.add_argument("--findings", type=Path, help="findings.json from scan.py")
    parser.add_argument(
        "--drift-out", type=Path,
        help="Write demoted skills (SHA drift) as JSON to this path. The index "
             "still builds when drift is present — this is a report, not a "
             "build failure.",
    )
    args = parser.parse_args()
    try:
        return main_with(args.out, args.findings, args.drift_out)
    except (NoSkillMd, StrayListingFile, BadCollections) as missing:
        print(f"error {missing}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
