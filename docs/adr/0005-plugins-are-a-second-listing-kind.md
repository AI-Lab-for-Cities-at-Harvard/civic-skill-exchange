# ADR 0005 — Plugins are a second listing kind

**Status:** accepted, 2026-09-30
**Rulings:** [#206](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/206)
**Specification:** [Agent Plugins 1.0.0](https://agent-plugins.org/specification), schemas vendored in [`schema/agent-plugins/1.0.0/`](../../schema/agent-plugins/1.0.0/)

## Context

The first submission larger than a skill arrived as a plugin: three skills that
build, refresh and summarise a housing dashboard, sharing Python and JavaScript
under one of them, and four remote MCP servers declared in a `.mcp.json`. It
cannot be listed today, for three reasons that are each deliberate:

- **One directory is one skill** ([ARCHITECTURE.md](../ARCHITECTURE.md)). A
  second `SKILL.md` anywhere but `references/` or `assets/` fails L0, because
  the marketplace generator installs a directory as one plugin and the index
  describes it as one skill.
- **An author may not write plugin-level files** (#151, #193). The generator
  writes `.claude-plugin/plugin.json` into every skill, and a hand-written copy
  fails the pull request.
- **MCP servers are read at the root of a skill only** (`scan.py`).

Splitting the plugin into three skills would list it, and lose it: the skills
call each other's scripts by relative path, and the servers belong to all
three. Relaxing "one directory is one skill" would list it, and take apart the
invariant every check in the registry leans on.

Agent Plugins 1.0.0 is a portable format for exactly this — a root
`plugin.json`, a root `mcp.json`, skills under `skills/{name}/SKILL.md` — and
the two clients this marketplace serves were checked against it:

| | Claude Code (documentation) | Codex (source, `openai/codex`) |
|---|---|---|
| A marketplace entry pointing at `./plugins/{owner}/{name}` | allowed at any depth, `./`-prefixed, no `..` | allowed, same rules (`marketplace.rs`) |
| Root `plugin.json` and `mcp.json` | not read | read when `$schema` is Agent Plugins 1.0.0, ahead of `.codex-plugin/` |
| What it needs instead | `.claude-plugin/plugin.json`; a dotted `.mcp.json`; transport spelled `http` | nothing |
| `${VAR}` in an MCP `url` | expanded | not expanded; the URL must be absolute |
| On install | reads the cloned repository | copies the plugin directory into a cache |

## Decision

**1. A plugin is a second kind of listing, under `plugins/{namespace}/{name}/`.**
`skills/` is unchanged, and "one directory is one skill" stays true of it.
The namespace does the same ownership work in both trees, and one marketplace
lists both, so a skill and a plugin may not share `{namespace}-{name}`.

**2. The author writes the portable files; the registry writes the rest.**
`plugin.json` and `mcp.json` in the Agent Plugins layout, which Codex reads as
they are. `scripts/build_marketplace.py` derives `.claude-plugin/plugin.json`
(metadata only) and `.mcp.json` (the same servers, in Claude Code's spelling)
from them, under the rule the per-skill manifests already follow: allowed only
at the plugin root, compared byte for byte by `--check-in-skills`, and foreign
if the generator did not write them. No `.codex-plugin/` is generated.

**3. The exchange's metadata is split by what it describes.** What is true of
the whole plugin — `civic.maintainer`, `civic.affiliation`, `civic.deployment`
and its `deployed-*` details, `civic.use-when`, `civic.avoid-when` — is declared
once, in `plugin.json` under `extensions["io.github.ai-lab-for-cities-at-harvard"]`,
the reverse-domain namespace of the Lab's GitHub Pages domain. What varies per
skill — `category`, `scope`, `language`, `data-sensitivity`, `human-review`,
`localization`, and `jurisdiction`, which the rules check against the same
skill's scope and localization — stays in each `SKILL.md`. A plugin-level field
repeated in a skill fails: three copies of one fact are three chances for them
to disagree. Both halves meet the rules a standalone skill's frontmatter does;
the plugin as a whole meets the structural ones once — the same caps, the same
file-type allowlist.

**4. The registry is stricter than the specification where the specification
leaves it to clients.**

- *No `extensions` but the registry's own, and nothing at the plugin root but
  `plugin.json`, `mcp.json`, `README.md` and `skills/`.* Client-specific
  namespaces are where hooks and apps are declared: configuration honoured by
  code, with no model in the path, the class #151 keeps out of skills. The
  registry's namespace carries only the metadata in decision 3, which no client
  reads — clients must ignore a namespace they do not implement.
- *`stdio` and `streamable-http` only.* `sse` is legacy in the specification
  and Codex does not load it, so the listing would install differently in the
  two clients.
- *An MCP URL is a literal `https` URL* (plain `http` to loopback only). A
  reviewer approves egress by reading the host ([REVIEW.md](../REVIEW.md)); a
  `${VAR}` URL names none, and Claude Code would expand it where Codex sends it
  literally.
- *No credentials in `headers` or `env`.* The specification says both are
  package data; `scan.py` blocks a credential-named field with a value in it.
- *`description` and `license` are required*, as they are for a skill.

**5. A plugin is reviewed and attested as one thing.** `registry/reviewed.yml`
files it under `plugin:` rather than `skill:`, pinned to the plugin directory's
last commit. A change to any of its skills demotes the whole plugin — it
installs as one thing.

**6. The index publishes plugins beside skills, not among them.** `plugins` in
`index.json`, with the skills each carries and the servers it talks to. The
`skills` array keeps its shape and its meaning.

**7. Contributors submit plugins; a maintainer reviews every one before it
merges** (ruling on #211). The namespace rule is the same as for a skill — a
pull request writes only under `plugins/{its author}/` — but `CODEOWNERS` names
`/plugins/` for the maintainers, so no plugin merges on the author's say-so,
even in their own namespace. A plugin launches MCP servers and brings several
skills' code in one pull request, which is more than a skill's author-only path
was designed to carry.

## Consequences

**A plugin shares one budget.** A hundred files and 2 MB across all of its
skills — the caps are about what a reviewer can read, which does not grow with
the number of `SKILL.md` files.

**Files may only reach within their own plugin.** Codex installs by copying the
plugin directory, so a path out of it breaks on install. `../` between two skills
of one plugin is inside it and works; the validator's path rules already refuse
anything that escapes a listing.

**An MCP server that moves needs a pull request.** A literal URL is a URL a
deployment cannot change without the registry seeing it, which is the point, and
is also friction for an author whose servers are not yet at stable addresses.
Such an author can list the plugin without `mcp.json` and document the servers
for the user to add themselves.

**The site shows plugins apart from skills.** A plugin has several categories,
languages and sensitivities, one per skill; the catalogue's facets are for
skills, and folding plugins into them would make each facet a question with two
meanings.

## When to revisit

- **A third client** the marketplace serves reads a different layout.
- **The specification revises** `plugin.json` or `mcp.json` — the vendored
  schemas and `plugin.test.ts` fail first.
- **A plugin needs something refused here** — hooks, a legacy transport, an
  extension — for a reason a reviewer can check. That is a ruling to make on
  that plugin, the way #151 ruled on `.mcp.json`, not a reason to relax the
  allowlist in advance.
