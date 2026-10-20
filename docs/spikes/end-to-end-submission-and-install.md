# An end-to-end walkthrough of submitting and installing

**Issue:** [#286](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/286)
**Status:** ruled 2026-10-20, all 13 recommendations accepted; see the rulings at the end.

**Run:** 2026-10-19, against the live site at `6e3e17d`, the first commit with every listing in the nested layout (ADR 0006).

**Clients:**
- Claude Code 2.1.302
- Codex CLI 0.163.0
- Chrome, on macOS 27.0

Two simulated newcomers went through the exchange. Each was told to act only on what was on screen, never on knowledge of this repository. Every step was recorded with the exact on-screen text. Two findings were also checked against the source: multi-word search and the command-line recipe.

## The two people

- **Priya** installs. She's a data analyst in a city performance office. She uses Claude Code and Codex at work, and types the commands she's given. She has never contributed to GitHub.
  - **What she did:** found the plain-language notice skill and installed it in both clients, then did the same with the `sgarcese/housing-dashboards` plugin. She confirmed each one loaded, and ran the update commands the guide gives.
- **Marcus** submits. He's an analyst at a county health department. He has a GitHub account he barely uses, and has never forked, committed or opened a pull request.
  - **What he did:**
    - submitted a skill folder whose frontmatter had only `name` and `description`, as a zip;
    - tried the repository-URL route;
    - submitted a one-skill plugin.
  - **Where he stopped:** at GitHub's pull-request form.

## How it was run, and its limits

- **Isolation:**
  - **Codex** ran in an empty `CODEX_HOME`, because this machine's Codex already had the exchange's marketplace from earlier testing.
  - **Claude Code** installed at project scope in a scratch directory, and everything was uninstalled afterwards. Both clients' marketplace and plugin lists matched their starting state at the end.
- **Submissions** were committed only to two throwaway branches, which were then deleted. `main` was unchanged. No pull request, issue or comment was opened.
- **Not observed:**
  - **The fork step.** The site's upload links target `main`. Marcus followed the same links with the throwaway branch name in their place, so the fork step itself wasn't exercised.
  - **A real folder drag.** A folder drag can't be automated, so Marcus uploaded each folder's files separately instead. The owner confirmed a real folder drop works on 2026-10-19 (#275).
  - **The interactive `/plugin` screens.** Priya ran the same command through the CLI (`claude plugin …`).
  - **A Codex model run.** It needs a login, and none was copied into the empty home.
  - **The registry's pull-request checks,** since no pull request was opened.
- **This account is not a clean one.** It already has claude.ai-synced copies of two listings, which caused one finding (I-9). The browser was signed in to GitHub as `sgarcese-hbs`, which the namespace check missed (S-1).

## What worked

- **Installing.** Both listings installed and loaded in both clients, using the page's own lines unchanged.
  - **Claude Code:** `plugin details` showed 1 skill for the notice listing, and 3 skills plus 5 MCP servers for the plugin. All 5 servers were "✔ Connected" with no configuration. A `claude -p` run listed all four skills.
  - **Codex:** `codex plugin list` showed both installed and enabled. `codex debug prompt-input` showed all four skills loaded.
- **The update commands** in the guide (`claude plugin update {ns}-{name}@civic-skill-exchange`, `codex plugin marketplace upgrade`) work as written. They were only tried against a current install.
- **The plugin page** lists the servers' hosts before you install.
- **Submitting:**
  - The zip was read, and the frontmatter written, correctly.
  - The page showed a diff, and the full file, before hand-off.
  - The hand-off said exactly where the folder would land: `skills/{ns}/{name}/skills/{name}/…`. That's where it landed.
- **The repository URL** was read in about 3 seconds, at a pinned commit, with provenance added.
- **The plugin** was detected and explained ("a plugin of 1 skill, connecting to no MCP servers"), and landed at `plugins/{ns}/{name}/` like the existing plugin.

## Findings: installing (Priya)

| # | What happened | The text involved | Severity |
|---|---|---|---|
| I-1 | A natural multi-word search finds nothing. Search matches the whole phrase as one string (`matchesQuery` in `site/src/lib/filter.ts`). | `plain language notice` → "0 of 6 skills"; `notice` → 1 | major |
| I-2 | The Claude Code lines are slash commands, shown beside Codex's shell commands with no cue to type them inside Claude Code. Pasted into a terminal, they fail. | `/plugin install …` → `no such file or directory: /plugin` | major |
| I-3 | Neither the skill page nor the guide says how to check an install worked, in either client, or whether to restart after a first install. Restarting is mentioned only for updates. | none | major |
| I-4 | The guide installs with `/plugin install`, but updates with `claude plugin update`, and never says they're the same command. | `claude plugin update {namespace}-{skill-name}@civic-skill-exchange` | minor |
| I-5 | No word on scope. The CLI installs for every project by default. | `--scope … user (default)` | minor |
| I-6 | Six routes are shown before the line that says two of them are all you need. | "the two marketplace lines are all you need" | minor |
| I-7 | The Plugins section ignores search, and plugins aren't counted in the hero or the grid. | the query `housingzzqq` still shows housing-dashboards | minor |
| I-8 | The guide presents `codex plugin marketplace upgrade` only for installs from before the layout move. An older Codex marketplace stays stale until it's upgraded. This machine's still listed two renamed skills. | "Installed a skill from here before it moved…" | minor |
| I-9 | On an account with a claude.ai-synced copy under another name, the housing skills load twice. | `housing-dashboards@synced` and `sgarcese-housing-dashboards` | minor, this account |
| I-10 | `curl` or a fetch tool sees only the empty app shell, so the install steps can't be read without a browser. | 986-byte `index.html` | minor |

These come from the clients, not this site: Codex's 19-second marketplace add with no progress; `codex mcp list` showing "Auth Unsupported" for remote servers that need no auth; a skill's version showing as a commit hash in Claude Code and as "local" in Codex; and Codex's first `upgrade` reporting "Upgraded 1" when nothing changed.

## Findings: submitting (Marcus)

| # | What happened | The text involved | Severity |
|---|---|---|---|
| S-1 | The username box is never checked against the GitHub login. Marcus typed `sgarcese`, but the browser's login was `sgarcese-hbs`. Files went to `skills/sgarcese/…` with commits by `sgarcese-hbs`, and nothing warned. The ownership check would fail only after the pull request. | "This has to match your login exactly — your skill goes in a folder of that name, and only you can write there." | major |
| S-2 | With the username empty, the page shows broken paths and no warning. | "skills//immunization-reminder-letter/skills", "plugins//county-health-toolkit" | major |
| S-3 | The one missing required field sat inside the collapsed "A few optional things" section. Its error uses an internal key. | "1 thing still to fill in, marked above." / "required when civic.deployment is 'team'" | major |
| S-4 | The license was filled in as MIT without asking, and had no help text. The plugin route requires a license, then flags the plugin's skill for a missing license with no field to supply it. | "+ license: MIT" / "Also flagged in this skill's SKILL.md: license the license is required" | major |
| S-5 | Leaving the page to fork, as step 2 says to, and coming back loses every answer and the uploaded zip. | "One button on GitHub, then come back and paste the address it gives you." | major |
| S-6 | The repository-URL route fills the username in from the repository's owner, then flags its own value. | "your GitHub username 'AI-Lab-for-Cities-at-Harvard' must be lowercase…" | major |
| S-7 | The command-line recipe can't work as written: it never copies the files in, `git commit -am` skips new files, and it pushes to `origin`, which is the registry (`Submit.tsx`, `PluginSubmit.tsx`). | `git commit -am "Add …"` / `git push origin add-…` | major, command line only |
| S-8 | The registry itself is accepted as "the address of your copy", giving a pull-request link that compares `main` with itself. | "Paste it from your browser's address bar, or type owner/name." | minor |
| S-9 | The status lines contradict each other. | "Nothing else to fix." beside "5 things still to fill in, marked above." | minor |
| S-10 | The page says "drop it here", but there's no drop zone, only a file button. | "Already have one? Drop it here…" | minor |
| S-11 | After the hand-off, nothing says what to put in the pull request or whether to ask for a review. GitHub's form has no template and no title. | "Add your description here..." / "at least 1 approving review is required" | minor |
| S-12 | The home page has no call to action for submitting. The page is reached only from the header. | nav "Submit" | minor |
| S-13 | Placeholders look like filled-in values, and required-field errors show on an untouched form. | "Permit Status Explainer", "en, es" / "the skill name is required" | minor |
| S-14 | Fields that were only re-folded are counted as "added". | "What we added to your SKILL.md — 10 lines" | minor |
| S-15 | The plugin route has no full-file preview, gates its download on a username where the skill route doesn't, and its username help says "your skill". | "Enter your GitHub username above, and the download is ready." | polish |

## Layout observations (for #287)

- **The submit page repeats the full hero,** so the form starts about 500px down, below the fold.
- **Steps 2–4 of the hand-off:**
  - "What is a commit?" and "What happens to a pull request?" touch the button borders below them.
  - The account paragraph butts against "Open the pull request".
  - "What is a fork?" sits tight against the Fork button.
- **"A few optional things"** has an oversized heading and triangle, with a double rule about 35px apart above it.
- **Code blocks:**
  - The first line is offset, because the recipe's template literal is indented inside `<pre>`.
  - Long lines are clipped at the right edge, with no wrap and no visible scrollbar.
- **Right edges:** notice boxes end at about 607px, and the form at about 760px.
- **Step buttons:** only step 1 has a primary button.

## Recommendations, for the owner's ruling

Each one is either a fix to file or a question. They're ordered by what blocks or misleads a newcomer most.

1. **Check the namespace before the hand-off (S-1, S-2, S-6, S-8).**
   - Derive it from the fork's address. The fork URL contains the login, so if the two differ, say so.
   - Check the typed username with GitHub's public user lookup, which needs no sign-in, so it's consistent with ADR 0003.
   - Block the hand-off while it's empty.
   - Refuse the registry's own address as "your copy".
   - Stop filling the username in from a repository's owner.
2. **Keep a draft across the fork round trip (S-5).** Save the answers in the browser as a per-viewer convenience, and restore them when the submitter comes back. The uploaded files may need re-adding, and the page should say so.
3. **Make every required question visible where it's asked (S-3, S-9).**
   - Open the section that holds a missing required field, or move that field out of "optional".
   - Word the errors in the page's own terms rather than `civic.*` keys.
   - Make the status line agree with itself.
4. **Ask for the license instead of assuming it (S-4).** Have the same explicit choice with help text on both routes. A plugin's skills take the plugin's license rather than being flagged for one the page can't take.
5. **Fix the command-line recipes (S-7):** copy the files in, `git add` them, and push to the submitter's fork remote. Both routes need this, with a test that runs the recipe in a throwaway repository.
6. **Say where each install line is typed, and how to check it worked (I-2, I-3, I-4, I-5).**
   - Label the Claude Code lines "type inside Claude Code", or offer the `claude plugin …` shell form beside them.
   - Add a "check it worked" line for each client (`claude plugin list` or `/plugin`, and `codex plugin list`), plus whether to restart.
   - In the guide, say that `/plugin` and `claude plugin` are the same command, and what scope does.
7. **Match search words independently, and include plugins (I-1, I-7).**
   - A listing matches when every word matches some field.
   - The Plugins section follows the search and filters.
   - The counts include plugins, or say "skills" exactly where they mean it.
8. **Tell the submitter what happens after the hand-off (S-11).** Pre-fill the pull request's title and body through the compare link's query parameters, and say a maintainer is asked to review automatically, or how to ask.
9. **Present `codex plugin marketplace upgrade` as the general way to refresh** the catalogue, not only for the layout move (I-8).
10. **Smaller fixes** that can go in one pass:
    - a real drop zone, or "choose it here" (S-10);
    - a submit call to action on the home page (S-12);
    - placeholders that read as examples, and errors shown only after a field is touched (S-13);
    - counting only real changes as "added" (S-14);
    - the plugin route's preview, download gate and wording (S-15);
    - fewer routes ahead of the "all you need" line (I-6).
11. **Fold the layout observations into #287.**
12. **Question: should the install steps be readable without a browser (I-10)?** A static, pre-rendered copy of each listing's install text would let fetch tools and agents read it. That's a larger change, and the need is unproven, so my recommendation is to note it and wait.
13. **Question: re-run this walkthrough after the fixes,** with a real fork and a real folder drag, as the check that they worked. My recommendation is yes, on the same two personas, so the results compare.

## Rulings (owner, 2026-10-20)

All 13 recommendations were accepted as written.

| Recommendation | Issue |
|---|---|
| 1. Check the namespace before the hand-off | #293 |
| 2. Keep a draft across the fork round trip | #294 |
| 3. Make every required question visible | #295 |
| 4. Ask for the license | #296 |
| 5. Fix the command-line recipes | #297 |
| 6. Say where install lines are typed, and how to check | #298 |
| 7. Search by words, and include plugins | #299 |
| 8. Say what happens after the hand-off | #300 |
| 9. Codex upgrade as the general refresh | #301 |
| 10. Smaller fixes | #302 |
| 11. Layout observations | added to #287 |
| 12. Install steps readable without a browser | noted; waits for a need |
| 13. Re-run after the fixes | #303 |

