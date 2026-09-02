---
name: search-the-exchange
description: >
  Searches the published civic-skill-exchange index for installable skills by
  category, jurisdiction, or a free-text description of the need, and reports
  each result's tier, scan status, and disclaimer alongside it. Reads the live
  index and category vocabulary rather than a bundled copy, so results and
  categories stay current as the registry changes. Never presents a Community
  listing as reviewed.
license: CC0-1.0
compatibility: >
  Fetches the published index and category vocabulary over HTTPS by default —
  no credentials, no writes. --index and --categories accept a local file
  path instead, for offline use against a checkout's own build output.
allowed-tools: Bash
metadata:
  civic.category: open-data-publishing
  civic.jurisdiction: generic
  civic.data-sensitivity: none
  civic.human-review: none
  civic.use-when: >
    Someone wants to find an existing skill in the registry before writing
    one — by category, by jurisdiction, or by describing the need in their
    own words — and wants an honest answer about whether a match has been
    reviewed.
  civic.avoid-when: >
    Not a substitute for reading the skill itself: a result reports tier and
    scan status, never the skill's actual content, correctness, or fitness.
    Not for browsing a cached or bundled catalogue — it always reads the
    published index, so results reflect what is live right now.
  civic.maintainer: "Civic Skills Registry maintainers"
  civic.contact: "security@civic-skill-exchange.example"
  civic.affiliation: academic
  civic.deployment: none
---

# Search the Exchange

Finds installable skills in the civic-skill-exchange registry by category,
jurisdiction, or a described need, and reports each result's tier, scan
status, and disclaimer — read from the published index, never asserted from
memory or a bundled copy.

## Steps

1. **Work out the filters** from what was asked: a category id, a
   jurisdiction (`us-local`, `us-state`, `us-federal`, `intl`, `generic`),
   free-text need, or any combination. None are required — an empty search
   lists everything the index carries.

2. **Never guess at the category vocabulary.** `registry/categories.yml` is
   the single source of truth for it and it is being recut (#102), so this
   skill carries no copy of its own. If a category filter is given, the
   script fetches the current vocabulary and says plainly if the id doesn't
   exist, together with the ids that do. Do not substitute a category
   remembered from an earlier run or from this file.

3. **Run the script**:
   ```
   python3 scripts/search_exchange.py --category CATEGORY --jurisdiction JURISDICTION --need "free text"
   ```
   Omit any flag not in play. Use `--list-categories` alone to show the
   current vocabulary without searching.

4. **Relay every result block verbatim**, in the order the script printed
   it. Each block already carries its own tier line and scan line — never
   summarize several results into one disclaimer at the top, and never drop
   the tier line when relaying or quoting a single result on its own. A
   Community result is never described as vetted, verified, endorsed, or
   safe; a Reviewed result is never described as more than one party's
   attestation to one exact commit.

5. **If nothing matched**, say so and suggest `--list-categories` or a
   broader `--need`. Do not invent a result, and do not soften "no matches"
   into a recommendation to write one from scratch unless asked.

## Output

For each match, in this order: id, description, category and jurisdiction,
use-when / avoid-when when the listing set them, where an imported copy came
from when known, the tier line, the scan line, and how to install it. This is
a report of what the registry currently says about a listing — never an
assessment of whether the skill itself is good, and never a claim the
registry hasn't made.

## Offline use

`--index` and `--categories` accept a local file path instead of the
published URL — useful against a checkout's own `site/data/index.json` and
`site/data/categories.json` after running `scripts/build_index.py`. There is
no bundled fallback: if neither the network nor a local file is reachable,
say so rather than reporting stale or invented data.
