---
name: submit-a-skill
description: >
  Writes a civic agent skill as a real directory — SKILL.md, scripts,
  references — and opens the pull request that adds it to the
  civic-skill-exchange registry under the author's own GitHub namespace. Reads
  the registry's published frontmatter contract and category vocabulary at run
  time rather than carrying a copy, and reports the registry's own check result
  back rather than asserting the skill passed.
license: CC0-1.0
compatibility: >
  Needs git and the GitHub CLI (`gh`), signed in as the person submitting —
  `gh` is what carries the credentials, so this handles no token. Fetches the
  published schema and category vocabulary over HTTPS; --schema and
  --categories accept local paths instead, for offline use against a
  checkout's own build output. Writes only inside the directory you point it
  at, and pushes only to your own fork.
allowed-tools: Bash
metadata:
  civic.category: open-data-publishing
  civic.jurisdiction: generic
  civic.data-sensitivity: none
  civic.human-review: none
  civic.use-when: >
    Someone has a task they keep doing by hand and wants it to become a skill
    other governments can install, or has already written a skill and wants it
    listed in the registry. Also for turning a working prompt into a skill
    that passes the registry's checks the first time.
  civic.avoid-when: >
    Not for changing a skill already listed — that is an edit in the registry,
    not a new submission, and this refuses it. Not a review: the checks it
    reports can only reject, and a pass says nothing about whether the skill
    is correct, safe, or fit for any purpose. Not a way to publish somebody
    else's work — it submits under the signed-in account and nothing else.
  civic.maintainer: "Civic Skills Registry maintainers"
  civic.contact: "security@civic-skill-exchange.example"
  civic.affiliation: academic
  civic.deployment: none
---

# Submit a Skill

Turns something the author already knows how to do into a skill in the
registry: ask about it, write the directory, open the pull request, and report
what the registry's checks said.

## What this never does

- **Submits under anybody but the signed-in account.** The registry's one
  ownership control is that a skill's namespace matches the pull request
  author. If the author wants the skill under an organization's name, they open
  the pull request from that account — there is no flag for it here, and do not
  offer to work around it.
- **Says a skill passed.** Step 6 relays the registry's comment. The checks can
  only reject; a pass is never a statement that a skill is safe, correct, or
  fit for any purpose.
- **Answers the two judgment questions for the author.** See step 2.

## Steps

1. **Ask the registry what a submission needs.** Do not work from memory or
   from this file — the required fields and the categories both change, and a
   remembered answer is how a submission fails a check nothing local can
   explain.

   ```
   python3 scripts/scaffold.py --contract
   ```

   That prints every field, whether it is required, the values it permits, what
   it means, and which fields become required or forbidden depending on another
   answer.

2. **Ask the author, in plain language.** Never read a schema key aloud: nobody
   should have to learn what `civic.human-review` means to answer it. Turn each
   field's meaning into an ordinary question, and offer the permitted values as
   choices in the author's words, using the labels the contract prints.

   Two of the questions are not derivable from anything and no scanner can
   answer them. Ask them in these words:

   - **What data does it touch?** — No personal data · Personal data (PII) ·
     Protected — statutory regime
   - **Does what it produces affect anyone's rights or benefits?** — No effect
     on rights or benefits · Informs a person, decides nothing · Feeds a
     decision someone acts on

   Take the author's answer. If they are unsure, describe what each option
   means and let them choose; do not choose for them, and do not pick the
   lowest option to make the submission easier.

   Push for `civic.avoid-when` even though it is optional. Nobody but the
   author can say where their own skill falls down, and it is the most useful
   line in a listing.

   The description is how an agent decides whether to invoke the skill, so it
   has to describe what the skill actually does. A description broader than the
   behaviour is a security finding, not a style problem.

3. **Write the skill.** Put the answers in a JSON file keyed by the field names
   the contract printed, write the body as markdown, and scaffold:

   ```
   python3 scripts/scaffold.py --answers answers.json --into DIR \
       --body body.md [--with-scripts] [--with-references]
   ```

   `DIR` is where the skill directory should be created; the skill's own
   directory is made inside it and named after the skill. Ask `--with-scripts`
   and `--with-references` only for what the skill actually has — an empty
   directory is noise a reviewer has to read past.

   The body is the author's. Write the steps as the author described them, in
   the order the work happens; do not pad it with sections they did not ask
   for. If an answer is missing or contradicts another, nothing is written and
   the problems are printed — fix those with the author and run it again.

4. **Read it back to the author before submitting.** Show them the SKILL.md.
   This is the last point at which a mistake costs nothing.

5. **Open the pull request.**

   ```
   python3 scripts/submit.py --dir path/to/the-skill
   ```

   Add `--dry-run` first to show the author exactly what will happen. This
   forks the registry if they have no fork, cuts a branch from the registry's
   main, puts the skill in `skills/<their login>/<skill name>/`, pushes to
   their fork, and opens the pull request. It prints the pull request URL.

6. **Report what the registry said, not what you think.** The pull request runs
   all four check layers and posts a comment. Wait for it and relay it:

   ```
   gh pr checks PULL-REQUEST-URL --watch
   gh pr view PULL-REQUEST-URL --comments
   ```

   Relay the comment as it stands. If a check failed, the comment names the
   field and says what is wrong — fix it with the author, commit to the same
   branch, and the checks run again. Do not diagnose a failure from this file:
   the comment is the authority, and the rules behind it live in the registry,
   not here.

## Where things go

A skill is a directory, and the shape matters to the checks:

```
skills/<your github login>/<skill-name>/
  SKILL.md            frontmatter and the steps
  scripts/            helper programs, if it has any
  references/         templates, checklists, worked examples
```

The directory name and the frontmatter's `name` have to match, and the
namespace has to be the login of whoever opens the pull request. `submit.py`
places both, so do not construct the path by hand.

## Changing a skill already listed

This submits new skills. A skill already in the registry is edited where it
lives — open a pull request against its directory. `submit.py` refuses rather
than opening a second listing for the same name.
