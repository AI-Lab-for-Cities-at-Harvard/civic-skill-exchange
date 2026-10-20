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
import { en } from "../i18n/en";
import { repoSlug } from "./repo";
import { isGitHubLogin } from "./login";

export interface Draft {
  /** GitHub login. The namespace, and what L1 checks the commit author against. */
  author: string;
  name: string;
  description: string;
  license: string;
  compatibility: string;
  tools: string;
  category: string;
  categorySecondary: string;
  version: string;
  scope: string;
  scopeSecondary: string;
  jurisdiction: string;
  localization: string;
  /** One BCP 47 tag. Required metadata, so an empty value is a finding rather
   *  than an omission the file gets away with. */
  language: string;
  /** Optional, comma-separated tags. The author's claim, verified by nothing. */
  languagesTested: string;
  /** Optional, comma-separated model names. The author's claim (#267). */
  modelsTested: string;
  dataSensitivity: string;
  humanReview: string;
  useWhen: string;
  avoidWhen: string;
  maintainer: string;
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
  author: "", name: "", description: "", license: "", compatibility: "",
  tools: "", category: "", categorySecondary: "", version: "",
  scope: "", scopeSecondary: "", jurisdiction: "", localization: "",
  language: "", languagesTested: "", modelsTested: "",
  dataSensitivity: "none", humanReview: "none", useWhen: "", avoidWhen: "",
  maintainer: "", affiliation: "", deployment: "none",
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
    "civic.category-secondary": trim(draft.categorySecondary),
    version: trim(draft.version),
    "civic.scope": trim(draft.scope),
    "civic.scope-secondary": trim(draft.scopeSecondary),
    "civic.jurisdiction": trim(draft.jurisdiction),
    "civic.localization": trim(draft.localization),
    "civic.language": trim(draft.language),
    "civic.languages-tested": trim(draft.languagesTested),
    "civic.models-tested": trim(draft.modelsTested),
    "civic.data-sensitivity": trim(draft.dataSensitivity),
    "civic.human-review": trim(draft.humanReview),
    "civic.use-when": trim(draft.useWhen),
    "civic.avoid-when": trim(draft.avoidWhen),
    "civic.maintainer": trim(draft.maintainer),
    "civic.affiliation": trim(draft.affiliation),
    "civic.deployment": trim(draft.deployment),
    "civic.deployed-at": trim(draft.deployedAt),
    "civic.deployed-in": trim(draft.deployedIn),
    "civic.deployed-since": trim(draft.deployedSince),
    "civic.source-repo": trim(draft.sourceRepo),
    "civic.source-commit": trim(draft.sourceCommit),
  };
}

/** Whether a `toFields` key lives under `metadata:`. The `civic.*` keys do, and
 *  so does `version`: the validator reads `metadata.version` (#77, #239). */
export const inMetadata = (key: string): boolean =>
  key.startsWith("civic.") || key === "version";

export function toFrontmatter(draft: Draft): Frontmatter & { metadata?: Record<string, unknown> } {
  const front: Record<string, unknown> = {};
  const meta: Record<string, unknown> = {};
  // Optional fields are omitted rather than emitted empty. An empty string is a
  // value, and the schema treats a present-but-blank field differently from an
  // absent one.
  for (const [key, value] of Object.entries(toFields(draft))) {
    if (!value) continue;
    if (inMetadata(key)) meta[key] = value;
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

/** The namespace is the login in lowercase. Logins are case-insensitive, the
 *  directory is the one canonical spelling, and the validator rejects an
 *  uppercase character in it (#155), so the page never hands back a folder CI
 *  would refuse. */
/** Which tree a listing lives in (ADR 0005). */
export type ListingTree = "skills" | "plugins";

/** What a path needs from a draft: a skill's and a plugin's both carry these. */
type Named = Pick<Draft, "author" | "name">;

export function namespaceOf(draft: Pick<Draft, "author">): string {
  return trim(draft.author).toLowerCase();
}

export function skillPath(draft: Named, tree: ListingTree = "skills"): string {
  return `${tree}/${namespaceOf(draft)}/${trim(draft.name)}`;
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
export function namespacePath(
  draft: Pick<Draft, "author">, tree: ListingTree = "skills",
): string {
  return `${tree}/${namespaceOf(draft)}`;
}

/** The author's own directory inside a single skill's listing (ADR 0006).
 *
 *  A listing keeps only what the registry generates at `skills/{ns}/{name}`;
 *  everything the author wrote lives one level down, at
 *  `skills/{ns}/{name}/skills/{name}`. */
export function skillDirPath(draft: Named): string {
  return `${skillPath(draft)}/skills/${trim(draft.name)}`;
}

/** The directory an upload must open in, which is where the dragged folder is
 *  dropped *into*.
 *
 *  The page still hands back the flat folder, named for the skill, and GitHub
 *  keeps a dropped folder's name. So a skill opens the upload page at the
 *  listing's own `skills/` — GitHub creates a target that does not exist yet on
 *  commit — and the folder lands at `skills/{ns}/{name}/skills/{name}`. A plugin
 *  is unchanged: it opens at `plugins/{ns}` (ADR 0006, decision 6; #275). */
export function uploadPath(draft: Named, tree: ListingTree = "skills"): string {
  return tree === "skills"
    ? `${skillPath(draft)}/skills` : namespacePath(draft, tree);
}

/** Where the dragged folder ends up, for telling the submitter. */
export function landingPath(draft: Named, tree: ListingTree = "skills"): string {
  return tree === "skills" ? skillDirPath(draft) : skillPath(draft, tree);
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
  url.searchParams.set("filename", `${skillDirPath(draft)}/SKILL.md`);
  url.searchParams.set("value", yaml);
  return url.toString();
}

/** Flow 2, where `path` is the directory holding the skill's own `SKILL.md`:
 *  the index's `skill_path`.
 *
 *  `value=` prefills new files only — GitHub offers no equivalent for
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
  return `https://github.com/${repo}/upload/main/${uploadPath(draft)}`;
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
  // A person reads this, so the wording is in the string table (#149). The
  // frontmatter it carries is not: that is the file, and it does not translate.
  //
  // The English table explicitly, not the reader's (#150). This mail is the one
  // thing the site composes that its author does not read: a maintainer
  // receives it and opens the pull request from it, and a Spanish submission
  // arriving as Spanish prose would need translating before it could be acted
  // on. The submitter's own words in it — their name, their skill's
  // description — are theirs and are carried through untouched.
  const say = en.email;
  const subject = say.subject(trim(draft.name) || say.noName);
  const body = say.body(
    trim(draft.maintainer) || say.noMaintainer,
    trim(draft.author) || say.noLogin,
    yaml,
  );
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
export function forkUploadUrl(
  fork: string, draft: Named, tree: ListingTree = "skills",
): string | null {
  const ref = parseForkRef(fork);
  return ref ? `https://github.com/${ref}/upload/main/${uploadPath(draft, tree)}` : null;
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
export function registryUploadUrl(
  repo: string, draft: Named, tree: ListingTree = "skills",
): string {
  return `https://github.com/${repo}/upload/main/${uploadPath(draft, tree)}`;
}

/** What the pull request says about itself (#300, S-11). GitHub's form opens
 *  with no title and nothing in the description, and a submitter has no way to
 *  know what belongs there. */
export interface PullRequestInput {
  kind: "skill" | "plugin";
  namespace: string;
  name: string;
  /** The listing already exists, so this changes it rather than adding it. */
  update?: boolean;
  /** What the page's own run of the validator's rules still reported. */
  findings: { where: string; message: string }[];
}

export interface PullRequestText { title: string; body: string }

const FINDINGS_SHOWN = 10;
const FINDING_CHARS = 200;

/** The title and description, in English whatever language the page is in. The
 *  reader of a pull request is a maintainer, who works in English; the
 *  submitter does not read this, it travels in the link. The page says so next
 *  to the button, and the text is deliberately not in the i18n tables. */
export function pullRequestText(input: PullRequestInput): PullRequestText {
  const ns = input.namespace.trim().toLowerCase();
  const name = input.name.trim();
  const tree: ListingTree = input.kind === "plugin" ? "plugins" : "skills";
  const id = `${ns}/${name}`;
  const verb = input.update ? "Update" : "Add";
  const lines = [
    `${input.update ? "Updates" : "Adds"} the ${input.kind} \`${id}\` at ` +
      `\`${tree}/${id}\`, sent from the Civic Skill Exchange submit page.`,
    "",
    `**Namespace:** \`${ns}\`, the submitter's GitHub login.`,
    "",
  ];
  const n = input.findings.length;
  const checked =
    "**Checked in the browser before sending:** the registry's own " +
    "frontmatter rules, the same module the validator runs in CI.";
  if (n === 0) {
    lines.push(`${checked} No findings remained.`);
  } else {
    lines.push(
      `${checked} ${n} finding${n === 1 ? "" : "s"} remained, and ` +
      `${n === 1 ? "it was" : "they were"} sent anyway:`, "");
    for (const f of input.findings.slice(0, FINDINGS_SHOWN)) {
      const msg = f.message.replace(/\s+/g, " ").trim();
      lines.push(`- \`${f.where}\`: ${msg.length > FINDING_CHARS
        ? msg.slice(0, FINDING_CHARS - 1) + "…" : msg}`);
    }
    if (n > FINDINGS_SHOWN) lines.push(`- and ${n - FINDINGS_SHOWN} more`);
  }
  lines.push("", "The checks that count run on this pull request.");
  return { title: `${verb} ${input.kind} ${id}`, body: lines.join("\n") };
}

/** Longest the whole compare link may be. Same measurement as the hand-off
 *  link (#24): 6.1 KB worked on GitHub, and it fails dirty above that. */
export const PR_URL_BUDGET = URL_BUDGET;

const CUT_NOTE =
  "\n\n(The rest was left out so this link fits; the checks on this pull request list everything.)";

/** The pull request, opened from the fork back to the registry.
 *
 *  The head ref is `owner:repo:branch` rather than `owner:branch`, which is
 *  GitHub's form for a fork whose name differs from the base — the case that
 *  broke this before. The upload step tells a fork's submitter to commit
 *  directly to the fork's `main` (#243), so `main` is the branch to compare.
 *
 *  With `text`, the link also carries `quick_pull=1` (open the form straight
 *  away), `title` and `body`, which GitHub documents for compare links. The
 *  body is cut at a whole line, from the end, until the link is under
 *  PR_URL_BUDGET; a half-finished finding reads worse than a missing one.
 */
export function pullRequestUrl(
  repo: string, fork: string, text?: PullRequestText,
): string | null {
  const ref = parseForkRef(fork);
  if (!ref) return null;
  const [owner, name] = ref.split("/");
  const base = `https://github.com/${repo}/compare/main...${owner}:${name}:main`;
  if (!text) return `${base}?expand=1`;
  const link = (body: string) =>
    `${base}?quick_pull=1&title=${encodeURIComponent(text.title)}` +
    `&body=${encodeURIComponent(body)}`;
  if (link(text.body).length <= PR_URL_BUDGET) return link(text.body);
  const lines = text.body.split("\n");
  while (lines.length > 1) {
    lines.pop();
    const body = lines.join("\n").replace(/\n+$/, "") + CUT_NOTE;
    if (link(body).length <= PR_URL_BUDGET) return link(body);
  }
  // One line alone is too long: cut it by characters, still within the budget.
  let body = lines[0] ?? "";
  while (body.length > 0 && link(body + CUT_NOTE).length > PR_URL_BUDGET) {
    body = body.slice(0, Math.floor(body.length * 0.9));
  }
  return link(body + CUT_NOTE);
}

/** What the command-line recipe needs to know (#297). */
export interface RecipeInput {
  /** The submitter's fork, as a clone address. Never the registry: the recipe
   *  pushes there, and the registry refuses a push from anyone who is not a
   *  maintainer. */
  forkUrl: string;
  /** The directory the clone makes, which is the fork's own name. */
  cloneDir: string;
  /** The branch to create and push. */
  branch: string;
  /** Where the folder the page handed back is on the submitter's machine. */
  folder: string;
  /** Where the listing lives: `skills/{ns}/{name}` or `plugins/{ns}/{name}`. */
  listing: string;
  /** Where the copied folder must end up, inside the clone. */
  landing: string;
}

/** The command-line route, as the lines to type, and nothing but commands.
 *
 *  Joined from an array, not a template literal: a literal indented to sit
 *  inside JSX renders that indent on every line after the first (S-7). The
 *  steps are the ones the page's other route does by hand: clone *your fork*,
 *  branch, copy the folder in (the earlier recipe never did, and `commit -am`
 *  skips files git has not seen), add, commit, push to the fork.
 *
 *  The prose around it — fork first, how to open the pull request — is in the
 *  i18n strings, so these lines stay copy-and-paste. */
export function recipe(r: RecipeInput): string {
  const parent = r.landing.split("/").slice(0, -1).join("/");
  return [
    `git clone ${r.forkUrl}`,
    `cd ${r.cloneDir}`,
    `git checkout -b ${r.branch}`,
    `mkdir -p ${parent}`,
    `cp -R ${r.folder} ${r.landing}`,
    `npm ci`,
    `npx tsx validator/src/cli.ts ${r.listing}`,
    `git add ${r.listing}`,
    `git commit -m "Add ${r.listing}"`,
    `git push -u origin ${r.branch}`,
  ].join("\n");
}

/** The recipe's inputs for a draft: what the page can know filled in, and a
 *  placeholder for what only the submitter can, their fork and where the
 *  download went. */
export function recipeInput(
  repo: string, fork: string, draft: Named, tree: ListingTree, fallbackName: string,
): RecipeInput {
  const name = trim(draft.name) || fallbackName;
  const ref = parseForkRef(fork);
  const repoName = repo.split("/").pop() ?? repo;
  return {
    forkUrl: `https://github.com/${ref ?? `YOUR-USERNAME/${repoName}`}.git`,
    cloneDir: ref ? ref.split("/")[1]! : repoName,
    branch: `add-${name}`,
    folder: `/path/to/${name}`,
    listing: skillPath(draft, tree),
    landing: landingPath(draft, tree),
  };
}

/** Whether there is a username to build a path from (#293, S-2).
 *
 *  Every path the hand-off names starts `{tree}/{namespace}/`, so with the box
 *  empty each one reads `skills//…`. The page withholds them instead. */
export function hasNamespace(draft: Pick<Draft, "author">): boolean {
  return namespaceOf(draft) !== "";
}

/** Whether the corrected folder can be handed back: a username GitHub would
 *  allow, and a name for the folder. One rule for the skill route and the
 *  plugin route (#302, S-15), so they cannot drift apart again. */
export function folderReady(draft: { author: string; name: string }): boolean {
  const login = draft.author.trim();
  return login !== "" && isGitHubLogin(login) && draft.name.trim() !== "";
}

/** The account a pasted fork lives under, or null. */
export function forkOwner(fork: string): string | null {
  return parseForkRef(fork)?.split("/")[0] ?? null;
}

/** Whether the pasted address is the registry itself (S-8).
 *
 *  GitHub's owner and repository names are case-insensitive, so any spelling
 *  is the registry. Pasting it gave a pull-request link comparing `main` with
 *  itself, and an upload page the submitter cannot write to. */
export function isRegistryFork(fork: string, repo: string): boolean {
  const ref = parseForkRef(fork);
  return ref !== null && ref.toLowerCase() === repoSlug(repo).toLowerCase();
}

/** The pasted address if it can stand for the submitter's copy, otherwise "".
 *
 *  For the callers that build a link or a recipe from it: an empty fork is the
 *  "not known yet" they already handle. */
export function usableFork(fork: string, repo: string): string {
  return parseForkRef(fork) && !isRegistryFork(fork, repo) ? fork : "";
}

/** What the page says about the fork's address, in order of precedence. */
export type ForkCheck = "empty" | "unparsed" | "registry" | "mismatch" | "ok";

/** The fork's address against the registry and the typed username (S-1).
 *
 *  A fork under another account is a warning, not a refusal: an organization
 *  can hold the fork while a person opens the pull request. What must not
 *  happen is the two disagreeing silently, which is how files went to
 *  `skills/sgarcese/…` from an account called `sgarcese-hbs`. With the box
 *  empty there is nothing to disagree with, and the empty box is said instead. */
export function checkFork(
  fork: string, repo: string, draft: Pick<Draft, "author">,
): ForkCheck {
  if (fork.trim() === "") return "empty";
  const owner = forkOwner(fork);
  if (owner === null) return "unparsed";
  if (isRegistryFork(fork, repo)) return "registry";
  if (hasNamespace(draft) && owner.toLowerCase() !== namespaceOf(draft)) return "mismatch";
  return "ok";
}
