# The exchange in more than one language

**Issue:** [#143](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/143)
**Ruled:** 2026-09-08, seven of eight; the rulings are recorded at the end.
**Decision record:** [ADR 0004](../adr/0004-language-is-metadata-and-verification-not-translation.md)

## The question

The exchange, its metadata, its checks and its one Reviewed skill all assume
English. Three separate things could change, and they are usually conflated:

1. **The site speaks one language.** Every string on it is English, from the
   facet labels to the About page to the submission wizard.
2. **A listing does not say what language it is written in**, or what languages
   it has been used in. A reader has to open the SKILL.md to find out.
3. **Nothing says whether a skill has been verified in a given language.** The
   review notes for `plain-language-notice-rewriter` already say it: "calibrated
   for English with a US bias ... a non-English deployment is untested."

The premise worth stating up front: a model reads a SKILL.md written in English
and will follow it in Spanish if the user writes in Spanish. Translating skill
text is mostly unnecessary. What is *not* automatic is that the skill still does
what it promises in the other language, and that is a verification question,
not a translation question.

## What is language-bound today

Read across the four listings and the checks, these things are tied to English:

| Where | What | Why it matters |
|---|---|---|
| `scripts/scan.py` L2 signatures | The prompt-injection patterns are English regexes ("ignore previous instructions", "do not tell the user") | A skill written in another language gets weaker automated screening for free. The Community tier promises "nothing mechanical is wrong"; that promise is thinner outside English and `docs/SECURITY.md` does not say so. |
| `plain-language-notice-rewriter/scripts/reading_level.py` | Flesch-Kincaid with an English vowel-run syllable count | In Spanish the formula is Fernández-Huerta; the script gives a plausible-looking wrong grade. Exactly the quiet failure `LOCALIZATION.md` warns about for form numbers. |
| `site/src/lib/labels.ts`, `registry/categories.yml` | Vocabulary labels and descriptions | These are the reader-facing words for the whole classification; a test holds them to one source of truth, so translations have to live in that source, not beside it. |
| `site/src/components/About.tsx` (~89 strings), `Submit.tsx` (~31), `SkillDetail.tsx` (~21) | Page copy | About is prose, not chrome. It is the bulk of the translation burden. |
| `site/index.html` | `lang="en"` on the root, and nothing per element | A Spanish description rendered on an English page is read by a screen reader in an English voice. Cheap to fix, independent of everything else. |
| `localize-skill` contract | No slot for target language | Localizing a skill to Bogotá without also saying "and the output is in Spanish" is half a localization. |
| `schema/skill.schema.json` `name` pattern | ASCII only | Correct: the Agent Skills spec constrains names the same way. Not a gap; noted so nobody files it as one. |
| `.github/ISSUE_TEMPLATE/submit-skill.yml`, the exchange skill scaffold, the Submit wizard | English prompts, English generated frontmatter | Follows whatever the metadata decision is: a required field the wizard does not ask for breaks submission. |

## Options

### A. Declaring a listing's language

**A1. `civic.language`, required, one BCP 47 tag.** The language the SKILL.md
is written in: `en`, `es`, `pt-BR`. Required because the project's own rule for
scope applies: an omitted value cannot be told apart from an unanswered one.
Four listings need a one-line edit; all are Lab- or owner-controlled.

**A2. Optional, default `en`.** Fewer edits, but bakes the English assumption
into the schema forever.

Recommended **A1**.

One consequence to plan for: adding the line to
`plain-language-notice-rewriter` touches its directory, so its attestation stops
matching and it drops to Community until re-attested. That is the SHA pin doing
its job, and the migration has to be followed by a re-attestation.

### B. Recording what languages a skill works in

Two different claims, two different homes, following the pattern the registry
already uses for deployment (author's claim in frontmatter) versus review
(reviewer's attestation in `reviewed.yml`).

**B1. Author's claim: `civic.languages-tested`.** A comma-separated string of
BCP 47 tags, because metadata values are strings per the Agent Skills spec. Must
include `civic.language`. Self-reported, rendered as a claim. The validator
parses and checks the tags; nothing verifies the claim, and the site says so.

**B2. Reviewer's attestation: `languages:` on the `reviewed.yml` entry.** The
languages the reviewer actually exercised the skill in during review, against a
written protocol (see D). Omitted means "the language it is written in, and no
other". This is the only place "verified in Spanish" can honestly come from,
and it is where the schema already says verification lives.

**B3. A list-typed metadata field.** Cleaner, but off-spec; the registry chose
two explicit fields for category for that reason. Rejected.

Recommended **B1 + B2**, shown separately on the detail page, never merged into
one badge.

### C. Translated variants of a skill

**C1. A translation is a separate listing** in the translator's namespace,
pointing at its original with a `civic.translation-of` field. Fits the
one-SKILL.md-per-directory rule (#129) and the existing `civic.source-*` shape.

**C2. `SKILL.es.md` beside `SKILL.md`.** Rejected: #129 exists precisely
because clients load whichever SKILL.md they find.

**C3. Do not build it yet.** The premise says translation is rarely needed;
build the pointer field when a second listing actually is a translation.

Recommended **C3**, with C1 as the shape when the evidence arrives. Lean-backlog
deferral, not blocked.

### D. What "verified in language X" means

B2 means nothing without a protocol. Proposed, as a REVIEW.md item 10:

- Invoke the skill with a realistic task written in X.
- Output is in X, and every promise in `description` still holds.
- Every executable under `scripts/` either works for X or the skill says it
  does not. `reading_level.py` fails this for Spanish today; the honest fix is
  the skill declaring English-only, not a Spanish formula nobody asked for.
- Any legally required element, terminology or citation the skill preserves is
  preserved in X.

Recorded in the attestation `notes` as today, plus the `languages` list.

### E. The site

**E1. Extract every string to one table, ship a second locale, switch by
route or setting.** Vocabulary labels and descriptions get per-locale fields in
`categories.yml`, since the label test already holds `labels.ts` to that file.
The About page is the cost centre.

**E2. Chrome only.** Translate facets, buttons, badges, form labels and the
Submit wizard; leave About and the docs in English with a note. Roughly a
quarter of the strings, most of the daily-use value.

**E3. Nothing; rely on browser translation.** Zero cost, and the About page
reads fine through it. But the Submit wizard's judgment questions are the two
places the wording is load-bearing; a machine-translated "does this affect
anyone's rights" is a different question.

Recommended **E2 first**, one locale, with the string table shaped so E1 is an
addition rather than a rewrite. Set `lang` per rendered description regardless.

Long-form docs (CONTRIBUTING, SUBMITTING, REVIEW): **do not translate**. The
"docs describe what is" rule doubles its drift surface per language. Revisit
when a non-English contributor asks.

### F. Screening non-English submissions

**F1. Say it.** SECURITY.md states that L2 signatures are English and that the
Community tier's mechanical promise is weaker in other languages.

**F2. Signatures per supported language.** Cheap for the handful of phrases
that matter, in the languages the site ships. Evasion is already trivial in
English; this is parity, not protection.

**F3. Model-based screening.** Out of scope; contradicts ADR 0003 until the
experience demands a backend.

Recommended **F1 now, F2 with each locale shipped**.

### G. The localize contract

Add an optional `language` slot to the context file. Adding an optional key is
not a `contract_version` bump, by the contract's own rule. `localize-skill`
writes output in that language when set.

## Decision questions

1. Which language first?
2. A1 or A2: is `civic.language` required?
3. B1 + B2: author's claim in frontmatter and reviewer's verification in the
   ledger, shown separately?
4. C3: defer translated variants until one exists?
5. D: adopt the language-verification protocol as REVIEW.md item 10, and
   re-attest `plain-language-notice-rewriter` with `languages: [en]` and a
   declared English-only scripts caveat?
6. E2: chrome and wizard only, About and docs stay English?
7. F1 + F2: disclose the English-only screening now, add signatures per
   shipped locale?
8. G: add the optional `language` slot to the localize contract?

---

## Rulings

Recorded on [#143](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/143),
2026-09-08.

**1. Spanish first.**

**2. `civic.language` is required.** The four existing listings are migrated to
`en`, which is true of all of them.

**3. Both homes, shown separately.** The author's claim in frontmatter as
`civic.languages-tested`; the reviewer's verified list on the attestation in
`reviewed.yml`.

**4. Translated variants are deferred.** There is deliberately no structure for
related skills at present: not a generalized-of pointer, not a translated-of
pointer. Both can be added later when a listing needs one.

**5. Open.** See below.

**6. Translate the whole site, About included, against this spike's
recommendation.** Long-form documentation stays in English. The bundle has to
stay small as locales are added: skills are downloaded, and nothing a locale
adds may reach a skill archive or the English visitor's load. In practice that
means a locale is a separately loaded chunk, and the skill archives are
byte-identical before and after.

**7. Signatures in English and Spanish**, and SECURITY.md says which languages
L2 covers.

**8. Yes**, the optional `language` slot goes into the localize contract, both
copies.

### Still open

Question 5, the verification protocol and the re-attestation of
`plain-language-notice-rewriter`. Ruling 3 puts a `languages` list on the
attestation; until 5 is ruled, the list has no written definition of what a
reviewer did to earn an entry. The ledger mechanism can be built ahead of the
protocol; the REVIEW.md item and the re-attestation wait on it.
