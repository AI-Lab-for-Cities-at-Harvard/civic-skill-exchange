# Single-skill listings in Codex

**Issue:** [#207](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/207), with [#183](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/183)'s deferred rulings
**Status:** analysis complete, awaiting rulings. Facts gathered 2026-10-18 against Codex CLI 0.162.1, Claude Code, `openai/codex` `main`, and the exchange at `2337f43`.

## The question

Every skill listing is published as a plugin whose root is the skill directory, `skills/{ns}/{name}/`, with `SKILL.md` at the top and a generated `.codex-plugin/plugin.json` saying `"skills": "./"`. #207 asked whether Codex still loads a skill from that shape. It does not. What should the exchange publish instead?

## What is actually true

**1. Codex installs every single-skill listing and loads none of them.**
- **Method:** add the marketplace, `codex plugin add civic-skills-plain-language-notice-rewriter@civic-skill-exchange`, then `codex debug prompt-input`, which renders what the model sees without calling it.
- **Result:** the plugin is "installed, enabled", but its skill appears nowhere in that input.
- **Same check for the housing plugin** (Agent Plugins layout, `skills/{name}/SKILL.md`): its three skills appear as `sgarcese-housing-dashboards:build-housing-dashboard` and so on.
- **Claude Code loads both** (`claude plugin details`): the rewriter's one skill, and the plugin's three skills and five MCP servers.

**2. Why.**
- `resolve_manifest_path` refuses a manifest path of exactly `./` (`codex-rs/core-plugins/src/manifest.rs`). The guard arrived with openai/codex#13712 on 2026-03-07.
- With no valid `skills` path, Codex looks in `<plugin root>/skills/` only (`loader.rs`, `default_skill_roots`).
- Neither the Claude-format fallback nor command migration loads a root `SKILL.md`.
- The generator's comment that `"./"` was "verified against Codex itself" (#98) predates the guard.

**3. Two layouts make Codex load a skill without moving its files.** Both were confirmed by installing them from a throwaway local marketplace, which was then removed:
- **(a)** A marketplace entry whose `source` is the *namespace* directory, `./skills/{ns}`, carrying `"skills": "./{name}"` itself, with no manifest at `skills/{ns}/`. Codex uses the entry's fields as the manifest when the source has none (`store.rs`, `marketplace.rs`), and scans `{ns}/{name}` recursively. The per-skill `.codex-plugin/` is hidden, so it is skipped.
- **(b)** `"skills": "./."` in the existing per-skill manifest. This passes only because Codex's path join drops `.` segments lexically, which gets around the `./` guard by accident.

**4. #183's precondition is met.** Its rulings were deferred until the owner had built a real plugin in the Agent Plugins layout. `sgarcese/housing-dashboards` is that plugin: listed since #227, loading in both clients, with its own MCP servers. The Agent Plugins layout is now proven in this registry, not just specified.

## Options

### 1. Every listing becomes an Agent Plugins plugin: #183's option B

```
skills/{ns}/{name}/
  plugin.json                  # generated, Agent Plugins
  .claude-plugin/plugin.json   # generated
  skills/{name}/SKILL.md       # everything the author wrote, one level down
```

- **Pros:** the default path in both clients, with no fallback or quirk. One shape for skills and plugins, so a skill that grows a second skill or an MCP server becomes a plugin without moving.
- **Costs** (as #183 lists them): every path in the validator, the index, the archive, the submission page and the docs changes once. The six listings move in one maintainer pull request. The two attestations are re-pinned to the inner directory. Contributors see one more directory level, and the submission page's corrected folder would produce it for them.

### 2. Point Codex at the namespace, keep the tree: layout (a)

- The generator writes each Codex marketplace entry as `source: ./skills/{ns}` plus `"skills": "./{name}"` and the interface fields, and stops writing `.codex-plugin/plugin.json` into skills.
- L0 refuses any file directly under `skills/{ns}/`, since one manifest there would silently override every entry in that namespace.
- **Pros:** small. Nothing moves, no attestation changes, and Claude is untouched.
- **Costs:**
  - Codex copies the **whole namespace directory** into its cache for each skill installed from it. A namespace with N skills is copied N times, and installing one Reviewed skill puts its Community siblings' files on disk. They are not loaded, but they are there.
  - The trick relies on Codex's fallback-manifest rule ("a real plugin manifest always wins"). Intended behaviour, but a rule this registry would now depend on.

### 3. `"skills": "./."`: layout (b)

- **Pros:** a one-line generator change.
- **Costs:** it works only because a path normalisation lets through what an explicit guard was written to refuse. Any tidy-up in Codex breaks every listing at once, with no error. It also loads any `SKILL.md` up to six levels down, including examples under `references/` and `assets/`, which L0 deliberately lets authors keep.
- **Not recommended for a registry.** Listed only because it is the cheapest.

### 4. Do nothing, and say so

README.md and SUBMITTING.md stop telling Codex users to `codex plugin add {namespace}-{skill-name}@civic-skill-exchange`, which installs and does nothing, until one of the above lands. The download path (unzip into `.agents/skills/`) keeps working. Honest, but it drops one of the two clients the marketplace exists for.

## Recommendation

**Option 1, as its own milestone, with option 2 as the bridge if the milestone will not start soon.**

Option 1 is what #183 recommended before there was any evidence. The evidence now points the same way: the Agent Plugins layout loads in both clients, the housing plugin proves the registry can validate, scan, attest and publish it, and every alternative leans on a fallback or a quirk.

Option 2 is intended Codex behaviour and small, but it is a second shape kept alive to avoid the first. Option 3 is not recommended.

#224's Codex section waits on whichever lands.

## Decision questions

1. **#183's question, now answerable: adopt the Agent Plugins layout as the shape of every listing (option 1)?** Recommended yes.
2. **If yes, build it now as its own milestone, or bridge with option 2 first?** Recommended: now, if it can start within this phase; otherwise bridge.
3. **Rule out option 3** (`"./."`)? Recommended yes.
4. **Until a fix lands, should README.md and SUBMITTING.md stop offering `codex plugin add` for single skills** (they install and do nothing), pointing Codex users to the download instead? Recommended yes. Skill pages on the site offer no Codex command today. The plugin page's does, and it works.
