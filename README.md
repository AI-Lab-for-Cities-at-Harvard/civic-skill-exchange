# Civic Skill Exchange

An open catalog of agent skills for civic use — government, public-sector, and nonprofit work.

A **skill** is a small, portable bundle of instructions (and sometimes scripts) that teaches an AI coding agent how to do one job well: explain a permit status in plain language, check a benefits application against eligibility rules, turn a budget spreadsheet into a published open-data file. Skills follow the [Agent Skills open standard](https://agentskills.io/specification), so they work across tools rather than locking you into one vendor.

This registry exists so that a city that solves a problem once can hand the solution to the next hundred cities.

---

## Two tiers

Every listing sits in exactly one tier, and the difference matters.

| | **Community** | **Reviewed** |
|---|---|---|
| Automated checks | Yes | Yes |
| Human review | No | The AI Lab for Cities at Harvard |
| Pinned to a commit | No | Yes — attestation covers one exact content hash |
| How many listings | Unbounded — this is where the long tail lives | Deliberately small; its value is its scarcity |
| What a listing means | It is well-formed and nothing mechanical is wrong with it | The Lab read every line of one commit and put its name on it — not an independent audit |

**A Community listing is not an endorsement.** It means the skill passed automated structural and security checks. Automated checks can only ever say *no* — a pass is never a statement that a skill is safe. Read anything from this tier before you run it, exactly as you would read any code you found on the internet.

See [docs/TIERS.md](docs/TIERS.md) for how tiers work and how a skill moves between them.

---

## Explore

Browse the catalog at **[ai-lab-for-cities-at-harvard.github.io/civic-skill-exchange](https://ai-lab-for-cities-at-harvard.github.io/civic-skill-exchange/)** — filter by category, jurisdiction, data sensitivity, and tier.

Skills are marked **generalized** or **localized**: a localized skill carries one jurisdiction's statute citations, form numbers, and deadlines, while a generalized one has had those lifted out into a context you fill in. If you're adopting rather than browsing, that's the field to filter on — see [docs/LOCALIZATION.md](docs/LOCALIZATION.md).

The site is generated from this repository. If you'd rather work with the data directly, the build publishes a static JSON API:

```
/index.json                              all skills, with tier and scan status
/categories.json                         the category vocabulary
/skills/{namespace}/{skill}.json         one skill's metadata
```

## Download

Skills are plain directories. Take one however you like:

**No tooling.** Every skill has a download link on its page — a zip of the
skill folder. Upload it wherever your agent tool takes skills. No git, no Node,
no account.

**In Claude Code, as a plugin marketplace.** The registry is one, so a skill is
one command:

```
/plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange --sparse .claude-plugin skills
/plugin install {namespace}-{skill-name}@civic-skill-exchange
```

The plugin name carries the namespace, because two people may publish a skill of
the same name. Each skill page shows its exact command.

`--sparse` is worth typing. Adding a marketplace clones the whole repository, and
you only need the manifest and `skills/` — about 60 KB rather than 400 KB. It
works without the flag; this just does not make you download the website source
to install a skill.

Fuller instructions for both Claude and ChatGPT, and how to submit one, are in
[docs/SUBMITTING.md](docs/SUBMITTING.md).

**In other agent tools.** Skills here follow the open
[Agent Skills](https://agentskills.io) format, so they work anywhere that has
adopted it — ChatGPT, Codex, Gemini CLI, Copilot, Cursor and others. Those tools
install a skill at a time rather than a repository: use the download link on the
skill's page, which is a zip of the skill folder rooted at a single directory,
which is the shape they expect.

**With a terminal:**

```bash
# A single skill, without cloning the whole registry
npx degit AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/skills/{namespace}/{skill-name} ./{skill-name}

# Or clone everything and copy what you need
git clone https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange.git
cp -r civic-skill-exchange/skills/{namespace}/{skill-name} ~/.claude/skills/
```

Install paths differ across agent tools — `.claude/skills/`, `.agents/skills/`, and others. Check your tool's documentation for where it looks.

**Before you run any skill from this registry:** read its `SKILL.md`, read anything under `scripts/`, and check the `allowed-tools` field. That field grants an agent tool access *without prompting you for approval*. This is true of every skill from every source, not just this one.

## Submit

Open a pull request adding your skill under `skills/{your-github-username}/{skill-name}/`. Automated checks run on the PR and report back in a comment. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contract and a worked example.

You can also open a [skill submission issue](../../issues/new?template=submit-skill.yml) if you'd rather not work in git directly.

---

## Documentation

| Document | What's in it |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to write and submit a skill; the frontmatter contract |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Repository layout, schema, category vocabulary, index build |
| [docs/TIERS.md](docs/TIERS.md) | Tier definitions, the attestation ledger, promotion and demotion |
| [docs/LOCALIZATION.md](docs/LOCALIZATION.md) | Generalized vs localized skills, and how to move between them |
| [docs/REVIEW.md](docs/REVIEW.md) | The reviewer checklist and process |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model, scan layers, CI hardening, how to report a problem |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Working on the registry itself — branching, TDD, test conventions |

What we're building next is on the [project board](https://github.com/orgs/AI-Lab-for-Cities-at-Harvard/projects).

What we're building next is on the [project board](https://github.com/orgs/AI-Lab-for-Cities-at-Harvard/projects).

## License

Registry infrastructure is licensed under [LICENSE](LICENSE). Each skill carries its own license in its frontmatter and remains the property of its authors.

## Disclaimer

Inclusion in this registry does not constitute endorsement, verification, or any guarantee regarding a skill's quality, functionality, security, or fitness for any purpose. Skills in the Reviewed tier have been read by named people against a published checklist; that is a statement about a specific commit, not a warranty. You are responsible for what you run.
