"""Shared fixtures for the Python suite, which now covers scan.py and
build_index.py only. Frontmatter validation moved to validator/ — see
docs/DEVELOPMENT.md for why the split runs the way it does.

Every test builds a throwaway skill on disk rather than reaching into skills/ —
a test that depends on a real listing breaks the moment someone edits it, and
twice it broke `main` on a deletion instead. That is no longer a convention:
test_no_listing_coupling.py enforces it, across the TypeScript suites too. See
"Testing conventions" in docs/DEVELOPMENT.md.
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
        "civic.category": "finance",
        "civic.scope": "any",
        "civic.data-sensitivity": "none",
        "civic.human-review": "none",
        "civic.maintainer": "Test Suite",
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



PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"
REGISTRY_EXTENSION = "io.github.ai-lab-for-cities-at-harvard"
#: What a plugin declares once, in plugin.json (ADR 0005); its skills do not.
PLUGIN_LEVEL = ("civic.maintainer", "civic.affiliation", "civic.deployment")
MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json"


@pytest.fixture
def make_plugin(tmp_path):
    """Build a plugin directory in the Agent Plugins layout (ADR 0005).
    Returns its path.

    make_plugin()                                 two skills, one remote server
    make_plugin(skills=["a"])                     choose the skills
    make_plugin(manifest={...})                   merged over the default manifest
    make_plugin(mcp=None)                         no mcp.json at all
    make_plugin(mcp={"s": {...}})                 replace the servers
    make_plugin(files={"skills/a/scripts/x.py": "..."})
    """
    import json

    def _make(
        name: str = "housing-dashboards",
        namespace: str = "testuser",
        skills: list[str] | None = None,
        manifest: dict | None = None,
        mcp: dict | None | str = "default",
        files: dict[str, str] | None = None,
        category: str = "finance",
    ) -> Path:
        plugin_dir = tmp_path / "plugins" / namespace / name
        plugin_dir.mkdir(parents=True, exist_ok=True)

        data = {
            "$schema": PLUGIN_SCHEMA,
            "name": f"{namespace}-{name}",
            "description": "Housing dashboards and briefs for any U.S. city or county.",
            "author": {"name": "Test Suite"},
            "license": "MIT",
            "extensions": {REGISTRY_EXTENSION: {
                "civic.maintainer": "Plugin Maintainer",
                "civic.affiliation": "government",
                "civic.deployment": "organization",
                "civic.deployed-at": "City of Example",
                "civic.use-when": "A city wants its housing picture in one place.",
            }},
            **(manifest or {}),
        }
        (plugin_dir / "plugin.json").write_text(json.dumps(data, indent=2), encoding="utf-8")

        if mcp == "default":
            mcp = {"census": {"type": "streamable-http",
                              "url": "https://census.example.org/mcp"}}
        if mcp is not None:
            (plugin_dir / "mcp.json").write_text(
                json.dumps({"$schema": MCP_SCHEMA, "mcpServers": mcp}, indent=2),
                encoding="utf-8")

        for skill in skills if skills is not None else ["build-dashboard", "write-brief"]:
            meta = {k: v for k, v in VALID_FRONTMATTER["metadata"].items()
                    if k not in PLUGIN_LEVEL}
            front = {**VALID_FRONTMATTER, "name": skill,
                     "metadata": {**meta, "civic.category": category}}
            path = plugin_dir / "skills" / skill / "SKILL.md"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(render_frontmatter(front) + "\n\n# Skill\n\nBody.\n",
                            encoding="utf-8")

        for rel, content in (files or {}).items():
            path = plugin_dir / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")

        return plugin_dir

    return _make
