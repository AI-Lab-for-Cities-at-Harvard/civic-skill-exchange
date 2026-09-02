# Installing and sharing a skill

Two halves. **Part 1** is getting a skill out of the registry and into your
agent. **Part 2** is putting one in.

Neither needs you to be a developer. Part 1 needs no account at all.

If you work in a coding agent — Claude Code, Codex — there is a third way to do
both, without a browser: [Part 3](#part-3--from-inside-a-coding-agent).

---

## Part 1 — Installing a skill

### In Claude itself — claude.ai and Cowork

This is the one most people will use, and it does not involve a terminal.

**Settings → Features → upload the skill as a `.zip`.** The download link on any
skill page gives you exactly that file, rooted at a single directory, which is
the shape the upload expects.

Three things worth knowing before you rely on it:

- It needs a **Pro, Max, Team or Enterprise plan with code execution enabled**.
- **Skills are per-person, not per-organization.** claude.ai has no central
  management for custom skills, so everybody who wants one uploads it
  themselves. A city cannot push a skill to its whole team this way.
- **Nothing syncs between surfaces.** A skill uploaded to claude.ai is not
  available in Claude Code or through the API, and the reverse. Upload it
  wherever you want to use it.

### In Claude Code

The registry is a plugin marketplace, so it is two commands:

```
/plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange --sparse .claude-plugin skills
/plugin install {namespace}-{skill-name}@civic-skill-exchange
```

Every skill page on the site shows its exact second line, ready to copy.

**Why `--sparse`.** Adding a marketplace **clones the whole repository** into
`~/.claude/plugins/marketplaces/`, and this one carries a website, a validator, a
test suite and documentation you have no use for. `--sparse .claude-plugin skills`
takes the manifest and the skills and leaves the rest — roughly 60 KB instead of
400 KB. It works fine without the flag; the flag just stops you downloading the
site source in order to install a skill.

The plugin name carries the namespace — `civic-skills-plain-language-notice-rewriter`
rather than `plain-language-notice-rewriter` — because two people may publish a
skill of the same name and plugin names have to be unique. It is unconditional, so
an install command you wrote down keeps working when a stranger publishes the same
name.

### In ChatGPT, Codex, and everything else

Skills here follow the open [Agent Skills](https://agentskills.io) standard — the
same `SKILL.md` format Claude, ChatGPT, Codex, Gemini CLI, Copilot, Cursor and
others read. So a skill from this registry works in all of them. **What differs
is how you get it there.**

**Codex has its own marketplace, and this registry publishes one:**

```
codex plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange
codex plugin add {namespace}-{skill-name}@civic-skill-exchange
```

The plugin names match the Claude ones on purpose, so the command reads the same
in both tools.

**For everything else, the download link on the skill's page.**
It is a `.zip` of the skill folder rooted at a single directory, which is exactly
the shape an upload expects.

- **ChatGPT** — Skills, then upload the zip. ChatGPT scans what you upload and
  may mark it for review before it will install.
- **Codex** — `$skill-installer`, or drop the unzipped folder into
  `.agents/skills/` in your project, `$REPO_ROOT/.agents/skills/`, or
  `~/.agents/skills/`. That last path is shared with Claude Code and Copilot CLI,
  so one copy serves all three.
- **Anything else** — check where your tool looks. `.claude/skills/` and
  `.agents/skills/` are the two common answers.

### Before you run anything from here

Read the `SKILL.md`. Read anything under `scripts/`. Check `allowed-tools` — that
field grants an agent access **without prompting you for approval**.

This is true of every skill from every source, not just this registry. Our
automated checks can only ever reject; a skill passing them is not a statement
that it is safe. See [SECURITY.md](SECURITY.md).

---

## Part 2 — Sharing a skill

**You will need a GitHub account.** It is free —
[create one](https://github.com/signup) if you do not have one. This is not
incidental friction: the check that admits a skill works by confirming the
account opening the pull request owns the folder the skill went into, so nobody
can submit on your behalf without changing whose skill it is.

The [submission page](https://ai-lab-for-cities-at-harvard.github.io/civic-skill-exchange/#/submit)
does most of the work. What follows is what actually happens, so you can tell
when something has gone wrong.

### Step 1 — Give the page your skill

Drop in a `.zip` of the skill folder, paste the address of the repository it
lives in, or paste your `SKILL.md` directly.

The archive is unpacked **in your browser**. It is not sent anywhere. The page
reads what is already in your `SKILL.md` and fills itself in.

![The submission page: a notice that a GitHub account is needed, then three ways to give it a skill — a repository address, a zip upload, or a pasted SKILL.md.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/site-01-submission-page.png)

### Step 2 — Answer only what it could not find

Everything the page read is shown back to you. What remains are the `civic.*`
fields the registry needs and a skill written elsewhere will not have: what it is
for, what data it touches, whether its output reaches a decision about somebody.

Those last two are the questions nobody can answer by reading your code, and
they are the reason this registry exists rather than a folder of gists.

![A note listing the fields read out of the uploaded file — the name, the description, the licence — so you are not asked for them twice.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/site-02-read-from-your-file.png)

The full field reference is on the
[About page](https://ai-lab-for-cities-at-harvard.github.io/civic-skill-exchange/#/about/metadata).

### Step 3 — Take the corrected folder

The page writes your answers into your own `SKILL.md`, between the `---` fences,
leaving everything else exactly as you wrote it — body, comments, key order.

**Download that folder and upload that one.** Your original on disk does not have
the answers in it. The page shows you the lines it added, so you can see what the
difference is.

![The lines the page added to SKILL.md, each marked with a plus, above a note that your original file on disk still does not have them.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/site-03-what-we-added.png)

### Step 4 — Get it onto GitHub

This part happens on GitHub, because a link can carry one new file but not a
folder.

**If your skill is one file**, the page opens GitHub's editor with the whole file
already in it. Commit, and GitHub offers the pull request. You are done.

**If it is more than one file**, four steps:

![The four numbered steps on the page: download the corrected folder, fork the registry and paste its address back, drag the folder in, open the pull request.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/site-04-the-four-steps.png)

1. **Download the corrected folder** and unzip it.
2. **Fork the registry** — one button — then paste the address back into the
   page. It cannot guess it: you may rename your copy, or keep it under a
   different account.

   ![GitHub's Create a new fork dialog. Leave the Repository name field exactly as it is — GitHub invites you to change it, and a renamed fork is one the page cannot find.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/github-01-fork-dialog.png)

3. **Drag the whole folder in.** The page opens the upload page at
   `skills/{your-username}/`, and GitHub keeps the name of the folder you drop —
   which is how it lands at `skills/{your-username}/{skill-name}/`. **Do not open
   the folder and drag its contents**, and do not rename it.

   ![GitHub's upload page in your fork. Check the breadcrumb reads skills / your-username before you drop anything, and note that Commit directly to the main branch is selected by default.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/github-02-upload-page.png)

   Then **Commit changes**, choosing **create a new branch and start a pull
   request** rather than committing to `main`.

   ![The commit box at the foot of the upload page, with Create a new branch for this commit and start a pull request selected instead of the default, and a branch name filled in.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/github-03-commit-box.png)

4. **Open the pull request.** If GitHub offered you one at the end of step 3,
   that is this step already done.



**If you are submitting into the Lab's own namespace**, there is no fork step —
you have write access, so you upload straight into the registry and take the same
*create a new branch* option.

### Step 5 — The checks run, and report back

A comment appears on your pull request. It names anything blocking, anything
flagged for a human, and which step failed if one did.

- **Blocking** stops the merge. Do not rewrite code to dodge a signature —
  explain what you are doing in a comment. There are legitimate reasons to need
  most of them.
- **Flagged** does not stop anything. Several fire on entirely ordinary skills.
  A maintainer will look.

What is checked, and what is deliberately not, is in
[CONTRIBUTING.md](../CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

### If it goes wrong

| What you see | What it means |
|---|---|
| *a skill must live at `skills/{username}/{skill-name}/SKILL.md`* | The files landed in the wrong place. Usually the folder was opened and its contents dragged, or the folder was dragged into a directory that already named it. Move the directory and push again. |
| *`SKILL.md` is missing* | Same cause, seen from the other side: the directory the registry looked in has no `SKILL.md` at its top level. |
| *`civic.deployed-at` is required* | You said a team or an organization uses this. Name it, or change the answer to `personal` or `none` — personal use asks for nothing further. |
| A field you never filled in | The page reports findings without blocking, on purpose. You can send a submission with them outstanding, and fix them on the pull request. |

Nothing here is unrecoverable. A pull request can be pushed to again, and a
maintainer can always be asked.

---

---

## About these screenshots

Captured **1 September 2026**, and kept on the
[`guide-assets`](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/tree/guide-assets)
branch rather than on `main`.

That is not fussiness. `/plugin marketplace add` clones this repository, and the
clone is shallow and single-branch — so a branch outside `main` costs somebody
installing a civic skill nothing, while these images on `main` would roughly
double the download.

**If they no longer match what you see, trust the page and not the picture** —
GitHub redesigns, and a stale screenshot is worse than none. Tell us, and we will
recapture.

---

## Part 3 — From inside a coding agent

The registry publishes two skills that do its own work. Install the marketplace
as in Part 1 and they are available like any other skill: you describe what you
want in your own words and the agent runs them.

### Finding a skill without leaving the editor

```
/plugin install civic-skills-search-the-exchange@civic-skill-exchange
```

Then ask for what you need — by category, by jurisdiction, or just by
describing the problem. It reads the live index, so what it reports is what is
listed right now, and every result carries its own tier and scan status. A
Community result means nobody has reviewed it; the skill says so on each one
rather than once at the top of a list.

### Writing a skill and opening the pull request

```
/plugin install civic-skills-submit-a-skill@civic-skill-exchange
```

Then say you want to share a skill. The agent asks about what your skill does,
writes the directory — `SKILL.md`, and `scripts/` or `references/` if it needs
them — and opens the pull request under your own GitHub username. You need
`git` and the [GitHub CLI](https://cli.github.com), signed in; that is what
carries your credentials, so nothing asks you for a token.

Three things worth knowing before you start:

- **It asks the registry what a submission needs** rather than working from
  memory, so it is asking for the fields that are actually required today.
- **It submits under the account you are signed in as, and there is no way to
  change that.** A skill's namespace has to match whoever opens the pull
  request. If the skill should sit under an organization's name, sign in as
  that account.
- **It reports what the checks said, not that you passed.** When the pull
  request is open it waits for the comment and relays it. The checks can only
  reject; a pass is never a statement that a skill is safe or fit for anything.

Ask for a dry run first if you want to see exactly what will happen — it prints
every command before running any of it.

---

## Doing it from the command line instead

```bash
git clone https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange.git
cd civic-skill-exchange
mkdir -p skills/{your-github-username}/{skill-name}
# write SKILL.md, plus scripts/ and references/ if you need them
npx tsx validator/src/cli.ts skills/{your-github-username}/{skill-name}
git checkout -b add-{skill-name}
git add skills/ && git commit -m "Add {skill-name}"
git push origin add-{skill-name}
```

That validator command is the same module the website and CI both run, so it
tells you the same thing they will.

If you also have Python to hand, `npm run check -- skills/{your-github-username}/{skill-name}`
goes further: it runs the signature scan too and prints the comment your pull
request will get, rendered by the code that posts it.

[CONTRIBUTING.md](../CONTRIBUTING.md) is the full contract, with a worked example
and the field tables.
