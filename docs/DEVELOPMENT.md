# Working on the registry

Conventions for changing the registry's own tooling — the schema, scripts,
workflows, and site. Contributing a *skill* is a different and much lighter
process; that's [CONTRIBUTING.md](../CONTRIBUTING.md).

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install pyyaml jsonschema pytest
pytest
```

## How we work

**One branch per feature.** Named `feat/`, `fix/`, `chore/`, or `docs/` plus a short
slug — `feat/site-browse`, `fix/sha-drift-fail-closed`. `main` is protected: no
direct pushes, one approving review, CODEOWNER review on the paths that matter.

**Test first.** Write the failing test, watch it fail for the reason you expect,
then make it pass. This is not ceremony here — the first run of this suite caught
two real bugs in code that had already been reviewed and pushed:

- `resolve_tier` returned **Reviewed** when the skill's commit SHA could not be
  resolved. A skill would have worn a review badge nobody could verify.
- `head_sha` raised `ValueError` instead of returning `None` for paths outside the
  repository, taking the whole index build down.

Both are exactly the class of bug that reads fine and fails quietly. Neither would
have been found by reading harder.

**Small commits.** One reviewable idea each. A commit that changes a signature and
refactors the loader is two commits.

**Every behaviour change needs a test.** New signature, new schema field, new tier
rule — a test that fails without the change. If it can't be tested, say why in the
pull request.

## Running things

```bash
pytest                                    # the tooling's own tests
pytest tests/test_scan.py -k wildcard     # one thing
python scripts/validate.py all            # L0 + L1 over every committed skill
python scripts/scan.py all                # L2 + L3 over every committed skill
python scripts/build_index.py --out site/data
```

## Testing conventions

Tests live in `tests/`, one file per script. `conftest.py` supplies `make_skill`,
which builds a throwaway skill in a temp directory:

```python
def test_wildcard_bash_grant_blocks(make_skill):
    skill = make_skill(overrides={"allowed-tools": "Bash(*)"})
    assert "wildcard-bash-grant" in blocking(skill)
```

Three rules that keep the suite useful:

**Never assert against a real listing under `skills/`.** A test that reads a real
skill breaks when someone edits that skill, and the failure tells you nothing.
Build a fixture.

**Every signature needs both tests.** One proving it fires on the bad case, one
proving it *doesn't* fire on the legitimate near-miss. The second is the one that
matters — an over-eager blocker rejects every skill citing documentation, reviewers
learn to ignore the flag list, and the layer quietly stops working.

**Test names are sentences.** `test_unverifiable_sha_demotes_rather_than_trusting`
tells a future reader what the rule is and why. `test_resolve_tier_3` does not.

## Security-sensitive changes

Changes to `scan.py` signatures, `validate.py` ownership logic, tier derivation in
`build_index.py`, or anything in `.github/workflows/` need a second reviewer and an
explicit note in the pull request about what the change makes possible that wasn't
before.

Before touching a workflow, re-read the CI hardening section of
[SECURITY.md](SECURITY.md). The two rules that matter most:

- `pull_request`, never `pull_request_target`, for anything reading skill content
- No secrets in any job that reads skill content — privileged work goes in a
  separate `workflow_run` job that reads only structured findings

## Before opening a pull request

- [ ] `pytest` passes
- [ ] `python scripts/validate.py all` and `python scripts/scan.py all` pass
- [ ] New behaviour has a test that fails without the change
- [ ] Docs updated if you changed the contract contributors rely on
- [ ] Security-sensitive changes flagged in the description
