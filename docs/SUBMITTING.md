# Installing and sharing a skill

Two halves. **Part 1** is getting a skill out of the registry and into your
agent. **Part 2** is putting one in.

Neither needs you to be a developer.


---

## Part 1 — Installing a skill

**The steps now live on the site:
[Using the Exchange](https://ai-lab-for-cities-at-harvard.github.io/civic-skill-exchange/#/guide).**
It covers installing one skill in Claude, Claude Code, ChatGPT, Gemini and Codex,
adding the whole exchange as a marketplace in Claude Code and Codex, and the
words you meet on GitHub. Each step there was checked against the product, and
the page says when.

It is on the site rather than here so that there is one copy, in English and
Spanish, that cannot drift from a second one
([#224](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/224)).
Every skill and plugin page also shows its own exact install lines.

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
lives in, or paste your `SKILL.md` directly. If the skill is one folder of a
larger repository, paste that folder's address —
`github.com/you/repo/tree/main/my-skill` — and only that folder is read.
A plugin goes in the same way; see [Sharing a plugin](#sharing-a-plugin).

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
   page. A fork is your own copy of the exchange on GitHub. Changes you make
   there don't affect anyone else until you ask for them to be added, which is
   the pull request in the next step. The page cannot guess its address: you may
   rename your copy, or keep it under a different account.

   ![GitHub's Create a new fork dialog. Leave the Repository name field exactly as it is — GitHub invites you to change it, and a renamed fork is one the page cannot find.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/github-01-fork-dialog.png)

3. **Drag the whole folder in.** The page opens the upload page at
   `skills/{your-username}/`, and GitHub keeps the name of the folder you drop —
   which is how it lands at `skills/{your-username}/{skill-name}/`. **Do not open
   the folder and drag its contents**, and do not rename it.

   ![GitHub's upload page in your fork. Check the breadcrumb reads skills / your-username before you drop anything, and note that Commit directly to the main branch is selected by default.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/github-02-upload-page.png)

   Then **Commit changes**, choosing **commit directly to the `main` branch**.
   It is your own copy, so nothing is affected until the pull request in the
   next step.

   ![The commit box at the foot of the upload page, with Commit directly to the main branch selected. Leave it that way: the fork is your own copy.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/github-03-commit-box.png)

4. **Open the pull request.** The button on the page compares your fork's `main`
   with the registry and lets you open it.



**If you are submitting into the Lab's own namespace**, there is no fork step —
you have write access, so you upload straight into the registry. Because that is
the registry itself and not your own copy, choose *create a new branch and start
a pull request* rather than committing to `main`.

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

### Sharing a plugin

A plugin is several skills that belong together, with the MCP servers they use —
for example, one skill that builds a dashboard, one that refreshes it and one
that writes a brief from it. It goes under `plugins/` instead of `skills/`, in
the [Agent Plugins](https://agent-plugins.org/specification) layout.

The [submission page](https://ai-lab-for-cities-at-harvard.github.io/civic-skill-exchange/#/submit)
takes a plugin the way it takes a skill. Drop the folder as a `.zip` (a
`.plugin` file is a zip too), or paste the address of its repository or of the
folder inside one. A folder with `plugin.json` at its top switches the page to
the plugin form by itself. The page:

- shows the plugin's skills and each MCP server with the host it connects to;
- asks what describes the whole plugin once, and each skill only what its
  `SKILL.md` leaves unanswered — a skill with nothing missing starts closed
  and marked complete;
- writes `$schema`, the name `{your-github-username}-{plugin-name}` and your
  answers into `plugin.json`, and each skill's answers into its own `SKILL.md`,
  and shows you the lines it added;
- hands the folder back for the upload into `plugins/{your-github-username}/`,
  through the same fork, upload and pull request steps as a skill of several
  files.

A plugin exported from Claude Code has `.claude-plugin/plugin.json` and
`.mcp.json` but no `plugin.json` or `mcp.json` at its top. The page converts it
for you, says so above the form, and shows the two new files with the lines it
added:

- `plugin.json` is written from `.claude-plugin/plugin.json`, with `$schema`
  first and the fields Agent Plugins defines (`name`, `version`,
  `description`, `author`, `homepage`, `repository`, `license`, `keywords`).
  Claude Code settings it has no place for — `hooks`, `commands`, `agents` and
  the like — are left out, each named with the reason.
- `mcp.json` is written from `.mcp.json`, with `$schema`, an `http` server
  becoming `streamable-http` and a `stdio` server left as it is.
- What it cannot carry across is listed, not written through: a server whose
  address or header is a `${VAR}` filled in from your computer, a `stdio`
  server that runs through `${CLAUDE_PLUGIN_ROOT}`, an `sse` server (which
  Codex does not load), and files outside `skills/` other than `README.md`.
  A server left out is one the listed plugin will not connect to.
- For a remote server left out because its address is a `${VAR}`, the page
  shows a box under that list: paste the server's public `https://` address
  there. The page checks it as the validator checks a server's address — it
  must be an absolute `https` URL (plain `http` only to `localhost`), with no
  `${…}` in it — and refuses anything
  else with the validator's own message, keeping the server out. An address it
  accepts puts the server back into `mcp.json` as `streamable-http`, and it
  shows under "What we added". Leave the box empty and the server stays out.
  There is no box for an `sse` server or one that runs through
  `${CLAUDE_PLUGIN_ROOT}`; to keep one of those, change the plugin itself and
  bring it again, or edit `mcp.json` in the folder the page hands back.

It leaves out `.claude-plugin/`, `.codex-plugin/` and `.mcp.json` from every
plugin it reads, because the registry writes those.

By hand, the folder looks like this:

```
plugins/{your-github-username}/{plugin-name}/
  plugin.json          $schema, name "{your-github-username}-{plugin-name}", description,
                       license, and the plugin's civic metadata (below)
  mcp.json             optional — each server a literal https URL
  README.md            optional
  skills/{skill-name}/SKILL.md     one per skill
```

What describes the whole plugin is written once, in `plugin.json`; what can
differ between its skills stays in each `SKILL.md`:

```json
"extensions": {
  "io.github.ai-lab-for-cities-at-harvard": {
    "civic.maintainer": "Your Name",
    "civic.affiliation": "government",
    "civic.deployment": "organization",
    "civic.deployed-at": "City of Example",
    "civic.use-when": "…",
    "civic.avoid-when": "…"
  }
}
```

Each skill's frontmatter then carries `category`, `scope`, `language`,
`data-sensitivity` and `human-review` (and `localization` or `jurisdiction` if
they apply) — but not the fields above.

```bash
npx tsx validator/src/cli.ts plugins/{your-github-username}/{plugin-name}
```

Two things differ from a skill. Every MCP server needs its real `https`
address, not one read from an environment variable, because a reviewer has to
be able to see where it connects. And no credentials in `mcp.json`: anything
there is published with the plugin. Do not write `.claude-plugin/` or `.mcp.json`
yourself — the registry generates them after merge. Why it works this way is
[ADR 0005](adr/0005-plugins-are-a-second-listing-kind.md).

[CONTRIBUTING.md](../CONTRIBUTING.md) is the full contract, with a worked example
and the field tables.
