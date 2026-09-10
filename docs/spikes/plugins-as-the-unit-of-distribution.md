# Plugins as the unit of distribution

**Issue:** [#183](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/183)
**Status:** analysis complete, awaiting rulings. Facts gathered 2026-09-10 against Claude Code 2.1.258 and the documents cited inline.

## The question

The exchange publishes each skill directory as a plugin root. The Claude
marketplace entry's `source` points at `skills/{ns}/{name}/`, which holds
`SKILL.md` directly plus a generated `.codex-plugin/plugin.json`. Both
marketplaces were new when that shape was chosen (#73, #98, #99).

The owner reports that the Claude desktop app shows an error against a listing
from this marketplace, and that both Claude and Codex now treat plugins, not
skills, as the unit of distribution: a manifest, skills nested under `skills/`,
and optionally agents, hooks, commands and MCP servers beside them. Should the
exchange change its unit?

## What is actually true

Three findings reframe the question. Each is sourced; the fact sheet behind
them is summarised here rather than restated.

**1. Claude Code has not changed its requirement.** Its plugin reference says
outright: "A plugin that has a `SKILL.md` at its root, no `skills/`
subdirectory, and no `skills` manifest field is automatically loaded as a
single-skill plugin." `claude plugin validate` on this repository passes with
one warning, a missing marketplace description. `marketplace update`,
`plugin install` for a Lab listing and for a contributor listing, and a fresh
session that lists both skills by name all succeed on the CLI today. The
manifest is optional altogether; when present, `name` is its only required
field.

**2. What changed is a third standard.** Agent Plugins 1.0 shipped on
2026-08-06 with a technical steering committee from AWS, Cursor, Microsoft,
OpenAI, Vercel and Google. Its normative text: a plugin MUST have `plugin.json`
at its root with a required `$schema`; skills are discovered only as immediate
children of `skills/`, and clients MUST NOT search deeper; MCP servers live at
`mcp.json`; `plugin.json` cannot relocate either. A root `SKILL.md` is not a
skill under this standard. It is not forbidden; it is never loaded.

OpenAI has moved Codex onto it. Its documentation now says: "For a portable
Agent Plugins package, add `plugin.json` at the plugin root", and "Existing
`.codex-plugin/plugin.json` files remain supported as a compatibility
fallback." The `"skills": "./"` trick this registry relies on was never
documented; `build_marketplace.py` says so itself. It is tolerated, on the
fallback path.

Claude Code is not a launch client of Agent Plugins. It differs on two paths:
its manifest is `.claude-plugin/plugin.json`, its MCP file is `.mcp.json`. The
two formats can coexist in one directory without collision. Whether Claude
Code reads a root `plugin.json` is not confirmed; its validator did not treat
one as a manifest.

**3. The desktop symptom is silence, not an error.** The owner reports that
Codex lists and loads every skill, that the Claude desktop app's plugin browser
shows nothing from this marketplace, and that it reports no error. The desktop
assistant, asked to inspect the repository, attributed it to the missing
`plugin.json` structure. That is a plausible reading, not a confirmed cause:
the desktop app reads the same marketplaces from the same configuration, no
document says it validates manifests more strictly than the CLI, and three
closed Claude Code issues (#39897, #64763, #39400) reproduce empty or broken
plugin lists for marketplace plugins with textbook layouts, including
Anthropic's own, working fine in the CLI. The cheapest way to settle it is the
experiment in option A: generate `.claude-plugin/plugin.json` beside each
`SKILL.md` on a branch and point the desktop app at it.

So the decision is not "Claude broke us". It is "a cross-vendor standard has
arrived that our shape does not satisfy, Codex has adopted it, and we have few
users". That is a better reason to move than a bug would have been, and a
better moment.

## What in this registry assumes the skill directory is the plugin root

| Component | What it assumes |
|---|---|
| `build_marketplace.py` | plugin name is `{ns}-{name}`; `source` is the skill directory; `.codex-plugin/plugin.json` is written inside it with `"skills": "./"`; `generated()` is two marketplaces plus one file per skill directory |
| `build_index.py` | the review SHA is `git log -1 -- skills/{ns}/{name}`; the download archive and `path` are rooted at the skill directory |
| `layout.ts` | `skills/{ns}/{name}/SKILL.md` is the only correct place for a SKILL.md |
| `structure-core.ts` | one directory is one skill and a nested SKILL.md is a hazard (#129); `hooks/`, `.claude-plugin/`, `settings.json`, `.lsp.json` are refused because an author's skill directory is a plugin root (#151); `.mcp.json` is kept and treated as executed |
| `skill.ts` | exactly `skills/{ns}/{name}/.codex-plugin/plugin.json` is registry-owned and exempt from ownership (#154) |
| `registry/reviewed.yml`, TIERS.md | the attestation pins the last commit touching the skill directory, and any commit demotes |
| ARCHITECTURE.md, SECURITY.md | "makes the skill directory the Claude plugin root" is stated as the reason for the L0 refusals |
| CONTRIBUTING.md, SUBMITTING.md, the wizard | the author's folder is `{name}/SKILL.md`; the upload target is `skills/{ns}`; the hand-back zip is one skill-named folder; `--sparse .claude-plugin skills` |

One thing that has changed since the fact sheet's concern was written: since
#170 the generated manifests land in the same pull request as the skill change.
A generated file inside a skill directory no longer demotes an attestation
after the fact on every merge. A change to the generator's output format still
would, for every Reviewed listing at once, which is visible and recoverable
but worth designing away.

## Options

### A. Keep the shape, add `.claude-plugin/plugin.json` per skill

Generate a Claude manifest beside the root `SKILL.md`, as `.codex-plugin/`
already is. Validated: with `name` alone it passes; `version` and `author`
survive `--strict`. Fixes the desktop app if, and only if, the missing
manifest is its cause, which the branch that implements it will show. Does nothing for Agent Plugins, and leaves Codex on its
fallback path. One more generated file per skill directory.

### B. Plugin per skill, Agent Plugins layout

Each listing becomes a plugin directory with one nested skill:

```
skills/{ns}/{name}/
  plugin.json                  # Agent Plugins, generated
  .claude-plugin/plugin.json   # Claude, generated, until Claude reads the root file
  skills/{name}/SKILL.md       # the skill, and everything the author wrote
  skills/{name}/scripts/ …
```

The listing, its metadata, its tier and its download stay per skill. The
attestation pins the inner directory, `skills/{ns}/{name}/skills/{name}`, so
the generated files at the plugin root never touch what a reviewer read.
Ownership stays per namespace. The plugin-level refusals from #151 stay, now as
policy rather than side effect: an author's plugin root may hold the skill,
`mcp.json` treated as executed, and nothing else that runs. Install granularity
is unchanged: one plugin, one skill, `plugin-name:skill-name`.

Costs: every path in the validator, the index build, the archive, the wizard
and the docs changes once; contributors learn one extra directory level, which
the wizard's hand-back zip produces for them; the four listings move in one
maintainer pull request; the one attestation is re-pinned to the inner
directory.

### C. Plugin per namespace

`skills/{ns}/` becomes the plugin root: `skills/{ns}/plugin.json` and
`skills/{ns}/skills/{name}/SKILL.md`. Generated files sit above every skill
directory, so no regeneration can ever touch a pin, and the tree is closest to
today's. But a plugin is what a client installs, so installing one Reviewed
skill installs the contributor's Community siblings with it. The tier blurs
exactly where it matters, at install time. Rejected on that ground.

### D. Publish both shapes

A generated plugin tree beside the current skill tree. Two copies of every
skill in git, or symlinks, which L0 refuses and marketplace caches copy rather
than follow. Rejected.

### What a plugin may carry

Agent Plugins and Claude both let a plugin ship hooks, MCP servers, agents,
commands, executables on PATH and monitors, all of which run with no model in
the path. #151 refused hooks and kept MCP as executed. Under B the same rule
holds and is easier to state: the author's content is the nested skill plus,
optionally, `mcp.json`; everything else at the plugin root is generated or
refused. Widening that is a separate ruling when a listing needs it.

### Several skills in one plugin

Agent Plugins allows it. The registry's metadata, tier and attestation are per
skill, and its catalogue is a catalogue of skills. Allowing a plugin to carry
several skills means either aggregating metadata across them or listing a
plugin whose skills disagree on data sensitivity. Defer: one skill per plugin,
revisit when a contributor actually has a bundle.

## Recommendation

**B.** Adopt the Agent Plugins layout with one skill per plugin, pin the
attestation to the inner skill directory, keep the Claude manifest beside the
root one until Claude reads it, drop `.codex-plugin/plugin.json` since Codex
documents the root file, and keep #151's refusals as policy. Do it now, as its
own milestone, while there are four listings and few installs. A generated
`.claude-plugin/plugin.json` (option A) is a one-day patch worth landing first
only if the desktop error text confirms it is the cause.

Two things before build issues are cut, neither a decision:

- Get the desktop error text and attribute it.
- Run a current Codex CLI against both the present layout and a B-shaped
  plugin. `.codex-plugin` with `"skills": "./"` is an undocumented behaviour on
  a fallback path; assume nothing.

## Decision questions

1. **Adopt Agent Plugins as the published shape?** Recommended yes.
2. **Unit: plugin per skill (B) or per namespace (C)?** Recommended B.
3. **The attestation pins the inner skill directory**, and plugin-root
   manifests are registry-generated and exempt from ownership, so regeneration
   never demotes. Recommended yes.
4. **What an author's plugin root may carry**: the nested skill and an optional
   `mcp.json` treated as executed; hooks, agents, commands, `bin/`, monitors
   and settings refused, as #151 does today. Recommended yes; widen later on
   evidence.
5. **One skill per plugin** until a contributor has a bundle. Recommended yes.
6. **Manifests**: generate root `plugin.json` and `.claude-plugin/plugin.json`;
   drop `.codex-plugin/plugin.json`. Recommended yes.
7. **Migration**: one maintainer pull request moves the four listings, the
   generator, the validator, the site and the docs together, followed by a
   re-attestation of the rewriter at the inner directory; the marketplace
   plugin names do not change, so an existing install updates in place.
   Recommended, as milestone M8.
8. **Option A first?** Only if the desktop error text names the missing
   manifest. Recommended no otherwise.
