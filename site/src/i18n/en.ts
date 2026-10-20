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

import { locale } from "./locale";

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

    /** The two languages the exchange itself ships in, plus Latin American
     *  Spanish, which a listing already declares and whose tag (`es-419`)
     *  few readers recognise (#252).
     *
     *  Deliberately not a language-name table. A full one is hundreds of
     *  entries in each locale the site speaks, it would go stale, and a tag the
     *  map does not hold renders as the tag — which is a correct, if terse,
     *  answer. `label` already falls back that way, so a Portuguese listing
     *  reads `pt-BR` rather than an empty cell. */
    language: {
      en: "English",
      es: "Spanish",
      "es-419": "Spanish (Latin America)",
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
      guide: "Guide",
      about: "About",
      submit: "Submit",
      github: "GitHub",
    },
    /** Beside a link into `docs/`, which stays in English in every locale
     *  (ADR 0004 decision 4).
     *
     *  Empty here, and that is the answer rather than a missing one: an English
     *  reader does not need to be told that an English document is in English.
     *  A locale that is not English fills it in, `DocLink` renders it only when
     *  it is non-empty, and the decision stays in the table where the next
     *  locale can see it. */
    docsInEnglish: "",

    /** The language switcher. Only its accessible name is prose: each locale
     *  is offered under its own name, which is the same in every language and
     *  lives in `strings.ts` rather than here. */
    language: {
      label: "Language",
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
    /** Under the counts, on the home page only (#302, S-12). */
    submitCta: "Submit a skill or plugin",
    /** The counts under the statement. The bold is on the number. */
    stats: {
      skills: (n: number) => `**${n}** skill${n === 1 ? "" : "s"}`,
      /** Beside the skills, never added into them. The hero gives these two
       *  totals and no tier counts (#306). */
      plugins: (n: number) => `**${n}** plugin${n === 1 ? "" : "s"}`,
    },
    footer: {
      disclaimer:
        "Inclusion in this registry is not an endorsement. Automated checks " +
        "can only reject — a pass is never a statement that a skill is safe.",
      /** `generated` is already formatted for the reader. */
      meta: (generated: string) =>
        `Catalog generated ${generated} · ` +
        "[Source and submissions on GitHub](repo) · [About this project](about)",
      /** The date under the catalogue, written the reader's own way round.
       *  `locale()` rather than the browser's default: the reader chose a
       *  language for the sentence around this date, and a Spanish page with a
       *  month-first date in it is a page in two languages. */
      date: (iso: string) => new Date(iso).toLocaleDateString(locale()),
    },
  },

  /** The catalogue itself: how many matched, and what to do when none did. */
  results: {
    loading: "Loading the catalog…",
    all: (n: number) => `${n} skill${n === 1 ? "" : "s"}`,
    some: (shown: number, total: number) => `${shown} of ${total} skills`,
    /** When the skills take more than a page: which of them this page shows. */
    range: (from: number, to: number, shown: number, total: number) =>
      shown === total
        ? `Skills ${from}–${to} of ${total}`
        : `Skills ${from}–${to} of the ${shown} that match (${total} in all)`,
    empty: "No skills match these filters. [Clear them](clear) to see the whole catalog.",
  },

  /** The browse page's rows, its pages and its Skills/Plugins toggle (#208,
   *  ADR 0008). */
  browse: {
    /** A row's button. The row's name follows it, visually hidden, so
     *  twenty-four of them are twenty-four different buttons to a screen
     *  reader. */
    details: "Details",
    hide: "Hide details",
    skillCta: "View this skill",
    /** Numbered pages of 24. `page` is read before each number, out of sight,
     *  so a link is "Page 2" rather than "2". */
    pager: { label: "Pages", page: "Page", previous: "Previous", next: "Next" },
    /** The Skills/Plugins toggle, `Skills 48 | Plugins 8`; each side's count
     *  follows the search and the filters. Its words are also the visually
     *  hidden heading of the side it shows. */
    show: { label: "Skills or plugins", skills: "Skills", plugins: "Plugins" },
  },

  /** The submission wizard.
   *
   *  Two modes, one page each: adding a listing and updating one. The wording
   *  here is doing more work than anywhere else on the site — it is the only
   *  surface that asks somebody for something — so the questions are plain
   *  language rather than field names, and the hints say why a field is being
   *  asked for rather than what shape the answer takes. */
  submit: {
    heading: "Share a skill or plugin",
    lede: "Fill this in and we will put it in the right shape for you. It takes a few minutes.",

    /** Before the form, not after it. Every path this page offers ends on
     *  GitHub, and somebody could otherwise fill in twenty fields before
     *  finding that out. */
    prereq:
      "You will need a **GitHub account** to finish — it is free, and it is " +
      "what records the skill as yours. [Create one](signup) if you do not " +
      "have one; it takes a couple of minutes and you can come back to this " +
      "page afterwards.",

    modes: {
      label: "What do you want to do?",
      new: "Add a new skill",
      update: "Update one you already listed",
    },

    communityWarn: "The skill will be listed as a community skill until it is reviewed.",

    /** Upload and paste first, because most people arrive with a skill already
     *  written and should not retype it. */
    intake: {
      heading: "Submit a new skill or plugin",
      lede:
        "Already have one? Drop its .zip on the box below and the rest of this " +
        "page fills itself in. If your skill lives in its own repository, " +
        "GitHub\u2019s **Code → Download ZIP** gives you the file to drop.",

      repoLabel: "Your skill's GitHub repository",
      repoHint:
        "Public repositories only. We read the file list and SKILL.md, and " +
        "hand the folder back for you to upload — the listing records where " +
        "the copy came from.",
      repoPlaceholder: "github.com/you/your-skill",
      read: "Read it",
      reading: "Reading…",
      /** `repo` is `owner/name` and `commit` an abbreviated sha. `folder` is
       *  the sub-folder an address named, and `branch` the one it gave; both
       *  are left out for a whole repository (#245). */
      imported: (files: number, repo: string, commit: string, folder?: string, branch?: string) =>
        `Read ${files} file${files === 1 ? "" : "s"} from ` +
        (folder ? `\`${folder}\` in ` : "") + `\`${repo}\`` +
        (folder && branch ? ` (branch \`${branch}\`)` : "") + ` at \`${commit}\`.`,

      archiveLabel: "Or upload the skill folder as a .zip",
      /** Inside the drop zone. A dropped folder cannot be read, so the zone
       *  asks for a zip and says what to do with a folder. */
      dropHint: "Drop a .zip here, or choose one. A folder? Zip it first.",
      archiveHint:
        "A plugin folder works too. Unpacked in your browser. It is not sent anywhere.",

      pasteLabel: "Or paste your SKILL.md",

      /** `name` is the uploaded file's own name, or `owner/name` for an import. */
      archiveResult: (name: string, files: number) =>
        `**${name}** — ${files} file${files === 1 ? "" : "s"}.`,
      blocked: "Fix these before continuing. They cannot be corrected below.",
    },

    /** The form. `fieldNames` are the plain questions a finding is rewritten to
     *  name; the labels below them are what the boxes are called. */
    form: {
      heading: "About the skill",

      /** Answered already, by the file. Shown rather than hidden, because a
       *  description read out of somebody's repository is exactly the thing
       *  they may want to improve before it is listed. `fields` is a list of
       *  `fieldNames` values, already joined. */
      fromFile: (fields: string) =>
        `Read from your file: ${fields}. Everything below is already filled in ` +
        "where it could be — change anything that is wrong.",

      /** Plain questions, not field names. The schema keys stay as element ids
       *  because that is how a finding is matched to its input, but no
       *  submitter should have to learn what `civic.human-review` means to
       *  answer it. A finding names the raw key, and it is swapped for one of
       *  these. */
      fieldNames: {
        namespace: "your GitHub username",
        name: "the skill name",
        description: "the description",
        license: "the license",
        "allowed-tools": "the tools it needs",
        metadata: "the details below",
        "civic.category": "the category",
        version: "the version",
        "civic.category-secondary": "the second category",
        "civic.scope": "the level of government",
        "civic.scope-secondary": "the second level",
        "civic.jurisdiction": "the place it is written for",
        "civic.localization": "how portable it is",
        "civic.language": "the language it is written in",
        "civic.languages-tested": "the languages you have tried it in",
        "civic.models-tested": "the AI models you have tried it with",
        "civic.data-sensitivity": "the data it touches",
        "civic.human-review": "its effect on people",
        "civic.use-when": "when it is useful",
        "civic.avoid-when": "when it is not useful",
        "civic.maintainer": "who maintains it",
        "civic.affiliation": "the kind of organization",
        "civic.deployment": "how much you have used it",
        "civic.deployed-at": "the organization",
        "civic.deployed-in": "where it operates",
        "civic.deployed-since": "since when",
      },

      /** What a finding says to a submitter (#295). The checks are written for a
       *  reviewer reading a diff, and quote keys and file values; each of these
       *  says the same thing in the page's own terms. `name` is a `fieldNames`
       *  value. */
      plain: {
        required: (name: string) => `${name} is required`,
        organizationNeeded:
          "Name the organization. Saying a team or an organization uses this is " +
          "a claim about them, and an unnamed organization is a claim nobody can check.",
        neverUsedHasOrganization:
          "You said you have not used it in real work, so there is no " +
          "organization to name. Clear this, or change that answer.",
        notOffered: (name: string) =>
          `That is not one of the choices for ${name}. Pick one from the list.`,
        generalizedHasPlace:
          "You said it is portable, with no place built in, so it cannot name a " +
          "place. Clear the place, or change that answer.",
        notAPlace:
          "That is not a place this can read. Use a country code, then a state or " +
          "province and a city if you like: US-VT, US-MA / Boston, CA-ON / Toronto.",
        anyHasPlace:
          "You said it works at every level of government, so it is not tied to " +
          "one place. Name the level it is for, or clear the place.",
        secondaryRepeats:
          "The second level repeats the first. Clear it, or choose the other " +
          "level the skill serves.",
        anyAlone:
          "“Every level” cannot be paired with a particular level. Keep " +
          "one or the other.",
        categoryRepeats:
          "The second category repeats the first. Clear it, or choose a different one.",
        testedLeavesOut:
          "The languages you have tried it in should include the one it is " +
          "written in. Add it, or correct that answer.",
        testedShape:
          "Write the languages as short codes separated by commas, like \u201cen, es\u201d, " +
          "with nothing empty and no comma at the end.",
        languageTag:
          "Use the language’s short code, not its name: en, es, pt-BR.",
        bashWildcard:
          "This allows any shell command, and the exchange rejects that " +
          "automatically. Name the specific commands it needs instead.",
        sourceRepo: "Write the repository as owner/name, not as a web address.",
        sourceCommit:
          "Use the full 40-character commit code of the repository this came from.",
        pluginLevel: (name: string) =>
          `${name} is answered once, for the whole plugin. Remove it from the skill.`,
        notForPlugin: (name: string) =>
          `${name} is not answered here. Each skill answers its own questions in ` +
          "its own SKILL.md.",
        thisAnswer: "this answer",
      },

      /** The empty option a select opens on. Not a value. */
      choose: "Choose…",

      namespaceLabel: "Your GitHub username",
      namespaceHint:
        "This has to match your login exactly — your skill goes in a folder of " +
        "that name, and only you can write there.",
      reservedNamespace: (namespace: string) =>
        `\`${namespace}\` is the Lab\u2019s own folder, so this does not have ` +
        "to match your login. It needs approval from a maintainer instead, and " +
        "the listing carries the Lab\u2019s badge.",
      noSuchUser: (login: string) =>
        `No GitHub user called ${login}. A submission whose folder does not ` +
        "match the account that opens the pull request is rejected.",
      /** The lookup was rate limited or the network failed (#293). Not a
       *  verdict, so it neither warns nor blocks. */
      userUnchecked: (login: string) =>
        `Couldn’t check ${login} with GitHub just now — it may be ` +
        "busy, or you may be offline. You can carry on: the checks on the pull " +
        "request will catch a username that is wrong.",
      /** `login` is what was typed. */
      badLogin: (login: string) =>
        `\u201c${login}\u201d is not a GitHub username. A username has only ` +
        "letters, numbers and single hyphens, like `maria-lopez` — it is the " +
        "name in your github.com address, not your full name or email.",

      nameLabel: "Skill name",
      namePlaceholder: "e.g. Permit Status Explainer",
      nameHint: "Type it however you like; we will tidy the spacing and capitals.",
      /** What was typed, beside the slug it becomes. Rewriting the box under
       *  the cursor would eat a hyphen the moment it is typed, so the
       *  conversion is shown rather than imposed. */
      nameSlug: (slug: string) =>
        `Listed as \`${slug}\` — names are lowercase with hyphens instead of ` +
        "spaces.",

      descriptionLabel: "Description",
      descriptionHint:
        "What the skill does, in a couple of sentences. This is what an agent " +
        "reads to decide whether to use it.",

      /** The license is asked for on both routes and never assumed (#296). */
      licenseLabel: "License",
      licenseHint:
        "What other people may do with this once it is listed. With no license " +
        "they may not reuse it at all, however freely you meant to share it. " +
        "MIT and Apache-2.0 are common for instructions and code, and " +
        "CC-BY-4.0 for writing; all three allow reuse as long as you are " +
        "credited. The choice belongs to whoever owns the work, so ask your " +
        "organization if it is not yours alone.",
      licenseChoices: [
        ["MIT", "MIT — short and permissive"],
        ["Apache-2.0", "Apache-2.0 — permissive, with a patent grant"],
        ["CC-BY-4.0", "CC-BY-4.0 — for writing; reuse with credit"],
        ["other", "Another license — I will give its SPDX identifier"],
      ] as Choices,
      licenseOtherLabel: "Its SPDX identifier",
      licenseOtherPlaceholder: "e.g. BSD-3-Clause",
      licenseOtherHint:
        "The short identifier from spdx.org/licenses, such as `BSD-3-Clause` " +
        "or `MPL-2.0`. Not the license’s name, and not a link.",

      categoryLabel: "Category",
      categorySecondaryLabel: "A second category, if it fits one",
      categorySecondaryNone: "None — it sits in one place",
      categorySecondaryHint:
        "The list mixes what a skill is *for* with whose desk it sits on, so " +
        "many skills belong in two places. Leave this alone if yours does not.",

      versionLabel: "Version, if you keep one",
      versionPlaceholder: "e.g. 1.0",
      versionHint:
        "Your own number for it, like `1.0` or `2.1.3`. Optional, and nothing " +
        "checks it — it is there so an adopter can tell this is not what they " +
        "took last year. The registry records when a skill arrived and last " +
        "changed on its own.",

      scopeLabel: "What level of government is it for?",
      /** What kind of government body, in the words a submitter would use.
       *  Country-neutral, because the specific place is asked separately (#67). */
      scopeChoices: [
        ["any", "Any level of government — it makes no assumptions"],
        ["municipal", "A city, county or town"],
        ["regional", "A state, province or region"],
        ["national", "A national government"],
        ["supranational", "A body above national government"],
      ] as Choices,
      scopeSecondaryLabel: "A second level, if it serves two",
      scopeSecondaryNone: "None — one level",

      jurisdictionLabel: "Is it written for one specific place?",
      jurisdictionPlaceholder: "e.g. US-MA / Boston",
      jurisdictionHint:
        "Only if the skill carries that place\u2019s rules, forms or deadlines " +
        "— `US-VT`, `US-MA / Boston`, `CA-ON / Toronto`. Leave it blank " +
        "otherwise, which is most skills. A country code, optionally a state or " +
        "province, and optionally a city after a slash.",

      localizationLabel: "Is it set up for one place, or does it work anywhere?",
      localizationChoices: [
        ["localized", "Set up for one place — it has our forms, deadlines and rules in it"],
        ["generalized", "Works anywhere — the local specifics have been lifted out"],
      ] as Choices,
      localizationNone: "Not sure yet",
      localizationHint:
        "[What this means](about) — a localized skill carries one " +
        "jurisdiction\u2019s specifics; a generalized one has had them taken " +
        "out so another city can fill in its own.",

      languageLabel: "What language is it written in?",
      /** A select over the two languages the exchange itself ships in, plus a
       *  tag box for everything else — the field is required, and a form that
       *  could only answer it in English or Spanish would stop a Portuguese
       *  author submitting at all (#145). `other` is not a value the schema
       *  accepts; it reveals the box. */
      languageChoices: [
        ["en", "English"],
        ["es", "Spanish"],
        ["other", "Another language — I will give the tag"],
      ] as Choices,
      languageHint:
        "The language of the `SKILL.md` itself. It is not a limit on who can " +
        "use the skill — a model reads a skill in one language and follows it " +
        "in another. It is so a reader knows what they are about to open.",
      languageOtherLabel: "Its language tag",
      languageOtherPlaceholder: "e.g. pt-BR",
      languageOtherHint:
        "A BCP 47 tag, not the language\u2019s name: `pt-BR`, `fr`, `de`, " +
        "`es-419`.",

      deploymentLabel: "Have you used it?",
      deploymentChoices: [
        ["none", "Not yet — I have not used it in real work"],
        ["personal", "I use it myself"],
        ["team", "My team uses it"],
        ["organization", "My whole organization uses it"],
      ] as Choices,
      deploymentHintClaim:
        "Saying a team or an organization uses it is a claim about them, so the " +
        "details below are needed.",
      deploymentHintPersonal:
        "Using it yourself is a complete answer — nothing else is required.",

      maintainerLabel: "Who maintains it?",
      maintainerHint: "A person or a team — City of X, Department of Innovation.",

      affiliationLabel: "What kind of organization?",
      affiliationChoices: [
        ["government", "Government"], ["nonprofit", "Nonprofit"], ["vendor", "Vendor"],
        ["academic", "Academic"], ["individual", "Just me"],
      ] as Choices,
    },

    optional: {
      summary: "A few optional things",
      useWhenLabel: "When is this useful?",
      avoidWhenLabel: "When is it not?",
      avoidWhenHint:
        "The one only you can answer. A skill honest about its limits gets " +
        "adopted faster.",
      /** #267: free text, so the hint carries the shape. */
      modelsTestedLabel: "Which AI models have you tried it with?",
      modelsTestedPlaceholder: "e.g. Claude Sonnet 5, GPT-5",
      modelsTestedHint:
        "Optional, and your own claim. Comma-separated, as you would name them. " +
        "It helps a reader pick a model it is known to work with.",
      languagesTestedLabel: "What languages have you tried it in?",
      languagesTestedPlaceholder: "e.g. en, es",
      languagesTestedHint:
        "Comma-separated tags, including the one above — `en, es`. Your own " +
        "claim: nothing here checks it, and the page shows it as something you " +
        "said rather than something anybody verified.",
      toolsLabel: "Tools it needs",
      toolsPlaceholder: "e.g. Read, Grep",
      toolsHint:
        "Comma separated. These are granted without asking the person who runs " +
        "it, so list the least it needs.",
      deployedAtLabel: "Which organization uses it?",
      deployedAtHint:
        "Leave this blank if it is just you — personal use names no organization.",
      deployedInLabel: "Where does that organization operate?",
      deployedInPlaceholder: "e.g. US-MA / Boston",
      deployedInHint: "Like US-MA / Boston.",
      deployedSinceLabel: "Roughly since when?",
      deployedSincePlaceholder: "e.g. 2026-03",
    },

    send: {
      heading: "Send it",

      /** What the page wrote into the submitter's own file, on every path. #82:
       *  asserting that the download matters did not stop somebody uploading
       *  their original folder instead and losing all of it. */
      addedSummary: (lines: number) =>
        `What we added to your SKILL.md — ${lines} line${lines === 1 ? "" : "s"}`,
      addedNote:
        "Written into the copy this page hands you. Your original file on disk " +
        "still does not have these.",

      findingsNote: (n: number) =>
        `${n} thing${n === 1 ? "" : "s"} still to fill in, marked above. You ` +
        "can send it anyway — the checks that count run after you do, and you " +
        "can fix things then.",

      /** The one status line (#295). It agrees with the findings: a count while
       *  any remain, this once none do, and the block when a file cannot go. */
      /** Before a hand-off is tried, while empty required questions are still
       *  quiet (#302, S-13): they are not marked yet, so the line counts them
       *  rather than pointing at them. */
      statusWaiting: (n: number) =>
        `${n} question${n === 1 ? "" : "s"} still to answer. You can send it ` +
        "anyway \u2014 the checks that count run after you do, and you can fix " +
        "things then.",
      showMissing: "Show what\u2019s missing",
      allClear:
        "Nothing left to fill in. The checks that count run after you send it, " +
        "and you can fix things then.",
      statusBlocked:
        "Something in your files has to change before this can be sent. It is " +
        "marked above.",

      /** Four steps, because a folder cannot be put in a link. Each one is a
       *  real URL the submitter can open, and the page never asks them to type
       *  a path. */
      multiFileNote: (files: number) =>
        `Your skill is ${files} files. GitHub takes a whole folder, but only ` +
        "from its own upload page — so the last steps happen there, with the " +
        "folder this page hands back.",

      folderTitle: "Take the corrected folder",
      folderBody:
        "Your files, unchanged, with the answers above written into `SKILL.md`. " +
        "This folder — not your original — is what you upload: the answers " +
        "exist only in this copy. Unzip it first.",
      /** `folder` is the directory the zip unpacks to. */
      downloadFolder: (folder: string) => `Download ${folder}.zip`,

      forkTitle: "Make your own copy of the registry",
      forkBody:
        "A fork is your own copy of the exchange on GitHub. Changes you make " +
        "there don\u2019t affect anyone else until you ask for them to be " +
        "added, which is the pull request in the next step. " +
        "One button on GitHub, then come back and paste the address it gives " +
        "you. We cannot guess it — you may rename the copy, or keep it under a " +
        "different account.",
      forkCta: "Fork the registry",
      /** Each GitHub step links to the guide's word for it (#259). */
      forkMore: "What is a fork?",
      forkLabel: "The address of your copy",
      forkPlaceholder: "github.com/you/civic-skill-exchange",
      forkHint: "Paste it from your browser's address bar, or type owner/name.",
      forkUnparsed:
        "That does not look like a GitHub repository. It should be like " +
        "`github.com/you/civic-skill-exchange`.",
      /** The registry's own address, pasted as the fork (#293, S-8). */
      forkIsRegistry:
        "That is the registry’s own address, not your copy. Fork it " +
        "first with the button above, then paste the address of the copy " +
        "GitHub makes for you — it has your username in it, like " +
        "`github.com/you/civic-skill-exchange`.",
      /** `owner` is the fork's account, `login` the typed username (#293, S-1). */
      forkMismatch: (owner: string, login: string) =>
        `Your copy is under \`${owner}\`, but the username above is ` +
        `\`${login}\`. They should be the same account: the folder is named ` +
        "for the username, and only that account can open the pull request " +
        `for it. If you are signed in to GitHub as \`${owner}\`, change the ` +
        `username to \`${owner}\`.`,
      /** The username box is empty, so no path can be given yet (#293, S-2). */
      /** Why the folder download is held, on the skill route and the plugin
       *  route alike (#302, S-15). */
      downloadWhy: "Enter your GitHub username above, and the download is ready.",
      /** The summary of a file shown whole, before it is uploaded. */
      seeFile: (path: string) => `See all of ${path}`,
      usernameNeeded:
        "Type your GitHub username above first. It names the folder your " +
        "submission goes in, so the upload, the download and the commands " +
        "wait for it.",

      uploadTitle: "Drag the folder in",
      /** `reserved` is a namespace CODEOWNERS gates rather than a person, whose
       *  submitter can write to the registry itself and has no fork. */
      uploadBody: (
        folder: string, reserved: boolean, namespacePath: string, skillPath: string,
      ) =>
        `Drop in the whole folder you **downloaded** in step 1 — unzipped, ` +
        `named \`${folder}\`, subfolders and all. Do not open it first: ` +
        "GitHub keeps the folder\u2019s name, which is how it lands in the " +
        "right place. Then **Commit changes**, choosing " +
        (reserved
          ? "*create a new branch and start a pull request* rather than " +
            "committing to `main`."
          : "*commit directly to the `main` branch*. It is your own copy, so " +
            "nothing is affected until the pull request in the next step.") +
        (reserved ? " This opens the registry at " : " This opens your copy at ") +
        `\`${namespacePath}\`, so the result is \`${skillPath}\`.`,
      uploadCta: "Upload the folder",
      commitMore: "What is a commit?",
      uploadWaiting:
        "Paste the address of your copy above and this becomes a link. A " +
        "guessed one would send you to the wrong place.",

      pullRequestTitle: "Open the pull request",
      pullRequestBody:
        "This button compares your copy with the registry and opens the pull " +
        "request form with a title and description already filled in. Check " +
        "them, then choose \u201cCreate pull request\u201d. The checks run on it, " +
        "and a maintainer takes it from there.",
      pullRequestCta: "Open the pull request",
      pullRequestMore: "What happens to a pull request?",

      /** After the hand-off (#300): the page's answer to "now what?". Who is
       *  asked to review comes from .github/CODEOWNERS, and the tests read that
       *  file, so these cannot drift from it without failing. */
      next: {
        heading: "What happens next",
        checks:
          "The checks run on the pull request as soon as it is open, and report " +
          "back in a comment on it. Then a maintainer reads it. Fix anything the " +
          "checks flag by adding to the same pull request.",
        /** `/skills/` has no CODEOWNER, so GitHub requests nobody — yet the
         *  repository still requires one approving review. */
        whoSkill:
          "**Nobody is asked for you.** A skill in your own folder has no " +
          "owner assigned, so GitHub does not request a reviewer, but the " +
          "repository still needs one approving review before anything merges, " +
          "and it has to come from a maintainer. If it has waited a while, a " +
          "comment on the pull request is the way to ask.",
        /** `/plugins/` is owned by the maintainers team. */
        whoPlugin:
          "**A maintainer is asked automatically.** GitHub requests the " +
          "maintainers\u2019 review on every plugin pull request, because a " +
          "plugin runs programs on the reader\u2019s computer. You do not need " +
          "to ask.",
        /** The reserved namespace is owned by the maintainers team. */
        whoReserved:
          "**A maintainer is asked automatically.** GitHub requests the " +
          "maintainers\u2019 review on everything in the Lab\u2019s own " +
          "namespace. You do not need to ask.",
        english:
          "The pull request\u2019s title and description are filled in for you, " +
          "in English, because the maintainers who read them work in English. " +
          "Change anything that is wrong before you create it.",
        singleFile:
          "GitHub\u2019s editor cannot pre-fill a title for a one-file skill, so " +
          "give the pull request one: **Add skill** and the name.",
        reviewed:
          "Once it merges, it is listed in the Community tier. The Reviewed " +
          "tier, where the Lab reads every line of one commit, is a **separate " +
          "request**, made after it merges: [open a review request](request). " +
          "[What a review checks](review).",
      },

      handoff: "Continue on GitHub",
      urlTooLong:
        "This is too long to carry in a link. Copy it below and paste it into " +
        "GitHub instead.",
      copy: "Copy it",
      copied: "Copied",

      /** The path for somebody without a GitHub account. A maintainer receives
       *  it and opens the pull request, which means the Lab is the committer —
       *  so the skill lands in the reserved namespace with the sender credited
       *  as maintainer. That is a real difference and the page says so. */
      emailHandoff:
        "No GitHub account? [Email it to us](email) and we will add it for " +
        "you. It goes in under the project\u2019s name rather than yours, with " +
        "you credited as the maintainer — attach the skill file and anything " +
        "it needs.",
      emailTooLong: (address: string) =>
        "Too long to send by email link. Copy it above and mail it to " +
        `[${address}](email) with the skill file attached.`,
      /** No inbox yet, so this cannot say "email it to us" — and going quiet
       *  instead would leave somebody who will not make an account with no idea
       *  whether that is a dead end. It is, for now, and saying so beats
       *  letting them find out. */
      noAccountPath:
        "Every route from here goes through GitHub, so an account is required " +
        "— the checks that admit a skill work by confirming the account that " +
        "submitted it owns the folder it went into. If that is a problem, open " +
        "an [issue](issues) or ask whoever pointed you at this page; a " +
        "maintainer can submit on your behalf, and the listing will credit you " +
        "as the maintainer.",

      seeYaml: "See what will be added",
      commandLine: "Or do it from the command line",
      recipeIntro:
        "Fork the registry on GitHub first, then clone your fork — not the " +
        "registry itself, which only its maintainers can push to. Where it " +
        "says YOUR-USERNAME, put your GitHub username, or paste your fork's " +
        "address above and it fills in. Where it says /path/to/, put the " +
        "place on your computer where the folder you downloaded is, unzipped. " +
        "`npm ci` installs what the checker needs.",
      recipeAfter:
        "When the push finishes, git prints a link for opening the pull " +
        "request. If you miss it, open your fork on GitHub and choose " +
        "“Compare & pull request”.",
    },

    update: {
      heading: "Update a skill you already listed",
      lede:
        "Choose it and we will show you what to add. You paste two lines into " +
        "the file on GitHub, and nothing else changes.",
      nothingListed: "Nothing is listed here yet.",
      pick: "Your skill",
      choose: "Choose a listing…",
      pasteHint:
        "Paste these into the `metadata:` block, keeping the indentation, and " +
        "change the text.",
      /** `id` is `{namespace}/{name}`. */
      editCta: (id: string) => `Edit ${id} on GitHub`,
      notFinding:
        "Not finding it? Only skills already in this catalog appear here. If " +
        "yours is not listed yet, [submit it as a new skill](new) first.",
    },

    /** Answers kept in this browser through the trip to GitHub and back (#294). */
    draft: {
      saved:
        "Your answers are saved in this browser as you type, so you can go to " +
        "GitHub and come back. The Start over button clears them.",
      restored:
        "We restored the answers you had typed here. They were kept in this " +
        "browser; nothing was sent anywhere.",
      notKept: "These could not be kept, so please add them again:",
      zipNotKept: (name: string) =>
        `The file you uploaded, ${name}. Choose it again.`,
      repoNotKept: (name: string) =>
        `The files read from ${name}. Read the repository again.`,
      pasteNotKept:
        "The SKILL.md you pasted was too long to keep. Paste it again.",
      addressesNotKept:
        "The server addresses you pasted. Paste them again.",
      pluginPending: (name: string) =>
        `You have a saved draft for the plugin ${name}. Drop that folder in ` +
        "again and your answers will be filled in.",
      unsaved:
        "This browser is not letting the page save your answers, so they will " +
        "be lost if you leave.",
      startOver: "Start over",
    },

    /** A plugin dropped or imported instead of a skill (#213). The page switches
     *  by itself on a root plugin.json; the plugin is asked about once and each
     *  skill only where its SKILL.md is silent. */
    plugin: {
      heading: "About the plugin",
      /** `name` is the plugin's folder name. */
      summary: (name: string, skills: number, servers: number) =>
        `**${name}** is a plugin of ${skills} skill${skills === 1 ? "" : "s"}` +
        (servers === 0
          ? ", connecting to no MCP servers."
          : `, connecting to ${servers} MCP server${servers === 1 ? "" : "s"}.`),
      skillsLabel: "Its skills",
      serversLabel: "What it connects to",
      /** A remote server is named with the host it talks to, which is what a
       *  reviewer approves; a local one with the program it runs. */
      remoteServer: (name: string, host: string) => `**${name}** — \`${host}\``,
      localServer: (name: string, command: string) =>
        `**${name}** — runs \`${command}\` on the computer it is installed on`,
      reviewed:
        "A maintainer reviews every plugin before it is listed. Its servers " +
        "and scripts run for whoever installs it, so a person reads them first.",

      /** Stands in for the username in an example name until one is typed. */
      youExample: "your-username",
      /** Answered already, by plugin.json. `fields` is a joined list of
       *  `fieldNames` values. */
      fromFile: (fields: string) =>
        `Read from plugin.json: ${fields}. Change anything that is not right \u2014 ` +
        "if someone else wrote the plugin and you will look after it, put your own name.",
      maintainerLabel: "Who maintains it?",
      deploymentLabel: "Have you used it?",
      versionHint:
        "Your own number for it, like `1.0` or `0.3.4`. Optional, and nothing " +
        "checks it.",
      /** The plugin's own help for the username box (#302, S-15): the folder it
       *  names is the plugin's, not a skill's. */
      namespaceHint:
        "This has to match your login exactly \u2014 your plugin goes in a folder of " +
        "that name, and only you can write there.",

      nameLabel: "Plugin name",
      /** `manifestName` is `{namespace}-{name}`, which the page writes. */
      nameHint: (manifestName: string) =>
        `Its folder in the exchange. We name it \`${manifestName}\` inside ` +
        "plugin.json for you, which is the name Claude Code and Codex install.",
      descriptionHint:
        "What the plugin does as a whole. The catalogue, Claude Code and Codex " +
        "all show this.",
      fitHint:
        "When the plugin as a whole fits, and when it does not. A skill's own " +
        "fit stays in its SKILL.md.",

      skillsHeading: "Its skills",
      skillsLede:
        "Each skill keeps its own answers in its own SKILL.md. Only what a file " +
        "leaves unanswered is asked here.",
      skillComplete: "Complete",
      skillOpen: (n: number) => `${n} to answer`,
      skillOther: "Also flagged in this skill\u2019s SKILL.md:",
      /** `file` is plugin.json or mcp.json. */
      fileFindings: (file: string) => `Flagged in ${file}:`,

      multiFileNote: (files: number) =>
        `Your plugin is ${files} files. GitHub takes a whole folder, but only ` +
        "from its own upload page — so the last steps happen there, with the " +
        "folder this page hands back.",
      folderBody:
        "Your files, unchanged, with the answers above written into " +
        "`plugin.json` and each skill\u2019s `SKILL.md`. This folder — not your " +
        "original — is what you upload: the answers exist only in this copy. " +
        "Unzip it first.",
      /** `file` is a path inside the plugin. */
      addedSummary: (file: string, lines: number) =>
        `What we added to ${file} — ${lines} line${lines === 1 ? "" : "s"}`,

      /** A Claude Code package — `.claude-plugin/plugin.json` and no root
       *  plugin.json — which the page rearranged itself (#246). `docs` is the
       *  guide's plugin section. */
      converted:
        "This is a plugin exported from Claude Code, so we rearranged it into " +
        "the layout the exchange lists, which Claude Code and Codex both read: " +
        "`plugin.json` from `.claude-plugin/plugin.json`, and `mcp.json` from " +
        "`.mcp.json`. The new files are under “What we added” below, and " +
        "your skills are unchanged. [The guide](docs) explains the layout.",
      /** Heading over what the conversion could not carry across. */
      convertedFindings:
        "Left out when we rearranged it. Nothing here stops the upload, but " +
        "read it: a server left out is one the plugin will not connect to.",
      /** The box under the findings for a remote server left out because its
       *  address was a `${VAR}` (#250). `server` is its name in `.mcp.json`. */
      addressLabel: (server: string) => `Public address of ${server}`,
      addressHint:
        "This server's address came from a setting on your computer. Paste " +
        "its public `https://` address.",
      addressPlaceholder: "https://example.org/mcp",
      /** `reason` is the validator's own message, which is in English. */
      addressRefused: (reason: string) => `We could not use this address: ${reason}`,
      /** `host` is the host the pasted address names. */
      addressAdded: (server: string, host: string) =>
        `**${server}** is back in \`mcp.json\`, connecting to \`${host}\`.`,
      /** Why each thing was left out of the converted files. `server` is a
       *  name in `.mcp.json`; `value` is the text it held. */
      conversion: {
        field: (field: string) =>
          `\`${field}\` is a Claude Code setting that Agent Plugins has no place ` +
          "for. The exchange lists what every client loads the same way — " +
          "skills and MCP servers — so it was left out of `plugin.json`.",
        skillsField:
          "The exchange reads skills from `skills/{skill}/SKILL.md` only, so a " +
          "different skills folder was left out of `plugin.json`.",
        mcpServersField:
          "Servers are read from `.mcp.json` or from this file itself; this " +
          "setting points somewhere else, so its servers were not carried across.",
        fromEnvironment: (field: string, value: string) =>
          `\`${field}\` is \`${value}\`, which is filled in from the settings ` +
          "on your computer. The exchange cannot see those, so it was left out.",
        notJson: (file: string, reason: string) =>
          `${file} is not valid JSON (${reason}), so nothing was read from it.`,
        fileOutside: (path: string) =>
          `\`${path}\` is outside \`skills/\`, where the layout carries nothing ` +
          "but `README.md`. Claude Code acts on it without asking the model, " +
          "so it was left out. Scripts and data belong inside the skill that uses them.",
        serverUrl: (server: string, url: string) =>
          `**${server}** connects to \`${url}\`, an address filled in from the ` +
          "settings on your computer. A reviewer has to see where a server " +
          "connects, so it was left out of `mcp.json`. Paste its `https` " +
          "address below to list it.",
        serverHeader: (server: string, header: string, value: string) =>
          `**${server}** sends the header \`${header}\` as \`${value}\`, filled in ` +
          "from the settings on your computer, so the header was left out. Never " +
          "write a key or password into `mcp.json`: it is published with the plugin.",
        serverPluginRoot: (server: string, field: string) =>
          `**${server}** runs a program through \`\${CLAUDE_PLUGIN_ROOT}\` in its ` +
          `\`${field}\`, a folder only Claude Code fills in, so it was left out of ` +
          "`mcp.json`.",
        serverCommand: (server: string, field: string, value: string) =>
          `**${server}** has \`${value}\` in its \`${field}\`, filled in from the ` +
          "settings on your computer, so it was left out of `mcp.json`.",
        serverEnv: (server: string, key: string, value: string) =>
          `**${server}** sets \`${key}\` to \`${value}\`, filled in from the ` +
          "settings on your computer, so that setting was left out. Whoever " +
          "installs the plugin sets it themselves.",
        serverField: (server: string, field: string) =>
          `**${server}** has \`${field}\`, which Agent Plugins does not define ` +
          "for this kind of server, so it was left out of `mcp.json`.",
      },
    },

    /** What went wrong reading what somebody brought.
     *
     *  Read by a submitter mid-hand-off, so they say what to do next rather
     *  than what failed. `import.ts`, `zip.ts`, `parse.ts` and `patch.ts`
     *  compose from these. */
    problems: {
      notARepo:
        "That does not look like a GitHub repository. Paste its address, like " +
        "github.com/you/your-skill.",
      notFound:
        "No public repository there. If it is private, download it and upload " +
        "the zip instead.",
      rateLimited:
        "GitHub is rate-limiting anonymous requests from here. Wait a few " +
        "minutes, or upload the zip instead.",
      tooBig:
        "That repository has too many files to read this way. Upload the skill " +
        "folder as a zip instead.",
      noSkillMdInRepo:
        "No SKILL.md at the top of that repository. A skill is a folder with " +
        "SKILL.md in it.",
      offline: "Could not reach GitHub. Check your connection, or upload the zip instead.",

      noSkillMdInZip:
        "No SKILL.md at the root of the archive. A skill is a directory with " +
        "SKILL.md at its top level.",
      notAZip: "This file could not be read as a zip archive.",
      /** A plugin's client manifests are the registry's to write (ADR 0005):
       *  dropped from the copy, named so nothing vanishes quietly. */
      clientFileLeftOut: (path: string) =>
        `${path} — the exchange makes this file for you, so it was left out.`,
      /** Left out is not the same as wrong: these name what was skipped so
       *  nothing vanishes quietly, and they do not stop the hand-off. */
      pathEscape: (path: string) =>
        `${path} — path escapes the skill directory, so it was skipped.`,
      fileTooBig: (path: string, kb: number, capKb: number) =>
        `${path} — too large at ${kb} KB. The cap is ${capKb} KB per file.`,
      archiveTooBig: (capMb: number) =>
        `The archive declares more than ${capMb} MB uncompressed, which is ` +
        "over the cap for a whole skill.",

      noFrontmatter:
        "This does not start with a --- block, so there is nothing to read yet.",
      emptyFrontmatter: "The --- block is empty.",
      noFrontmatterToAmend:
        "This file does not start with a --- block, so there is nothing to amend.",
      invalidYaml: (reason: string) => `The --- block is not valid YAML: ${reason}`,
      invalidPluginJson: (reason: string) => `plugin.json is not valid JSON: ${reason}`,
    },
  },

  /** The mail somebody without a GitHub account sends, which a maintainer
   *  reads and opens the pull request from. Composed rather than typed, so
   *  nothing has to be retyped out of an email — and read by a person, so it
   *  follows the locale they filled the form in. */
  email: {
    subject: (name: string) => `Skill submission: ${name}`,
    /** Where the form had nothing. */
    noName: "untitled",
    noMaintainer: "(name)",
    noLogin: "(username)",
    body: (maintainer: string, login: string, yaml: string) =>
      "A skill for the Civic Skill Exchange.\n\n" +
      `From: ${maintainer}\n` +
      `GitHub: ${login}\n\n` +
      `${yaml}\n` +
      "The skill body and any scripts are attached.\n",
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
      heading: "Two Tiers:",
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

  /** The About page.
   *
   *  ADR 0004 decision 4 translates this page too, against the spike's own
   *  recommendation, and the record says why: it is the page a Spanish-speaking
   *  visitor actually reads. It is also the page that will drift, because it is
   *  prose and it changes with the project. Every change here is two changes.
   *
   *  Ordered as the page is, so a translator can work down the screen. */
  /** "Using the Exchange" (#224, #258): how to get a listing into the tool
   *  somebody uses, and the words they meet sharing one of their own.
   *
   *  Organised by task, with the products inside each (ruling 2). Every step
   *  was checked against the product on the date `checked` is given; a
   *  product's interface labels stay as the product shows them, in English,
   *  because that is what the screenshots show (ruling 4c). */
  guide: {
    heading: "Using the Exchange",
    lede:
      "Every listing here follows an open standard — a skill is a folder with " +
      "a `SKILL.md` that Claude, ChatGPT, Codex, Gemini and others all read, " +
      "and a plugin is several skills with the data connections they use. " +
      "So one listing works in many tools. What differs is how you get it in.",
    /** `iso` is the date every step was last checked. */
    checked: (iso: string) =>
      `Each step was checked against the product on ${
        new Date(iso).toLocaleDateString(locale(), { dateStyle: "long", timeZone: "UTC" })
      }. If a product looks different now, trust the product.`,
    contents: "On this page",
    /** Under each section's screenshots (#260). `iso` is when they were taken. */
    captured: (iso: string) =>
      `Captured on ${
        new Date(iso).toLocaleDateString(locale(), { dateStyle: "long", timeZone: "UTC" })
      }, in English. Personal details are blurred.`,
    /** Alt text says what to look for, not only what is pictured. The
     *  products' own labels stay in English, as the screenshots show them. */
    figures: {
      claude01: {
        alt: "Claude's Customize page on the Skills tab. The + Add button is at the top right.",
        caption: "Customize, then Skills.",
      },
      claude02: {
        alt: "The + Add menu open, with Upload skill at the top.",
        caption: "+ Add, then Upload skill.",
      },
      claude04: {
        alt: "The Upload a skill page with the .zip chosen, a preview of the skill's name and description, and the Upload button.",
        caption: "The skill read from the .zip, ready to upload.",
      },
      chatgpt01: {
        alt: "ChatGPT's Customize panel on Skills, with the Add button at the top right.",
        caption: "Plugins, then Skills.",
      },
      chatgpt02: {
        alt: "The Add menu open, with Upload from your computer at the bottom.",
        caption: "Add, then Upload from your computer.",
      },
      gemini01: {
        alt: "Gemini's sidebar with More open, showing Customize.",
        caption: "More, then Customize.",
      },
      gemini02: {
        alt: "Gemini's Customize page on the Skills tab, with the Create menu open and Upload at the bottom.",
        caption: "Skills, then Create, then Upload.",
      },
    },

    install: {
      heading: "Install one skill",
      lede:
        "Every skill page has a **download** button that gives you the skill " +
        "as a `.zip`, which is what most tools ask for. Find the tool you use:",
      products: {
        claude: {
          heading: "In Claude (claude.ai, the desktop app and Cowork)",
          steps: [
            "On the skill's page, **download** the `.zip`.",
            "In Claude, open **Customize**, then **Skills**.",
            "Click **+ Add**, then **Upload skill**, and pick the `.zip`. " +
              "Claude shows the skill's name and description; click **Upload**.",
          ],
          notes: [
            "If there is no upload option, turn on code execution first: " +
              "**Settings → Capabilities**. On a Team or Enterprise plan only an " +
              "owner can turn it on, and an owner can also add a skill for " +
              "everyone in the organization at once.",
            "Skills work on every Claude plan, Free included. One you upload " +
              "also appears in Claude Code when you sign in to it with the same " +
              "account.",
          ],
        },
        claudeCode: {
          heading: "In Claude Code",
          steps: [
            "Inside Claude Code, add the exchange once, with the first command " +
              "below.",
            "Still inside Claude Code, install any skill by name with the " +
              "second. Every skill page shows its exact install line, ready to " +
              "copy.",
            "Check it worked: in a terminal, outside Claude Code, run the " +
              "third. The skill should be in the list.",
          ],
          notes: [
            "`/plugin` and `claude plugin` are the same command: `/plugin " +
              "install …` inside Claude Code and `claude plugin install …` in a " +
              "terminal do the same thing.",
            "`--scope` sets where an install goes: `user`, `project` or " +
              "`local`. The default is `user`, which is for you in every project.",
            "`--sparse` downloads the listings and leaves out the website and " +
              "tools that live alongside them. It works without it; it is just " +
              "smaller.",
          ],
        },
        chatgpt: {
          heading: "In ChatGPT",
          steps: [
            "On the skill's page, **download** the `.zip`.",
            "In ChatGPT, open **Plugins** from the left-hand rail, then **Skills**.",
            "Click **Add**, then **Upload from your computer**, and pick " +
              "the `.zip`.",
          ],
          notes: [
            "Skills are on ChatGPT **Business, Enterprise, Healthcare and " +
              "Edu** plans, as your workspace allows — not on Free, Plus or Pro.",
            "ChatGPT checks every upload. Most are ready at once; some are " +
              "marked **Needs Review**, and a risky one is **Blocked**.",
          ],
        },
        gemini: {
          heading: "In Gemini",
          steps: [
            "On the skill's page, **download** the `.zip`.",
            "At **gemini.google.com**, or in the Gemini app on a Mac, open " +
              "**More**, then **Customize**, then the **Skills** tab.",
            "Click **Create**, then **Upload**, and pick the `.zip`. If it " +
              "does not take the `.zip`, unzip it and upload the folder instead.",
          ],
          notes: [
            "For now this works with a personal Google account, for people " +
              "over 18 with **Keep Activity** on — not yet with a work or " +
              "school account — and not in the phone app.",
          ],
        },
        codex: {
          heading: "In Codex and other tools",
          steps: [
            "On the skill's page, **download** the `.zip` and unzip it.",
            "Put the folder in `.agents/skills/` in your project, or in " +
              "`~/.agents/skills/` to have it everywhere.",
          ],
          notes: [
            "Codex can also install a skill by name from its own " +
              "marketplace, as Claude Code does: [add the exchange](marketplaceCodex) " +
              "once.",
            "Other tools: check where yours looks for skills. `.agents/skills/` " +
              "in your project also works for Gemini CLI and Antigravity, and " +
              "Claude Code reads `.claude/skills/`.",
          ],
        },
      },
    },

    marketplace: {
      heading: "Add the whole exchange",
      lede:
        "Claude Code and Codex can add the exchange as a **marketplace**: " +
        "every listing, installable by name, with updates coming to you. It is " +
        "also the way in for a **plugin**. On ChatGPT Business and Enterprise, " +
        "a workspace admin can add a marketplace for everyone; ask yours.",
      products: {
        claudeCode: {
          heading: "In Claude Code",
          notes: [
            "Add the exchange, then install any skill or plugin by name. Each " +
              "listing's page shows its exact install line.",
            "To refresh the exchange's catalogue at any time and pick up new " +
              "and updated listings, run `claude plugin marketplace update` " +
              "(or `claude plugin marketplace update civic-skill-exchange` for " +
              "just this one).",
            "Installed a skill from here before it moved into the plugin " +
              "layout? Your copy keeps working. `claude plugin update " +
              "{namespace}-{skill-name}@civic-skill-exchange` brings it up to " +
              "date; restart Claude Code to load it.",
            "Type the two marketplace lines inside Claude Code. To check it " +
              "worked, run `claude plugin list` in a terminal.",
          ],
        },
        codex: {
          heading: "In Codex",
          notes: [
            "Add the exchange, then install any skill or plugin by name, the " +
              "same name as in Claude Code. Each listing's page shows its exact " +
              "line. As in Claude Code, `--sparse` downloads only the listings.",
            "To check it worked, run `codex plugin list` in a terminal.",
            "To refresh the exchange's catalogue at any time and pick up new " +
              "and updated listings, run `codex plugin marketplace upgrade` " +
              "(or `codex plugin marketplace upgrade civic-skill-exchange` for " +
              "just this one).",
            "Installed a skill from here before it moved into the plugin " +
              "layout? `codex plugin marketplace upgrade` brings it up to date, " +
              "under the same name.",
          ],
        },
      },
    },

    safety: {
      heading: "Before you run anything",
      body: [
        "Read the `SKILL.md`, and anything under `scripts/`. Check " +
          "`allowed-tools`: it lets an assistant use those tools **without " +
          "asking you first**.",
        "That is true of every skill from anywhere, not only this exchange. " +
          "Our automated checks can only reject; a skill passing them is not a " +
          "promise that it is safe. A **Reviewed** listing has also been read " +
          "by a person. [How we check](security).",
      ],
    },

    share: {
      heading: "Share your own",
      body:
        "The submission page reads your skill or plugin, asks only for what it " +
        "could not find, and walks you through putting it on GitHub. You will " +
        "need a free GitHub account. The words below are the ones you will meet.",
      cta: "Share a skill or plugin",
    },

    glossary: {
      heading: "Words you'll meet on GitHub",
      lede:
        "Sharing a listing happens on GitHub, which has its own vocabulary. " +
        "These are the five words, and why each step exists.",
      words: {
        fork: {
          term: "Fork",
          meaning:
            "A fork is your own copy of the exchange on GitHub. Changes you " +
            "make there don't affect anyone else until you ask for them to be " +
            "added, which is the pull request. You make one with one button, " +
            "once.",
        },
        branch: {
          term: "Branch",
          meaning:
            "A line of changes inside a copy. Your fork's main line is called " +
            "`main`, and because the fork is yours, the page has you put your " +
            "skill straight onto it.",
        },
        commit: {
          term: "Commit",
          meaning:
            "Saving a change, with a short note of what it was. Uploading your " +
            "folder ends with **Commit changes** — that is the save.",
        },
        pullRequest: {
          term: "Pull request",
          meaning:
            "Asking for your change to be added to the exchange. It shows " +
            "exactly what you are adding, and it is where the checks and the " +
            "maintainers reply.",
        },
        review: {
          term: "Review",
          meaning:
            "Automated checks run on every pull request and report back in a " +
            "comment, and a person approves it before it is added. A " +
            "maintainer reads every plugin in full. **Reviewed** on a listing " +
            "means more: the Lab has read that exact version and signed it off.",
        },
      },
    },
  },

  about: {
    toc: {
      label: "On this page",
      title: "On this page",
      /** The two groups the eight sections sit in (#136): the substance, and
       *  the caveats a reader wants findable rather than first. */
      groups: {
        whatThisIs: "What this is",
        whatToExpect: "What to expect",
      },
      /** Keyed by section id, which is a route slug and not prose. */
      sections: {
        "what-this-is": "The registry",
        tiers: "Two tiers",
        localization: "Generalized and localized",
        metadata: "The civic metadata",
        submitting: "How to submit",
        checks: "What we check",
        review: "What a review checks for",
        beta: "What Beta means",
      },
    },

    whatThisIs: {
      heading: "What this is",
      lede:
        "An open catalog of agent skills for civic use — government, " +
        "public-sector and nonprofit work.",
      skill:
        "A **skill** is a small, portable bundle of instructions — and " +
        "sometimes scripts — that teaches an AI coding agent how to do one job " +
        "well: explain a permit status in plain language, check a benefits " +
        "application against eligibility rules, turn a budget spreadsheet into " +
        "a published open-data file.",
      standard:
        "Skills follow the [Agent Skills open standard](spec), so they work " +
        "across tools rather than locking you into one vendor.",
    },

    tiers: {
      heading: "Two tiers, and what they mean",
      communityTerm: "Community",
      community:
        "The skill is well-formed and nothing mechanical is wrong with it. " +
        "Merged once it passes structural, ownership and signature checks.",
      communityWarn:
        "**This is not an endorsement.** Automated checks can only ever say " +
        "*no* — a pass is the absence of known-bad signals, not the presence " +
        "of safety. Read anything from this tier before you run it.",
      reviewedTerm: "Reviewed",
      reviewed:
        "The AI Lab for Cities at Harvard read every line of one specific " +
        "commit against a published checklist and put its name on it.",
      reviewedWarn:
        "**One reader, and it is us.** Nobody outside the Lab has read it, and " +
        "where the Lab wrote the skill as well, the listing says so. It is a " +
        "smaller claim than two readers from separate organizations would be, " +
        "and it is one we can actually make.",
      pinned:
        "The attestation is pinned to **one commit** — the last one that " +
        "touched the skill. If anything commits to it after that, the listing " +
        "drops back to Community automatically, so a compromised account " +
        "cannot quietly alter something already carrying our review.",
      reviewLink: "What a review checks for",
    },

    localization: {
      heading: "Generalized and localized",
      bound:
        "Most civic skills start out bound to one place. A policy skill " +
        "written for the State of Vermont knows Vermont's statute citations, " +
        "appeal windows and form numbers — which is what makes it useful " +
        "there, and useless anywhere else.",
      /** The three steps of the diagram. Placeholder jurisdictions, and they
       *  stay as they are: the point is one place to another, and Vermont to
       *  Boston is the example the LOCALIZATION doc uses. */
      flow: {
        from: "Vermont policy skill",
        via: "generalized",
        to: "Boston policy skill",
      },
      both:
        "A **localized** skill carries one jurisdiction's specifics. A " +
        "**generalized** one has had them lifted out into a context an adopter " +
        "fills in. Neither is better — but generalizing is what lets a " +
        "solution make the trip to the second city.",
      /** Named only when actually listed: a hardcoded link to a skill that has
       *  not been merged yet is a 404 on the page explaining the idea. At least
       *  one of the two is always true where this is rendered. */
      pair: (generalize: boolean, localize: boolean) =>
        "The trip is not manual. Two skills in this registry do it: " +
        (generalize && localize
          ? "[generalize](generalize), which lifts a jurisdiction's specifics " +
            "out into a context file, and [localize](localize), which applies " +
            "a new place's context to a generalized skill."
          : generalize
            ? "[generalize](generalize)."
            : "[localize](localize), which applies a new place's context to a " +
              "generalized skill, listed here."),
      more: "Read more on generalizing skills",
    },

    metadata: {
      heading: "The civic metadata",
      ordinary:
        "A skill here is an ordinary [Agent Skill](spec) — the same `SKILL.md` " +
        "that works in Claude Code, ChatGPT, Codex and the rest. What this " +
        "registry adds is a `civic.*` block under `metadata`, which the " +
        "specification reserves for exactly this.",
      selfReported:
        "Every field below is **self-reported** by the author. The registry " +
        "derives only two things itself: the tier, from the attestation " +
        "ledger, and authorship, from the namespace. Nothing an author writes " +
        "can move either.",

      purposeHeading: "What it is for",
      category:
        "One of a closed list, so the catalogue can be filtered rather than " +
        "searched. Closed on purpose: a free-text field becomes twelve " +
        "spellings of \u201cpermits\u201d.",
      scope:
        "What kind of government body it is written for — a city, a state, a " +
        "national agency. Country-neutral, because the place is a separate " +
        "field. A skill may serve two levels; one is required, because leaving " +
        "it out could not be told apart from meaning *any*.",
      jurisdiction:
        "The specific place, when there is one: `US-VT`, `US-MA / Boston`. " +
        "Left out by a skill that is not tied to a place, which is most of " +
        "them — and a `generalized` skill never has one, since its specifics " +
        "were lifted out.",
      localization:
        "Whether the local specifics are still in it. This one changes how the " +
        "checks read the skill: an external URL in a `localized` skill is the " +
        "skill working, and in a `generalized` one it is a leftover.",
      language:
        "The language the `SKILL.md` is written in, as one BCP 47 tag — `en`, " +
        "`es`, `pt-BR`. Not a limit on who can use the skill: a model reads an " +
        "English skill and follows it in Spanish. It is so you know what you " +
        "are about to open, and so the catalogue can be browsed by it. " +
        "Required, because an omitted tag could not be told apart from an " +
        "unanswered one.",
      modelsTested:
        "Optional, and the author\u2019s own claim about which AI models they " +
        "have tried the listing with, as free text. **Nothing checks it.** The " +
        "reviewer\u2019s list is `models:` on the attestation, shown apart from it.",
      languagesTested:
        "Optional, and the author\u2019s own claim about which languages they " +
        "have exercised the skill in. **Nothing checks it.** The verified list " +
        "is a different field in a different file — `languages:` on the review " +
        "attestation in `registry/reviewed.yml` — and the skill\u2019s page " +
        "keeps the two apart rather than merging them into one badge.",

      effectHeading: "What it might do to somebody",
      effectLede:
        "The two fields nobody can answer by reading the code, and the reason " +
        "this registry exists rather than a folder of gists.",
      dataSensitivity: "What the skill touches when it runs on real work.",
      humanReview:
        "Whether its output reaches a decision about a person\u2019s rights or " +
        "benefits. A skill that drafts a letter and a skill that feeds an " +
        "eligibility determination are different propositions.",

      fitHeading: "When it fits, and when it does not",
      useWhen:
        "The situation this is the right tool for. Plain text, never rendered " +
        "as markdown.",
      avoidWhen:
        "The higher-value half. Nobody but the author can supply it, and a " +
        "skill honest about its limits gets adopted faster than one claiming " +
        "none.",

      standingHeading: "Who stands behind it",
      maintainer:
        "A person or team, and what kind of organization they are. There is no " +
        "separate contact field: the namespace is a GitHub account, so an " +
        "issue or a mention reaches whoever owns it, and that cannot go stale " +
        "independently of the account.",
      deployment:
        "Whether anyone has actually used it, and where. Self-reported, and " +
        "shown as such.",
      source:
        "Where an imported copy came from, stamped automatically when a skill " +
        "is read out of a repository. The registry holds the content; these " +
        "record its provenance.",

      schema: "The schema, which is the contract",
    },

    submitting: {
      heading: "How to submit a skill",
      lede:
        "The [submission page](submit) does most of this for you: drop in a " +
        "folder or point it at a repository, and it reads what is already " +
        "there and asks only for what it could not find. A plugin \u2014 several " +
        "skills with the MCP servers they use \u2014 goes in the same way, and a " +
        "maintainer reviews every one. You will need a **GitHub account** " +
        "\u2014 it is free, and it is what records the skill as yours.",
      /** For somebody who came to install rather than share (#259). */
      installGuide:
        "Here to install a listing rather than share one? [Using the " +
        "Exchange](guide) has the steps for each tool.",
      byHand: "What it produces, and what you would build by hand:",
      steps: {
        namespaceTitle: "Put it in your own namespace",
        namespace:
          "`skills/{your-github-username}/{skill-name}/skills/{skill-name}/` " +
          "with a `SKILL.md`, plus optional `scripts/` and `references/` " +
          "directories. The exchange generates the rest of the listing when " +
          "it merges.",
        frontmatterTitle: "Fill in the frontmatter",
        frontmatter:
          "The six fields of the Agent Skills spec, plus `civic.*` metadata: " +
          "category, level of government, what data it touches, and whether " +
          "its output affects anyone's rights or benefits. Those last two are " +
          "the questions nobody can answer from reading your code.",
        pullRequestTitle: "Open a pull request",
        pullRequest:
          "Automated checks run and report back in a comment. They can only " +
          "reject \u2014 a pass is not a statement that a skill is safe.",
      },
      cta: "Share a skill or plugin",
      guide: "The contributor guide",
    },

    checks: {
      heading: "What we check, and what we don\u2019t",
      what:
        "Every submission goes through automated checks. They confirm the " +
        "skill is well formed, that it was submitted into its author\u2019s " +
        "own folder, and they scan for a set of known problems: commands that " +
        "run before the model has read the file, unrestricted tool access, and " +
        "code that reaches for credentials.",
      limits:
        "**These checks find known problems. They cannot tell you a skill is " +
        "safe.** Scanners of this kind are well documented as possible to " +
        "evade, so a clean result means only that nothing on the list matched.",
      reviewIsDifferent:
        "A review is a different thing. Someone reads the whole skill and " +
        "checks that what it does matches what it says it does. That is the " +
        "question no scanner can answer, and it is why the Reviewed tier " +
        "exists.",
      threeThings: "Three things to know before you run any skill, from anywhere:",
      scripts: "Skills can include scripts your agent *runs*, not only text it reads.",
      tools:
        "The `allowed-tools` field gives a skill access to tools without " +
        "asking you first.",
      removal:
        "Removing a skill from this catalog does not remove it from anyone who " +
        "already downloaded it.",
      security: "Security model and how to report a problem",
    },

    review: {
      heading: "What a review checks for",
      lede:
        "A review is one person reading the whole skill against a fixed list " +
        "of nine questions, in this order. Four of them are outright " +
        "rejections rather than judgment calls, and they are marked.",
      /** The nine, in order. Each opens with the question in bold, and the four
       *  that are refusals rather than judgment calls close with the marker.
       *  REVIEW.md is the authority; this is the reader's version of it. */
      questions: [
        "**Does the description match what the skill does?** A description " +
        "broader than the behaviour is a security finding, not a style " +
        "problem — it is how a skill gets invoked for work it was not written " +
        "for. *Rejection.*",

        "**Would we run these scripts?** Every line of every file under " +
        "`scripts/` gets read, and of a plugin's `mcp.json`, which declares " +
        "the servers it starts. If we would not run it on our own machine, it " +
        "does not pass. *Rejection.*",

        "**Does it ask for more tools than it needs?** `allowed-tools` grants " +
        "access without prompting you and is not gated by trusting the " +
        "workspace, so every entry has to be necessary. An unrestricted shell " +
        "grant is refused outright. *Rejection.*",

        "**Where does it send anything?** Every network destination has to be " +
        "named, expected, and written down. Traffic to somewhere the " +
        "skill\u2019s stated purpose does not require is not a question to " +
        "ask the author. *Rejection.*",

        "**Does it reach outside the folder it was given?** Credentials, " +
        "environment variables, files elsewhere on the machine.",

        "**Does it tell the agent to hide anything?** Instructions to " +
        "disregard what came before, to conceal a step, or to leave something " +
        "out of what it reports back to you.",

        "**Does what it produces affect anyone\u2019s rights or benefits?** " +
        "If it does, the skill has to say so in its own output, where the " +
        "person affected will see it — not only in its metadata, where only " +
        "we will.",

        "**Is the license there, and does it actually apply?** A license " +
        "naming terms the author had no standing to grant is worse than none.",

        "**Would it work outside the place it came from?** A skill welded to " +
        "one jurisdiction\u2019s forms and deadlines is still useful; it just " +
        "needs to say so, so nobody adopts it expecting otherwise.",
      ],
      warn:
        "**This is a record of what was checked, not a guarantee.** One " +
        "reader, about fifteen minutes, one version of the skill. It is not an " +
        "independent audit, we do not test that the skill works, and passing " +
        "these nine questions is not a statement that a skill is safe or fit " +
        "for your purpose. What it does mean is that somebody looked, and you " +
        "can see exactly what they looked for.",
      checklist: "The full checklist, with what each question rejects",
    },

    beta: {
      heading: "What Beta means",
      scope:
        "This is about the exchange, not about the skills. What a listing " +
        "means is covered above and has not changed: automated checks can only " +
        "reject, and a review is a record of what was checked rather than a " +
        "guarantee. Beta says something narrower — that the registry around " +
        "those listings is still being built, and you may hit an " +
        "inconsistency that is ours rather than a skill\u2019s.",
      movingLede: "What is moving right now:",
      moving: [
        "**The categories.** Just recut from twelve to fifteen, onto two axes. " +
        "A listing\u2019s category may be relabelled again.",

        "**The metadata fields.** Some are being dropped, others added — what " +
        "level of government a skill is written for, and how a version is " +
        "declared.",

        "**Submitting.** The browser route works; the two paths around it are " +
        "still settling, and error messages are still being written for " +
        "people rather than for reviewers.",

        "**Review and removal.** Both processes exist and each has run once. " +
        "Expect the guides to change as they are used.",
      ],
      migration:
        "A field that changes does not invalidate a listing: the validator " +
        "says what a submission needs at the moment you submit it, and the " +
        "maintainers migrate what is already listed rather than asking authors " +
        "to. If something contradicts itself, that is a bug and worth an issue.",
    },

    terms: {
      heading: "Terms",
      inclusion:
        "Inclusion in this registry does not constitute endorsement, " +
        "verification, or any guarantee regarding a skill's quality, " +
        "functionality, security, or fitness for any purpose. Skills in the " +
        "Reviewed tier have been read by the AI Lab for Cities at Harvard " +
        "against a published checklist; that is a statement about a specific " +
        "commit, not a warranty, and not an independent assessment. **You are " +
        "responsible for what you run.**",
      licensing:
        "Registry infrastructure is MIT licensed. Each skill carries its own " +
        "license in its frontmatter and remains the property of its authors — " +
        "check that field before you use one.",
      affiliation:
        "A project affiliated with the AI Lab for Cities at Harvard. Not an " +
        "official publication, and not endorsed by any institution.",
    },
  },

  /** One skill's own page. */
  detail: {
    breadcrumb: "Breadcrumb",
    catalog: "Catalog",
    maintainedBy: (who: string) => `Maintained by ${who}`,

    /** Flow 2 on #24, shown only where the fields are actually absent — so it
     *  is an offer to the maintainer rather than chrome on every listing. */
    nudge: "This listing does not say when the skill fits and when it does not.",
    nudgeCta: "Maintain it? Add that",

    fit: {
      heading: "When to use this",
      caveat:
        "Written by whoever submitted the skill, about their own work. Nobody " +
        "has checked it against what the skill actually does.",
      use: "Use it when",
      avoid: "Don’t use it when",
    },

    tools: {
      heading: "What it can do",
      /** The grant is the most security-relevant thing on the page, so the
       *  sentence that says it happens without asking carries the emphasis. */
      caveat:
        "These tools are granted **without prompting you** when the skill is " +
        "invoked, and the grant is not gated by workspace trust. Check that " +
        "each one is necessary for what the skill claims to do.",
      none: "No tools declared.",
    },

    structure: {
      heading: "What is in it",
      caveat:
        "Files under `scripts/` are **executed by the agent**, not read by " +
        "the model. Read " +
        "them before you run this skill — the descriptions above tell you " +
        "what it claims to do, and only the code tells you what it does.",
      /** The tag on a file the agent runs rather than reads. */
      executed: "executed",
      source: "Read the source on GitHub",
    },

    /** The facts panel. Each `dt` is two words because the column is narrow;
     *  where a fact needs a caveat, the caveat is its own entry. */
    facts: {
      heading: "At a glance",
      category: "Category",
      categories: "Categories",
      scope: "Level",
      scopes: "Levels",
      jurisdiction: "Written for",
      localization: "Portability",
      /** The declared language, and separately the author's claim about what
       *  they tried it in. Never merged: the reviewer's verified list lives on
       *  the attestation in registry/reviewed.yml, and a reader who cannot tell
       *  the two apart will over-trust the claim. ADR 0004. */
      language: "Written in",
      modelsTested: "Author reports testing with",
      modelsTestedNote: "Self-reported. Nobody has checked it with these models.",
      verifiedModels: "Run in review with",
      verifiedModelsNote: (reviewers: string) =>
        `Run by ${reviewers} against this exact commit.`,
      languagesTested: "Author reports testing in",
      languagesTestedNote:
        "Self-reported. Nobody has run it in these languages on our behalf.",
      verifiedLanguages: "Verified in review",
      verifiedLanguagesNote: (reviewers: string) =>
        `Confirmed by ${reviewers} against this exact commit.`,
      /** Where the ledger names nobody. */
      someReviewer: "the reviewer",
      sensitivity: "Data",
      humanReview: "Affects people",
      license: "License",
      compatibility: "Requires",
      commit: "Commit",
      source: "Copied from",
    },

    /** Longer than `vocabulary.humanReview`, because this is the one place with
     *  room to say what the answer means for the person on the other end. */
    humanReview: {
      none: "Output does not affect any individual's rights, benefits or standing.",
      "advisory-only": "Informs a person. Does not determine anything on its own.",
      "decision-support": "Feeds a determination someone acts on. Review its output.",
    },

    provenance: {
      heading: "Where it has been used",
      note: "Self-reported by the submitter.",
      deployment: "Use",
      at: "At",
      in: "In",
      since: "Since",
    },
  },

  /** The panel beside the skill, where somebody is about to act.
   *
   *  The disclaimer sits here rather than in a footer for that reason: a
   *  Community listing is not an endorsement, and the place to say so is next
   *  to the button. */
  download: {
    heading: "Use this skill",

    community:
      "**Nobody has reviewed this skill.** It passed automated structural and " +
      "signature checks, which can only ever reject — a pass is not a " +
      "statement that it is safe. Read the source on GitHub before you run it, " +
      "particularly anything under `scripts/`.",

    /** `selfReviewed` is a Lab-authored skill in the Reviewed tier. Under one
     *  reviewer the Lab can be both author and reviewer, and the sentence that
     *  makes the review claim is the sentence that has to say so. */
    reviewed: (reviewers: string, date: string, selfReviewed: boolean) =>
      `**Reviewed${selfReviewed ? " — by its own author" : ""}.** ` +
      `${reviewers} read this exact commit against the published checklist` +
      `${date ? ` on ${date}` : ""}. That is a statement about this content, ` +
      "not a warranty." +
      (selfReviewed
        ? " The AI Lab for Cities wrote and reviewed this skill. Nobody " +
          "outside the Lab has read it."
        : ""),

    /** First, and deliberately. degit needs Node and clone needs git; the
     *  archive is the only path open to somebody with a browser and nothing
     *  else. `size` is already formatted. */
    archive: (size: string) => `Download the skill (${size})`,
    archiveNote:
      "A zip of this folder. Upload it wherever your agent tool takes skills " +
      "— no git, no command line.",

    /** The registry is a Claude Code and a Codex plugin marketplace (#73,
     *  #289), which is the shortest path in and needs no knowledge of where a
     *  tool keeps its skills. The commands themselves are not prose. */
    commands: {
      claudeMarketplace: "Inside Claude Code: add the marketplace, once",
      claudeInstall: "Inside Claude Code: install it",
      claudeCheck: "In a terminal, for Claude Code: check it worked",
      codexMarketplace: "In a terminal, for Codex: add the marketplace, once",
      codexInstall: "In a terminal, for Codex: install it",
      codexCheck: "In a terminal, for Codex: check it worked",
      degit: "Just this skill",
      clone: "The whole registry",
    },
    copy: "Copy",
    copied: "Copied",

    /** Under the download: the guide's section for each product (#259). The
     *  product names are names, the same in every language. */
    stepByStep:
      "Step by step: [Claude](claude) · [ChatGPT](chatgpt) · " +
      "[Gemini](gemini) · [Codex](codex)",
    formatNote:
      "In Claude Code and Codex, the two marketplace lines below are all you need " +
      "— [what these do](claudeCode). Skills here follow the open " +
      "[Agent Skills](spec) format, so they also work in ChatGPT, Gemini, " +
      "Copilot, Cursor and others — those take a skill at a time, so use the " +
      "download above.",
    pathsNote:
      "Install paths differ across agent tools — `.claude/skills/`, " +
      "`.agents/skills/`, and others. Check your tool's docs for where it looks.",
    github: "View on GitHub",
  },

  /** Plugins: several skills and the MCP servers they use, installed as one
   *  (ADR 0005). Their own section and their own page, by the owner's ruling
   *  on #206 — never cards among the skills, because a plugin's skills
   *  install and are reviewed together. */
  plugins: {
    heading: "Plugins",
    intro:
      "Several skills that work together, installed as one, with the MCP " +
      "servers they connect to. Their skills are described on each plugin's page.",
    /** The section's own count, as the grid has its own. Plugins are not folded
     *  into the skills' count, so each says what it counts. */
    count: {
      all: (n: number) => `${n} plugin${n === 1 ? "" : "s"}`,
      some: (shown: number, total: number) => `${shown} of ${total} plugins`,
      range: (from: number, to: number, shown: number, total: number) =>
        shown === total
          ? `Plugins ${from}–${to} of ${total}`
          : `Plugins ${from}–${to} of the ${shown} that match (${total} in all)`,
    },
    empty: "No plugins match these filters. [Clear them](clear) to see every plugin.",
    row: {
      cta: "View this plugin",
      skills: (n: number) => `${n} skill${n === 1 ? "" : "s"}`,
      servers: (n: number) => `${n} MCP server${n === 1 ? "" : "s"}`,
      noServers: "No MCP servers",
    },
    detail: {
      /** The skill page's caveat says "skill"; this is the plugin's (#230). */
      fit: {
        caveat:
          "Written by whoever submitted the plugin, about their own work. " +
          "Nobody has checked it against what the plugin actually does.",
      },
      skills: {
        heading: "Skills in this plugin",
        caveat:
          "Each one meets the same rules as a skill listed on its own. They " +
          "install together and were checked together.",
      },
      servers: {
        heading: "MCP servers",
        caveat:
          "**The plugin connects to these when it loads.** A reviewer checks " +
          "that each host is one the plugin's purpose needs — check them " +
          "against your organization's own rules before you install.",
        none: "None. This plugin connects to no MCP server.",
        remote: "Remote",
        local: "Runs on your machine",
      },
      facts: {
        categories: "Categories",
        languages: "Languages",
        sensitivity: "Most sensitive data it handles",
      },
    },
    download: {
      heading: "Use this plugin",
      /** A maintainer reviews every plugin before it merges (ruling 1 on
       *  #211), so Community here means no Reviewed-tier attestation — not no
       *  review, which is what the skill wording would say (#230). */
      community:
        "**A maintainer reviewed this plugin before listing it.** It has not " +
        "been attested to the Reviewed tier, and automated checks can only " +
        "ever reject — a pass is not a statement that it is safe. Read the " +
        "source on GitHub before you install it, particularly every skill's " +
        "`scripts/` and `mcp.json`.",
      archive: (size: string) => `Download the plugin (${size})`,
      archiveNote: "A zip of this folder, every skill included.",
      commands: {
        claudeMarketplace: "Inside Claude Code: add the marketplace, once",
        claudeInstall: "Inside Claude Code: install it",
        claudeCheck: "In a terminal, for Claude Code: check it worked",
        codexMarketplace: "In a terminal, for Codex: add the marketplace, once",
        codexInstall: "In a terminal, for Codex: install it",
        codexCheck: "In a terminal, for Codex: check it worked",
      },
      /** The guide's section on adding the exchange (#259). */
      stepByStep: "[Step by step](guide): adding the exchange to Claude Code or Codex.",
      formatNote:
        "Plugins here follow the open [Agent Plugins](spec) format. Tools " +
        "that take one skill at a time can use the skills inside the download.",
    },
    errors: {
      /** `id` is `{namespace}/{name}` as it appeared in the URL. */
      noSuchPlugin: (id: string) => `No plugin called ${id} is listed here.`,
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
     *  as meaningful, which it is not. UTC is pinned rather than taken from the
     *  reader's zone: midnight on the 1st is the month before, anywhere west of
     *  Greenwich, and a listing that arrived in March should not read February
     *  in Boston. */
    when: (iso: string) => new Date(iso).toLocaleDateString(
      locale(), { month: "long", year: "numeric", timeZone: "UTC" }),
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
