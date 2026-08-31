/** Reading a skill out of a public GitHub repository.
 *
 *  Every failure the network can produce has to say what to do next, and a rate
 *  limit must never read as "your repository is wrong" — that would send
 *  somebody off to fix something that was fine.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { parseRepoRef, importFromRepo, FAILURE_MESSAGES } from "./import";

afterEach(() => { vi.unstubAllGlobals(); });

const SKILL = `---
name: civic-analytics
description: An example.
---
Body.
`;

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

/** Answers each of the three calls in the order importFromRepo makes them. */
function github(over: {
  repo?: unknown; tree?: unknown; file?: unknown; status?: Record<string, number>;
} = {}) {
  const status = over.status ?? {};
  const routes: [RegExp, unknown, string][] = [
    [/\/git\/trees\//, over.tree ?? {
      sha: "c".repeat(40), truncated: false,
      tree: [{ path: "SKILL.md", type: "blob", size: 120 }],
    }, "tree"],
    [/\/contents\/SKILL\.md/, over.file ?? { encoding: "base64", content: b64(SKILL) }, "file"],
    [/\/repos\/[^/]+\/[^/]+$/, over.repo ?? { default_branch: "main" }, "repo"],
  ];
  return vi.fn(async (url: string) => {
    for (const [re, body, key] of routes) {
      if (re.test(url)) {
        const code = status[key] ?? 200;
        return { status: code, ok: code < 300, json: async () => body };
      }
    }
    throw new Error(`unexpected request: ${url}`);
  });
}

describe("parseRepoRef", () => {
  it("takes what people actually paste", () => {
    const want = { owner: "sgarcese", repo: "Civic-Analytics-Agent-Workflow-Claude-Skill" };
    for (const input of [
      "https://github.com/sgarcese/Civic-Analytics-Agent-Workflow-Claude-Skill",
      "https://github.com/sgarcese/Civic-Analytics-Agent-Workflow-Claude-Skill/",
      "https://github.com/sgarcese/Civic-Analytics-Agent-Workflow-Claude-Skill.git",
      "https://github.com/sgarcese/Civic-Analytics-Agent-Workflow-Claude-Skill/tree/main",
      "git@github.com:sgarcese/Civic-Analytics-Agent-Workflow-Claude-Skill.git",
      "sgarcese/Civic-Analytics-Agent-Workflow-Claude-Skill",
      "  github.com/sgarcese/Civic-Analytics-Agent-Workflow-Claude-Skill  ",
    ]) {
      expect(parseRepoRef(input)).toEqual(want);
    }
  });

  it("takes a bare host, which is what people paste most", () => {
    expect(parseRepoRef("github.com/sgarcese/skill"))
      .toEqual({ owner: "sgarcese", repo: "skill" });
  });

  it("refuses what is not one", () => {
    for (const bad of [
      "", "   ", "not a url",
      "https://gitlab.com/a/b/c",
      // Would otherwise parse its own host as the owner.
      "gitlab.com/a/b",
    ]) {
      expect(parseRepoRef(bad)).toBeNull();
    }
  });
});

describe("importFromRepo", () => {
  it("reads the tree and SKILL.md in three requests", async () => {
    const fetchMock = github();
    vi.stubGlobal("fetch", fetchMock);
    const out = await importFromRepo("sgarcese/Civic-Analytics-Agent-Workflow-Claude-Skill");
    expect("kind" in out).toBe(false);
    if ("kind" in out) return;
    expect(out.skillMd).toContain("name: civic-analytics");
    expect(out.commit).toBe("c".repeat(40));
    expect(out.branch).toBe("main");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("follows a default branch that is not main", async () => {
    const fetchMock = github({ repo: { default_branch: "trunk" } });
    vi.stubGlobal("fetch", fetchMock);
    const out = await importFromRepo("a/b");
    expect("kind" in out ? null : out.branch).toBe("trunk");
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("trunk"))).toBe(true);
  });

  it("builds entries from the tree without downloading any of them", async () => {
    // Sizes come from the tree, so the structural checks cost no requests.
    vi.stubGlobal("fetch", github({
      tree: {
        sha: "c".repeat(40), truncated: false,
        tree: [
          { path: "SKILL.md", type: "blob", size: 120 },
          { path: "scripts/run.py", type: "blob", size: 4096 },
          { path: "scripts", type: "tree" },
        ],
      },
    }));
    const out = await importFromRepo("a/b");
    if ("kind" in out) throw new Error("expected success");
    expect(out.entries.map((e) => e.path)).toEqual(["SKILL.md", "scripts/run.py"]);
    const script = out.entries[1];
    expect(script?.kind === "file" ? script.bytes.length : 0).toBe(4096);
  });
});

describe("importFromRepo — every failure says what to do next", () => {
  it("rejects something that is not a repository", async () => {
    expect(await importFromRepo("not a repo")).toEqual({ kind: "not-a-repo" });
  });

  it("treats private and missing alike, because GitHub does", async () => {
    vi.stubGlobal("fetch", github({ status: { repo: 404 } }));
    expect(await importFromRepo("a/b")).toEqual({ kind: "not-found" });
    expect(FAILURE_MESSAGES["not-found"]).toMatch(/private/i);
  });

  it("says a rate limit is a rate limit, not a bad repository", async () => {
    vi.stubGlobal("fetch", github({ status: { repo: 403 } }));
    expect(await importFromRepo("a/b")).toEqual({ kind: "rate-limited" });
    expect(FAILURE_MESSAGES["rate-limited"]).not.toMatch(/wrong|invalid|bad/i);
  });

  it("refuses a truncated tree rather than checking a partial file list", async () => {
    // Checks that pass only because entries are missing are worse than none.
    vi.stubGlobal("fetch", github({
      tree: { sha: "c".repeat(40), truncated: true, tree: [] },
    }));
    expect(await importFromRepo("a/b")).toEqual({ kind: "too-big" });
  });

  it("says so when there is no SKILL.md at the top", async () => {
    vi.stubGlobal("fetch", github({
      tree: {
        sha: "c".repeat(40), truncated: false,
        tree: [{ path: "docs/SKILL.md", type: "blob", size: 10 }],
      },
    }));
    expect(await importFromRepo("a/b")).toEqual({ kind: "no-skill-md" });
  });

  it("reports a network failure as one", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await importFromRepo("a/b")).toEqual({ kind: "offline" });
  });

  it("names what it skipped instead of dropping it silently", async () => {
    vi.stubGlobal("fetch", github({
      tree: {
        sha: "c".repeat(40), truncated: false,
        tree: [
          { path: "SKILL.md", type: "blob", size: 120 },
          { path: "big.txt", type: "blob", size: 900_000 },
          { path: "vendor", type: "commit" },
        ],
      },
    }));
    const out = await importFromRepo("a/b");
    if ("kind" in out) throw new Error("expected success");
    expect(out.skipped.join(" ")).toMatch(/big\.txt/);
    expect(out.skipped.join(" ")).toMatch(/vendor/);
    expect(out.entries.map((e) => e.path)).toEqual(["SKILL.md"]);
  });

  it("offers a way forward in every message", () => {
    for (const message of Object.values(FAILURE_MESSAGES)) {
      expect(message.length).toBeGreaterThan(20);
    }
  });
});

/** The real repository this was built against. Fifteen files flat at the root,
 *  two of them the repository's own. Recorded as a fixture because it is the
 *  case that showed the allowlist answering a question nobody asked: every
 *  repository has a LICENSE, and none of them belong in a skill. */
describe("importFromRepo — a real repository", () => {
  const REAL = [
    ".gitignore", "Analytical_Skill.md", "Benchmarking_Skill.md", "CHECKLISTS.md",
    "Communication_Skill.md", "EXAMPLE-311-equity.md", "LICENSE", "PROMPTS.md",
    "Performance_Management_Skill.md", "Problem_Framing_Skill.md", "README.md",
    "REFERENCE.md", "SKILL.md", "TEMPLATES.md", "index.html",
  ];

  it("leaves the repository's own files behind and copies the rest", async () => {
    vi.stubGlobal("fetch", (() => {
      const tree = {
        sha: "6acf7bb" + "0".repeat(33), truncated: false,
        tree: REAL.map((path) => ({ path, type: "blob", size: 9000 })),
      };
      return vi.fn(async (url: string) => ({
        status: 200, ok: true,
        json: async () => /\/git\/trees\//.test(url) ? tree
          : /\/contents\//.test(url) ? { encoding: "base64", content: b64(SKILL) }
          : { default_branch: "main" },
      }));
    })());

    const out = await importFromRepo("github.com/sgarcese/Civic-Analytics-Agent-Workflow-Claude-Skill");
    if ("kind" in out) throw new Error(`expected success, got ${out.kind}`);

    expect(out.entries).toHaveLength(13);
    expect(out.entries.map((e) => e.path)).not.toContain("LICENSE");
    expect(out.entries.map((e) => e.path)).not.toContain(".gitignore");
    expect(out.skipped.join(" ")).toMatch(/LICENSE/);
    expect(out.skipped.join(" ")).toMatch(/\.gitignore/);
    // index.html is on the allowlist. Nothing about it needs an opinion here.
    expect(out.entries.map((e) => e.path)).toContain("index.html");
  });
});
