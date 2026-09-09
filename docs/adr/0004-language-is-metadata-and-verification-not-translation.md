# ADR 0004 — Language is metadata and verification, not translation

**Status:** accepted, 2026-09-08
**Analysis:** [spikes/the-exchange-in-more-than-one-language.md](../spikes/the-exchange-in-more-than-one-language.md)
**Rulings:** [#143](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/143)

## Context

Everything in the exchange assumed English without anyone deciding it should:
the site's strings, the prompt-injection signatures, the reading-level script in
the one Reviewed skill, and a schema with no field for the language a listing is
written in.

The audience is not only English-speaking, and the first partner cities outside
the United States will work in Spanish. But a model reads an English SKILL.md
and follows it in Spanish when the user writes in Spanish. Translating skill
text is rarely the problem. Whether the skill still keeps its promises in the
other language is, and nothing in the registry could say.

## Decision

**1. A listing declares the language it is written in.** `civic.language` is
required, one BCP 47 tag. Required rather than defaulted, because an omitted
value cannot be told apart from an unanswered one, which is the same reasoning
that made `civic.scope: any` explicit.

**2. "Works in language X" has two homes, and they are never merged.** The
author's claim is `civic.languages-tested` in frontmatter, a comma-separated
string because metadata values are strings. The reviewer's verified list is
`languages:` on the attestation in `registry/reviewed.yml`. This is the
deployment pattern again: a claim in the skill, verification in the ledger.

**3. The registry does not model related skills.** Not a translated-of pointer,
not a generalized-of pointer. A translation, when one exists, is a separate
listing in the translator's namespace; the pointer field is added the day a
listing needs it. A second SKILL.md in a directory stays rejected (#129).

**4. The site ships in Spanish as well as English, About page included.**
Long-form documentation (CONTRIBUTING, SUBMITTING, REVIEW, the rest of `docs/`)
stays in English.

**5. A locale costs the English visitor and the skill archives nothing.** Locale
strings are loaded separately; the English bundle does not grow with each
language, and a skill archive is byte-identical whether the site has one locale
or five. Skills are what people download.

**6. Automated screening names the languages it covers.** L2 signatures exist
in English and Spanish, and SECURITY.md says so. A submission in a third
language is screened more weakly and the document says that too.

**7. The localize contract carries an optional `language` slot**, in both
copies. Adding an optional key is not a `contract_version` bump.

**Not decided:** what a reviewer does to earn a language entry on an
attestation, and whether `plain-language-notice-rewriter` is re-attested as
English-only. Open on #143.

## Consequences

### What this gives up

**The About page will drift.** It is prose, it changes with the project, and
every change is now two changes. This was chosen over translating only the
chrome, accepting the drift for a page a Spanish-speaking visitor actually
reads. The docs were kept English for exactly the drift reason; the line is
drawn at the site.

**The migration demotes the Reviewed skill.** Adding `civic.language: en` to
`plain-language-notice-rewriter` touches its directory, the attestation SHA
stops matching, and it drops to Community until re-attested. That is the SHA
pin working as designed, and the re-attestation is part of the migration, not
a follow-up.

**A claim nobody checks.** `civic.languages-tested` is self-reported. The site
renders it as a claim and the attestation as verification, and a reader who
does not notice the difference will over-trust the claim. The same is true of
`civic.deployment` today.

**Spanish signatures are parity, not protection.** L2 was triage in English and
it is triage in Spanish. Nothing here makes the Community tier safer; it makes
the tier's promise the same size in both languages.

### What it keeps

No translated skills to keep in step with their originals. No related-skills
graph to maintain. One schema, one vocabulary file, one ledger, each gaining a
field rather than a parallel structure. A build with no new inputs.

## When to revisit

**(a) A translated skill is submitted.** Decision 3 says where it goes; the
pointer field is designed and built then, not before.

**(b) A third language is asked for.** Decisions 4 to 6 were made for one
added locale. A third tests whether the About page drift is bearable and
whether signature parity scales.

**(c) A non-English contributor cannot follow the English docs.** The line
between site and docs moves when someone is actually stopped by it.

**(d) Question 5 is ruled.** The verification protocol becomes REVIEW.md item
10 and this record is superseded or amended to say so.
