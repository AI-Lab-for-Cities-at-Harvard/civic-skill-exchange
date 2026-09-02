# Installing and sharing a skill

Two halves. **Part 1** is getting a skill out of the registry and into your
agent. **Part 2** is putting one in.

Neither needs you to be a developer. Part 1 needs no account at all.

---

## Part 1 — Installing a skill

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
others read. **There is no marketplace to add.** Those tools install a skill at a
time.

The path that works everywhere: **use the download link on the skill's page.**
It is a `.zip` of the skill folder rooted at a single directory, which is exactly
the shape an upload expects.

- **ChatGPT** — Skills, then upload the zip. ChatGPT scans what you upload and
  may mark it for review before it will install.
- **Codex** — `$skill-installer`, or drop the unzipped folder into
  `.agents/skills/` in your project, `$REPO_ROOT/.agents/skills/`, or
  `~/.agents/skills/`.
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

<!-- IMAGE: 01-submission-page.png
     alt: The submission page, with the notice that a GitHub account is needed
     and the three ways to give it a skill. -->

### Step 2 — Answer only what it could not find

Everything the page read is shown back to you. What remains are the `civic.*`
fields the registry needs and a skill written elsewhere will not have: what it is
for, what data it touches, whether its output reaches a decision about somebody.

Those last two are the questions nobody can answer by reading your code, and
they are the reason this registry exists rather than a folder of gists.

<!-- IMAGE: 04-read-from-your-file.png
     alt: A note listing the fields read from the uploaded file, so they are not
     asked for twice. -->

The full field reference is on the
[About page](https://ai-lab-for-cities-at-harvard.github.io/civic-skill-exchange/#/about/metadata).

### Step 3 — Take the corrected folder

The page writes your answers into your own `SKILL.md`, between the `---` fences,
leaving everything else exactly as you wrote it — body, comments, key order.

**Download that folder and upload that one.** Your original on disk does not have
the answers in it. The page shows you the lines it added, so you can see what the
difference is.

<!-- IMAGE: 05-what-we-added.png
     alt: The lines the page added to SKILL.md, with a note that the original
     file on disk does not have them. -->

### Step 4 — Get it onto GitHub

This part happens on GitHub, because a link can carry one new file but not a
folder.

**If your skill is one file**, the page opens GitHub's editor with the whole file
already in it. Commit, and GitHub offers the pull request. You are done.

**If it is more than one file**, four steps:

<!-- IMAGE: 06-the-four-steps.png
     alt: The four numbered steps: download the folder, fork the registry, drag
     the folder in, open the pull request. -->

1. **Download the corrected folder** and unzip it.
2. **Fork the registry** — one button — then paste the address back into the
   page. It cannot guess it: you may rename your copy, or keep it under a
   different account.

   <!-- IMAGE: 01-fork-dialog.png (from capture-github.mjs)
        alt: GitHub's fork dialog. Leave the repository name as it is. -->

3. **Drag the whole folder in.** The page opens the upload page at
   `skills/{your-username}/`, and GitHub keeps the name of the folder you drop —
   which is how it lands at `skills/{your-username}/{skill-name}/`. **Do not open
   the folder and drag its contents**, and do not rename it.

   <!-- IMAGE: 02-upload-page.png (from capture-github.mjs)
        alt: GitHub's upload page, with the breadcrumb showing the namespace
        directory and the drop target. -->

   Then **Commit changes**, choosing **create a new branch and start a pull
   request** rather than committing to `main`.

   <!-- IMAGE: 03-commit-box.png (from capture-github.mjs)
        alt: The commit box at the bottom of the upload page, with "create a new
        branch for this commit and start a pull request" selected. -->

4. **Open the pull request.** If GitHub offered you one at the end of step 3,
   that is this step already done.

   <!-- IMAGE: 04-pull-request.png (from capture-github.mjs)
        alt: The compare page, with the Create pull request button. -->

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

[CONTRIBUTING.md](../CONTRIBUTING.md) is the full contract, with a worked example
and the field tables.
