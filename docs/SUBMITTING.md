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

It checks the folder with the same rules CI applies to a skill's own
directory. A skill with an MCP server is a plugin, so a `.mcp.json` or
`mcp.json` in a skill folder stops the hand-off; bring it as a plugin instead.
The two manifests the exchange generates, `.claude-plugin/plugin.json` and
`.codex-plugin/plugin.json`, are left out and named, so a zip downloaded from
the exchange can be dropped back on the page.

![The submission page: a notice that a GitHub account is needed, then three ways to give it a skill — a repository address, a zip upload, or a pasted SKILL.md.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/site-01-submission-page.png)

### Step 2 — Answer only what it could not find

Everything the page read is shown back to you. What remains are the `civic.*`
fields the registry needs and a skill written elsewhere will not have: what it is
for, what data it touches, whether its output reaches a decision about somebody.

Those last two are the questions nobody can answer by reading your code, and
they are the reason this registry exists rather than a folder of gists.

![A note listing the fields read out of the uploaded file — the name, the description, the licence — so you are not asked for them twice.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/site-02-read-from-your-file.png)

**The license is yours to choose.** The page does not fill one in for you. It
starts empty unless your files already declare one, and it explains what a
license means for the people who reuse your work: with none, they may not reuse
it at all. It offers MIT, Apache-2.0 and CC-BY-4.0, and "another license" for any
other [SPDX identifier](https://spdx.org/licenses/) such as `BSD-3-Clause`. The
choice is written to `license:` in your `SKILL.md`.

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

**Your GitHub username comes first.** It names the folder your submission goes
in, and the checks admit it only when the account that opens the pull request
has that username. So the page checks it before it hands off, on the skill form
and the plugin form alike:

- **Until you type one**, the page gives no link, no download and no commands,
  because every path would start `skills//` or `plugins//`. It says so instead.
- **It asks GitHub whether the account exists**, using GitHub's public user
  lookup, which needs no sign-in. It waits until you stop typing, and asks
  nothing for a name GitHub would not allow. If GitHub is busy or you are
  offline, the page says it couldn't check and lets you carry on.
- **When you paste your fork's address**, the page compares the account the
  fork is under with the username, and says so if they differ. It does not
  change the username for you: if you are signed in to GitHub as the fork's
  account, change the username to match.
- **The registry's own address is refused** as the address of your copy. Fork
  it first, then paste the address of the copy GitHub makes for you.
- **Reading a skill from a repository does not fill the username in.** Whoever
  owns that repository is not necessarily the person submitting it.

**If your skill is one file**, the page opens GitHub's editor with the whole file
already in it. Commit, and GitHub offers the pull request. GitHub's editor cannot
carry a title, so give the pull request one yourself: **Add skill** and the name.

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
   `skills/{your-username}/{skill-name}/skills/`, and GitHub keeps the name of the
   folder you drop — which is how it lands at
   `skills/{your-username}/{skill-name}/skills/{skill-name}/`. GitHub creates the
   directory the first time you commit, so it is fine that it doesn't exist yet. **Do not open
   the folder and drag its contents**, and do not rename it.

   ![GitHub's upload page in your fork. Check the breadcrumb reads skills / your-username / skill-name / skills before you drop anything (the picture predates that path, so its breadcrumb is shorter), and note that Commit directly to the main branch is selected by default.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/github-02-upload-page.png)

   Then **Commit changes**, choosing **commit directly to the `main` branch**.
   It is your own copy, so nothing is affected until the pull request in the
   next step.

   ![The commit box at the foot of the upload page, with Commit directly to the main branch selected. Leave it that way: the fork is your own copy.](https://raw.githubusercontent.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/guide-assets/guide/github-03-commit-box.png)

4. **Open the pull request.** The button on the page compares your fork's `main`
   with the registry and opens GitHub's pull request form with a **title and
   description already filled in**: `Add skill {username}/{skill-name}` (or
   `Update skill …` when the skill is already listed, and `plugin` for a plugin),
   and a description naming the listing, your namespace and what the page
   checked in your browser — the registry's own field rules, the same module CI
   runs — including any findings still outstanding. They are in English whatever
   language the page is in, because the maintainers who read them work in
   English. Read them, change anything that is wrong, and choose **Create pull
   request**. A very long list of findings is cut at a whole line so the link
   stays within what GitHub accepts; the checks on the pull request list
   everything.



**If you are submitting into the Lab's own namespace**, there is no fork step —
you have write access, so you upload straight into the registry. Because that is
the registry itself and not your own copy, choose *create a new branch and start
a pull request* rather than committing to `main`.

### Step 5 — The checks run, and report back

The checks start as soon as the pull request is open, and a comment appears on it.
It names anything blocking, anything flagged for a human, and which step failed
if one did. Then a maintainer reads it. The page says the same thing after the
hand-off.

- **Blocking** stops the merge. Do not rewrite code to dodge a signature —
  explain what you are doing in a comment. There are legitimate reasons to need
  most of them.
- **Flagged** does not stop anything. Several fire on entirely ordinary skills.
  A maintainer will look.

What is checked, and what is deliberately not, is in
[CONTRIBUTING.md](../CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

**Who is asked to review.** It depends on where the pull request lands, and
comes from [`.github/CODEOWNERS`](../.github/CODEOWNERS):

| Your pull request touches | Who GitHub asks | What you do |
|---|---|---|
| `skills/{your-username}/` only | **Nobody.** The folder has no owner, so no reviewer is requested. The repository still needs one approving review before anything merges, and it has to come from a maintainer. | Nothing is required. If it has waited a while, comment on the pull request. |
| `plugins/` (any plugin, even in your own namespace) | **The maintainers team, automatically.** | Nothing. |
| `skills/civic-skills/` (the Lab's own namespace) | **The maintainers team, automatically.** | Nothing. |

**The Reviewed tier is a separate request.** A merged skill lists in the
Community tier. Reviewed means the Lab read every line of one commit
([TIERS.md](TIERS.md), [REVIEW.md](REVIEW.md)), and nothing on the pull request
asks for it. After the pull request merges, open an issue from the
[review request template](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/new?template=review-request.yml).
The page links it too.

### If it goes wrong

| What you see | What it means |
|---|---|
| *a skill must live at `skills/{username}/{skill-name}/skills/{skill-name}/SKILL.md`* | The files landed in the wrong place. The page's upload lands your folder at `skills/{username}/{skill-name}/skills/{skill-name}/SKILL.md`; anywhere else is a mistake. Usually the folder was opened and its contents dragged, or the folder was dragged into a directory that already named it. Move the directory and push again. |
| *a single skill's files go one level down* | Your files landed at `skills/{username}/{skill-name}/`, the listing's root, which holds only what the exchange generates. Move them, `SKILL.md` included, into `skills/{username}/{skill-name}/skills/{skill-name}/` and push again. |
| *`SKILL.md` is missing* | Same cause, seen from the other side: `skills/{username}/{skill-name}/skills/{skill-name}/`, the directory the registry looks in, has no `SKILL.md`. |
| *`civic.deployed-at` is required* | You said a team or an organization uses this. Name it, or change the answer to `personal` or `none` — personal use asks for nothing further. |
| *Type your GitHub username above first* | The username box is empty. The page holds back the links, the download and the commands until it has a username, because every path it gives starts with it. |
| *No GitHub user called …* | GitHub has no account with that username. Check the spelling against your github.com address. A folder that doesn't match the account opening the pull request is rejected. |
| *Couldn't check … with GitHub just now* | GitHub's public lookup was busy or rate-limited, or you are offline. Nothing is wrong with the username as far as the page knows, so carry on. The checks on the pull request will catch a wrong one. |
| *Your copy is under `…`, but the username above is `…`* | You forked into a different account from the username you typed. That is how a submission ends up in `skills/{one-account}/…` with commits from another, and fails the ownership check. Use the account you are signed in to GitHub as, in both places. |
| *That is the registry's own address, not your copy* | You pasted the exchange's own address. Fork it first with the page's button, then paste your fork's address, which has your username in it. |
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

First fork the registry on GitHub, so that you have a copy of your own. You
clone your fork, not the registry, because only the registry's maintainers can
push to the registry. Then, with the folder the submission page handed back
(unzipped) at `/path/to/{skill-name}`:

```bash
git clone https://github.com/{your-github-username}/civic-skill-exchange.git
cd civic-skill-exchange
git checkout -b add-{skill-name}
mkdir -p skills/{your-github-username}/{skill-name}/skills
cp -R /path/to/{skill-name} skills/{your-github-username}/{skill-name}/skills/{skill-name}
npm ci
npx tsx validator/src/cli.ts skills/{your-github-username}/{skill-name}
git add skills/{your-github-username}/{skill-name}
git commit -m "Add skills/{your-github-username}/{skill-name}"
git push -u origin add-{skill-name}
```

If you renamed your fork, use its name in the clone address and in `cd`. When
the push finishes, `git` prints a link for opening the pull request; if you miss
it, open your fork on GitHub and choose "Compare & pull request".

For a plugin, the same steps go under `plugins/`, with the folder copied to
`plugins/{your-github-username}/{plugin-name}`:

```bash
git clone https://github.com/{your-github-username}/civic-skill-exchange.git
cd civic-skill-exchange
git checkout -b add-{plugin-name}
mkdir -p plugins/{your-github-username}
cp -R /path/to/{plugin-name} plugins/{your-github-username}/{plugin-name}
npm ci
npx tsx validator/src/cli.ts plugins/{your-github-username}/{plugin-name}
git add plugins/{your-github-username}/{plugin-name}
git commit -m "Add plugins/{your-github-username}/{plugin-name}"
git push -u origin add-{plugin-name}
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

The license is asked once, for the plugin, and is not assumed: the page starts
empty unless `plugin.json` declares one, or every skill already declares the same
one. The registry's checks still require `license` in each `SKILL.md`, so the page
writes the plugin's license into every skill that has none. A license a skill
already declares is left as its author wrote it. By hand, put the same SPDX
identifier in `plugin.json` and in each `SKILL.md`.

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
