# The "Using the Exchange" page

**Issue:** [#224](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/224)
**Status:** design pass, ruled by the owner on 2026-10-18 (see the end). It encodes the rulings of 2026-10-17 and 2026-10-18 (questions 1–6 on #224) and turns them into a page outline, links and a screenshot list. Six questions remain, listed at the end. Written against the exchange at `1dcb359`.

## What is ruled

- **Its own page**, titled "Using the Exchange" (Spanish: "Cómo usar el intercambio"), with an item in the header.
- **Organised by task**, with the products inside each task.
- **Deep links:**
  - the install box on every skill and plugin page links to its product's section;
  - each GitHub step on the submission page has a one-line note that links to its glossary entry.
- **Screenshots:**
  - stored on the `guide-assets` branch and loaded by URL;
  - English interface only, with Spanish captions and alt text on the Spanish page;
  - each section dated "Captured on …";
  - captured by Claude through the owner's signed-in browser, or with the owner walked through each capture. Claude never enters credentials.
- **The page is the source.** `docs/SUBMITTING.md` Part 1 shrinks to a pointer to it.
- **The glossary** (fork, branch, commit, pull request, review) lives on this page (#213 walkthrough, ruling a).

## What the page has to be true to

Facts that constrain the wording, from the code and the docs as they stand:

- **Claude (claude.ai, Cowork):**
  - You upload the skill's `.zip`. Every skill page's download link gives exactly that file.
  - It needs a Pro, Max, Team or Enterprise plan with code execution.
  - Skills are per person, and nothing syncs between Claude surfaces.
- **Claude Code:**
  - The exchange is a plugin marketplace: `/plugin marketplace add … --sparse .claude-plugin skills plugins`, then `/plugin install {ns}-{name}@civic-skill-exchange`.
  - This works for skills and for plugins.
- **Codex:**
  - Its marketplace loads **plugins only**, for now (#207, #242).
  - A single skill goes in through the download, into `.agents/skills/`, until M9 moves every listing to the plugin layout (#241).
- **ChatGPT:** you upload the zip under Skills, and it may hold the skill for review.
- **Gemini:** which surface installs Agent Skills (the app, Gemini CLI, or both), and how, **is not yet verified**. It is checked against the live product before anything is written (#224, "to verify at build time").
- **Safety:** "Before you run anything from here" (read `SKILL.md` and `scripts/`, check `allowed-tools`) applies to every path. It belongs on this page, not only in SUBMITTING.md.

## Outline

Route `#/guide`, with a section as a path segment (`#/guide/claude`), the same scheme as `#/about/{section}`. Hash routing allows only one `#`, and a path segment is a link someone can send.

| § | Heading (en) | Anchor | Contents | Screenshots |
|---|---|---|---|---|
| — | Using the Exchange | — | One paragraph: what a skill and a plugin are, and that they follow open standards, so one listing works in several tools. | — |
| 1 | Install one skill | `install` | A short "which one is you?" list linking to 1a–1e. | — |
| 1a | In Claude (claude.ai and Cowork) | `claude` | Download the zip, then Settings, then upload. Plan requirement. Per person; no syncing. | 2–3: the setting, the upload, the skill switched on |
| 1b | In Claude Code | `claude-code` | The two commands, with `--sparse` explained in a sentence. | none (commands as copyable text) |
| 1c | In ChatGPT | `chatgpt` | Download the zip, then upload under Skills. It may be held for review. | 2: the Skills page, the upload |
| 1d | In Gemini | `gemini` | **Written after verification.** | per verified path |
| 1e | In Codex and other tools | `codex` | The download into `.agents/skills/` (or `$skill-installer`), with the note that the marketplace is for plugins for now. Where other tools look. | none |
| 2 | Add the whole exchange | `marketplace` | What a marketplace is, in one paragraph: every listing at once, updates come to you. | — |
| 2a | In Claude Code | `marketplace-claude-code` | Add the marketplace; install any skill or plugin by name. | none |
| 2b | In Codex | `marketplace-codex` | Add the marketplace; install a plugin. Single skills: see 1e. | none |
| 3 | Before you run anything | `safety` | The safety paragraph above, linking to SECURITY.md. | — |
| 4 | Share your own | `share` | Two sentences and a button to the submission page. | — |
| 5 | Words you'll meet on GitHub | `glossary` | Fork, branch, commit, pull request, review. Each gets a short entry with its own anchor (`glossary-fork`, and so on) and says why the step exists. The fork entry reuses the #243 wording. | — |

**Why there are no terminal screenshots:** a command in a code block can be copied, translated and kept current. A picture of a terminal can't, and it ages the fastest.

## Links into the page

| From | Link | To |
|---|---|---|
| The skill page's install box (`DownloadBox.tsx`) | "Step by step: Claude · ChatGPT · Gemini · Codex" under the download button | `#/guide/claude`, `/chatgpt`, `/gemini`, `/codex` |
| The skill page's install box, next to the Claude Code commands | "What these do" | `#/guide/claude-code` |
| The plugin page's install box (`PluginDetail.tsx`) | "Step by step" | `#/guide/marketplace` |
| Submission page, step 1 (fork) | "What is a fork?" | `#/guide/glossary-fork` |
| Submission page, step 3 (upload and commit) | "What is a commit?" | `#/guide/glossary-commit` |
| Submission page, step 4 (pull request) | "What happens to a pull request?" | `#/guide/glossary-pull-request` |
| About page, "Submitting" | a sentence pointing at the page | `#/guide` |
| README and SUBMITTING.md Part 1 | the pointer | the live page URL |

The submission-page notes are links, not more text. Step 1 already explains a fork (#243), so the note is the way to the full glossary.

## Screenshots

**Stored** on `guide-assets` under `guide/using/`, with names like `claude-01-settings.png`, next to the existing `guide/github-*.png` and `guide/site-*.png`.

**Loaded** by URL from `raw.githubusercontent.com`, as SUBMITTING.md does. They are outside the bundle, so the size gate is unaffected. Each image has:
- `loading="lazy"`;
- explicit `width` and `height`, so the page doesn't jump while it loads;
- a `<figure>` with a `<figcaption>`.

**Each section's date** comes from one record in the page's strings (`capturedOn: "2026-10-…"`), formatted by the locale's date function (#145 rules). A recapture is then a one-line change.

**Capture list:**

| # | Product | What | Notes |
|---|---|---|---|
| 1 | claude.ai | Settings, showing the Skills / Capabilities area | owner's signed-in browser |
| 2 | claude.ai | The upload dialog with the zip chosen | uses a listed skill, e.g. `plain-language-notice-rewriter`. Uploading **changes the owner's account**: Claude asks before this step and offers to remove the skill afterwards |
| 3 | claude.ai | The skill listed and switched on | |
| 4 | ChatGPT | The Skills page | same account caution as 2 |
| 5 | ChatGPT | The upload, or the review notice if it appears | |
| 6 | Gemini | per verified path | after verification |
| 7 | GitHub | **Recapture** of `github-03-commit-box.png`, with "Commit directly to the main branch" selected | for SUBMITTING.md Part 2, which #243 left without it; done in the same session |

Every capture records the date, the product's visible version or plan where it shows, and the account's interface language (English, per ruling 4c). A capture that shows personal data (name, email, avatar, other skills) is cropped or masked before it's committed.

## Accessibility and language

- The headings run h1 → h2 (each task) → h3 (each product). The site's axe check covers the new page, as it does every page (`a11y.test.tsx`).
- Every screenshot has alt text saying what to look for, not just what's pictured, in the same style as SUBMITTING.md's ("Check the breadcrumb reads …").
- All prose is in `en.ts` and `es.ts`. The no-literals and `es` shape tests cover it.
- Product names and interface labels stay in English inside the Spanish text (for example *Settings → Capabilities*), because the screenshots show the English interface (ruling 4c).

## Questions for the owner

1. **The header label.** "Using the Exchange" (Spanish: "Cómo usar el intercambio") is long for a header that already holds Browse, About, Submit and GitHub. On a phone, the Spanish version wraps.
   *Options:*
   - the full title in the header;
   - a short label, "Guide" (Spanish: "Guía"), with the full title as the page heading.

   *Recommendation:* the short label, placed after Browse: Browse · Guide · Submit · About · GitHub. #208's navigation pass can revisit the order.
2. **The route name.** `#/guide`, or `#/using`?
   *Recommendation:* `#/guide`. It's short, it matches the label in question 1, and it's the same word in links people send.
3. **The Claude Code command in the skill page's install box.** It omits `--sparse`, which SUBMITTING.md recommends. So the box and the guide would give different commands.
   *Recommendation:* add `--sparse .claude-plugin skills plugins` to the install boxes as part of this work, so the page, the boxes and the docs all say the same thing.
4. **The plugin page's install box.** It has `codex plugin marketplace add` but no `codex plugin add {ns}-{name}@civic-skill-exchange` line.
   *Recommendation:* add it, matching README and SUBMITTING.md.
5. **How to split the build.** One PR would carry the route, page, header, links, submission notes, docs and screenshots, which is too much to review well.
   *Recommendation:* make #224 an epic with three sub-issues, built in order:
   - **(A)** the page, route and header item, all text, with SUBMITTING.md Part 1 reduced to a pointer;
   - **(B)** the links from the install boxes, the submission-page notes and the About page, plus the `--sparse` and Codex lines (questions 3–4);
   - **(C)** the screenshots, captured with the owner, and the `github-03` recapture.

   Gemini's section ships in (A) only once it's verified. If verification is slow, (A) ships without it and (C) adds it.
6. **Which skill for the capture uploads.** The claude.ai and ChatGPT screenshots need a real upload into the owner's account.
   *Recommendation:* `civic-skills/plain-language-notice-rewriter`, the exchange's own Reviewed listing. Removing it afterwards is the owner's choice.

## Rulings (owner, 2026-10-18)

The owner accepted all six recommendations:

1. **The header label** is "Guide" (Spanish: "Guía"). The page heading is "Using the Exchange" (Spanish: "Cómo usar el intercambio"). The order is Browse · Guide · Submit · About · GitHub.
2. **The route** is `#/guide`, with sections at `#/guide/{section}`.
3. **`--sparse .claude-plugin skills plugins`** is added to the Claude Code marketplace command in the install boxes.
4. **The plugin page's install box** gains `codex plugin add {ns}-{name}@civic-skill-exchange`.
5. **#224 becomes an epic** with three sub-issues, built in order:
   - (A) the page, route and header, with SUBMITTING.md Part 1 reduced to a pointer;
   - (B) the links into the page and the install-box command changes (rulings 3 and 4);
   - (C) the screenshots, captured with the owner.
6. **The captures use `civic-skills/plain-language-notice-rewriter`.** Removing it afterwards is the owner's choice.
