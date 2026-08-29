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
    except (subprocess.CalledProcessError, FileNotFoundError):
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

    if sha and attestation.get("sha") != sha:
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
        "data_sensitivity": meta.get("civic.data-sensitivity"),
        "human_review": meta.get("civic.human-review"),
        "maintainer": meta.get("civic.maintainer"),
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
        path = out / "skills" / entry["namespace"]
        path.mkdir(parents=True, exist_ok=True)
        (path / f"{entry['name']}.json").write_text(json.dumps(entry, indent=2) + "\n",
                                                    encoding="utf-8")

    print(f"Wrote {len(entries)} skills to {out} "
          f"({len(reviewed)} reviewed, {len(entries) - len(reviewed)} community).")

    if drifted:
        print(f"\n{len(drifted)} skill(s) demoted for SHA drift — open an issue for each:")
        for entry in drifted:
            print(f"  {entry['id']}: {entry['reason']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
