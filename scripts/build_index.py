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
import subprocess
import sys
import zipfile
from datetime import date, datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "skills"

FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*(?:\n|\Z)", re.DOTALL)

REPO_URL = "https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange"




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


def load_attestations() -> dict[str, dict]:
    doc = yaml.safe_load((ROOT / "registry" / "reviewed.yml").read_text(encoding="utf-8")) or {}
    return {a["skill"]: a for a in (doc.get("attestations") or [])}


def load_categories() -> list[dict]:
    doc = yaml.safe_load((ROOT / "registry" / "categories.yml").read_text(encoding="utf-8"))
    return doc.get("categories", [])


def read_frontmatter(skill_md: Path) -> dict | None:
    m = FRONTMATTER_RE.match(skill_md.read_text(encoding="utf-8"))
    if not m:
        return None
    front = yaml.safe_load(m.group(1))
    return front if isinstance(front, dict) else None


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


def normalize_tools(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value]
    return [part.strip() for part in str(value).split(",") if part.strip()]


def resolve_tier(skill_id: str, sha: str | None, attestation: dict | None) -> dict:
    """Derive tier, and say plainly why — the reason is published in the index."""
    if not attestation:
        return {"tier": "community", "reason": "no review attestation"}

    expires = attestation.get("expires")
    if isinstance(expires, str):
        expires = date.fromisoformat(expires)
    if expires and expires < date.today():
        return {"tier": "community", "reason": f"attestation expired {expires.isoformat()}"}

    # Fail closed. If we cannot resolve the skill's current commit we cannot confirm
    # the attestation still applies, and an unverifiable Reviewed badge is worse
    # than no badge — people act on it.
    if sha is None:
        return {
            "tier": "community",
            "reason": "cannot resolve the skill's current commit, so the attestation "
                      "cannot be verified",
        }

    if attestation.get("sha") != sha:
        return {
            "tier": "community",
            "reason": "content changed since review — attestation covers "
                      f"{str(attestation.get('sha'))[:12]}, current is {sha[:12]}",
            "drift": True,
        }

    return {
        "tier": "reviewed",
        "reason": "attestation matches current content",
        "reviewed": {
            "date": str(attestation.get("reviewed")),
            "expires": str(attestation.get("expires")),
            "reviewers": attestation.get("reviewers", []),
            "notes": attestation.get("notes", ""),
        },
    }


def build_entry(skill_dir: Path, attestations: dict, scans: dict) -> dict | None:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.is_file():
        return None
    front = read_frontmatter(skill_md)
    if not front:
        return None

    namespace = skill_dir.parent.name
    name = skill_dir.name
    skill_id = f"{namespace}/{name}"
    meta = front.get("metadata") or {}
    sha = head_sha(skill_dir)

    entry = {
        "id": skill_id,
        "name": name,
        "namespace": namespace,
        "description": front.get("description", "").strip(),
        "license": front.get("license"),
        "compatibility": front.get("compatibility"),
        "allowed_tools": normalize_tools(front.get("allowed-tools")),
        "category": meta.get("civic.category"),
        "jurisdiction": meta.get("civic.jurisdiction"),
        "localization": meta.get("civic.localization"),
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
        "has_scripts": (skill_dir / "scripts").is_dir(),
        "script_files": sorted(
            str(p.relative_to(skill_dir))
            for p in (skill_dir / "scripts").rglob("*")
            if p.is_file()
        ) if (skill_dir / "scripts").is_dir() else [],
        "path": f"skills/{namespace}/{name}",
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

    # civic.contact is deliberately omitted from the public index. It exists so a
    # maintainer can be reached about a security report, not to be harvested.
    return entry


def build_detail(skill_dir: Path, entry: dict) -> dict:
    """The per-skill payload the landing page reads.

    Structure only — the file tree with sizes, and which files the agent
    executes rather than reads. Deliberately NOT the skill body or any file
    contents: rendering submitter-authored markdown on our origin is a stored
    XSS surface, and the page does not need it to describe a skill. Anyone
    reading the actual code should read it on GitHub, where they get the real
    thing rather than our rendering of it.
    """
    files = []
    for path in sorted(skill_dir.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        rel = path.relative_to(skill_dir).as_posix()
        files.append({
            "path": rel,
            "size": path.stat().st_size,
            # Anything under scripts/ is run, not read. The page says so.
            "executed": rel.startswith("scripts/"),
        })

    return {**entry, "files": files}


# A fixed timestamp for every archive entry. A zip that embeds wall-clock time
# changes on every build even when the skill has not, which churns the Pages
# artifact and makes the bytes a person downloads unstable for no reason.
ZIP_EPOCH = (1980, 1, 1, 0, 0, 0)


def write_archive(skill_dir: Path, entry: dict, files: list[dict], target: Path) -> int:
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
    directory = out / "skills" / entry["namespace"]
    directory.mkdir(parents=True, exist_ok=True)

    detail = build_detail(skill_dir, entry)
    name = entry["name"]
    size = write_archive(skill_dir, entry, detail["files"], directory / f"{name}.zip")
    detail["archive"] = {
        "path": f"data/skills/{entry['namespace']}/{name}.zip",
        "size": size,
    }

    (directory / f"{name}.json").write_text(json.dumps(detail, indent=2) + "\n",
                                            encoding="utf-8")
    return detail


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "site" / "data")
    parser.add_argument("--findings", type=Path, help="findings.json from scan.py")
    args = parser.parse_args()

    attestations = load_attestations()
    categories = load_categories()

    scans: dict = {}
    if args.findings and args.findings.is_file():
        payload = json.loads(args.findings.read_text(encoding="utf-8"))
        scans = dict(payload.get("results", {}))
        scans["_generated"] = payload.get("generated")

    entries = []
    for skill_dir in sorted(p for p in SKILLS_DIR.glob("*/*") if p.is_dir()):
        entry = build_entry(skill_dir, attestations, scans)
        if entry:
            entries.append(entry)
        else:
            print(f"warn  skipped {skill_dir.relative_to(ROOT)}: unreadable frontmatter",
                  file=sys.stderr)

    drifted = [e for e in entries if e.get("drift")]
    reviewed = [e for e in entries if e["tier"] == "reviewed"]

    index = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "repo": REPO_URL,
        "counts": {
            "total": len(entries),
            "reviewed": len(reviewed),
            "community": len(entries) - len(reviewed),
        },
        "disclaimer": (
            "Inclusion in this registry does not constitute endorsement, verification, "
            "or any guarantee regarding a skill's quality, functionality, security, or "
            "fitness for any purpose. Automated checks can only reject; a pass is never "
            "a statement that a skill is safe."
        ),
        "skills": sorted(entries, key=lambda e: e["id"]),
    }

    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
    (out / "categories.json").write_text(json.dumps({"categories": categories}, indent=2) + "\n",
                                         encoding="utf-8")

    for entry in entries:
        write_outputs(SKILLS_DIR / entry["namespace"] / entry["name"], entry, out)

    print(f"Wrote {len(entries)} skills to {out} "
          f"({len(reviewed)} reviewed, {len(entries) - len(reviewed)} community).")

    if drifted:
        print(f"\n{len(drifted)} skill(s) demoted for SHA drift — open an issue for each:")
        for entry in drifted:
            print(f"  {entry['id']}: {entry['reason']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
