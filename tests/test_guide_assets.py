"""Every picture the docs link on the guide-assets branch is there (#341).

The screenshots live on their own branch so a re-capture does not bloat main's
history, which also means nothing on main notices when one is renamed or never
pushed: the doc links a 404 and reads as if it had a picture. This lists the
branch and checks every guide-assets link in the Markdown docs against it.

CI checks out with fetch-depth 0, which brings every branch as origin/*. A
clone without it fails here with the command that fixes it, rather than
passing because it could not look.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRANCH = "origin/guide-assets"
LINK = re.compile(
    r"https://raw\.githubusercontent\.com/AI-Lab-for-Cities-at-Harvard/"
    r"civic-skill-exchange/guide-assets/([^)\s\"']+)"
)


def _docs() -> list[Path]:
    return [ROOT / "README.md", ROOT / "CONTRIBUTING.md", *sorted((ROOT / "docs").rglob("*.md"))]


def _links() -> list[tuple[str, str]]:
    found = []
    for doc in _docs():
        if doc.exists():
            rel = doc.relative_to(ROOT).as_posix()
            found += [(rel, m) for m in LINK.findall(doc.read_text(encoding="utf-8"))]
    return found


def _on_branch() -> set[str]:
    result = subprocess.run(
        ["git", "ls-tree", "-r", "--name-only", BRANCH],
        cwd=ROOT, capture_output=True, text=True,
    )
    assert result.returncode == 0, (
        f"{BRANCH} is not in this clone, so the pictures cannot be checked. "
        "Run: git fetch origin guide-assets:refs/remotes/origin/guide-assets"
    )
    return set(result.stdout.split())


def test_the_docs_link_pictures_on_guide_assets() -> None:
    # Held to a floor so a change to the link format cannot pass this by
    # matching nothing.
    assert len(_links()) >= 7


def test_every_picture_the_docs_link_is_on_guide_assets() -> None:
    present = _on_branch()
    missing = [f"{doc}: {path}" for doc, path in _links() if path not in present]
    assert not missing, "linked but not on guide-assets:\n" + "\n".join(missing)
