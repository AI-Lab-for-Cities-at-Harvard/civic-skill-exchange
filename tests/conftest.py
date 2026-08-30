"""Shared fixtures for the Python suite, which now covers scan.py and
build_index.py only. Frontmatter validation moved to validator/ — see
docs/DEVELOPMENT.md for why the split runs the way it does.

Every test builds a throwaway skill on disk rather than reaching into skills/ —
a test that depends on a real listing breaks the moment someone edits it.
"""

from __future__ import annotations

import sys
import textwrap
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

VALID_FRONTMATTER = {
    "name": "example-skill",
    "description": (
        "An example skill used in the test suite, long enough to clear the "
        "minimum description length the schema requires."
    ),
    "license": "MIT",
    "allowed-tools": "Read, Grep",
    "metadata": {
        "civic.category": "budget-finance",
        "civic.jurisdiction": "generic",
        "civic.data-sensitivity": "none",
        "civic.human-review": "none",
        "civic.maintainer": "Test Suite",
        "civic.contact": "test@example.com",
        "civic.affiliation": "individual",
        "civic.deployment": "none",
    },
}


def render_frontmatter(front: dict) -> str:
    """Hand-rolled so a test can write frontmatter the YAML dumper would refuse."""
    lines = ["---"]
    for key, value in front.items():
        if isinstance(value, dict):
            lines.append(f"{key}:")
            for subkey, subvalue in value.items():
                lines.append(f'  {subkey}: "{subvalue}"')
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    return "\n".join(lines)


@pytest.fixture
def make_skill(tmp_path):
    """Build a skill directory. Returns its path.

    make_skill()                                  a valid skill
    make_skill(name="other")                      a different directory name
    make_skill(front={...})                       replace the frontmatter entirely
    make_skill(body="...")                        replace the body
    make_skill(raw="---\\nbroken")                 write SKILL.md verbatim
    make_skill(files={"scripts/x.py": "..."})     add extra files
    """

    def _make(
        name: str = "example-skill",
        namespace: str = "testuser",
        front: dict | None = None,
        body: str = "# Example\n\nA body, so the skill is not empty.\n",
        raw: str | None = None,
        files: dict[str, str] | None = None,
        overrides: dict | None = None,
    ) -> Path:
        skill_dir = tmp_path / "skills" / namespace / name
        skill_dir.mkdir(parents=True, exist_ok=True)

        if raw is not None:
            (skill_dir / "SKILL.md").write_text(raw, encoding="utf-8")
        else:
            data = dict(front if front is not None else VALID_FRONTMATTER)
            data.setdefault("name", name)
            if front is None:
                data["name"] = name
            if overrides:
                for key, value in overrides.items():
                    if value is None:
                        data.pop(key, None)
                    else:
                        data[key] = value
            (skill_dir / "SKILL.md").write_text(
                render_frontmatter(data) + "\n\n" + textwrap.dedent(body),
                encoding="utf-8",
            )

        for rel, content in (files or {}).items():
            path = skill_dir / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")

        return skill_dir

    return _make

