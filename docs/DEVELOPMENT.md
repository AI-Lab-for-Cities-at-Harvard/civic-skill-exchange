# Working on the registry

Conventions for changing the registry's own tooling — the schema, scripts,
workflows, and site. Contributing a *skill* is a different and much lighter
process; that's [CONTRIBUTING.md](../CONTRIBUTING.md).

## Two languages, and which owns what

The repository runs TypeScript and Python side by side. That is deliberate, and
the split is not arbitrary:

| | Language | Why |
|---|---|---|
| **Frontmatter validation** — `validator/` | TypeScript | The submission page has to tell someone their frontmatter is valid *before* they open a pull request. Two validators that must agree will drift, and a site that says "valid" before CI says otherwise is worse than no browser validation at all. So there is one module, run in both places. |
| **Security scanning** — `scripts/scan.py` | Python | The browser never scans a submitter's scripts, so there is nothing to share. Porting these regexes would reimplement the code most expensive to get subtly wrong — lookbehind support, `\b` against unicode, `re.IGNORECASE` versus `/i` on non-ASCII — for no gain. |
| **Index build** — `scripts/build_index.py` | Python | Build-time only, and it shells out to git. |

**Browser validation is UX, never a gate.** CI re-runs the identical module and
stays the authority. Do not add a code path that trusts a client-supplied result.

## Setup

```bash
npm install                       # workspace root: installs validator/ and site/
python -m venv .venv && source .venv/bin/activate
pip install pyyaml jsonschema pytest
```

```bash
npm run test --workspaces         # validator + site
pytest                            # scan.py and build_index.py
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
npx tsx validator/src/cli.ts all          # L0 + L1 over every committed skill
python scripts/scan.py all                # L2 + L3 over every committed skill
python scripts/build_index.py --out site/public/data

npm run test -w @civic-skill-exchange/validator
pytest tests/test_scan.py -k wildcard     # one thing
```

## The validator workspace

`validator/` is an npm workspace, not a directory inside `site/` — the Skills CI
gate should not need the React app installed to validate a YAML file.

```
validator/src/
├── rules.ts           pure frontmatter validation — runs in BOTH runtimes
├── structure-core.ts  size caps, file types, symlinks, path safety — BOTH
├── yaml-safety.ts     frontmatter size and alias rules — BOTH
├── structure.ts       walks a directory into entries — Node ONLY
├── skill.ts           reads a skill directory, applies both layers
└── cli.ts             what CI invokes
```

The line is **pure versus entry-producing**, not "frontmatter versus structure".
Every rule lives in a module that runs in either runtime; only the walk needs
Node. `structure-core.ts` takes a kind-tagged entry list — file, directory or
symlink — so even the symlink rule is shared rather than reimplemented by
whoever assembles entries some other way.

A caller that builds entries from something other than a filesystem must also
run `checkPathSafety`. A directory walk cannot produce a `..` segment, an
absolute path or a duplicate; a list of names chosen by somebody else can.

Nothing reachable from the package entry point may import `node:`.
`validator/src/purity.test.ts` enforces that by reading the source. Typechecking
does not catch it — `@types/node` is hoisted in the workspace, so an explicit
`import from "node:fs"` compiles cleanly even where it must never run.

Findings are structured — `{ where, message }` — so the submission form can put
an error next to the field it belongs to rather than dumping a list.

The category vocabulary comes from `registry/categories.yml` in Node and from the
published `data/categories.json` in the browser. Both derive from the same file,
so the vocabulary cannot drift either.

The site depends on the workspace and imports it directly:

```ts
import { checkFrontmatter } from "@civic-skill-exchange/validator/rules";

const findings = checkFrontmatter(frontmatter, { categories });
// findings: { where: "civic.deployed-at", message: "..." }[]
```

`where` names the field, so the submission form can render an error beside the
input it belongs to. There is no second implementation to keep in step.

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

## The three CI gates

Every pull request gets three checks, and **each one always reports** — including
when it has nothing to do.

| Gate | Covers | Runs when |
|---|---|---|
| **Skills** | `validator/` and `scan.py` over submitted skills | `skills/**` changed |
| **Tooling — pytest** | the registry's own scripts and schema | `scripts/`, `schema/`, `registry/`, `tests/`, `skills/` changed |
| **Site — lint, typecheck, test, build** | the React app | `site/**` changed |

The filtering happens **inside each job**, not with a `paths:` trigger filter.
This matters: a required status check that `paths:` filters out never reports at
all, and GitHub leaves the pull request permanently unmergeable rather than
treating it as passed. A site-only pull request would sit blocked forever waiting
on a skills check that was never going to run.

So a pull request touching only `site/` gets a green Skills check that says
"touches no skills/, nothing to validate", and the site gate does the real work.

## Security-sensitive changes

Changes to `scan.py` signatures, ownership logic in `validator/`, tier derivation in
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
- [ ] `npx tsx validator/src/cli.ts all` and `python scripts/scan.py all` pass
- [ ] New behaviour has a test that fails without the change
- [ ] Docs updated if you changed the contract contributors rely on
- [ ] Security-sensitive changes flagged in the description

## The site

React + Vite + TypeScript under `site/`, deployed to Pages by `build.yml`.

```bash
cd site
npm install
npm run dev       # localhost:5173
npm run lint      # eslint
npm run test      # vitest
npm run build     # → site/dist
```

`build_index.py --out site/public/data` writes the catalog into Vite's `public/`,
which Vite copies verbatim into `dist/data/`. That directory is generated, so it
is gitignored — run the build script once before `npm run dev` or the page will
show its load error.

### Design tokens

`src/styles/tokens.css` follows the HBS web design system: semantic `--c-*`
colors redefined per theme on the root element, fluid `clamp()` spacing, their
breakpoints.

Two rules when working in it:

**The brand accent is one variable.** `--brand-accent` is the only place the
crimson appears. This project is affiliated with HBS but not yet approved to
carry the brand, so de-identifying the site has to stay a one-line change.
Never hardcode `#a41034` anywhere else, and never add the HBS logo, wordmark,
shield, or name.

**No HBS typefaces.** Graphik and Tiempos are commercially licensed and cannot
be redistributed. Inter substitutes for Graphik.

**The system is sans-serif, headings included.** The reference CSS carries 348
Graphik declarations against Tiempos' 32, and every topper and title in it is
Graphik. The serif is an editorial accent reserved for pull quotes, blockquotes,
date displays and bios — not for headings and not for body copy.

Nothing here uses it yet, so its webfont is deliberately not requested. If you
add a pull quote, add the face to the font link in `index.html` at the same
time, or it falls back to Georgia and reads off-system.

Headings run tight: weight 700 for display and 600 for smaller titles, with
`--track-display` / `--track-heading` / `--track-tight` matching where the
reference CSS clusters (-.02em to -.04em).

### Testing the front end

Logic lives in `src/lib/` as pure functions so it can be unit-tested without a
DOM — `filter.ts` is the pattern. Components stay thin enough that a rendering
bug is visible rather than subtle. Accessibility checks arrive with issue #6.
