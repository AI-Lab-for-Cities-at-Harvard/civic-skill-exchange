/** Reading a skill straight out of a public GitHub repository.
 *
 *  No backend and no token: api.github.com sends
 *  `access-control-allow-origin: *`, so the browser can do this itself. Three
 *  requests at most — the repository for its default branch, one recursive tree
 *  for every path and size, and SKILL.md.
 *
 *  The limit is 60 an hour per address, so a rate-limited answer has to read as
 *  "try again later" and never as "your repository is wrong".
 *
 *  What comes back is a *copy*. The registry holds the content, which is what
 *  the SHA pin, the weekly re-scan and the published archive work against; the
 *  repo and commit are recorded as provenance so a reader can go and look.
 */

import {
  MAX_FILE_BYTES, isRepositoryFurniture, type Entry,
} from "@civic-skill-exchange/validator";

const API = "https://api.github.com";

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

export const FAILURE_MESSAGES: Record<ImportFailure["kind"], string> = {
  "not-a-repo": "That does not look like a GitHub repository. Paste its address, like github.com/you/your-skill.",
  // A 404 covers private and missing alike — GitHub will not distinguish them
  // for an unauthenticated caller, and neither should we.
  "not-found": "No public repository there. If it is private, download it and upload the zip instead.",
  "rate-limited": "GitHub is rate-limiting anonymous requests from here. Wait a few minutes, or upload the zip instead.",
  "too-big": "That repository has too many files to read this way. Upload the skill folder as a zip instead.",
  "no-skill-md": "No SKILL.md at the top of that repository. A skill is a folder with SKILL.md in it.",
  offline: "Could not reach GitHub. Check your connection, or upload the zip instead.",
};

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
    // Sizes come from the tree, so the structural checks run without fetching
    // any content. Only SKILL.md is downloaded.
    entries.push({ path: node.path, kind: "file", bytes: new Uint8Array(size) });
  }

  if (!entries.some((e) => e.path === "SKILL.md")) return { kind: "no-skill-md" };

  const fileRes = await get(
    `${API}/repos/${ref.owner}/${ref.repo}/contents/SKILL.md?ref=${encodeURIComponent(branch)}`,
    signal,
  );
  if (isFailure(fileRes)) return fileRes;
  const file = await fileRes.json() as { content?: string; encoding?: string };
  if (file.encoding !== "base64" || !file.content) return { kind: "no-skill-md" };
  const skillMd = new TextDecoder().decode(
    Uint8Array.from(atob(file.content.replace(/\n/g, "")), (c) => c.charCodeAt(0)),
  );

  return { ref, branch, commit: tree.sha, entries, skillMd, skipped };
}
