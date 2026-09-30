/** Reading a skill straight out of a public GitHub repository.
 *
 *  No backend and no token: api.github.com sends
 *  `access-control-allow-origin: *`, so the browser can do this itself. Two API
 *  requests, whatever the size of the skill — the repository for its default
 *  branch, and one recursive tree for every path and size.
 *
 *  The limit is 60 an hour per address, so a rate-limited answer has to read as
 *  "try again later" and never as "your repository is wrong".
 *
 *  File contents come from raw.githubusercontent.com, which also allows any
 *  origin and is not counted against that limit, each pinned to the commit the
 *  tree was read at. Every file is fetched, because the corrected folder the
 *  page hands back is built from these bytes: it once held zeros for everything
 *  but SKILL.md, and zeros are valid UTF-8, so no check noticed (#212).
 *
 *  What comes back is a *copy*. The registry holds the content, which is what
 *  the SHA pin, the weekly re-scan and the published archive work against; the
 *  repo and commit are recorded as provenance so a reader can go and look.
 */

import {
  MAX_FILE_BYTES, isRepositoryFurniture, type Entry,
} from "@civic-skill-exchange/validator";
import { strings } from "../i18n/strings";

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

/** Downloads at once. Enough to be quick for a hundred files, few enough not to
 *  look like a flood to the host. */
const RAW_CONCURRENCY = 6;

export interface RepoRef { owner: string; repo: string }

/** Accepts what someone actually pastes: a browser URL, a clone URL, or the
 *  slug on its own. */
export function parseRepoRef(input: string): RepoRef | null {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  // The host is optional independently of the scheme, because `github.com/a/b`
  // is what people paste most often — and the owner is restricted to the
  // characters a GitHub login may contain, so a bare `gitlab.com/a/b` cannot
  // parse its host as the owner.
  const m = /^(?:(?:https?:\/\/)?(?:www\.)?github\.com\/|git@github\.com:)?([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([\w.-]+)/
    .exec(trimmed);
  if (!m || !m[1] || !m[2]) return null;
  return { owner: m[1], repo: m[2] };
}

export type ImportFailure =
  | { kind: "not-a-repo" }
  | { kind: "not-found" }
  | { kind: "rate-limited" }
  | { kind: "too-big" }
  | { kind: "no-skill-md" }
  | { kind: "offline" };

export interface ImportResult {
  ref: RepoRef;
  branch: string;
  commit: string;
  entries: Entry[];
  skillMd: string;
  /** Paths dropped before the checks ran, with why. */
  skipped: string[];
}

/** The wording lives in the string table with the rest of what a submitter
 *  reads (#149). A function rather than a constant, because the answer depends
 *  on the locale in force when the failure is shown.
 *
 *  A 404 covers private and missing alike — GitHub will not distinguish them
 *  for an unauthenticated caller, and neither should we. */
export function failureMessages(): Record<ImportFailure["kind"], string> {
  const { problems } = strings().submit;
  return {
    "not-a-repo": problems.notARepo,
    "not-found": problems.notFound,
    "rate-limited": problems.rateLimited,
    "too-big": problems.tooBig,
    "no-skill-md": problems.noSkillMdInRepo,
    offline: problems.offline,
  };
}

async function get(url: string, signal?: AbortSignal): Promise<Response | ImportFailure> {
  try {
    const res = await fetch(url, { signal, headers: { Accept: "application/vnd.github+json" } });
    if (res.status === 404) return { kind: "not-found" };
    if (res.status === 403 || res.status === 429) return { kind: "rate-limited" };
    if (!res.ok) return { kind: "offline" };
    return res;
  } catch {
    return { kind: "offline" };
  }
}

const isFailure = (v: unknown): v is ImportFailure =>
  typeof v === "object" && v !== null && "kind" in v;

async function fetchRaw(
  ref: RepoRef, commit: string, path: string, signal?: AbortSignal,
): Promise<Uint8Array | ImportFailure> {
  const url = `${RAW}/${ref.owner}/${ref.repo}/${commit}/` +
    path.split("/").map(encodeURIComponent).join("/");
  try {
    const res = await fetch(url, { signal });
    if (res.status === 429) return { kind: "rate-limited" };
    if (!res.ok) return { kind: "offline" };
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return { kind: "offline" };
  }
}

async function fetchAll(
  ref: RepoRef, commit: string, entries: Entry[], signal?: AbortSignal,
): Promise<Entry[] | ImportFailure> {
  const out: Entry[] = [...entries];
  let failure: ImportFailure | null = null;
  let next = 0;
  const worker = async () => {
    while (!failure && next < out.length) {
      const i = next++;
      const entry = out[i]!;
      if (entry.kind !== "file") continue;
      const bytes = await fetchRaw(ref, commit, entry.path, signal);
      if (isFailure(bytes)) failure ??= bytes;
      else out[i] = { ...entry, bytes };
    }
  };
  await Promise.all(Array.from({ length: RAW_CONCURRENCY }, worker));
  return failure ?? out;
}

export async function importFromRepo(
  input: string,
  signal?: AbortSignal,
): Promise<ImportResult | ImportFailure> {
  const ref = parseRepoRef(input);
  if (!ref) return { kind: "not-a-repo" };

  const meta = await get(`${API}/repos/${ref.owner}/${ref.repo}`, signal);
  if (isFailure(meta)) return meta;
  const { default_branch: branch } = await meta.json() as { default_branch: string };

  const treeRes = await get(
    `${API}/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    signal,
  );
  if (isFailure(treeRes)) return treeRes;
  const tree = await treeRes.json() as {
    sha: string; truncated: boolean;
    tree: { path: string; type: string; size?: number }[];
  };
  // GitHub truncates a large tree rather than erroring, and a partial file list
  // would produce checks that passed only because entries were missing.
  if (tree.truncated) return { kind: "too-big" };

  const skipped: string[] = [];
  const entries: Entry[] = [];
  for (const node of tree.tree) {
    if (node.type === "tree") continue;
    if (node.type !== "blob") {
      // Submodules and symlinks. checkStructureCore rejects symlinks anyway;
      // naming them here is clearer than a finding about a file that is not one.
      skipped.push(`${node.path} — not a regular file`);
      continue;
    }
    if (isRepositoryFurniture(node.path)) {
      // LICENSE, .gitignore and the like belong to the repository, not to the
      // skill. Copying them in would fail the allowlist for a reason the
      // submitter can do nothing useful about.
      skipped.push(`${node.path} — belongs to the repository, not the skill`);
      continue;
    }
    const size = node.size ?? 0;
    if (size > MAX_FILE_BYTES) {
      skipped.push(`${node.path} — larger than ${MAX_FILE_BYTES / 1024} KB`);
      continue;
    }
    entries.push({ path: node.path, kind: "file", bytes: new Uint8Array(size) });
  }

  if (!entries.some((e) => e.path === "SKILL.md")) return { kind: "no-skill-md" };

  // Every file, at the commit the tree came from. One that cannot be fetched
  // fails the import: a folder with a file missing is not the skill.
  const fetched = await fetchAll(ref, tree.sha, entries, signal);
  if (isFailure(fetched)) return fetched;
  const skill = fetched.find((e) => e.path === "SKILL.md");
  const skillMd = skill?.kind === "file" ? new TextDecoder().decode(skill.bytes) : "";

  return { ref, branch, commit: tree.sha, entries: fetched, skillMd, skipped };
}
