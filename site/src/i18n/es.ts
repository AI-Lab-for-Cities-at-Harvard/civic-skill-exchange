/** Every string the site shows a person, in Spanish.
 *
 *  ==================== FOR THE TRANSLATOR ====================
 *
 *  NOT TRANSLATED YET. Every value below is the English text behind the marker
 *
 *      [es]
 *
 *  which is there to be greppable and to look wrong on the page. Translate the
 *  value and delete the marker, including the space after it.
 *  `no-untranslated.test.ts` lists what is left and fails while anything is,
 *  so the file is finished exactly when that test is green.
 *
 *  `en.ts` is the contract and the commentary. Every key here sits in the same
 *  group, in the same order, and `es.test.ts` fails if that stops being true —
 *  so a paragraph's rationale, the reason a field is asked for, and the note on
 *  what must not be translated are all readable beside the same key over there,
 *  and are deliberately not copied here. Two copies of a comment is one stale
 *  comment.
 *
 *  What that leaves to say twice:
 *
 *  Four markers are markup inside a string, rendered by `rich()`:
 *
 *      **strong**        emphasis that carries meaning: a warning, a caveat
 *      *emphasis*        emphasis that carries tone
 *      `code`            an identifier: a path, a field name, a place code
 *      [label](name)     a link, whose URL the component supplies
 *
 *  Translate around them. `name` in a link is not a URL and not shown to
 *  anybody — leave it alone, and move the `[label]` to wherever the Spanish
 *  sentence wants it.
 *
 *  A value that is a function takes something the page counted or was given.
 *  Keep every argument, and put them where the sentence needs them. The plural
 *  rules are the function’s business: `${n} skill${n === 1 ? "" : "s"}`
 *  becomes whatever Spanish needs, and the condition may be rewritten.
 *
 *  A value that is `[value, label]` translates the label only. The value is an
 *  enum the schema defines, it is the same in every language, and `es.test.ts`
 *  fails on a translated one.
 *
 *  What is NOT here, deliberately: frontmatter keys, enum values, URLs, file
 *  paths and anything the validator parses. And `docs/` stays in English (ADR
 *  0004 decision 4), which is why the links to it carry `docsEnglish`.
 *
 *  ==========================================================
 */

import { locale } from "./locale";
import type { Strings } from "./strings";

/** A select's or a radio group's choices, as `[value, label]`. */
type Choices = [value: string, label: string][];

export const strings: Strings = {
  vocabulary: {
    missing: "[es] —",

    category: {
      policy: "[es] Policy",
      "data-analysis": "[es] Data Analysis",
      communications: "[es] Communications",
      finance: "[es] Finance",
      hr: "[es] HR",
      technology: "[es] Technology",
      "constituent-services": "[es] Constituent Services",
      "benefits-eligibility": "[es] Benefits & Eligibility",
      "permitting-licensing": "[es] Permitting & Licensing",
      legal: "[es] Legal",
      "public-records": "[es] Public Records & Transparency",
      operations: "[es] Operations & Service Delivery",
      "emergency-public-safety": "[es] Emergency Management & Public Safety",
      "planning-land-use": "[es] Planning & Land Use",
      "ai-tools": "[es] AI Tools",
    },

    scope: {
      any: "[es] Any level of government",
      municipal: "[es] City, county or town",
      regional: "[es] State, province or region",
      national: "[es] National",
      supranational: "[es] Supranational",
    },

    language: {
      en: "[es] English",
      es: "[es] Spanish",
    },

    sensitivity: {
      none: "[es] No personal data",
      pii: "[es] Personal data (PII)",
      protected: "[es] Protected — statutory regime",
    },

    localization: {
      generalized: "[es] Generalized",
      localized: "[es] Localized",
    },

    deployment: {
      none: "[es] Not used in production",
      personal: "[es] Used personally",
      team: "[es] Used by a team",
      organization: "[es] Used organization-wide",
    },

    humanReview: {
      none: "[es] No effect on rights or benefits",
      "advisory-only": "[es] Informs a person, decides nothing",
      "decision-support": "[es] Feeds a decision someone acts on",
    },

    affiliation: {
      government: "[es] Government",
      nonprofit: "[es] Nonprofit",
      vendor: "[es] Vendor",
      academic: "[es] Academic",
      individual: "[es] Individual",
    },

    tier: {
      reviewed: "[es] Reviewed",
      community: "[es] Community",
    },
  },

  questions: {
    "civic.data-sensitivity": {
      question: "[es] What data does it touch?",
      options: [
        ["none", "[es] No personal data"],
        ["pii", "[es] Personal details about identifiable people"],
        ["protected", "[es] Health, benefits, immigration or criminal justice data"],
      ] as Choices,
    },
    "civic.human-review": {
      question: "[es] Does what it produces affect anyone's rights or benefits?",
      options: [
        ["none", "[es] No — it does not affect anyone's rights or benefits"],
        ["advisory-only", "[es] It informs a person, but decides nothing"],
        ["decision-support", "[es] It feeds a decision someone acts on"],
      ] as Choices,
    },
  },

  units: {
    bytes: "[es] B",
    kilobytes: "[es] KB",
    megabytes: "[es] MB",
  },

  chrome: {
    skipToContent: "[es] Skip to content",

    brand: "[es] Civic Skill\u00a0Exchange",
    nav: {
      label: "[es] Main",
      browse: "[es] Browse",
      about: "[es] About",
      submit: "[es] Submit",
      github: "[es] GitHub",
    },
    language: {
      label: "[es] Language",
    },
    theme: {
      toLight: "[es] Light",
      toDark: "[es] Dark",
      switchToLight: "[es] Switch to light theme",
      switchToDark: "[es] Switch to dark theme",
    },
    title: "[es] Agent skills for government, public-sector and nonprofit work",
    lede:
      "[es] A city that solves a problem once should be able to hand the solution " +
      "to the next hundred cities.",

    stats: {
      skills: (n: number) => `[es] **${n}** skill${n === 1 ? "" : "s"}`,
      reviewed: (n: number) => `[es] **${n}** reviewed`,
      community: (n: number) => `[es] **${n}** community`,
    },
    footer: {
      disclaimer:
        "[es] Inclusion in this registry is not an endorsement. Automated checks " +
        "can only reject — a pass is never a statement that a skill is safe.",

      meta: (generated: string) =>
        `[es] Catalog generated ${generated} · ` +
        "[Source and submissions on GitHub](repo) · [About this project](about)",

      date: (iso: string) => new Date(iso).toLocaleDateString(locale()),
    },
  },

  results: {
    loading: "[es] Loading the catalog…",
    all: (n: number) => `[es] ${n} skill${n === 1 ? "" : "s"}`,
    some: (shown: number, total: number) => `[es] ${shown} of ${total} skills`,
    empty: "[es] No skills match these filters. [Clear them](clear) to see the whole catalog.",
  },

  submit: {
    heading: "[es] Share a skill",
    lede: "[es] Fill this in and we will put it in the right shape for you. It takes a few minutes.",

    prereq:
      "[es] You will need a **GitHub account** to finish — it is free, and it is " +
      "what records the skill as yours. [Create one](signup) if you do not " +
      "have one; it takes a couple of minutes and you can come back to this " +
      "page afterwards.",

    modes: {
      label: "[es] What do you want to do?",
      new: "[es] Add a new skill",
      update: "[es] Update one you already listed",
    },

    communityWarn: "[es] The skill will be listed as a community skill until it is reviewed.",

    intake: {
      heading: "[es] Submit a new skill",
      lede:
        "[es] Already have one? Drop it here and the rest of this page fills itself " +
        "in. If your skill lives in its own repository, GitHub\u2019s **Code → " +
        "Download ZIP** gives you the file to drop.",

      repoLabel: "[es] Your skill's GitHub repository",
      repoHint:
        "[es] Public repositories only. We read the file list and SKILL.md, and " +
        "hand the folder back for you to upload — the listing records where " +
        "the copy came from.",
      repoPlaceholder: "[es] github.com/you/your-skill",
      read: "[es] Read it",
      reading: "[es] Reading…",

      imported: (files: number, repo: string, commit: string) =>
        `[es] Read ${files} file${files === 1 ? "" : "s"} from \`${repo}\` at ` +
        `\`${commit}\`.`,

      archiveLabel: "[es] Or upload the skill folder as a .zip",
      archiveHint: "[es] Unpacked in your browser. It is not sent anywhere.",

      pasteLabel: "[es] Or paste your SKILL.md",

      archiveResult: (name: string, files: number) =>
        `[es] **${name}** — ${files} file${files === 1 ? "" : "s"}.`,
      nothingElse: "[es] Nothing else to fix.",
      blocked: "[es] Fix these before continuing. They cannot be corrected below.",
    },

    form: {
      heading: "[es] About the skill",

      fromFile: (fields: string) =>
        `[es] Read from your file: ${fields}. Everything below is already filled in ` +
        "where it could be — change anything that is wrong.",

      fieldNames: {
        namespace: "[es] your GitHub username",
        name: "[es] the skill name",
        description: "[es] the description",
        license: "[es] the license",
        "allowed-tools": "[es] the tools it needs",
        metadata: "[es] the details below",
        "civic.category": "[es] the category",
        version: "[es] the version",
        "civic.category-secondary": "[es] the second category",
        "civic.scope": "[es] the level of government",
        "civic.scope-secondary": "[es] the second level",
        "civic.jurisdiction": "[es] the place it is written for",
        "civic.localization": "[es] how portable it is",
        "civic.language": "[es] the language it is written in",
        "civic.languages-tested": "[es] the languages you have tried it in",
        "civic.data-sensitivity": "[es] the data it touches",
        "civic.human-review": "[es] its effect on people",
        "civic.use-when": "[es] when it is useful",
        "civic.avoid-when": "[es] when it is not useful",
        "civic.maintainer": "[es] who maintains it",
        "civic.affiliation": "[es] the kind of organization",
        "civic.deployment": "[es] how much you have used it",
        "civic.deployed-at": "[es] the organization",
        "civic.deployed-in": "[es] where it operates",
        "civic.deployed-since": "[es] since when",
      },

      choose: "[es] Choose…",

      namespaceLabel: "[es] Your GitHub username",
      namespaceHint:
        "[es] This has to match your login exactly — your skill goes in a folder of " +
        "that name, and only you can write there.",
      reservedNamespace: (namespace: string) =>
        `[es] \`${namespace}\` is the Lab\u2019s own folder, so this does not have ` +
        "to match your login. It needs approval from a maintainer instead, and " +
        "the listing carries the Lab\u2019s badge.",
      noSuchUser: (login: string) =>
        `[es] No GitHub user called ${login}. A submission whose folder does not ` +
        "match the account that opens the pull request is rejected.",

      nameLabel: "[es] Skill name",
      namePlaceholder: "[es] Permit Status Explainer",
      nameHint: "[es] Type it however you like; we will tidy the spacing and capitals.",

      nameSlug: (slug: string) =>
        `[es] Listed as \`${slug}\` — names are lowercase with hyphens instead of ` +
        "spaces.",

      descriptionLabel: "[es] Description",
      descriptionHint:
        "[es] What the skill does, in a couple of sentences. This is what an agent " +
        "reads to decide whether to use it.",

      categoryLabel: "[es] Category",
      categorySecondaryLabel: "[es] A second category, if it fits one",
      categorySecondaryNone: "[es] None — it sits in one place",
      categorySecondaryHint:
        "[es] The list mixes what a skill is *for* with whose desk it sits on, so " +
        "many skills belong in two places. Leave this alone if yours does not.",

      versionLabel: "[es] Version, if you keep one",
      versionPlaceholder: "[es] 1.0",
      versionHint:
        "[es] Your own number for it, like `1.0` or `2.1.3`. Optional, and nothing " +
        "checks it — it is there so an adopter can tell this is not what they " +
        "took last year. The registry records when a skill arrived and last " +
        "changed on its own.",

      scopeLabel: "[es] What level of government is it for?",

      scopeChoices: [
        ["any", "[es] Any level of government — it makes no assumptions"],
        ["municipal", "[es] A city, county or town"],
        ["regional", "[es] A state, province or region"],
        ["national", "[es] A national government"],
        ["supranational", "[es] A body above national government"],
      ] as Choices,
      scopeSecondaryLabel: "[es] A second level, if it serves two",
      scopeSecondaryNone: "[es] None — one level",

      jurisdictionLabel: "[es] Is it written for one specific place?",
      jurisdictionPlaceholder: "[es] US-MA / Boston",
      jurisdictionHint:
        "[es] Only if the skill carries that place\u2019s rules, forms or deadlines " +
        "— `US-VT`, `US-MA / Boston`, `CA-ON / Toronto`. Leave it blank " +
        "otherwise, which is most skills. A country code, optionally a state or " +
        "province, and optionally a city after a slash.",

      localizationLabel: "[es] Is it set up for one place, or does it work anywhere?",
      localizationChoices: [
        ["localized", "[es] Set up for one place — it has our forms, deadlines and rules in it"],
        ["generalized", "[es] Works anywhere — the local specifics have been lifted out"],
      ] as Choices,
      localizationNone: "[es] Not sure yet",
      localizationHint:
        "[es] [What this means](about) — a localized skill carries one " +
        "jurisdiction\u2019s specifics; a generalized one has had them taken " +
        "out so another city can fill in its own.",

      languageLabel: "[es] What language is it written in?",

      languageChoices: [
        ["en", "[es] English"],
        ["es", "[es] Spanish"],
        ["other", "[es] Another language — I will give the tag"],
      ] as Choices,
      languageHint:
        "[es] The language of the `SKILL.md` itself. It is not a limit on who can " +
        "use the skill — a model reads a skill in one language and follows it " +
        "in another. It is so a reader knows what they are about to open.",
      languageOtherLabel: "[es] Its language tag",
      languageOtherPlaceholder: "[es] pt-BR",
      languageOtherHint:
        "[es] A BCP 47 tag, not the language\u2019s name: `pt-BR`, `fr`, `de`, " +
        "`es-419`.",

      deploymentLabel: "[es] Have you used it?",
      deploymentChoices: [
        ["none", "[es] Not yet — I have not used it in real work"],
        ["personal", "[es] I use it myself"],
        ["team", "[es] My team uses it"],
        ["organization", "[es] My whole organization uses it"],
      ] as Choices,
      deploymentHintClaim:
        "[es] Saying a team or an organization uses it is a claim about them, so the " +
        "details below are needed.",
      deploymentHintPersonal:
        "[es] Using it yourself is a complete answer — nothing else is required.",

      maintainerLabel: "[es] Who maintains it?",
      maintainerHint: "[es] A person or a team — City of X, Department of Innovation.",

      affiliationLabel: "[es] What kind of organization?",
      affiliationChoices: [
        ["government", "[es] Government"], ["nonprofit", "[es] Nonprofit"], ["vendor", "[es] Vendor"],
        ["academic", "[es] Academic"], ["individual", "[es] Just me"],
      ] as Choices,
    },

    optional: {
      summary: "[es] A few optional things",
      useWhenLabel: "[es] When is this useful?",
      avoidWhenLabel: "[es] When is it not?",
      avoidWhenHint:
        "[es] The one only you can answer. A skill honest about its limits gets " +
        "adopted faster.",
      languagesTestedLabel: "[es] What languages have you tried it in?",
      languagesTestedPlaceholder: "[es] en, es",
      languagesTestedHint:
        "[es] Comma-separated tags, including the one above — `en, es`. Your own " +
        "claim: nothing here checks it, and the page shows it as something you " +
        "said rather than something anybody verified.",
      toolsLabel: "[es] Tools it needs",
      toolsPlaceholder: "[es] Read, Grep",
      toolsHint:
        "[es] Comma separated. These are granted without asking the person who runs " +
        "it, so list the least it needs.",
      licenseLabel: "[es] License",
      deployedAtLabel: "[es] Which organization uses it?",
      deployedAtHint:
        "[es] Leave this blank if it is just you — personal use names no organization.",
      deployedInLabel: "[es] Where does that organization operate?",
      deployedInPlaceholder: "[es] US-MA / Boston",
      deployedInHint: "[es] Like US-MA / Boston.",
      deployedSinceLabel: "[es] Roughly since when?",
      deployedSincePlaceholder: "[es] 2026-03",
    },

    send: {
      heading: "[es] Send it",

      addedSummary: (lines: number) =>
        `[es] What we added to your SKILL.md — ${lines} line${lines === 1 ? "" : "s"}`,
      addedNote:
        "[es] Written into the copy this page hands you. Your original file on disk " +
        "still does not have these.",

      findingsNote: (n: number) =>
        `[es] ${n} thing${n === 1 ? "" : "s"} still to fill in, marked above. You ` +
        "can send it anyway — the checks that count run after you do, and you " +
        "can fix things then.",

      multiFileNote: (files: number) =>
        `[es] Your skill is ${files} files. GitHub takes a whole folder, but only ` +
        "from its own upload page — so the last steps happen there, with the " +
        "folder this page hands back.",

      folderTitle: "[es] Take the corrected folder",
      folderBody:
        "[es] Your files, unchanged, with the answers above written into `SKILL.md`. " +
        "This folder — not your original — is what you upload: the answers " +
        "exist only in this copy. Unzip it first.",

      downloadFolder: (folder: string) => `[es] Download ${folder}.zip`,

      forkTitle: "[es] Make your own copy of the registry",
      forkBody:
        "[es] One button on GitHub, then come back and paste the address it gives " +
        "you. We cannot guess it — you may rename the copy, or keep it under a " +
        "different account.",
      forkCta: "[es] Fork the registry",
      forkLabel: "[es] The address of your copy",
      forkPlaceholder: "[es] github.com/you/civic-skill-exchange",
      forkHint: "[es] Paste it from your browser's address bar, or type owner/name.",
      forkUnparsed:
        "[es] That does not look like a GitHub repository. It should be like " +
        "`github.com/you/civic-skill-exchange`.",

      uploadTitle: "[es] Drag the folder in",

      uploadBody: (
        folder: string, reserved: boolean, namespacePath: string, skillPath: string,
      ) =>
        `[es] Drop in the whole folder you **downloaded** in step 1 — unzipped, ` +
        `named \`${folder}\`, subfolders and all. Do not open it first: ` +
        "GitHub keeps the folder\u2019s name, which is how it lands in the " +
        "right place. Then **Commit changes**, choosing *create a new branch " +
        "and start a pull request* rather than committing to `main`." +
        (reserved ? "[es]  This opens the registry at " : "[es]  This opens your copy at ") +
        `\`${namespacePath}\`, so the result is \`${skillPath}\`.`,
      uploadCta: "[es] Upload the folder",
      uploadWaiting:
        "[es] Paste the address of your copy above and this becomes a link. A " +
        "guessed one would send you to the wrong place.",

      pullRequestTitle: "[es] Open the pull request",
      pullRequestBody:
        "[es] If GitHub already offered you one at the end of step 3, that is this " +
        "step done. The checks run on it, and a maintainer takes it from there.",
      pullRequestCta: "[es] Open the pull request",

      handoff: "[es] Continue on GitHub",
      urlTooLong:
        "[es] This is too long to carry in a link. Copy it below and paste it into " +
        "GitHub instead.",
      copy: "[es] Copy it",
      copied: "[es] Copied",

      emailHandoff:
        "[es] No GitHub account? [Email it to us](email) and we will add it for " +
        "you. It goes in under the project\u2019s name rather than yours, with " +
        "you credited as the maintainer — attach the skill file and anything " +
        "it needs.",
      emailTooLong: (address: string) =>
        "[es] Too long to send by email link. Copy it above and mail it to " +
        `[${address}](email) with the skill file attached.`,

      noAccountPath:
        "[es] Every route from here goes through GitHub, so an account is required " +
        "— the checks that admit a skill work by confirming the account that " +
        "submitted it owns the folder it went into. If that is a problem, open " +
        "an [issue](issues) or ask whoever pointed you at this page; a " +
        "maintainer can submit on your behalf, and the listing will credit you " +
        "as the maintainer.",

      seeYaml: "[es] See what will be added",
      commandLine: "[es] Or do it from the command line",
    },

    update: {
      heading: "[es] Update a skill you already listed",
      lede:
        "[es] Choose it and we will show you what to add. You paste two lines into " +
        "the file on GitHub, and nothing else changes.",
      nothingListed: "[es] Nothing is listed here yet.",
      pick: "[es] Your skill",
      choose: "[es] Choose a listing…",
      pasteHint:
        "[es] Paste these into the `metadata:` block, keeping the indentation, and " +
        "change the text.",

      editCta: (id: string) => `[es] Edit ${id} on GitHub`,
      notFinding:
        "[es] Not finding it? Only skills already in this catalog appear here. If " +
        "yours is not listed yet, [submit it as a new skill](new) first.",
    },

    problems: {
      notARepo:
        "[es] That does not look like a GitHub repository. Paste its address, like " +
        "github.com/you/your-skill.",
      notFound:
        "[es] No public repository there. If it is private, download it and upload " +
        "the zip instead.",
      rateLimited:
        "[es] GitHub is rate-limiting anonymous requests from here. Wait a few " +
        "minutes, or upload the zip instead.",
      tooBig:
        "[es] That repository has too many files to read this way. Upload the skill " +
        "folder as a zip instead.",
      noSkillMdInRepo:
        "[es] No SKILL.md at the top of that repository. A skill is a folder with " +
        "SKILL.md in it.",
      offline: "[es] Could not reach GitHub. Check your connection, or upload the zip instead.",

      noSkillMdInZip:
        "[es] No SKILL.md at the root of the archive. A skill is a directory with " +
        "SKILL.md at its top level.",
      notAZip: "[es] This file could not be read as a zip archive.",

      pathEscape: (path: string) =>
        `[es] ${path} — path escapes the skill directory, so it was skipped.`,
      fileTooBig: (path: string, kb: number, capKb: number) =>
        `[es] ${path} — too large at ${kb} KB. The cap is ${capKb} KB per file.`,
      archiveTooBig: (capMb: number) =>
        `[es] The archive declares more than ${capMb} MB uncompressed, which is ` +
        "over the cap for a whole skill.",

      noFrontmatter:
        "[es] This does not start with a --- block, so there is nothing to read yet.",
      emptyFrontmatter: "[es] The --- block is empty.",
      noFrontmatterToAmend:
        "[es] This file does not start with a --- block, so there is nothing to amend.",
      invalidYaml: (reason: string) => `[es] The --- block is not valid YAML: ${reason}`,
    },
  },

  /** NOT TRANSLATED, AND NOT TO BE. The mail goes to a maintainer who reads
   *  English and opens the pull request from it, so `submit.ts` composes it off
   *  the English table explicitly rather than off the reader's locale. These
   *  entries exist because a locale has to fill every key; they are never
   *  rendered. */
  email: {
    subject: (name: string) => `Skill submission: ${name}`,

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

  errors: {
    catalogUnavailable: "[es] The catalog could not be loaded. Try reloading the page.",
    loading: "[es] Loading…",

    noSuchSkill: (id: string) => `[es] No skill called ${id} is listed here.`,
    backToCatalog: "[es] Back to the catalog",
  },

  badges: {
    lab: "[es] Written by the AI Lab",

    tier: {
      reviewedTitle:
        "[es] Read against the published nine-item checklist, at this exact " +
        "version. A record of what was checked, not a warranty.",
      communityNote: "[es] automated checks only",

      reviewedNote: "[es] read against the published checklist",

      reviewers: (names: string[]) => names.join("[es]  and "),
    },

    localization: {
      generalized: "[es] Jurisdiction specifics lifted out into a context you fill in",
      localized: "[es] Carries one jurisdiction's citations, forms and deadlines",
    },

    deployment: {
      selfReported: "[es] Self-reported by the submitter",
      selfReportedSince: (since: string) => `[es] ${since} — self-reported by the submitter`,
    },

    sensitivity: {
      protected:
        "[es] Health, benefits, immigration, criminal justice, or another " +
        "statutory regime",
      pii: "[es] Expected to handle personally identifiable information",
    },

    beta: {
      label: "[es] Beta",
      summary:
        "[es] The exchange itself is new: the category vocabulary, the metadata " +
        "fields and the submission and review workflows are all still changing.",
    },
  },

  card: {
    cta: "[es] View this skill",
  },

  facets: {
    label: "[es] Filter skills",

    any: "[es] Any",
    clear: "[es] Clear filters",
    search: {
      label: "[es] Search",
      placeholder: "[es] permit, benefits, Boston…",
    },
    tier: {
      legend: "[es] Tier",
      note: "[es] Community listings passed automated checks only.",
    },
    category: { legend: "[es] Category" },
    localization: {
      legend: "[es] Portability",
      note: "[es] Generalized skills have jurisdiction specifics lifted out.",
    },
    scope: {
      legend: "[es] Level of government",
      note:
        "[es] What kind of body a skill is written for. The specific place, when " +
        "it has one, is on the skill's own page.",
    },
    language: {
      legend: "[es] Language",
      note:
        "[es] The language the listing is written in. A model reads a skill in " +
        "one language and follows it in another, so this is not a limit on " +
        "who can use it.",
    },
    sensitivity: { legend: "[es] Data touched" },
  },

  bands: {
    tiers: {
      heading: "[es] What a listing here does and does not mean",
      communityTerm: "[es] Community",
      community:
        "[es] Well-formed, and nothing mechanical is wrong with it. Merged once it " +
        "passes structural, ownership and signature checks.",
      reviewedTerm: "[es] Reviewed",
      reviewed:
        "[es] The AI Lab for Cities read every line of one specific commit against " +
        "a published checklist and put its name on it. One reader, not an " +
        "independent audit. Pinned to a content hash, so any change drops it " +
        "back to Community.",
    },
    contribute: {
      heading: "[es] Have one of these already?",
      lede:
        "[es] A city that solves a problem once should be able to hand the " +
        "solution to the next hundred cities. Submitting is a pull request, " +
        "or a form if you would rather not work in git.",
      guide: "[es] Read the contributor guide",
      security: "[es] What we check, and the security model",
    },
  },

  notices: {
    community: {
      lead: (community: number, total: number) => community === total
        ? "[es] Every skill here is a Community listing."
        : community === 1
          ? `[es] 1 of the ${total} skills here is a Community listing.`
          : `[es] ${community} of the ${total} skills here are Community listings.`,
      body:
        "[es] That means automated checks passed — not that anybody read the code. " +
        "Automated checks can only ever reject. Read a skill and its scripts " +
        "before you run it.",
    },
  },

  about: {
    toc: {
      label: "[es] On this page",
      title: "[es] On this page",

      groups: {
        whatThisIs: "[es] What this is",
        whatToExpect: "[es] What to expect",
      },

      sections: {
        "what-this-is": "[es] The registry",
        tiers: "[es] Two tiers",
        localization: "[es] Generalized and localized",
        metadata: "[es] The civic metadata",
        submitting: "[es] How to submit",
        checks: "[es] What we check",
        review: "[es] What a review checks for",
        beta: "[es] What Beta means",
      },
    },

    whatThisIs: {
      heading: "[es] What this is",
      lede:
        "[es] An open catalog of agent skills for civic use — government, " +
        "public-sector and nonprofit work.",
      skill:
        "[es] A **skill** is a small, portable bundle of instructions — and " +
        "sometimes scripts — that teaches an AI coding agent how to do one job " +
        "well: explain a permit status in plain language, check a benefits " +
        "application against eligibility rules, turn a budget spreadsheet into " +
        "a published open-data file.",
      standard:
        "[es] Skills follow the [Agent Skills open standard](spec), so they work " +
        "across tools rather than locking you into one vendor.",
    },

    tiers: {
      heading: "[es] Two tiers, and what they mean",
      communityTerm: "[es] Community",
      community:
        "[es] The skill is well-formed and nothing mechanical is wrong with it. " +
        "Merged once it passes structural, ownership and signature checks.",
      communityWarn:
        "[es] **This is not an endorsement.** Automated checks can only ever say " +
        "*no* — a pass is the absence of known-bad signals, not the presence " +
        "of safety. Read anything from this tier before you run it.",
      reviewedTerm: "[es] Reviewed",
      reviewed:
        "[es] The AI Lab for Cities at Harvard read every line of one specific " +
        "commit against a published checklist and put its name on it.",
      reviewedWarn:
        "[es] **One reader, and it is us.** Nobody outside the Lab has read it, and " +
        "where the Lab wrote the skill as well, the listing says so. It is a " +
        "smaller claim than two readers from separate organizations would be, " +
        "and it is one we can actually make.",
      pinned:
        "[es] The attestation is pinned to **one commit** — the last one that " +
        "touched the skill. If anything commits to it after that, the listing " +
        "drops back to Community automatically, so a compromised account " +
        "cannot quietly alter something already carrying our review.",
      reviewLink: "[es] What a review checks for",
    },

    localization: {
      heading: "[es] Generalized and localized",
      bound:
        "[es] Most civic skills start out bound to one place. A policy skill " +
        "written for the State of Vermont knows Vermont's statute citations, " +
        "appeal windows and form numbers — which is what makes it useful " +
        "there, and useless anywhere else.",

      flow: {
        from: "[es] Vermont policy skill",
        via: "[es] generalized",
        to: "[es] Boston policy skill",
      },
      both:
        "[es] A **localized** skill carries one jurisdiction's specifics. A " +
        "**generalized** one has had them lifted out into a context an adopter " +
        "fills in. Neither is better — but generalizing is what lets a " +
        "solution make the trip to the second city.",

      pair: (generalize: boolean, localize: boolean) =>
        "[es] The trip is not manual. Two skills in this registry do it: " +
        (generalize && localize
          ? "[es] [generalize](generalize), which lifts a jurisdiction's specifics " +
            "out into a context file, and [localize](localize), which applies " +
            "a new place's context to a generalized skill."
          : generalize
            ? "[es] [generalize](generalize)."
            : "[es] [localize](localize), which applies a new place's context to a " +
              "generalized skill, listed here."),
      more: "[es] Read more on generalizing skills",
    },

    metadata: {
      heading: "[es] The civic metadata",
      ordinary:
        "[es] A skill here is an ordinary [Agent Skill](spec) — the same `SKILL.md` " +
        "that works in Claude Code, ChatGPT, Codex and the rest. What this " +
        "registry adds is a `civic.*` block under `metadata`, which the " +
        "specification reserves for exactly this.",
      selfReported:
        "[es] Every field below is **self-reported** by the author. The registry " +
        "derives only two things itself: the tier, from the attestation " +
        "ledger, and authorship, from the namespace. Nothing an author writes " +
        "can move either.",

      purposeHeading: "[es] What it is for",
      category:
        "[es] One of a closed list, so the catalogue can be filtered rather than " +
        "searched. Closed on purpose: a free-text field becomes twelve " +
        "spellings of \u201cpermits\u201d.",
      scope:
        "[es] What kind of government body it is written for — a city, a state, a " +
        "national agency. Country-neutral, because the place is a separate " +
        "field. A skill may serve two levels; one is required, because leaving " +
        "it out could not be told apart from meaning *any*.",
      jurisdiction:
        "[es] The specific place, when there is one: `US-VT`, `US-MA / Boston`. " +
        "Left out by a skill that is not tied to a place, which is most of " +
        "them — and a `generalized` skill never has one, since its specifics " +
        "were lifted out.",
      localization:
        "[es] Whether the local specifics are still in it. This one changes how the " +
        "checks read the skill: an external URL in a `localized` skill is the " +
        "skill working, and in a `generalized` one it is a leftover.",
      language:
        "[es] The language the `SKILL.md` is written in, as one BCP 47 tag — `en`, " +
        "`es`, `pt-BR`. Not a limit on who can use the skill: a model reads an " +
        "English skill and follows it in Spanish. It is so you know what you " +
        "are about to open, and so the catalogue can be browsed by it. " +
        "Required, because an omitted tag could not be told apart from an " +
        "unanswered one.",
      languagesTested:
        "[es] Optional, and the author\u2019s own claim about which languages they " +
        "have exercised the skill in. **Nothing checks it.** The verified list " +
        "is a different field in a different file — `languages:` on the review " +
        "attestation in `registry/reviewed.yml` — and the skill\u2019s page " +
        "keeps the two apart rather than merging them into one badge.",

      effectHeading: "[es] What it might do to somebody",
      effectLede:
        "[es] The two fields nobody can answer by reading the code, and the reason " +
        "this registry exists rather than a folder of gists.",
      dataSensitivity: "[es] What the skill touches when it runs on real work.",
      humanReview:
        "[es] Whether its output reaches a decision about a person\u2019s rights or " +
        "benefits. A skill that drafts a letter and a skill that feeds an " +
        "eligibility determination are different propositions.",

      fitHeading: "[es] When it fits, and when it does not",
      useWhen:
        "[es] The situation this is the right tool for. Plain text, never rendered " +
        "as markdown.",
      avoidWhen:
        "[es] The higher-value half. Nobody but the author can supply it, and a " +
        "skill honest about its limits gets adopted faster than one claiming " +
        "none.",

      standingHeading: "[es] Who stands behind it",
      maintainer:
        "[es] A person or team, and what kind of organization they are. There is no " +
        "separate contact field: the namespace is a GitHub account, so an " +
        "issue or a mention reaches whoever owns it, and that cannot go stale " +
        "independently of the account.",
      deployment:
        "[es] Whether anyone has actually used it, and where. Self-reported, and " +
        "shown as such.",
      source:
        "[es] Where an imported copy came from, stamped automatically when a skill " +
        "is read out of a repository. The registry holds the content; these " +
        "record its provenance.",

      schema: "[es] The schema, which is the contract",
    },

    submitting: {
      heading: "[es] How to submit a skill",
      lede:
        "[es] The [submission page](submit) does most of this for you: drop in a " +
        "folder or point it at a repository, and it reads what is already " +
        "there and asks only for what it could not find. You will need a " +
        "**GitHub account** \u2014 it is free, and it is what records the " +
        "skill as yours.",
      byHand: "[es] What it produces, and what you would build by hand:",
      steps: {
        namespaceTitle: "[es] Put it in your own namespace",
        namespace:
          "[es] `skills/{your-github-username}/{skill-name}/` with a `SKILL.md`, " +
          "plus optional `scripts/` and `references/` directories.",
        frontmatterTitle: "[es] Fill in the frontmatter",
        frontmatter:
          "[es] The six fields of the Agent Skills spec, plus `civic.*` metadata: " +
          "category, level of government, what data it touches, and whether " +
          "its output affects anyone's rights or benefits. Those last two are " +
          "the questions nobody can answer from reading your code.",
        pullRequestTitle: "[es] Open a pull request",
        pullRequest:
          "[es] Automated checks run and report back in a comment. They can only " +
          "reject \u2014 a pass is not a statement that a skill is safe.",
      },
      cta: "[es] Share a skill",
      guide: "[es] The contributor guide",
    },

    checks: {
      heading: "[es] What we check, and what we don\u2019t",
      what:
        "[es] Every submission goes through automated checks. They confirm the " +
        "skill is well formed, that it was submitted into its author\u2019s " +
        "own folder, and they scan for a set of known problems: commands that " +
        "run before the model has read the file, unrestricted tool access, and " +
        "code that reaches for credentials.",
      limits:
        "[es] **These checks find known problems. They cannot tell you a skill is " +
        "safe.** Scanners of this kind are well documented as possible to " +
        "evade, so a clean result means only that nothing on the list matched.",
      reviewIsDifferent:
        "[es] A review is a different thing. Someone reads the whole skill and " +
        "checks that what it does matches what it says it does. That is the " +
        "question no scanner can answer, and it is why the Reviewed tier " +
        "exists.",
      threeThings: "[es] Three things to know before you run any skill, from anywhere:",
      scripts: "[es] Skills can include scripts your agent *runs*, not only text it reads.",
      tools:
        "[es] The `allowed-tools` field gives a skill access to tools without " +
        "asking you first.",
      removal:
        "[es] Removing a skill from this catalog does not remove it from anyone who " +
        "already downloaded it.",
      security: "[es] Security model and how to report a problem",
    },

    review: {
      heading: "[es] What a review checks for",
      lede:
        "[es] A review is one person reading the whole skill against a fixed list " +
        "of nine questions, in this order. Four of them are outright " +
        "rejections rather than judgment calls, and they are marked.",

      questions: [
        "[es] **Does the description match what the skill does?** A description " +
        "broader than the behaviour is a security finding, not a style " +
        "problem — it is how a skill gets invoked for work it was not written " +
        "for. *Rejection.*",

        "[es] **Would we run these scripts?** Every line of every file under " +
        "`scripts/` gets read, and of `.mcp.json` where a skill declares MCP " +
        "servers. If we would not run it on our own machine, it does not " +
        "pass. *Rejection.*",

        "[es] **Does it ask for more tools than it needs?** `allowed-tools` grants " +
        "access without prompting you and is not gated by trusting the " +
        "workspace, so every entry has to be necessary. An unrestricted shell " +
        "grant is refused outright. *Rejection.*",

        "[es] **Where does it send anything?** Every network destination has to be " +
        "named, expected, and written down. Traffic to somewhere the " +
        "skill\u2019s stated purpose does not require is not a question to " +
        "ask the author. *Rejection.*",

        "[es] **Does it reach outside the folder it was given?** Credentials, " +
        "environment variables, files elsewhere on the machine.",

        "[es] **Does it tell the agent to hide anything?** Instructions to " +
        "disregard what came before, to conceal a step, or to leave something " +
        "out of what it reports back to you.",

        "[es] **Does what it produces affect anyone\u2019s rights or benefits?** " +
        "If it does, the skill has to say so in its own output, where the " +
        "person affected will see it — not only in its metadata, where only " +
        "we will.",

        "[es] **Is the license there, and does it actually apply?** A license " +
        "naming terms the author had no standing to grant is worse than none.",

        "[es] **Would it work outside the place it came from?** A skill welded to " +
        "one jurisdiction\u2019s forms and deadlines is still useful; it just " +
        "needs to say so, so nobody adopts it expecting otherwise.",
      ],
      warn:
        "[es] **This is a record of what was checked, not a guarantee.** One " +
        "reader, about fifteen minutes, one version of the skill. It is not an " +
        "independent audit, we do not test that the skill works, and passing " +
        "these nine questions is not a statement that a skill is safe or fit " +
        "for your purpose. What it does mean is that somebody looked, and you " +
        "can see exactly what they looked for.",
      checklist: "[es] The full checklist, with what each question rejects",
    },

    beta: {
      heading: "[es] What Beta means",
      scope:
        "[es] This is about the exchange, not about the skills. What a listing " +
        "means is covered above and has not changed: automated checks can only " +
        "reject, and a review is a record of what was checked rather than a " +
        "guarantee. Beta says something narrower — that the registry around " +
        "those listings is still being built, and you may hit an " +
        "inconsistency that is ours rather than a skill\u2019s.",
      movingLede: "[es] What is moving right now:",
      moving: [
        "[es] **The categories.** Just recut from twelve to fifteen, onto two axes. " +
        "A listing\u2019s category may be relabelled again.",

        "[es] **The metadata fields.** Some are being dropped, others added — what " +
        "level of government a skill is written for, and how a version is " +
        "declared.",

        "[es] **Submitting.** The browser route works; the two paths around it are " +
        "still settling, and error messages are still being written for " +
        "people rather than for reviewers.",

        "[es] **Review and removal.** Both processes exist and each has run once. " +
        "Expect the guides to change as they are used.",
      ],
      migration:
        "[es] A field that changes does not invalidate a listing: the validator " +
        "says what a submission needs at the moment you submit it, and the " +
        "maintainers migrate what is already listed rather than asking authors " +
        "to. If something contradicts itself, that is a bug and worth an issue.",
    },

    terms: {
      heading: "[es] Terms",
      inclusion:
        "[es] Inclusion in this registry does not constitute endorsement, " +
        "verification, or any guarantee regarding a skill's quality, " +
        "functionality, security, or fitness for any purpose. Skills in the " +
        "Reviewed tier have been read by the AI Lab for Cities at Harvard " +
        "against a published checklist; that is a statement about a specific " +
        "commit, not a warranty, and not an independent assessment. **You are " +
        "responsible for what you run.**",
      licensing:
        "[es] Registry infrastructure is MIT licensed. Each skill carries its own " +
        "license in its frontmatter and remains the property of its authors — " +
        "check that field before you use one.",
      affiliation:
        "[es] A project affiliated with the AI Lab for Cities at Harvard. Not an " +
        "official publication, and not endorsed by any institution.",
    },
  },

  detail: {
    breadcrumb: "[es] Breadcrumb",
    catalog: "[es] Catalog",
    maintainedBy: (who: string) => `[es] Maintained by ${who}`,

    nudge: "[es] This listing does not say when the skill fits and when it does not.",
    nudgeCta: "[es] Maintain it? Add that",

    fit: {
      heading: "[es] When to use this",
      caveat:
        "[es] Written by whoever submitted the skill, about their own work. Nobody " +
        "has checked it against what the skill actually does.",
      use: "[es] Use it when",
      avoid: "[es] Don’t use it when",
    },

    tools: {
      heading: "[es] What it can do",

      caveat:
        "[es] These tools are granted **without prompting you** when the skill is " +
        "invoked, and the grant is not gated by workspace trust. Check that " +
        "each one is necessary for what the skill claims to do.",
      none: "[es] No tools declared.",
    },

    structure: {
      heading: "[es] What is in it",
      caveat:
        "[es] Files under `scripts/`, and `.mcp.json` where a skill declares MCP " +
        "servers, are **executed by the agent**, not read by the model. Read " +
        "them before you run this skill — the descriptions above tell you " +
        "what it claims to do, and only the code tells you what it does.",

      executed: "[es] executed",
      source: "[es] Read the source on GitHub",
    },

    facts: {
      heading: "[es] At a glance",
      category: "[es] Category",
      categories: "[es] Categories",
      scope: "[es] Level",
      scopes: "[es] Levels",
      jurisdiction: "[es] Written for",
      localization: "[es] Portability",

      language: "[es] Written in",
      languagesTested: "[es] Author reports testing in",
      languagesTestedNote:
        "[es] Self-reported. Nobody has run it in these languages on our behalf.",
      verifiedLanguages: "[es] Verified in review",
      verifiedLanguagesNote: (reviewers: string) =>
        `[es] Confirmed by ${reviewers} against this exact commit.`,

      someReviewer: "[es] the reviewer",
      sensitivity: "[es] Data",
      humanReview: "[es] Affects people",
      license: "[es] License",
      compatibility: "[es] Requires",
      commit: "[es] Commit",
      source: "[es] Copied from",
    },

    humanReview: {
      none: "[es] Output does not affect any individual's rights, benefits or standing.",
      "advisory-only": "[es] Informs a person. Does not determine anything on its own.",
      "decision-support": "[es] Feeds a determination someone acts on. Review its output.",
    },

    provenance: {
      heading: "[es] Where it has been used",
      note: "[es] Self-reported by the submitter.",
      deployment: "[es] Use",
      at: "[es] At",
      in: "[es] In",
      since: "[es] Since",
    },
  },

  download: {
    heading: "[es] Use this skill",

    community:
      "[es] **Nobody has reviewed this skill.** It passed automated structural and " +
      "signature checks, which can only ever reject — a pass is not a " +
      "statement that it is safe. Read the source on GitHub before you run it, " +
      "particularly anything under `scripts/`.",

    reviewed: (reviewers: string, date: string, selfReviewed: boolean) =>
      `[es] **Reviewed${selfReviewed ? " — by its own author" : ""}.** ` +
      `${reviewers} read this exact commit against the published checklist` +
      `${date ? ` on ${date}` : ""}. That is a statement about this content, ` +
      "not a warranty." +
      (selfReviewed
        ? "[es]  The AI Lab for Cities wrote and reviewed this skill. Nobody " +
          "outside the Lab has read it."
        : ""),

    archive: (size: string) => `[es] Download the skill (${size})`,
    archiveNote:
      "[es] A zip of this folder. Upload it wherever your agent tool takes skills " +
      "— no git, no command line.",

    commands: {
      marketplace: "[es] Add the marketplace, once",
      install: "[es] Install it",
      degit: "[es] Just this skill",
      clone: "[es] The whole registry",
    },
    copy: "[es] Copy",
    copied: "[es] Copied",

    formatNote:
      "[es] In Claude Code the two `/plugin` lines are all you need. Skills here " +
      "follow the open [Agent Skills](spec) format, so they also work in " +
      "ChatGPT, Codex, Gemini CLI, Copilot, Cursor and others — those take a " +
      "skill at a time, so use the download above.",
    pathsNote:
      "[es] Install paths differ across agent tools — `.claude/skills/`, " +
      "`.agents/skills/`, and others. Check your tool's docs for where it looks.",
    github: "[es] View on GitHub",
  },

  history: {
    heading: "[es] Version and history",

    when: (iso: string) => new Date(iso).toLocaleDateString(
      locale(), { month: "long", year: "numeric", timeZone: "UTC" }),
    version: "[es] Version",
    versionAside:
      "[es] — the author’s own number for it. Self-reported, and not checked " +
      "against anything.",
    firstSeen: "[es] Listed since",
    lastChanged: "[es] Last changed",
    commits: "[es] Times changed",
    commitsAside:
      "[es] — a count, not a measure. It says nothing about whether the skill is " +
      "well maintained: one change may mean finished.",
    note:
      "[es] Dates come from this repository’s own history, for this path. A skill " +
      "moved between namespaces starts again here, so an early date is " +
      "reliable and a recent one may just mean it was renamed.",
  },
};
