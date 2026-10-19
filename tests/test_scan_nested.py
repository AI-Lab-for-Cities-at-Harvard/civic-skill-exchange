"""The scanner reads a nested single skill's own SKILL.md (ADR 0006, #273).

A nested listing keeps everything the author wrote in `skills/{name}/`, so
`{listing}/SKILL.md` no longer exists. The scanner used to look only there and
return None when it found nothing, which quietly turned off the parsed
wildcard-Bash check (#152) and the localization disposition (#89). Both now go
through build_index.skill_dir_of, and a listing whose SKILL.md can't be found is
an error rather than a clean result.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

import scan
from build_index import NoSkillMd
from conftest import VALID_FRONTMATTER

ROOT = Path(__file__).resolve().parent.parent


def nest(listing: Path, inner_name: str | None = None) -> Path:
    """Move everything in a flat listing down into skills/{name}/, and add the
    two manifests the registry generates at the listing root. Returns the
    listing."""
    inner = listing / "skills" / (inner_name or listing.name)
    staging = listing.parent / f".{listing.name}-staging"
    shutil.move(str(listing), str(staging))
    inner.parent.mkdir(parents=True)
    shutil.move(str(staging), str(inner))
    for manifest in (".codex-plugin/plugin.json", ".claude-plugin/plugin.json"):
        path = listing / manifest
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"name": f"testuser-{listing.name}"}), encoding="utf-8")
    return listing


def front(**overrides) -> dict:
    data = {**VALID_FRONTMATTER, "metadata": dict(VALID_FRONTMATTER["metadata"])}
    for key, value in overrides.items():
        if key.startswith("civic."):
            data["metadata"][key] = value
        else:
            data[key] = value
    return data


def urls(result: dict) -> list[dict]:
    return [f for f in result["flags"] if f["signature"] == "external-url"]


# --------------------------------------------------------------------------- #
# allowed-tools, parsed (#152)


def test_a_bare_bash_grant_in_a_nested_skill_blocks(make_skill):
    """A bare `Bash` is only caught by the parsed check, not the raw-text
    signature, so this is the case that went silent."""
    listing = nest(make_skill(front=front(**{"allowed-tools": "Bash"})))
    hits = [f for f in scan.scan_skill(listing)["blocking"]
            if f["signature"] == "wildcard-bash-grant"]
    assert [f["file"] for f in hits] == ["skills/example-skill/SKILL.md"]


def test_a_yaml_list_bash_grant_in_a_nested_skill_blocks(make_skill):
    listing = make_skill()
    skill_md = listing / "SKILL.md"
    skill_md.write_text(skill_md.read_text(encoding="utf-8").replace(
        "allowed-tools: Read, Grep", "allowed-tools:\n  - Read\n  - Bash"), encoding="utf-8")
    nest(listing)
    assert "wildcard-bash-grant" in {f["signature"] for f in scan.scan_skill(listing)["blocking"]}


def test_allowed_tools_of_reads_the_inner_skill_md(make_skill):
    listing = nest(make_skill(front=front(**{"allowed-tools": "Read, Bash(git:*)"})))
    assert scan.allowed_tools_of(listing / "skills" / listing.name) == "Read, Bash(git:*)"


def test_a_clean_nested_skill_blocks_nothing(make_skill):
    listing = nest(make_skill())
    result = scan.scan_skill(listing)
    assert result["blocking"] == []
    assert result["flags"] == []


# --------------------------------------------------------------------------- #
# civic.localization (#89)


def test_a_localized_nested_skill_is_not_flagged_for_its_own_jurisdiction(make_skill):
    listing = nest(make_skill(front=front(**{"civic.localization": "localized"}),
                              body="See https://data.brooklinema.gov for the feed.\n"))
    assert urls(scan.scan_skill(listing)) == []


def test_a_generalized_nested_skill_carrying_a_city_url_is_explained(make_skill):
    listing = nest(make_skill(front=front(**{"civic.localization": "generalized"}),
                              body="See https://data.brooklinema.gov for the feed.\n"))
    found = urls(scan.scan_skill(listing))
    assert len(found) == 1
    assert found[0]["explanation"] == scan.GENERALIZED_URL


# --------------------------------------------------------------------------- #
# Loud, not None


def test_a_listing_with_no_skill_md_is_an_error_not_a_clean_scan(make_skill):
    listing = make_skill()
    (listing / "SKILL.md").unlink()
    with pytest.raises(NoSkillMd):
        scan.scan_skill(listing)


def test_an_inner_directory_under_another_name_is_an_error(make_skill):
    listing = nest(make_skill(), inner_name="something-else")
    with pytest.raises(NoSkillMd):
        scan.scan_skill(listing)


def test_allowed_tools_of_a_directory_with_no_skill_md_raises(tmp_path):
    with pytest.raises(NoSkillMd):
        scan.allowed_tools_of(tmp_path)


def test_localization_of_a_directory_with_no_skill_md_raises(tmp_path):
    with pytest.raises(NoSkillMd):
        scan.localization_of(tmp_path)


def test_malformed_frontmatter_is_still_l0s_finding_not_a_crash(make_skill):
    """Not finding the file is the scanner's error. A file it can't parse is
    L0's, which reports it with a message the author can act on."""
    listing = nest(make_skill(raw="---\nname: [unclosed\n---\n\nBody.\n"))
    scan.scan_skill(listing)  # must not raise


def test_the_command_line_fails_loudly_on_a_listing_with_no_skill_md(make_skill, tmp_path):
    listing = make_skill()
    (listing / "SKILL.md").unlink()
    out = tmp_path / "findings.json"
    run = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "scan.py"), str(listing), "--out", str(out)],
        capture_output=True, text=True, check=False)
    assert run.returncode == 2, run.stdout + run.stderr
    assert "example-skill" in run.stderr
    assert "SKILL.md" in run.stderr
    assert not out.exists()


def test_a_plugin_skill_directory_with_no_skill_md_does_not_crash_the_scan(make_plugin):
    """checkPluginSkills (L0) reports a plugin's skills/{x}/ with no SKILL.md.
    The plugin's other files are still scanned, with the undisposed default."""
    plugin = make_plugin(mcp=None, files={"skills/empty/notes.md": "See https://x.example.org/\n"})
    result = scan.scan_plugin(plugin)
    assert [f["file"] for f in urls(result)] == ["skills/empty/notes.md"]
