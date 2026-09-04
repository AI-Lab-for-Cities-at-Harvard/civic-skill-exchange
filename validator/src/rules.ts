/**
 * Pure frontmatter validation. No filesystem, no Node built-ins — this module
 * runs unchanged in the browser and in CI.
 *
 * THE BROWSER RESULT IS UX, NEVER A GATE. The site runs these rules so a
 * submitter finds out about a problem before opening a pull request, not so
 * anyone can skip the check. CI re-runs this same module and remains the
 * authority. Do not add a code path that trusts a client-supplied result.
 *
 * Structural checks — symlinks, size caps, file types — live in
 * structure-core.ts, which is equally pure and runs in both runtimes too. Only
 * structure.ts is Node-only, and all it does is turn a directory into the entry
 * list that module takes. Content security scanning stays in scripts/scan.py:
 * the browser never scans a submitter's scripts, and porting those regexes buys
 * nothing.
 */

import type { Finding, Frontmatter, RuleContext } from "./types";

export const SPEC_FIELDS = [
  "name", "description", "license", "compatibility", "allowed-tools", "metadata",
] as const;

/** Namespaces reserved for maintainer-seeded skills. The author check is skipped
 *  for these because CODEOWNERS gates them, which is a stronger control than a
 *  username match. */
export const RESERVED_NAMESPACES = new Set(["civic-skills"]);

export const JURISDICTIONS = ["us-local", "us-state", "us-federal", "intl", "generic"] as const;
export const SENSITIVITIES = ["none", "pii", "protected"] as const;
export const HUMAN_REVIEW = ["none", "advisory-only", "decision-support"] as const;
export const AFFILIATIONS = ["government", "nonprofit", "vendor", "academic", "individual"] as const;
export const DEPLOYMENTS = ["none", "personal", "team", "organization"] as const;
export const LOCALIZATIONS = ["generalized", "localized"] as const;

/** The optional second category. Named here so the schema test, the site and
 *  the index generator all reach for one spelling. */
export const SECONDARY_CATEGORY = "civic.category-secondary";

/** MAJOR.MINOR, optionally MAJOR.MINOR.PATCH. Written as a string so the
 *  published schema can carry the same pattern rather than describing it.
 *
 *  Deliberately loose. Nothing here can know the previous value, so
 *  monotonicity is unenforceable and a rule that pretended otherwise would be
 *  a rule an author works around. A skill is not a library. */
export const VERSION_PATTERN = "^\\d+\\.\\d+(\\.\\d+)?$";
const VERSION_RE = new RegExp(VERSION_PATTERN);

/** Unprefixed, not `civic.version` (#77). The Agent Skills specification's own
 *  example writes `metadata: {author, version}`, so any other tool with an
 *  opinion about skill versions will look at `version` — and a version is not
 *  civic-specific, so the prefix would namespace something that is not ours. */
export const VERSION_FIELD = "version";

/** A generalized skill has had its jurisdiction specifics lifted out, so it
 *  cannot also be shaped for one named jurisdiction. These two are compatible:
 *  'generic' means no assumptions, 'intl' says nothing about which. */
export const GENERALIZED_OK_JURISDICTIONS = ["generic", "intl"] as const;
const GENERALIZED_OK = new Set<string>(GENERALIZED_OK_JURISDICTIONS);

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Written as strings so the published schema can carry the same patterns
 *  instead of describing them in English. A program reads the schema to find
 *  out what a submission needs (#10) and cannot read a prose description;
 *  schema.test.ts holds the two files to these exact strings. */
export const DEPLOYED_IN_PATTERN = "^[A-Z]{2}(-[A-Z0-9]{1,3})?( / .+)?$";
export const DEPLOYED_SINCE_PATTERN = "^\\d{4}(-(0[1-9]|1[0-2]))?$";

/** ISO 3166 country, optional subdivision, optional locality: "US-MA / Boston". */
const DEPLOYED_IN_RE = new RegExp(DEPLOYED_IN_PATTERN);
const DEPLOYED_SINCE_RE = new RegExp(DEPLOYED_SINCE_PATTERN);

/** Exported so schema.test.ts can hold the published schema's conditionals to
 *  the same two fields rather than repeating them. */
export const DEPLOYMENT_DETAILS = ["civic.deployed-at", "civic.deployed-in"] as const;

/** Deployment values that are a claim *about an organization*, and so have to
 *  name one.
 *
 *  `personal` is not among them, deliberately. `civic.deployed-at` is defined as
 *  "the organization where it was used", and somebody using their own skill in
 *  their own work has no organization to name — the check was demanding a field
 *  whose own definition did not apply. A required field that does not apply does
 *  not go unanswered; it gets filled with something, which corrupts the data the
 *  field exists to collect.
 *
 *  `civic.maintainer` already says who the person is, which is the whole of what
 *  a personal-use claim asserts. */
export const ORGANIZATIONAL_DEPLOYMENTS = ["team", "organization"] as const;

/** Cap on the two fit fields. Exported so schema.test.ts can hold the published
 *  schema to the same number rather than repeating it. */
export const FIT_MAX_LENGTH = 500;

/** When a skill earns its place, and when it does not. Both optional, both plain
 *  text — never markdown. The site renders them on the landing page, and after
 *  #27 that page publishes no submitter-authored markup at all. Keeping these
 *  plain is what lets them be shown without reopening that surface.
 *
 *  civic.avoid-when is the higher-value half: nobody but the author can supply
 *  it. The submission form pushes for it. It stays optional here on purpose —
 *  a blocking check would only buy a sentence written to satisfy the check. */
const FIT_FIELDS = ["civic.use-when", "civic.avoid-when"] as const;

/** civic.contact was here until #95. The namespace is a GitHub account and L1
 *  proves the submitter owns it, so a typed address was a second and less
 *  reliable copy of what the registry already held — and the only field the
 *  index withheld, so it was collected, stored, and never shown. An issue or a
 *  mention on that account reaches the maintainer and cannot go stale
 *  independently of it. */
const REQUIRED_METADATA = [
  "civic.category", "civic.jurisdiction", "civic.data-sensitivity",
  "civic.human-review", "civic.maintainer",
  "civic.affiliation", "civic.deployment",
] as const;

const finding = (where: string, message: string): Finding => ({ where, message });

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function checkEnum(
  meta: Record<string, unknown>, field: string, allowed: readonly string[],
): Finding[] {
  const value = str(meta[field]);
  if (value === undefined || allowed.includes(value)) return [];
  return [finding(field, `'${value}' is not one of: ${allowed.join(", ")}`)];
}

// --------------------------------------------------------------------------- //

/** A claim about an organization must name it, and a non-claim must not imply
 *  one. Personal use is neither: it asserts nothing about anybody but the
 *  maintainer, who is already named. */
export function checkProvenance(meta: Record<string, unknown>): Finding[] {
  const findings: Finding[] = [];
  const deployment = str(meta["civic.deployment"]);

  if (deployment === "none") {
    for (const field of DEPLOYMENT_DETAILS) {
      if (meta[field]) {
        findings.push(finding(field,
          `${field} is set, but civic.deployment: none says the skill has never ` +
          `been used. Remove ${field}, or state where it was used.`));
      }
    }
  } else if (deployment && ORGANIZATIONAL_DEPLOYMENTS.includes(deployment as never)) {
    for (const field of DEPLOYMENT_DETAILS) {
      if (!meta[field]) {
        findings.push(finding(field,
          `${field} is required when civic.deployment is '${deployment}'. ` +
          `Saying a team or an organization uses this is a claim about them, ` +
          `and an unnamed organization is a claim nobody can check.`));
      }
    }
  }

  const deployedIn = str(meta["civic.deployed-in"]);
  if (deployedIn && !DEPLOYED_IN_RE.test(deployedIn)) {
    findings.push(finding("civic.deployed-in",
      `'${deployedIn}' is not in the expected form: an ISO 3166 country code, ` +
      `optionally a subdivision, optionally ' / ' and a locality. For example ` +
      `'US-MA / Boston', 'GB', 'CA-ON / Toronto'.`));
  }

  const since = str(meta["civic.deployed-since"]);
  if (since && !DEPLOYED_SINCE_RE.test(since)) {
    findings.push(finding("civic.deployed-since", `'${since}' is not YYYY or YYYY-MM.`));
  }

  return findings;
}

/** Catch the one contradiction an adopter cannot resolve on their own. */
export function checkLocalization(meta: Record<string, unknown>): Finding[] {
  const localization = str(meta["civic.localization"]);
  const jurisdiction = str(meta["civic.jurisdiction"]);

  if (localization && !LOCALIZATIONS.includes(localization as never)) {
    return [finding("civic.localization",
      `'${localization}' is not one of: ${LOCALIZATIONS.join(", ")}`)];
  }

  if (localization === "generalized" && jurisdiction &&
      !GENERALIZED_OK.has(jurisdiction)) {
    return [finding("civic.localization",
      `civic.localization: generalized contradicts civic.jurisdiction: ` +
      `${jurisdiction}. A generalized skill has had its jurisdiction specifics ` +
      `lifted out, so use 'generic' (or 'intl'), or mark the skill 'localized'.`)];
  }

  return [];
}

/** Length only. There is deliberately no rule relating the two fields to each
 *  other, and none requiring either. */
export function checkFit(meta: Record<string, unknown>): Finding[] {
  const findings: Finding[] = [];
  for (const field of FIT_FIELDS) {
    const value = str(meta[field]);
    if (value && value.length > FIT_MAX_LENGTH) {
      findings.push(finding(field,
        `${field} must be ${FIT_MAX_LENGTH} characters or fewer. It is a short ` +
        `note on fit, not a second description.`));
    }
  }
  return findings;
}

/** Where an imported copy came from.
 *
 *  The registry holds the content, always — that is what keeps the SHA pin, the
 *  weekly re-scan and the published archive working, and none of them can work
 *  against a repository we do not control. These two fields record the origin
 *  of the copy so a reader can go and look, and so nothing has to be guessed
 *  later about which upstream a listing came from.
 *
 *  Deliberately inert: nothing in the build reads them, nothing fetches them,
 *  and a listing stays valid when its upstream is deleted. They are provenance,
 *  not a link.
 *
 *  Both optional. A skill written here has no upstream, and a hand-written one
 *  must never be pushed toward inventing a value.
 */
const SOURCE_REPO_RE = /^[A-Za-z0-9][\w.-]*\/[\w.-]+$/;
const SOURCE_COMMIT_RE = /^[0-9a-f]{40}$/;

/** The author's own claim about which version of their skill this is.
 *
 *  Optional, pattern-checked, and nothing more. It is a claim rather than a
 *  fact — the registry's derived history is the fact — so the site renders it
 *  as the author's statement, the same footing `provenance` already sits on
 *  with `self_reported`. It must never influence tier or order the catalogue:
 *  `version: 4.0` means somebody typed 4.0. */
export function checkVersion(meta: Record<string, unknown>): Finding[] {
  const value = str(meta[VERSION_FIELD]);
  if (!value || VERSION_RE.test(value)) return [];
  return [finding(VERSION_FIELD,
    `'${value}' is not a version this can read. Use MAJOR.MINOR, optionally ` +
    `MAJOR.MINOR.PATCH — '1.0' or '2.1.3'. No leading 'v', no suffix. It is ` +
    `optional: leave it out rather than inventing one.`)];
}

export function checkSource(meta: Record<string, unknown>): Finding[] {
  const findings: Finding[] = [];
  const repo = str(meta["civic.source-repo"]);
  const commit = str(meta["civic.source-commit"]);

  if (repo && !SOURCE_REPO_RE.test(repo)) {
    findings.push(finding("civic.source-repo",
      `'${repo}' should be owner/repository, not a URL`));
  }
  if (commit && !SOURCE_COMMIT_RE.test(commit)) {
    findings.push(finding("civic.source-commit",
      "civic.source-commit must be a full 40-character lowercase commit SHA. " +
      "A short SHA stops being unique as a repository grows."));
  }
  // A commit with no repository names a point in a history nobody can find.
  if (commit && !repo) {
    findings.push(finding("civic.source-commit",
      "civic.source-commit needs civic.source-repo — a commit on its own " +
      "cannot be resolved to anything"));
  }
  return findings;
}

/** Move non-spec top-level fields into metadata instead of rejecting them.
 *  Some agent tools accept roughly twenty fields beyond the spec's six, and
 *  rejecting those would reject otherwise-working skills. */
export function quarantineExtensions(
  frontmatter: Frontmatter,
): { frontmatter: Frontmatter; moved: string[] } {
  const spec = new Set<string>(SPEC_FIELDS);
  const moved = Object.keys(frontmatter).filter((k) => !spec.has(k)).sort();
  if (moved.length === 0) return { frontmatter, moved };

  const out: Frontmatter = { ...frontmatter };
  const metadata: Record<string, unknown> = { ...(out.metadata ?? {}) };
  for (const key of moved) {
    metadata[`ext.${key}`] = String(out[key]);
    delete out[key];
  }
  out.metadata = metadata;
  return { frontmatter: out, moved };
}

// --------------------------------------------------------------------------- //

export function checkFrontmatter(frontmatter: Frontmatter, context: RuleContext): Finding[] {
  const findings: Finding[] = [];

  // Ownership. Compared against the PR author, never the fork owner — an org
  // fork would otherwise let any member write into that org's namespace.
  const { author, namespace } = context;
  if (author && namespace && !RESERVED_NAMESPACES.has(namespace.toLowerCase()) &&
      namespace.toLowerCase() !== author.toLowerCase()) {
    findings.push(finding("namespace",
      `namespace '${namespace}' does not match the pull request author ` +
      `'${author}'. Submit under skills/${author}/`));
  }

  const name = str(frontmatter.name);
  if (!name) {
    findings.push(finding("name", "name is required"));
  } else {
    if (name.length > 64) findings.push(finding("name", "name must be 64 characters or fewer"));
    if (!NAME_RE.test(name)) {
      findings.push(finding("name",
        `'${name}' must be lowercase alphanumeric words separated by single hyphens`));
    }
    if (context.directoryName && name !== context.directoryName) {
      findings.push(finding("name",
        `name '${name}' does not match the directory '${context.directoryName}'`));
    }
  }

  const description = str(frontmatter.description);
  if (!description) {
    findings.push(finding("description", "description is required"));
  } else if (description.length < 40) {
    findings.push(finding("description",
      "description must be at least 40 characters — it is how an agent decides " +
      "whether to invoke the skill"));
  } else if (description.length > 1024) {
    findings.push(finding("description", "description must be 1024 characters or fewer"));
  }

  if (!str(frontmatter.license)) findings.push(finding("license", "license is required"));

  const compatibility = str(frontmatter.compatibility);
  if (compatibility && compatibility.length > 500) {
    findings.push(finding("compatibility", "compatibility must be 500 characters or fewer"));
  }

  const metadata = frontmatter.metadata;
  if (!metadata || typeof metadata !== "object") {
    findings.push(finding("metadata", "metadata is required"));
    return findings;
  }

  for (const field of REQUIRED_METADATA) {
    if (!str(metadata[field])) findings.push(finding(field, `${field} is required`));
  }

  const category = str(metadata["civic.category"]);
  if (category && !context.categories.includes(category)) {
    findings.push(finding("civic.category",
      `'${category}' is not in the vocabulary. One of: ${[...context.categories].sort().join(", ")}`));
  }

  // A skill can sit in two places in one vocabulary (#102) — the functional
  // axis and the service axis cut differently, and forcing one answer discards
  // what the author knows. Two explicit fields rather than an ordered list: the
  // cap of two is structural, nothing has to be parsed, and which is primary is
  // never in question. build_marketplace.py takes civic.category, because a
  // plugin manifest carries exactly one category.
  const secondary = str(metadata[SECONDARY_CATEGORY]);
  if (secondary && !context.categories.includes(secondary)) {
    findings.push(finding(SECONDARY_CATEGORY,
      `'${secondary}' is not in the vocabulary. One of: ${[...context.categories].sort().join(", ")}`));
  } else if (secondary && secondary === category) {
    findings.push(finding(SECONDARY_CATEGORY,
      `${SECONDARY_CATEGORY} is the same as civic.category ('${category}'). ` +
      `A second category that repeats the first claims nothing and counts the ` +
      `skill twice in one facet — remove it, or name the other axis.`));
  }

  findings.push(...checkEnum(metadata, "civic.jurisdiction", JURISDICTIONS));
  findings.push(...checkEnum(metadata, "civic.data-sensitivity", SENSITIVITIES));
  findings.push(...checkEnum(metadata, "civic.human-review", HUMAN_REVIEW));
  findings.push(...checkEnum(metadata, "civic.affiliation", AFFILIATIONS));
  findings.push(...checkEnum(metadata, "civic.deployment", DEPLOYMENTS));
  findings.push(...checkProvenance(metadata));
  findings.push(...checkLocalization(metadata));
  findings.push(...checkFit(metadata));
  findings.push(...checkSource(metadata));
  findings.push(...checkVersion(metadata));

  return findings;
}
