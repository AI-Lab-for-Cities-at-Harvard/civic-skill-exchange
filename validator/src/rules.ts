/**
 * Pure frontmatter validation. No filesystem, no Node built-ins — this module
 * runs unchanged in the browser and in CI.
 *
 * THE BROWSER RESULT IS UX, NEVER A GATE. The site runs these rules so a
 * submitter finds out about a problem before opening a pull request, not so
 * anyone can skip the check. CI re-runs this same module and remains the
 * authority. Do not add a code path that trusts a client-supplied result.
 *
 * Structural checks — symlinks, size caps, file types, YAML aliases — live in
 * structure.ts, which needs a filesystem and is never imported by the browser.
 * Content security scanning stays in scripts/scan.py: the browser never scans a
 * submitter's scripts, and porting those regexes buys nothing.
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

/** A generalized skill has had its jurisdiction specifics lifted out, so it
 *  cannot also be shaped for one named jurisdiction. These two are compatible:
 *  'generic' means no assumptions, 'intl' says nothing about which. */
const GENERALIZED_OK_JURISDICTIONS = new Set(["generic", "intl"]);

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** ISO 3166 country, optional subdivision, optional locality: "US-MA / Boston". */
const DEPLOYED_IN_RE = /^[A-Z]{2}(-[A-Z0-9]{1,3})?( \/ .+)?$/;
const DEPLOYED_SINCE_RE = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

const DEPLOYMENT_DETAILS = ["civic.deployed-at", "civic.deployed-in"] as const;

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

const REQUIRED_METADATA = [
  "civic.category", "civic.jurisdiction", "civic.data-sensitivity",
  "civic.human-review", "civic.maintainer", "civic.contact",
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

/** A deployment claim must say where, and a non-claim must not imply one. */
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
  } else if (deployment && DEPLOYMENTS.includes(deployment as never)) {
    for (const field of DEPLOYMENT_DETAILS) {
      if (!meta[field]) {
        findings.push(finding(field,
          `${field} is required when civic.deployment is '${deployment}'. ` +
          `A deployment claim has to name where.`));
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
      !GENERALIZED_OK_JURISDICTIONS.has(jurisdiction)) {
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

  findings.push(...checkEnum(metadata, "civic.jurisdiction", JURISDICTIONS));
  findings.push(...checkEnum(metadata, "civic.data-sensitivity", SENSITIVITIES));
  findings.push(...checkEnum(metadata, "civic.human-review", HUMAN_REVIEW));
  findings.push(...checkEnum(metadata, "civic.affiliation", AFFILIATIONS));
  findings.push(...checkEnum(metadata, "civic.deployment", DEPLOYMENTS));
  findings.push(...checkProvenance(metadata));
  findings.push(...checkLocalization(metadata));
  findings.push(...checkFit(metadata));

  return findings;
}
