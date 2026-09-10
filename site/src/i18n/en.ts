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

  /** The frame every page sits in: the skip link, the identity, the navigation,
   *  the statement at the top and the footing at the bottom. */
  chrome: {
    skipToContent: "Skip to content",
    /** A non-breaking space, so the two words of the name never split across a
     *  line on a narrow screen. */
    brand: "Civic Skill\u00a0Exchange",
    nav: {
      label: "Main",
      browse: "Browse",
      about: "About",
      submit: "Submit",
      github: "GitHub",
    },
    theme: {
      toLight: "Light",
      toDark: "Dark",
      switchToLight: "Switch to light theme",
      switchToDark: "Switch to dark theme",
    },
    title: "Agent skills for government, public-sector and nonprofit work",
    lede:
      "A city that solves a problem once should be able to hand the solution " +
      "to the next hundred cities.",
    /** The counts under the statement. The bold is on the number. */
    stats: {
      skills: (n: number) => `**${n}** skill${n === 1 ? "" : "s"}`,
      reviewed: (n: number) => `**${n}** reviewed`,
      community: (n: number) => `**${n}** community`,
    },
    footer: {
      disclaimer:
        "Inclusion in this registry is not an endorsement. Automated checks " +
        "can only reject — a pass is never a statement that a skill is safe.",
      /** `generated` is already formatted for the reader. */
      meta: (generated: string) =>
        `Catalog generated ${generated} · ` +
        "[Source and submissions on GitHub](repo) · [About this project](about)",
      /** The date under the catalogue, formatted the reader's own way. */
      date: (iso: string) => new Date(iso).toLocaleDateString(),
    },
  },

  /** The catalogue itself: how many matched, and what to do when none did. */
  results: {
    loading: "Loading the catalog…",
    all: (n: number) => `${n} skill${n === 1 ? "" : "s"}`,
    some: (shown: number, total: number) => `${shown} of ${total} skills`,
    empty: "No skills match these filters. [Clear them](clear) to see the whole catalog.",
  },

  /** What a page says when it cannot show what was asked for.
   *
   *  These are the site's own errors. A finding on a submission comes from the
   *  validator, which speaks its own language and is out of this table's
   *  reach. */
  errors: {
    catalogUnavailable: "The catalog could not be loaded. Try reloading the page.",
    loading: "Loading…",
    /** `id` is `{namespace}/{name}` as it appeared in the URL. */
    noSuchSkill: (id: string) => `No skill called ${id} is listed here.`,
    backToCatalog: "Back to the catalog",
  },

  /** The chips on a card and at the top of a detail page.
   *
   *  Each one owns exactly one fact and its `title` says what that fact is
   *  worth. The tier chip's note is the load-bearing one: "Community" alone
   *  invites a reader to assume something was checked. */
  badges: {
    /** Who wrote it. Derived from the reserved namespace, not a field (#51). */
    lab: "Written by the AI Lab",

    tier: {
      /** The badge says a skill was reviewed, names who reviewed it, and stops.
       *
       *  It used to say "{reviewers} read this commit", which undersold nine
       *  questions covering scripts, tool grants, egress, credentials and
       *  instruction-suppression — and meant nothing to a reader who does not
       *  know what a commit is. The obvious repair, "reviewed for safety", is
       *  the one claim the registry refuses everywhere else: a pass is never a
       *  statement that a skill is safe.
       *
       *  So the questions moved to the About page, where there is room to say
       *  which they are and what they do not amount to, and the badge stopped
       *  characterising the review at all (#113). */
      reviewedTitle:
        "Read against the published nine-item checklist, at this exact " +
        "version. A record of what was checked, not a warranty.",
      communityNote: "automated checks only",
      /** No names in the ledger is a malformed attestation, not a stronger
       *  claim. Say the least that is still true rather than nothing. */
      reviewedNote: "read against the published checklist",
      /** The conjunction is language, so the joining happens here rather than
       *  in the three components that name reviewers. */
      reviewers: (names: string[]) => names.join(" and "),
    },

    localization: {
      generalized: "Jurisdiction specifics lifted out into a context you fill in",
      localized: "Carries one jurisdiction's citations, forms and deadlines",
    },

    deployment: {
      selfReported: "Self-reported by the submitter",
      selfReportedSince: (since: string) => `${since} — self-reported by the submitter`,
    },

    sensitivity: {
      protected:
        "Health, benefits, immigration, criminal justice, or another " +
        "statutory regime",
      pii: "Expected to handle personally identifiable information",
    },

    /** The Beta marker. One sentence, shared with README.md and held to it by a
     *  test — leaving Beta should not be an archaeology exercise (#123).
     *
     *  It says only that the *exchange* is new. The registry already carries
     *  three statements about what a *listing* means; a fourth disclaimer in
     *  the same voice would dilute all of them. */
    beta: {
      label: "Beta",
      summary:
        "The exchange itself is new: the category vocabulary, the metadata " +
        "fields and the submission and review workflows are all still changing.",
    },
  },

  /** A tease, not a summary: who vouched for it, what it is called, what it
   *  does, and roughly where it belongs. */
  card: {
    cta: "View this skill",
  },

  /** The filters down the side of the catalogue.
   *
   *  A facet's `note` is where the vocabulary gets explained, because the
   *  legend has room for two words and some of these need a sentence. */
  facets: {
    label: "Filter skills",
    /** The option that clears one facet, as against the button that clears all. */
    any: "Any",
    clear: "Clear filters",
    search: {
      label: "Search",
      placeholder: "permit, benefits, Boston…",
    },
    tier: {
      legend: "Tier",
      note: "Community listings passed automated checks only.",
    },
    category: { legend: "Category" },
    localization: {
      legend: "Portability",
      note: "Generalized skills have jurisdiction specifics lifted out.",
    },
    scope: {
      legend: "Level of government",
      note:
        "What kind of body a skill is written for. The specific place, when " +
        "it has one, is on the skill's own page.",
    },
    language: {
      legend: "Language",
      note:
        "The language the listing is written in. A model reads a skill in " +
        "one language and follows it in another, so this is not a limit on " +
        "who can use it.",
    },
    sensitivity: { legend: "Data touched" },
  },

  /** The full-bleed sections above and below the catalogue. */
  bands: {
    tiers: {
      heading: "What a listing here does and does not mean",
      communityTerm: "Community",
      community:
        "Well-formed, and nothing mechanical is wrong with it. Merged once it " +
        "passes structural, ownership and signature checks.",
      reviewedTerm: "Reviewed",
      reviewed:
        "The AI Lab for Cities read every line of one specific commit against " +
        "a published checklist and put its name on it. One reader, not an " +
        "independent audit. Pinned to a content hash, so any change drops it " +
        "back to Community.",
    },
    contribute: {
      heading: "Have one of these already?",
      lede:
        "A city that solves a problem once should be able to hand the " +
        "solution to the next hundred cities. Submitting is a pull request, " +
        "or a form if you would rather not work in git.",
      guide: "Read the contributor guide",
      security: "What we check, and the security model",
    },
  },

  /** The standing Community notice.
   *
   *  This replaced a paragraph repeated verbatim on every Community card —
   *  eight identical warnings on a ten-card page, which is how a warning
   *  becomes wallpaper. Said once, above the grid, it has to be accurate, so
   *  the lead sentence is counted from the catalogue rather than written in
   *  advance. The consequence sentence never varies: it is the part that
   *  matters and it is true regardless of the mix. */
  notices: {
    community: {
      /** `community` is at least one, and at most `total`. */
      lead: (community: number, total: number) => community === total
        ? "Every skill here is a Community listing."
        : community === 1
          ? `1 of the ${total} skills here is a Community listing.`
          : `${community} of the ${total} skills here are Community listings.`,
      body:
        "That means automated checks passed — not that anybody read the code. " +
        "Automated checks can only ever reject. Read a skill and its scripts " +
        "before you run it.",
    },
  },

  /** When a skill arrived, when it last changed, and the version its author
   *  claims (#77).
   *
   *  Two kinds of statement, worded differently on purpose. The dates and the
   *  count are derived from git and stated flatly. The version is the author's
   *  claim and is labelled as one. Neither may read as a quality signal, which
   *  is why the count says outright that it is not a measure. */
  history: {
    heading: "Version and history",
    /** Month and year. A precise timestamp invites reading a week's difference
     *  as meaningful, which it is not. The locale tag is part of the wording,
     *  so it lives with it. */
    when: (iso: string) => new Date(iso).toLocaleDateString(
      "en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    version: "Version",
    versionAside:
      "— the author’s own number for it. Self-reported, and not checked " +
      "against anything.",
    firstSeen: "Listed since",
    lastChanged: "Last changed",
    commits: "Times changed",
    commitsAside:
      "— a count, not a measure. It says nothing about whether the skill is " +
      "well maintained: one change may mean finished.",
    note:
      "Dates come from this repository’s own history, for this path. A skill " +
      "moved between namespaces starts again here, so an early date is " +
      "reliable and a recent one may just mean it was renamed.",
  },
};
