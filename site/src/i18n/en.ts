/** Every string the site shows a person, in English.
 *
 *  ==================== FOR A TRANSLATOR ====================
 *
 *  This file is the contract. `Strings` in `strings.ts` is *its* type, so a
 *  second locale that is missing a key, or gets an interpolation's arguments
 *  wrong, fails to compile rather than rendering a blank space.
 *
 *  Groups are one per surface — `chrome`, `facets`, `bands`, `detail`,
 *  `download`, `about`, `submit` — so a locale can be worked through a screen at
 *  a time rather than a screen at random.
 *
 *  Four markers are markup inside a string, rendered by `rich()`:
 *
 *      **strong**        emphasis that carries meaning: a warning, a caveat
 *      *emphasis*        emphasis that carries tone
 *      `code`            an identifier: a path, a field name, a place code
 *      [label](name)     a link, whose URL the component supplies
 *
 *  Translate around them. `name` in a link is not a URL and not shown to
 *  anybody — leave it alone, and move the `[label]` to wherever the sentence
 *  wants it.
 *
 *  A value that is a function takes something the page counted or was given.
 *  Keep every argument, and put them where the sentence needs them; the plural
 *  rules of the language are the function's business, which is why counting
 *  happens here rather than in a component.
 *
 *  What is NOT here, deliberately: frontmatter keys, enum values, URLs, file
 *  paths and anything the validator parses. Those are identifiers. They are the
 *  same in every language, and a listing's own prose — its description, its
 *  use-when — belongs to whoever wrote the skill and is rendered in the
 *  language they wrote it in (#145).
 *
 *  ==========================================================
 */

/** A select's or a radio group's choices, as `[value, label]`. The value is an
 *  enum the schema defines and never translates; the label is prose. */
type Choices = [value: string, label: string][];

export const en = {
  /** The closed vocabularies, as a reader sees them.
   *
   *  Kept in one place so the facets, the cards, the detail page and the About
   *  page's field tables cannot disagree. `vocabulary.category` duplicates the
   *  labels in `registry/categories.yml`, and `labels.test.ts` makes
   *  disagreement a build failure. */
  vocabulary: {
    /** Shown where a listing has no value for a field. */
    missing: "—",

    category: {
      policy: "Policy",
      "data-analysis": "Data Analysis",
      communications: "Communications",
      finance: "Finance",
      hr: "HR",
      technology: "Technology",
      "constituent-services": "Constituent Services",
      "benefits-eligibility": "Benefits & Eligibility",
      "permitting-licensing": "Permitting & Licensing",
      legal: "Legal",
      "public-records": "Public Records & Transparency",
      operations: "Operations & Service Delivery",
      "emergency-public-safety": "Emergency Management & Public Safety",
      "planning-land-use": "Planning & Land Use",
      "ai-tools": "AI Tools",
    },

    /** What kind of government body a skill is written for (#67).
     *  Country-neutral, because the place is a separate field that carries the
     *  country — "regional" is a state, province, prefecture, canton or region,
     *  and "municipal" is a city, county or town. */
    scope: {
      any: "Any level of government",
      municipal: "City, county or town",
      regional: "State, province or region",
      national: "National",
      supranational: "Supranational",
    },

    /** The two languages the exchange itself ships in, and nothing more.
     *
     *  Deliberately not a language-name table. A full one is hundreds of
     *  entries in each locale the site speaks, it would go stale, and a tag the
     *  map does not hold renders as the tag — which is a correct, if terse,
     *  answer. `label` already falls back that way, so a Portuguese listing
     *  reads `pt-BR` rather than an empty cell. */
    language: {
      en: "English",
      es: "Spanish",
    },

    sensitivity: {
      none: "No personal data",
      pii: "Personal data (PII)",
      protected: "Protected — statutory regime",
    },

    localization: {
      generalized: "Generalized",
      localized: "Localized",
    },

    deployment: {
      none: "Not used in production",
      personal: "Used personally",
      team: "Used by a team",
      organization: "Used organization-wide",
    },

    humanReview: {
      none: "No effect on rights or benefits",
      "advisory-only": "Informs a person, decides nothing",
      "decision-support": "Feeds a decision someone acts on",
    },

    affiliation: {
      government: "Government",
      nonprofit: "Nonprofit",
      vendor: "Vendor",
      academic: "Academic",
      individual: "Individual",
    },

    tier: {
      reviewed: "Reviewed",
      community: "Community",
    },
  },

  /** The two questions no scanner can answer, and the words both intake routes
   *  ask them in.
   *
   *  Only the author knows what data their skill touches or whether its output
   *  reaches a person's rights, so these are asked rather than derived — and
   *  asking them differently in two places is how one skill acquires two
   *  different answers, so the wording lives here rather than inline in the
   *  form. Submit.test.tsx asserts the form renders what this holds.
   *
   *  These are the plain questions, not the display strings above:
   *  `vocabulary.sensitivity` renders a listing, this asks a submitter. Keyed by
   *  the schema field, which is what a finding names. */
  questions: {
    "civic.data-sensitivity": {
      question: "What data does it touch?",
      options: [
        ["none", "No personal data"],
        ["pii", "Personal details about identifiable people"],
        ["protected", "Health, benefits, immigration or criminal justice data"],
      ] as Choices,
    },
    "civic.human-review": {
      question: "Does what it produces affect anyone's rights or benefits?",
      options: [
        ["none", "No — it does not affect anyone's rights or benefits"],
        ["advisory-only", "It informs a person, but decides nothing"],
        ["decision-support", "It feeds a decision someone acts on"],
      ] as Choices,
    },
  },

  /** Byte sizes, shown to somebody deciding whether to click something. */
  units: {
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
  },
};
