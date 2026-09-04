---
name: plain-language-notice-rewriter
description: >
  Rewrites a government notice template into plain language at a target reading
  level, preserving every legally required element. Works on templates, not on
  filled notices containing a specific person's information. Produces a draft for
  human review; it does not approve or send anything.
license: CC0-1.0
compatibility: >
  No network access, no credentials, no external services. Reads and writes local
  files only. Reading-level scoring uses a bundled script with no dependencies.
allowed-tools: Read, Write, Grep
metadata:
  civic.category: communications
  civic.category-secondary: constituent-services
  civic.scope: any
  civic.data-sensitivity: none
  civic.human-review: advisory-only
  civic.use-when: >
    Rewriting a notice, letter, or form-instruction template for readability, or
    auditing an existing template against a target reading level. Also worth
    running before translation — plain English translates better and cheaper
    than bureaucratic English.
  civic.avoid-when: >
    Not for filled notices containing a real person's name, case number, or
    determination — templates only. Not a substitute for legal review: it
    preserves the required elements you list, but cannot tell you what those
    elements are. It decides nothing: every output is a draft someone else has
    to read, approve, and send.
  civic.maintainer: "Civic Skills Registry maintainers"
  civic.affiliation: academic
  civic.deployment: none
---

# Plain Language Notice Rewriter

Government notices fail people for a predictable set of reasons: they lead with
authority instead of consequence, bury the deadline, name a form without saying
where to get it, and sit four grades above the reading level of the people who
receive them. This skill rewrites a notice template to fix those things without
dropping anything a statute requires.

## Steps

1. **Read the source template.** If it contains anything that looks like real
   constituent data, stop and tell the user before going further.

2. **Inventory the required elements** before changing a word. Ask the user for a
   list if one was not supplied. Typically: the determination, the legal basis,
   the effective date, the appeal right, the appeal deadline, the appeal method,
   and a contact. Write them down — you will check against this list at the end.

3. **Restructure, then rewrite.** Order matters more than vocabulary:
   - What happened, in the first sentence
   - What it means for the reader
   - What they must do, and by when
   - How to do it, including where to get any form named
   - How to get help, including language access

4. **Rewrite each section:**
   - Second person. "You must apply by March 1", not "Application must be received"
   - Active voice, present tense
   - Short sentences. One idea each
   - Replace terms of art on first use, or define them inline
   - Keep statutory citations, but move them out of the sentence a person must act on
   - Dates as "March 1, 2027", never "30 days from the date of this notice"

5. **Score the result.** Run `scripts/reading_level.py` on the draft. Target grade
   6-8 unless the user set a different level. If it scores higher, the usual cause
   is sentence length, not word choice.

6. **Check the inventory.** Walk your list from step 2 and confirm each element
   survived. Report anything you could not preserve — do not quietly drop it.

7. **Report what changed**, in this order: elements preserved, reading level before
   and after, structural changes, and anything you were unsure about.

## Output

Always end with the review notice, verbatim:

> This is a draft for human review. It has not been checked for legal sufficiency.
> Confirm every required element and every deadline before this notice is sent.

## Adapting this to your jurisdiction

`references/required-elements.md` holds a starting checklist by notice type. It is
generic on purpose. Replace it with your own — your statutes, your appeal windows,
your contact conventions — and this skill becomes materially more useful.

`references/plain-language-swaps.md` holds common term replacements. Add the ones
your agency actually uses.
