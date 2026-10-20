# ADR 0008 — The browse page: compact rows, a Skills/Plugins toggle, and collections

**Status:** accepted, 2026-10-20
**Supersedes:** part of [ADR 0002](0002-lab-is-authorship-not-a-tier.md) decision 3 — where the Community chip's note is shown, on the browse page's closed rows only
**Analysis:** [spikes/browsing-the-catalogue.md](../spikes/browsing-the-catalogue.md)
**Rulings:** [#208](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/208), [#209](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/209)

## Context

- **What prompted it.** Every listing on the browse page is a full card. At 48 skills and 8 plugins the page is 10,234 px tall at desktop and 26,227 px at a phone, and the plugins are reached only by scrolling past every skill. #208 asked for a compact view; #209 asked for a way to point readers at listings that work together.
- **What the spike did.** It prototyped collapsible rows, a list toggle, denser cards, paging and collections against a synthetic catalogue. The owner then reviewed the collapsible rows with numbered pages live, and changed four things in a second round: the Lab as a label only, the tier word only on a closed row, an even grid of collection tiles, and a Skills/Plugins toggle.
- **The constraint it changes.** ADR 0002 decision 3 shows the Community chip *with its note* beside the Lab chip, because the chip alone invites a reader to assume someone checked the listing. On a closed row, the note and the Lab chip together pushed the name onto two lines, which the owner ruled is the worse cost to readability.

## Decision

**1. Collapsible rows are the browse page's only layout.** No view toggle and no second layout.
- **A closed row** shows the name, the namespace, the tier word, `Written by the AI Lab` when it applies, the category, and a Details button.
- **An open row** adds the tier chip with its note, the other badges, the description, the scopes and the link to the listing's page.
- **The Lab is a label on the row,** never a section of its own. A section would repeat what the labels say and push the catalogue down.

**2. The tier's note leaves the closed row, and nothing else does.** This is the part of ADR 0002 decision 3 this record supersedes.
- **On a closed row the note is visually hidden, not removed,** so a screen reader still hears "Community, automated checks only".
- **The Community chip itself stays on every row,** including the Lab's, which is the substance of ADR 0002 decision 3.
- **Everywhere else the note stays where it is:** the open row, the listing's own page and the download box. The tier band above the catalogue still explains both tiers.

**3. Numbered pages of 24, now.**
- Previous, the page numbers and Next are links to the page's own URL. A page change pushes a history entry and moves focus to the count.
- Not show-more, because a reader cannot link or return to "the third batch".

**4. The browse page's state is in its URL,** for example `#/?category=hr&page=2&show=plugins`.
- **Filter changes replace the history entry,** so typing doesn't leave forty Back steps.
- **Page and section changes push one,** so Back returns to them.
- **Values that are not vocabulary ids are dropped.**
- **A filter change returns to page 1.**

**5. A Skills/Plugins toggle switches between the two sections.**
- **Each side is a link** with its count, `Skills 48 | Plugins 8`. The counts follow the search and the filters, and `aria-current` marks the side shown.
- **Switching keeps the reader's place.** It is handled in place, as the pager is. The page moves only when the toggle has scrolled out of view, and then to just above it.
- **Plugins stay apart from skills,** as ADR 0005 decided. They page on their own, with the same control, once they pass 24.

**6. On a phone, the filters start closed.**
- **Below 1024 px,** the facets sit behind a Filters button that says how many are set, for example `Filters (2 on)`.
- **Search stays open.**
- **At desktop the facets always show.**

**7. Collections are recorded in `registry/collections.yml`.**
- **Ownership:** maintainers, through the existing `/registry/` CODEOWNERS line.
- **Languages:** bilingual, like `categories.yml`.
- **Publishing:** `build_index.py` publishes them as `collections`, members as `{kind, id}`. The build fails on a member that doesn't exist.
- **Contents:** each collection has a title, a note on why its listings belong together, and a `featured` flag for the ones the browse page shows. A collection can mix skills and plugins, and a plugin's row is marked as one.

**8. They are called Collections,** never "Featured", "Curated" or "Recommended". This follows ADR 0002 decision 4.

**9. A collection is not a review.**
- **Any listing may be in one.**
- **The collection says so** in a `.notice`, per #101 ruling 6.
- **Every row keeps its own tier.**

**10. Where collections appear.**
- **On the browse page,** as tiles at the top of the unfiltered first page. The tiles are an even grid: the same width and height, with their counts aligned along the bottom. They stack on a phone, and hide once a filter is chosen.
- **On a page of its own** at `#/collection/{slug}`, loaded on demand to protect the size gate.

**11. Built on ADR 0007's primitives,** with the two fixes the prototypes found carried by #316:
- `[hidden]` on a primitive hides it;
- `Cluster` takes an `align` prop.

## Consequences

- **The page shortens.** Collapsible rows with pages of 24 measured 4,025 px at desktop and 8,282 px at a phone, against 10,234 and 26,227 today.
- **One tier statement leaves the closed row.** A reader sees "Community" there without "automated checks only". The page leans on the tier band above it, the facet's note, and the open row to say what it means.
- **A new registry file** that maintainers edit by pull request, and a build that fails on a stale member.
- **Plugins are one click from the top of the list** instead of below every skill, at the cost of being hidden until that click.

## When to revisit

- **Readers take Community for checked.** If feedback or a walkthrough shows readers reading the closed row's chip as a review, the note returns to the closed row and the layout gives the name more room instead.
- **The catalogue passes a few hundred listings,** and 24 a page leaves too many pages to scan.
- **Collections start to read as endorsements,** or a request to be added to one arrives as a request for promotion.
