/** The submission page's pure half.
 *
 *  Kept out of the component because the URL budget has to be exactly right.
 *  Rulings on #24 measured GitHub's behaviour against this repository: 6.1 KB
 *  worked, 7.1 KB returned a 500, 8.1 KB dropped the connection, 9.1 KB gave a
 *  clean 414. There is a band where it fails dirty, so the fallback is chosen
 *  from the measured length *before* navigating. By the time there is an error
 *  to catch, the submitter has lost the page.
 */

import type { Frontmatter } from "@civic-skill-exchange/validator";

export interface Draft {
  /** GitHub login. The namespace, and what L1 checks the commit author against. */
  author: string;
  name: string;
  description: string;
  license: string;
  compatibility: string;
  tools: string;
  category: string;
  jurisdiction: string;
  localization: string;
  dataSensitivity: string;
  humanReview: string;
  useWhen: string;
  avoidWhen: string;
  maintainer: string;
  contact: string;
  affiliation: string;
  deployment: string;
  deployedAt: string;
  deployedIn: string;
  deployedSince: string;
}

export const EMPTY_DRAFT: Draft = {
  author: "", name: "", description: "", license: "MIT", compatibility: "",
  tools: "", category: "", jurisdiction: "", localization: "",
  dataSensitivity: "none", humanReview: "none", useWhen: "", avoidWhen: "",
  maintainer: "", contact: "", affiliation: "", deployment: "none",
  deployedAt: "", deployedIn: "", deployedSince: "",
};

/** Under GitHub's dirty-failure band, not inside it. */
export const URL_BUDGET = 6000;

const trim = (v: string) => v.trim();

/** Optional fields are omitted rather than emitted empty. An empty string is a
 *  value, and the schema treats a present-but-blank field differently from an
 *  absent one. */
function put(into: Record<string, unknown>, key: string, value: string): void {
  const v = trim(value);
  if (v) into[key] = v;
}

export function toFrontmatter(draft: Draft): Frontmatter & { metadata?: Record<string, unknown> } {
  const front: Record<string, unknown> = {};
  put(front, "name", draft.name);
  put(front, "description", draft.description);
  put(front, "license", draft.license);
  put(front, "compatibility", draft.compatibility);

  const tools = draft.tools.split(",").map(trim).filter(Boolean);
  if (tools.length) front["allowed-tools"] = tools.join(", ");

  const meta: Record<string, unknown> = {};
  put(meta, "civic.category", draft.category);
  put(meta, "civic.jurisdiction", draft.jurisdiction);
  put(meta, "civic.localization", draft.localization);
  put(meta, "civic.data-sensitivity", draft.dataSensitivity);
  put(meta, "civic.human-review", draft.humanReview);
  put(meta, "civic.use-when", draft.useWhen);
  put(meta, "civic.avoid-when", draft.avoidWhen);
  put(meta, "civic.maintainer", draft.maintainer);
  put(meta, "civic.contact", draft.contact);
  put(meta, "civic.affiliation", draft.affiliation);
  put(meta, "civic.deployment", draft.deployment);
  put(meta, "civic.deployed-at", draft.deployedAt);
  put(meta, "civic.deployed-in", draft.deployedIn);
  put(meta, "civic.deployed-since", draft.deployedSince);
  front.metadata = meta;

  return front;
}

/** Every scalar is double-quoted and escaped.
 *
 *  Not a general YAML emitter — it does not need to be, because it only ever
 *  writes strings the form collected. Quoting unconditionally is what makes a
 *  colon in a description, a quote in an organization name, or a newline in a
 *  fit field safe without inspecting any of them. */
function scalar(value: unknown): string {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
}

export function toYaml(front: ReturnType<typeof toFrontmatter>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(front)) {
    if (key === "metadata") continue;
    lines.push(`${key}: ${scalar(value)}`);
  }
  const meta = front.metadata ?? {};
  if (Object.keys(meta).length) {
    lines.push("metadata:");
    for (const [key, value] of Object.entries(meta)) {
      lines.push(`  ${key}: ${scalar(value)}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

/** The index publishes `repo` as a full URL; every GitHub handoff needs
 *  `owner/name`. Derived rather than hardcoded so a fork of this registry
 *  points its own submissions at itself. */
export function repoSlug(repoUrl: string): string {
  return repoUrl.replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
}

/** Turn what somebody typed into a name the registry accepts.
 *
 *  rules.ts requires lowercase words joined by single hyphens, and a real skill
 *  is usually not named that way — a repository called
 *  `Civic-Analytics-Agent-Workflow-Claude-Skill` is a valid name everywhere
 *  else. Rejecting that is the form making its own rule the submitter's
 *  problem, so it converts instead and shows what it produced.
 *
 *  Applied to the value used, never to the box being typed in: rewriting text
 *  under the cursor eats a hyphen the moment it is typed. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")  // café → cafe
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "");  // the slice may have landed mid-word
}

export function skillPath(draft: Draft): string {
  return `skills/${trim(draft.author)}/${trim(draft.name)}`;
}

/** GitHub's new-file editor, prefilled.
 *
 *  Chosen over the issue-form path because it produces a real pull request, and
 *  because it is the only handoff that satisfies L1: rules.ts checks namespace
 *  ownership against the pull request author, so the submitter has to be the
 *  committer. A commit made on their behalf would fail the check it exists to
 *  enforce. */
export function newFileUrl(repo: string, draft: Draft, yaml: string): string {
  const url = new URL(`https://github.com/${repo}/new/main`);
  url.searchParams.set("filename", `${skillPath(draft)}/SKILL.md`);
  url.searchParams.set("value", yaml);
  return url.toString();
}

/** Flow 2. `value=` prefills new files only — GitHub offers no equivalent for
 *  editing an existing one, and the site could not supply the current contents
 *  anyway: build_detail publishes no file contents, which is the #27 stored-XSS
 *  decision. So this opens the editor and the page gives the lines to paste. */
export function editUrl(repo: string, path: string): string {
  return `https://github.com/${repo}/edit/main/${path}/SKILL.md`;
}

/** GitHub's multi-file upload, for a skill that is more than one file.
 *
 *  MAX_FILES_PER_SKILL in structure-core.ts is set to 100 because this
 *  interface hard-fails above it — the cap exists to keep the registry from
 *  promising what this path cannot deliver. */
export function uploadUrl(repo: string, draft: Draft): string {
  return `https://github.com/${repo}/upload/main/${skillPath(draft)}`;
}

/** The path for somebody without a GitHub account.
 *
 *  A maintainer receives it and opens the pull request, which means the *Lab*
 *  is the committer — so the skill lands in the reserved namespace with the
 *  sender credited as maintainer, rather than under a name the namespace check
 *  would reject. That is a real difference from the GitHub path and the page
 *  says so.
 *
 *  Mail clients truncate long bodies without warning, so this is measured
 *  against the same budget as the editor link. */
export function mailtoUrl(email: string, draft: Draft, yaml: string): string {
  const subject = `Skill submission: ${trim(draft.name) || "untitled"}`;
  const body =
    `A skill for the Civic Skill Exchange.\n\n` +
    `From: ${trim(draft.maintainer) || "(name)"}\n` +
    `Contact: ${trim(draft.contact) || "(contact)"}\n\n` +
    `${yaml}\n` +
    `The skill body and any scripts are attached.\n`;
  // Built with encodeURIComponent rather than URLSearchParams: the latter
  // encodes a space as `+`, which is correct for a form body and wrong here —
  // mail clients show the plus signs.
  return `mailto:${email}?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;
}

/** Percent-encoded bytes, which is what the browser actually sends.
 *
 *  Measuring `url.length` would pass a URL that fails: a newline is one
 *  character and three bytes once encoded, so a draft with long fit fields is
 *  comfortably under the budget by character count and well over it in bytes. */
export function fitsInUrl(url: string): boolean {
  return new TextEncoder().encode(encodeURI(url)).length <= URL_BUDGET;
}
