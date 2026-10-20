"""A re-pin moves a review's `sha:` without a fresh review (ADR 0006,
decision 7). That is honest only when nothing the reviewer read has changed:
every file the author wrote is the same bytes, at most renamed, between the old
pin and the new one. The registry's generated manifests may change, since no
reviewer reads them and the build rewrites them.

An entry whose `sha:` moves while its `reviewed:` date stays put is a re-pin.
If any author file was modified, added or deleted in between, it is a review
claiming more than was checked. Raised by the security review of #279.
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

import pytest
import yaml

import attestation
import build_index

ROOT = Path(__file__).resolve().parent.parent
LISTING = "skills/cityofx/permit-status-explainer"


def git(cwd: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-c", "user.email=t@e.x", "-c", "user.name=T", *args],
        cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


def commit(cwd: Path, message: str) -> str:
    git(cwd, "add", "-A")
    git(cwd, "commit", "-q", "-m", message)
    return git(cwd, "rev-parse", "HEAD")


@pytest.fixture
def repo(tmp_path):
    """A listing, flat as listings were before the move, committed once."""
    listing = tmp_path / LISTING
    (listing / "references").mkdir(parents=True)
    (listing / "SKILL.md").write_text("---\nname: permit-status-explainer\n---\n\nBody.\n")
    (listing / "references" / "notes.md").write_text("Notes.\n")
    (listing / ".codex-plugin").mkdir()
    (listing / ".codex-plugin" / "plugin.json").write_text('{"skills": "./"}\n')
    git(tmp_path, "init", "-q", "-b", "main")
    return tmp_path, commit(tmp_path, "Add it")


def move(root: Path) -> None:
    listing = root / LISTING
    inner = listing / "skills" / listing.name
    inner.mkdir(parents=True)
    for name in ("SKILL.md", "references"):
        git(root, "mv", f"{LISTING}/{name}", f"{LISTING}/skills/{listing.name}/{name}")


def test_a_pure_move_is_a_valid_re_pin(repo):
    root, old = repo
    move(root)
    new = commit(root, "Move")
    assert attestation.repin_violations(root, LISTING, old, new) == []


def test_a_regenerated_manifest_does_not_count(repo):
    root, old = repo
    move(root)
    commit(root, "Move")
    (root / LISTING / ".codex-plugin" / "plugin.json").write_text("{}\n")
    new = commit(root, "Regenerate")
    assert attestation.repin_violations(root, LISTING, old, new) == []


def test_a_modified_author_file_is_named(repo):
    root, old = repo
    (root / LISTING / "SKILL.md").write_text("---\nname: permit-status-explainer\n---\n\nChanged.\n")
    new = commit(root, "Edit")
    assert attestation.repin_violations(root, LISTING, old, new) == [f"M {LISTING}/SKILL.md"]


def test_a_move_with_an_edit_is_not_a_pure_rename(repo):
    root, old = repo
    move(root)
    inner = root / LISTING / "skills" / "permit-status-explainer"
    (inner / "references" / "notes.md").write_text("Notes, edited.\n")
    new = commit(root, "Move and edit")
    found = attestation.repin_violations(root, LISTING, old, new)
    assert f"D {LISTING}/references/notes.md" in found
    assert f"A {LISTING}/skills/permit-status-explainer/references/notes.md" in found


def test_an_added_or_deleted_author_file_is_named(repo):
    root, old = repo
    (root / LISTING / "references" / "notes.md").unlink()
    (root / LISTING / "scripts").mkdir()
    (root / LISTING / "scripts" / "run.py").write_text("print(1)\n")
    new = commit(root, "Swap")
    assert sorted(attestation.repin_violations(root, LISTING, old, new)) == [
        f"A {LISTING}/scripts/run.py", f"D {LISTING}/references/notes.md"]


def test_a_new_file_beside_the_manifests_is_named(repo):
    """Only the two manifests are exempt, not anything under their directories."""
    root, old = repo
    (root / LISTING / ".codex-plugin" / "hooks.json").write_text("{}\n")
    new = commit(root, "Add")
    assert attestation.repin_violations(root, LISTING, old, new) == [
        f"A {LISTING}/.codex-plugin/hooks.json"]


def test_a_plugin_s_generated_files_do_not_count(tmp_path):
    plugin = "plugins/cityofx/housing"
    (tmp_path / plugin).mkdir(parents=True)
    (tmp_path / plugin / "plugin.json").write_text("{}\n")
    (tmp_path / plugin / ".mcp.json").write_text("{}\n")
    git(tmp_path, "init", "-q", "-b", "main")
    old = commit(tmp_path, "Add")
    (tmp_path / plugin / ".mcp.json").write_text('{"a": 1}\n')
    new = commit(tmp_path, "Regenerate")
    assert attestation.repin_violations(tmp_path, plugin, old, new, plugin=True) == []
    (tmp_path / plugin / "plugin.json").write_text('{"b": 1}\n')
    newer = commit(tmp_path, "Edit the author's manifest")
    assert attestation.repin_violations(tmp_path, plugin, old, newer, plugin=True) == [
        f"M {plugin}/plugin.json"]


# --------------------------------------------------------------------------- #
# The ledger itself, against the branch this change merges into.


def _base_ledger() -> dict[str, dict]:
    base = os.environ.get("GITHUB_BASE_REF") or "main"
    ref = f"origin/{base}"
    merge_base = subprocess.run(["git", "merge-base", ref, "HEAD"], cwd=ROOT,
                                capture_output=True, text=True)
    if merge_base.returncode != 0:
        pytest.skip(f"{ref} isn't available, so there is no base ledger to compare.")
    shown = subprocess.run(
        ["git", "show", f"{merge_base.stdout.strip()}:registry/reviewed.yml"],
        cwd=ROOT, capture_output=True, text=True)
    if shown.returncode != 0:
        return {}
    entries = (yaml.safe_load(shown.stdout) or {}).get("attestations") or []
    return {_key(e): e for e in entries}


def _key(entry: dict) -> str:
    return f"plugins/{entry['plugin']}" if "plugin" in entry else f"skills/{entry['skill']}"


def _repins() -> list[tuple[str, dict, dict]]:
    base = _base_ledger()
    current = (yaml.safe_load((ROOT / "registry" / "reviewed.yml").read_text()) or {}).get(
        "attestations") or []
    return [(_key(e), base[_key(e)], e) for e in current
            if _key(e) in base and str(base[_key(e)]["sha"]) != str(e["sha"])
            and str(base[_key(e)]["reviewed"]) == str(e["reviewed"])]


def test_every_re_pin_moved_nothing_but_file_names():
    for path, old, new in _repins():
        found = attestation.repin_violations(
            ROOT, path, str(old["sha"]), str(new["sha"]), plugin=path.startswith("plugins/"))
        assert not found, (
            f"{path}: sha moved from {str(old['sha'])[:12]} to {str(new['sha'])[:12]} "
            f"with reviewed: unchanged, but these files changed in between: {found}. "
            f"That needs a fresh review (move reviewed: to its date), not a re-pin.")


def test_a_re_pin_keeps_every_other_field():
    """Decision 7: only `sha:` moves. A re-pin that also rewrote the notes, the
    models or the expiry would be a review edited under cover of a rename."""
    for path, old, new in _repins():
        changed = {k for k in set(old) | set(new) if k != "sha" and old.get(k) != new.get(k)}
        assert not changed, f"{path}: a re-pin changed {sorted(changed)} as well as sha."


def test_the_generated_sets_match_the_build():
    assert attestation.LISTING_GENERATED == build_index.LISTING_GENERATED
    assert attestation.PLUGIN_GENERATED == build_index.PLUGIN_GENERATED


@pytest.mark.parametrize("bad", ["--output=/tmp/x", "HEAD", "main", "a" * 39, "A" * 40, ""])
def test_a_pin_that_is_not_a_full_sha_is_refused_before_git_sees_it(repo, bad):
    """The pins come from registry/reviewed.yml, which a pull request can edit,
    so one must never reach git as an option or a ref name."""
    root, old = repo
    with pytest.raises(ValueError, match="40"):
        attestation.repin_violations(root, LISTING, bad, old)
    with pytest.raises(ValueError, match="40"):
        attestation.repin_violations(root, LISTING, old, bad)
