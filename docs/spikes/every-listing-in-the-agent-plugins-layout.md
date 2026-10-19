# Every listing in the Agent Plugins layout

**Issue:** [#241](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/241), from rulings 1–2 on [#207](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/207)
**Status:** analysis complete, awaiting rulings. Facts gathered 2026-10-19 against Codex CLI 0.163.0, Claude Code 2.1.302, and the exchange at `063acf6`.

## The question

The owner ruled that every listing takes the Agent Plugins layout, so a single skill loads in Codex as the housing plugin's skills already do ([single-skill-listings-in-codex.md](single-skill-listings-in-codex.md), option 1). A single-skill listing goes from

```
skills/{ns}/{name}/SKILL.md            (and scripts/, references/, assets/ beside it)
skills/{ns}/{name}/.codex-plugin/plugin.json    generated, "skills": "./"
skills/{ns}/{name}/.claude-plugin/plugin.json   generated
```

to

```
skills/{ns}/{name}/skills/{name}/SKILL.md       everything the author wrote, one level down
skills/{ns}/{name}/.codex-plugin/plugin.json    generated
skills/{ns}/{name}/.claude-plugin/plugin.json   generated
```

This document settles how to get there: what moves, what happens to the reviews, what the published zip and links become, what the validator and the submission page do, and in what order. ADR 0006 records the rulings, and the build issues are cut from it.

## What is actually true

### 1. The nested layout loads in both clients, with nothing new written

Tested from a throwaway local marketplace, with isolated Codex and Claude Code homes. No sign-in happened, and the user's own configuration was hashed before and after and is unchanged.

| Case | Codex: skills loaded | Claude Code: skills loaded |
|---|---|---|
| Today's flat listing (control) | **0** | 1 |
| Nested, Codex manifest with no `skills` key | 1 | 1 |
| Nested, `"skills": "./skills/"` in both manifests | 1 | 1, no duplicate |
| Nested, an Agent Plugins root `plugin.json` instead of `.codex-plugin/` | 1 | 1 |
| Nested, with the old `"skills": "./"` left in place | 1 (falls back to `skills/`) | n/a |
| Nested `problem-identification-scan` (`references/domains/…`, `context.template.yml`) | 1 | 1 |

- **Method:** for Codex, `codex debug prompt-input` renders what the model is given without calling it. For Claude Code, `claude plugin details` and the init event of `claude -p` list the loaded skills, printed before the "Not logged in" stop.
- **So the generated manifests stay as they are, minus `"skills": "./"`.** Codex's default is `<plugin root>/skills/`, and Claude Code's is the same. No root `plugin.json` is needed for a single skill.
- **Relative paths still work.** Both clients keep the inner directory whole in the installed copy, so `scripts/reading_level.py` and `references/*.md` stay beside `SKILL.md`. Every relative path in the six listings' bodies points at a sibling of `SKILL.md`. There is no `../` anywhere, so moving the author's directory down as one unit breaks none.
- **Not verified:** a live session in which a model invokes the skill and opens those files, because that needs a signed-in session.

### 2. Names and install commands do not change

- **Claude Code:** the skill is `civic-skills-plain-language-notice-rewriter:plain-language-notice-rewriter` before and after. The plugin name and the skill's name are both unchanged.
- **Codex:** the same `{ns}-{name}:{name}` appears for the first time.
- **Both:** `/plugin install {ns}-{name}@civic-skill-exchange` and `codex plugin add {ns}-{name}@civic-skill-exchange` are unchanged. The marketplace entries' `source` is the listing directory, `./skills/{ns}/{name}`, and that does not move.

### 3. Existing installs update in place

This was simulated with a git marketplace whose listing was installed flat, then moved and committed.
- **Codex:** `codex plugin marketplace upgrade` alone refreshed the installed copy. The skill started loading under the same plugin id, with nothing left behind.
- **Claude Code:** `claude plugin marketplace update` left the install on the old flat copy, which keeps working. `claude plugin update {id}` then moved it to the new commit, and it loads the same skill after a restart. Nothing breaks in between.
- **Not tested:** Claude Code's auto-update at startup for a third-party marketplace.

### 4. A new risk: Codex loads any `SKILL.md` under `skills/`

Codex scans `skills/` recursively. A `SKILL.md` kept as an example under `references/` became a second Codex skill (`…:example-inner`). Claude Code ignored it.
- **L0 allows exactly that today,** in `skills/` and in plugins (#78: a skill about writing skills may ship an example `SKILL.md` under `references/` or `assets/`).
- **The housing plugin is exposed to it already:** `PLUGIN_LAYOUT` has the same exemption.
- **No listing has such a file today.**

### 5. The move touches every part of the pipeline, and three parts fail silently

A full map of what assumes the flat layout was made from the code. The parts that matter most:
- **Silent failures.**
  - `build_index.build_entry` returns nothing when `skill_dir/SKILL.md` is missing, so the index builds with zero skills and only a warning.
  - `build_marketplace.build` and `generated` skip the same way, which empties both marketplaces.
  - `scan.py`'s `allowed_tools_of` and `localization_of` return `None`. That quietly turns off the parsed wildcard-Bash check (#152), a security check, and the localization suppression.
  - All three read `skill_dir / "SKILL.md"`. Each needs a test that fails loudly if the inner file isn't found.
- **Wrong published values.** `is_executed` matches `scripts/` at the listing root, so `has_scripts` and `script_files` would go false for the rewriter. Plugins already have the right rule: `skills/*/scripts/`.
- **The validator refuses the nested layout today.** `layout.ts`'s `CORRECT` rejects a `SKILL.md` at `skills/{ns}/{name}/skills/{name}/`. `SKILL_LAYOUT`'s second-`SKILL.md` rule refuses it too. `checkSkillFile` looks for `SKILL.md` at the listing root.
- **Civic metadata stays where it is.** A nested single skill must keep `inPlugin: false`, so its metadata stays in `SKILL.md`. `validatePlugin` can't be reused wholesale: it would refuse every listing's maintainer and use-when fields as "describes the whole plugin", and require a `plugin.json` `extensions` block none of them has.
- **Links that would 404 or install the wrong shape:**
  - the update mode's "edit `SKILL.md`" link;
  - the new-file link;
  - the command-line recipe's `mkdir -p`;
  - the `npx degit` line on the skill page;
  - the README's `degit` and `cp -r` lines.
  
  All of them name the listing directory plus `/SKILL.md`, or copy the listing directory.
- **Tests that read the real tree.** `tests/test_attestation.py` checks every attestation's `SKILL.md` on disk. `discover.test.ts` reads the generator's source text, and `test_workflows.py` reads workflow step names. A correct refactor can fail them for the wrong reason.
- **Docs that pin today's limitation.**
  - README's "a single skill installs from Codex but does not load yet" is held by `test_docs_describe_what_is.py`.
  - The guide's Codex strings say the same.
  - ADR 0005 says "one directory is one skill stays true of `skills/`".
  - ARCHITECTURE's "One directory is one skill" and its `"skills": "./"` paragraph.

### 6. Every review drops on the move

- **What a review pins.** An attestation pins `git log -1 --format=%H -- skills/{ns}/{name}`, the last commit to touch the listing directory (`build_index.head_sha`).
- **The move is such a commit.** So are the Manifest workflow's regenerated manifests after it, because dropping `"skills": "./"` changes every one of them.
- **What drops.** All five Reviewed single skills fall to Community at the move and again at the regeneration. The housing plugin doesn't move.
- **The SHA path doesn't change.** It stays the listing directory, not the inner one. #207's "re-pinned to the inner directory" was loose: what changes is the commit, not the path.

## Options and recommendations, by topic

### A. The move

- **One maintainer PR**, with `git mv` of every author file into `skills/{ns}/{name}/skills/{name}/`, generated manifests left where they are.
- **All of it moves**, including `civic-analytics-workflow`'s root `README.md` and `context.template.yml`. Its body names eleven sibling files and `context.yml` "beside this file", so splitting them would break those references.
- **After the move, the listing root holds only generated files.**
- **Git records the moves as 100% renames.** That is what lets a reviewer confirm nothing changed inside a file (topic B).

### B. The reviews

1. **Re-pin each review to the post-move commit.** Change only `sha:` on the five entries, in a PR after the Manifest regeneration lands. Each entry gets a YAML comment above it:

   ```yaml
   # Re-pinned 2026-MM-DD after the layout move (#241): every file renamed at 100% similarity, no content changed.
   ```

   - The `reviewed`, `expires`, `languages`, `models` and `notes` fields don't change.
   - The PR shows `git diff -M --stat {old}..{new} -- skills/{ns}/{name}`, with every line a rename and no content change.
   - **Cost:** the five listings show Community on the live site between the move's merge and the re-pin's merge, probably about an hour.
2. **Rule that a move-only change keeps a review.** `build_index` would compare the author's files by content (a tree hash of `skills/{name}/`) instead of by commit.
   - No Community window.
   - **But it changes what a review pins**, from "this exact commit" (ADR 0001 and the header of `reviewed.yml`) to "this exact content". It's a weaker statement about the generated files around it, and a second rule to keep for one event.
3. **Re-review each listing from scratch.** It's honest, but nothing changed to review.

**Recommended: 1.** It keeps the review model unchanged, it can be checked mechanically, and it leaves your notes untouched. The YAML comment is the record. A Community window of about an hour on a site with no traffic depending on tiers is the price.

### C. Generated or written, and where civic metadata lives

**Recommended:**
- **The two manifests stay generated, exactly as today, minus `"skills": "./"`.** The author writes nothing new, and there's no root `plugin.json` for a single skill. A root `plugin.json` would make the submission page and import read the listing as a plugin (`zip.ts`, `import.ts`), and nothing loads better with it.
- **Civic metadata stays in the skill's own `SKILL.md` frontmatter**, validated with `inPlugin: false`.
- **The only difference between a one-skill listing and a plugin is then** that a plugin has several skills (or a server) and declares its civic fields once in `plugin.json`.

### D. The published zip, the index and links

- **The zip is rooted at the author's directory:** `{name}/SKILL.md`, `{name}/references/…`, without the generated manifests.
  - Today's zip roots at the listing directory and carries the manifests. A nested zip rooted there would unpack to `.agents/skills/{name}/skills/{name}/SKILL.md`, which no skills-directory client loads, and claude.ai, ChatGPT and Gemini's skill upload wouldn't find `SKILL.md` either.
  - Rooting it at the author's directory keeps every guide step and screenshot true. It also keeps the round trip, dropping a published zip back on the submission page, a plain skill.
- **The index keeps `path` as the listing directory**, which is the `tree/` link, the attestation path and the marketplace source. It adds `skill_path`, `skills/{ns}/{name}/skills/{name}`.
  - `degit`, the README's `cp -r`, the update mode's edit link and the new-file link use `skill_path`.
  - The detail page's file list shows the author's files relative to `skill_path`, without the generated manifests, as the plugin page already does.
- **`is_executed` takes the plugin rule,** so `has_scripts` stays true for the rewriter.

**Recommended: all of D.**

### E. The validator and the scanner

- **Two layouts briefly, then one.**
  - The tooling PRs accept both flat and nested single skills, so each can be built and tested while the listings are still flat.
  - The move PR then retires flat. From then on, L0 refuses a root `SKILL.md` in `skills/` and says where it goes.
- **A nested single skill's L0 rules:**
  - The listing root holds only the generated `.codex-plugin/`, `.claude-plugin/` and `skills/{name}/`, where `{name}` is the listing's own name.
  - The inner directory gets today's `SKILL_LAYOUT` rules, and `hooks/`, `settings*.json` and `.lsp.json` are refused there, as `rejectedInPlugin` does inside a plugin's skill.
  - The caps stay on the whole listing.
- **The scanner and `build_index` read the inner `SKILL.md`,** and each silent skip in 5 becomes a loud failure under test.
- **A `SKILL.md` below `skills/{name}/SKILL.md` is refused, in single skills and in plugins (fact 4).** The message suggests renaming an example to `SKILL.example.md`. This reverses #78's exemption, because Codex now loads what the exemption allowed.

**Recommended: all of E.**

### F. A single skill with an MCP server

- **Today a single skill may ship a root `.mcp.json`.** No listing does. Under the nested layout, the listing root is generated-only, and a server config inside `skills/{name}/` is one no client reads (`PLUGIN_LAYOUT` refuses it there).
- **The options:**
  1. A skill with a server is a plugin, and goes under `plugins/`.
  2. Allow an authored `.mcp.json` at the nested listing's root, beside the generated files.

**Recommended: 1.** Servers then get the plugin review addendum (every host justified) in one place. It's also the stated benefit of the ruling: one shape, and a skill that grows a server becomes a plugin.

### G. The submission page

People keep bringing what every skill tool produces: a folder, zip or repository with `SKILL.md` at its root. The page keeps validating that folder with the same rules CI applies to the inner directory, so the page and CI still run the same module on the same shape. Only the hand-off changes. There are two ways to get the nested path:

1. **Hand back the same flat folder,** and point GitHub's upload page at `skills/{ns}/{name}/skills/`.
   - What the person drags is still "your skill folder", and every screenshot and instruction stays true.
   - **Unverified:** whether GitHub's web upload accepts a target directory that doesn't exist yet. It does for `skills/{ns}/` today, which is the same situation one level deeper, but it needs a check.
2. **Hand back a wrapped folder,** `{name}/skills/{name}/…`, uploaded to `skills/{ns}/` as today.
   - It works without the check.
   - **But** the person drags a folder whose inside doesn't look like what they made, and the step-3 screenshot and the "don't open the folder" instruction both get harder to explain.

**Recommended: 1, if the check passes; 2 if it doesn't.** The command-line recipe becomes `mkdir -p skills/{ns}/{name}/skills/{name}`. The update mode edits `{skill_path}/SKILL.md`.

### H. Order of work

1. **Validator and scanner accept the nested layout** (E). They refuse a deep `SKILL.md` in both kinds, and fail loudly instead of skipping.
2. **Generators, index and attestation tool read either layout** (C, D, E). The Codex manifest drops `"skills": "./"` for nested listings only, so no flat listing's manifest changes yet. If it did, every review would drop early.
3. **The submission page hands off the nested path** (G).
4. **The move.** One maintainer PR:
   - all six listings, retiring the flat layout;
   - the docs: README and the guide offer `codex plugin add` for single skills again; ARCHITECTURE, CONTRIBUTING and SUBMITTING describe the nested layout; ADR 0005's "one directory is one skill" gets a superseded-by-0006 banner.

   The Manifest workflow then regenerates the six manifests. Closes #207.
5. **The re-pin** (B.1), at the regeneration commit.

Steps 1 to 3 can be built in parallel worktrees, but they merge one at a time, in this order. Each leaves main working with flat listings.

**Note for Claude Code users** with a listing installed before the move: their copy keeps working, and `claude plugin update` brings it forward (fact 3). The guide's marketplace section says so once the move lands.

## Decision questions

1. **Reviews (B):** re-pin each review to the post-move commit, changing only `sha:` and adding a dated YAML comment, and accept a Community window of about an hour? Recommended yes, over keeping reviews across move-only changes or re-reviewing.
2. **Manifests and metadata (C):** keep the two generated manifests minus `"skills": "./"`, with no root `plugin.json` for single skills, and civic metadata staying in `SKILL.md`? Recommended yes.
3. **The zip (D):** root the published zip at the author's directory, without the generated manifests, so every unzip and upload path keeps working? Recommended yes.
4. **Deep `SKILL.md` files (E, fact 4):** refuse any `SKILL.md` below `skills/{name}/SKILL.md`, in single skills and plugins, reversing #78's exemption, with a message to rename examples to `SKILL.example.md`? Recommended yes.
5. **Servers (F):** a single skill with an MCP server is a plugin (option 1)? Recommended yes.
6. **Submission hand-off (G):** hand back the flat folder and upload it into `skills/{ns}/{name}/skills/` if GitHub accepts a new target directory; otherwise hand back a wrapped folder? Recommended yes.
7. **Order (H):** three tooling PRs that accept both layouts, then one move PR that retires flat and fixes the docs, then the re-pin? Recommended yes.
