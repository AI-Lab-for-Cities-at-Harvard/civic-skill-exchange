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
  /** Stamped by an import, never typed. Empty for a skill written here. */
  sourceRepo: string;
  sourceCommit: string;
}

export const EMPTY_DRAFT: Draft = {
  author: "", name: "", description: "", license: "MIT", compatibility: "",
  tools: "", category: "", jurisdiction: "", localization: "",
  dataSensitivity: "none", humanReview: "none", useWhen: "", avoidWhen: "",
  maintainer: "", contact: "", affiliation: "", deployment: "none",
  deployedAt: "", deployedIn: "", deployedSince: "",
  sourceRepo: "", sourceCommit: "",
};

/** Under GitHub's dirty-failure band, not inside it. */
export const URL_BUDGET = 6000;

const trim = (v: string) => v.trim();

/** The draft as flat schema keys, in the order they belong in the file.
 *
 *  One place that knows the mapping. `toFrontmatter` nests it for the
 *  from-scratch path; `patchSkillMd` writes the same keys into a file somebody
 *  else wrote. Empties are kept rather than dropped, because "cleared" and
 *  "never set" are different instructions to a patch — the omission happens in
 *  the caller that needs it.
 */
export function toFields(draft: Draft): Record<string, string> {
  return {
    name: trim(draft.name),
    description: trim(draft.description),
    license: trim(draft.license),
    compatibility: trim(draft.compatibility),
    "allowed-tools": draft.tools.split(",").map(trim).filter(Boolean).join(", "),
    "civic.category": trim(draft.category),
    "civic.jurisdiction": trim(draft.jurisdiction),
    "civic.localization": trim(draft.localization),
    "civic.data-sensitivity": trim(draft.dataSensitivity),
    "civic.human-review": trim(draft.humanReview),
    "civic.use-when": trim(draft.useWhen),
    "civic.avoid-when": trim(draft.avoidWhen),
    "civic.maintainer": trim(draft.maintainer),
    "civic.contact": trim(draft.contact),
    "civic.affiliation": trim(draft.affiliation),
    "civic.deployment": trim(draft.deployment),
    "civic.deployed-at": trim(draft.deployedAt),
    "civic.deployed-in": trim(draft.deployedIn),
    "civic.deployed-since": trim(draft.deployedSince),
    "civic.source-repo": trim(draft.sourceRepo),
    "civic.source-commit": trim(draft.sourceCommit),
  };
}

export function toFrontmatter(draft: Draft): Frontmatter & { metadata?: Record<string, unknown> } {
  const front: Record<string, unknown> = {};
  const meta: Record<string, unknown> = {};
  // Optional fields are omitted rather than emitted empty. An empty string is a
  // value, and the schema treats a present-but-blank field differently from an
  // absent one.
  for (const [key, value] of Object.entries(toFields(draft))) {
    if (!value) continue;
    if (key.startsWith("civic.")) meta[key] = value;
    else front[key] = value;
  }
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

/** The directory the skill goes *into*, which is where an upload must open.
 *
 *  GitHub's upload page drops a dragged folder into the directory you are
 *  looking at, keeping the folder's own name. The folder this page hands back is
 *  named for the skill — so opening the upload page at the skill directory
 *  produced `skills/{ns}/{name}/{name}/SKILL.md`. A real submission landed that
 *  way. The parent is the correct target: drop `{name}` into `skills/{ns}` and
 *  the result is `skills/{ns}/{name}`.
 */
export function namespacePath(draft: Draft): string {
  return `skills/${trim(draft.author)}`;
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

/** Fork first, rather than trusting an auto-fork.
 *
 *  GitHub documents automatic forking for *editing a file* in a repository you
 *  cannot write to. It documents nothing of the kind for **uploading**, and the
 *  multi-file path depends entirely on the upload page working — so the
 *  submitter forks deliberately and uploads somewhere they certainly can write.
 */
export function forkUrl(repo: string): string {
  return `https://github.com/${repo}/fork`;
}

/** `owner/name` out of whatever somebody pastes, or null.
 *
 *  The page used to *derive* the fork from `{namespace}/{registry-name}` and was
 *  wrong twice over (#81): the owner is not the namespace when the namespace is
 *  reserved, and the name is whatever the submitter typed into GitHub's fork
 *  dialog, which offers a name field. There is no reliable way to find "the fork
 *  owned by X" without authenticating, so the page stops guessing and asks.
 *
 *  Same acceptance as parseRepoRef in import.ts, and for the same reason: people
 *  paste the address bar.
 */
export function parseForkRef(input: string): string | null {
  const trimmed = input.trim().replace(/\.git\/?$/, "").replace(/\/+$/, "");
  const m = /^(?:(?:https?:\/\/)?(?:www\.)?github\.com\/|git@github\.com:)?([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([\w.-]+)$/
    .exec(trimmed);
  if (!m || !m[1] || !m[2]) return null;
  return `${m[1]}/${m[2]}`;
}

/** The upload page inside the submitter's own fork, or null until it is known.
 *
 *  Null rather than a best guess: a link that 404s in the middle of a hand-off
 *  is worse than no link, because the submitter goes looking for the page
 *  themselves and can land anywhere — which is exactly how a skill came to be
 *  committed at the repository root.
 *
 *  GitHub's upload page takes a dragged folder and preserves its subdirectories,
 *  which is the whole reason this path exists: `value=` prefills one new file and
 *  has no equivalent for a directory.
 */
export function forkUploadUrl(fork: string, draft: Draft): string | null {
  const ref = parseForkRef(fork);
  return ref ? `https://github.com/${ref}/upload/main/${namespacePath(draft)}` : null;
}

/** The upload page in the registry itself, for somebody who can write to it.
 *
 *  A reserved namespace is not a person — CODEOWNERS gates the folder to the
 *  maintainers team, and checkFrontmatter skips the ownership check for it. Such
 *  a submitter has write access, so telling them to fork is both unnecessary and
 *  impossible to follow: the fork the page would point at does not exist.
 *
 *  GitHub's upload page offers "create a new branch and start a pull request" at
 *  commit time, which is the branch this path needs and never main.
 */
export function registryUploadUrl(repo: string, draft: Draft): string {
  return `https://github.com/${repo}/upload/main/${namespacePath(draft)}`;
}

/** The pull request, opened from the fork back to the registry.
 *
 *  The head ref is `owner:repo:branch` rather than `owner:branch`, which is
 *  GitHub's form for a fork whose name differs from the base — the case that
 *  broke this before. `main` is the branch GitHub's upload page starts from; if
 *  the submitter took the "create a new branch" option, GitHub's compare page
 *  offers the branch picker anyway.
 */
export function pullRequestUrl(repo: string, fork: string): string | null {
  const ref = parseForkRef(fork);
  if (!ref) return null;
  const [owner, name] = ref.split("/");
  return `https://github.com/${repo}/compare/main...${owner}:${name}:main?expand=1`;
}
