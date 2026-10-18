"""Issue and pull request templates, and the labels they declare.

The `review-request` label did not exist in the repository, so every issue
opened through that form came out unlabelled — GitHub silently drops a label a
form declares but the repository does not define. `submission` was missing too.
Silently: the form works, the issue opens, and the label is simply absent (#119).

So the labels a template may use are declared in `.github/labels.yml`, and these
hold the templates to it. Creating them on the repository is still manual; what
this catches is a template naming one that was never agreed.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = sorted(ROOT.glob(".github/ISSUE_TEMPLATE/*.yml"))


def declared_labels() -> set[str]:
    doc = yaml.safe_load((ROOT / ".github" / "labels.yml").read_text(encoding="utf-8"))
    return {entry["name"] for entry in doc["labels"]}


def test_there_are_templates_to_check():
    assert len(TEMPLATES) >= 2, [p.name for p in TEMPLATES]


@pytest.mark.parametrize("path", TEMPLATES, ids=lambda p: p.name)
def test_every_label_a_template_declares_exists(path: Path):
    form = yaml.safe_load(path.read_text(encoding="utf-8"))
    used = set(form.get("labels") or [])
    missing = used - declared_labels()
    assert not missing, (
        f"{path.name} declares {sorted(missing)}, which .github/labels.yml does "
        f"not. GitHub drops a label the repository has not defined, so the issue "
        f"would open with no label and nothing would say so.")


def test_every_declared_label_says_what_it_is_for():
    doc = yaml.safe_load((ROOT / ".github" / "labels.yml").read_text(encoding="utf-8"))
    for entry in doc["labels"]:
        assert entry.get("description"), f"{entry['name']} has no description"


def test_the_attestation_template_exists_and_points_at_the_write_up():
    """A reviewer's nine answers go in the issue and `notes` stays short
    (docs/TIERS.md step 4). The pull request template is where that is said at
    the moment it matters."""
    template = ROOT / ".github" / "PULL_REQUEST_TEMPLATE" / "attestation.md"
    text = template.read_text(encoding="utf-8")
    assert "review-request" in text or "review request" in text.lower()
    assert "notes" in text.lower()


# Ruling 3 on #211: a plugin is reviewed and attested too (ADR 0005, decision
# 5), so the request names which kind of listing it is about.


def _review_request() -> dict:
    return yaml.safe_load(
        (ROOT / ".github" / "ISSUE_TEMPLATE" / "review-request.yml").read_text(encoding="utf-8"))


def test_a_review_request_says_whether_it_is_a_skill_or_a_plugin():
    fields = {f.get("id"): f for f in _review_request()["body"]}
    kind = fields.get("kind")
    assert kind and kind["type"] == "dropdown", "no skill-or-plugin choice"
    assert kind["attributes"]["options"] == ["Skill", "Plugin"]
    assert kind.get("validations", {}).get("required") is True


def test_a_review_request_asks_for_a_listing_id_that_fits_both():
    fields = {f.get("id"): f for f in _review_request()["body"]}
    listing = fields.get("listing")
    assert listing, "the id field is still skill-only"
    assert "plugin" in listing["attributes"]["description"].lower()
