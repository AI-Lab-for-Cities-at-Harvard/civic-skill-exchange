# ADR 0006 — Every listing in the Agent Plugins layout

**Status:** accepted, 2026-10-19
**Analysis:** [spikes/every-listing-in-the-agent-plugins-layout.md](../spikes/every-listing-in-the-agent-plugins-layout.md), after [spikes/single-skill-listings-in-codex.md](../spikes/single-skill-listings-in-codex.md)
**Rulings:** [#207](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/207) (rulings 1–2), [#241](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/241)
**Amends:** [ADR 0005](0005-plugins-are-a-second-listing-kind.md), which kept "one directory is one skill" true of `skills/`

## Context

- **The problem.** Every single-skill listing keeps `SKILL.md` at the root of `skills/{ns}/{name}/`, and its generated Codex manifest says `"skills": "./"`. Current Codex refuses a skills path of exactly `./` and looks only in `<plugin root>/skills/`. So it installs every single skill and loads none (#207). The housing plugin, in the Agent Plugins layout, loads in both clients.
- **Ruled on #207:** every listing takes that layout, built now as M9.
- **What #241 settled:** how to get there. This ADR records its seven rulings.

## Decision

**1. A single skill's files live one level down.** Everything the author wrote moves to `skills/{ns}/{name}/skills/{name}/`, where `{name}` is the listing's own name.
- The listing root holds only what the registry generates: `.codex-plugin/plugin.json` and `.claude-plugin/plugin.json`.
- The marketplace `source`, the index's `path` and the attestation path all stay `skills/{ns}/{name}`.
- Install commands and skill names don't change.

**2. The manifests stay generated, and civic metadata stays in `SKILL.md`.**
- The Codex manifest drops `"skills": "./"`. Both clients load `<root>/skills/` by default, which was verified with Codex CLI 0.163.0 and Claude Code 2.1.302.
- A single skill gets no root `plugin.json`. Its frontmatter is validated with `inPlugin: false`, as now.
- A plugin is still what declares its civic fields once, in `plugin.json`.

**3. The published zip is a plain skill folder.**
- It's rooted at the author's directory, `{name}/SKILL.md`, without the generated manifests. Unzipping into `.agents/skills/` or `~/.claude/skills/`, and uploading to claude.ai, ChatGPT and Gemini, keep working.
- The index adds `skill_path`, `skills/{ns}/{name}/skills/{name}`. It's used for `degit`, copying, the edit links and the detail page's file list.
- Executed files follow the plugin rule, `skills/*/scripts/`.

**4. No `SKILL.md` below a skill's own.** Codex loads any `SKILL.md` under `skills/`, recursively. So L0 refuses one anywhere below `skills/{name}/SKILL.md`, in single skills and in plugins, and suggests `SKILL.example.md` for an example. This reverses the `references/` and `assets/` exemption from #78.

**5. A skill with an MCP server is a plugin.** A single skill's listing root is generated-only, and a server config inside `skills/{name}/` is one no client reads. Servers go under `plugins/`, where every host gets the plugin review.

**6. Submitters still bring a flat skill folder.** The submission page validates it with the same rules CI applies to the inner directory.
- The page hands back that folder, for upload into `skills/{ns}/{name}/skills/`, if GitHub's upload page accepts a target directory that doesn't exist yet.
- If not, it hands back a wrapped folder, `{name}/skills/{name}/…`, for upload into `skills/{ns}/`.

**7. Reviews are re-pinned, not reinterpreted.**
- The move changes the listing directory's last commit, and so does the manifest regeneration after it, so every Reviewed single skill drops to Community.
- After both land, each review's `sha:` is moved to the final commit, with a dated YAML comment saying the files were renamed at 100% similarity. Nothing else in the entry changes. What a review pins stays "this exact commit" (ADR 0001).
- A Community window of about an hour is accepted.

## Consequences

The order is fixed. Each of steps 1 to 3 leaves `main` working with flat listings, and they merge one at a time:
1. **The validator and scanner** accept the nested layout and refuse a deep `SKILL.md`. Where they would skip a listing whose `SKILL.md` they can't find, they fail instead. Today those skips are silent in `build_index`, `build_marketplace` and the scanner's wildcard-Bash check.
2. **The generators, the index and the attestation tool** read either layout. The Codex manifest changes only for nested listings, so no review drops early.
3. **The submission page** hands off the nested path (decision 6).
4. **The move:**
   - one maintainer PR, moving all six listings and retiring the flat layout;
   - the docs, in the same PR:
     - README and the guide offer `codex plugin add` for single skills again;
     - ARCHITECTURE, CONTRIBUTING and SUBMITTING describe the nested layout;
     - ADR 0005 gets a banner pointing here.

   It closes #207.
5. **The re-pin.**

**Existing installs** update in place under the same plugin id. Codex users get the skill on the next marketplace upgrade. Claude Code users keep a working flat copy until `claude plugin update`, and the guide says so.

## When to revisit

- If either client stops loading `<root>/skills/` by default.
- If a client starts reading a root `SKILL.md` alongside `skills/`, so a listing could load twice.
- If a review's pin needs to survive mechanical changes often enough that re-pinning by hand is the larger cost.
