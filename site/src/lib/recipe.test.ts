/** The command-line recipes, run for real (#297, finding S-7).
 *
 *  Why vitest and not pytest: the recipe is rendered by TypeScript on the page,
 *  so the thing under test is `recipe()` itself, and a pytest could only read a
 *  copy of its text. Here the very string the page prints is executed, by `bash`
 *  and a real `git`, against two bare repositories in a temp directory: a
 *  "registry" and the submitter's "fork". Nothing touches the network; the
 *  clone addresses are local paths.
 *
 *  The one line that cannot run is `npx tsx validator/src/cli.ts …`, because the
 *  throwaway clone has no validator in it. It is checked as text instead (it is
 *  there, and points at the listing directory), and left out of the run.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recipe, recipeInput } from "./submit";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "t@example.test",
  GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "t@example.test",
};

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, env: ENV, encoding: "utf8" });

let root: string;
let registry: string;
let fork: string;
let work: string;
let handedBack: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "recipe-"));
  const seed = join(root, "seed");
  mkdirSync(seed);
  git(seed, "init", "-q", "-b", "main");
  writeFileSync(join(seed, "README.md"), "registry\n");
  git(seed, "add", ".");
  git(seed, "commit", "-q", "-m", "seed");
  registry = join(root, "registry.git");
  fork = join(root, "fork.git");
  git(root, "clone", "-q", "--bare", seed, registry);
  git(root, "clone", "-q", "--bare", registry, fork);
  work = join(root, "work");
  mkdirSync(work);
  // A stand-in for the folder the page handed back.
  handedBack = join(root, "downloads", "permit-status");
  mkdirSync(join(handedBack, "scripts"), { recursive: true });
  writeFileSync(join(handedBack, "SKILL.md"), "---\nname: permit-status\n---\n");
  writeFileSync(join(handedBack, "scripts", "run.py"), "print(1)\n");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const refs = (repo: string) => git(root, "--git-dir", repo, "for-each-ref");
const draft = { author: "CityOfX", name: "permit-status" };

function run(text: string) {
  const runnable = text.split("\n").filter((l) => !l.startsWith("npx ")).join("\n");
  execFileSync("bash", ["-ec", runnable], { cwd: work, env: ENV, stdio: "pipe" });
}

describe.each([
  ["skill", "skills" as const, "skills/cityofx/permit-status",
    "skills/cityofx/permit-status/skills/permit-status"],
  ["plugin", "plugins" as const, "plugins/cityofx/permit-status",
    "plugins/cityofx/permit-status"],
])("the %s recipe, run against bare repositories", (_kind, tree, listing, landing) => {
  const text = () => recipe({
    ...recipeInput(REPO, "cityofx/civic-skill-exchange", draft, tree, "x"),
    // `git clone` names the directory for the address, so for fork.git it is "fork".
    forkUrl: fork, cloneDir: "fork", folder: handedBack,
  });

  it("pushes a branch to the fork, with the files at the nested path", () => {
    run(text());
    const branch = git(root, "--git-dir", fork, "branch", "--list", "add-permit-status");
    expect(branch).toContain("add-permit-status");
    const files = git(root, "--git-dir", fork, "ls-tree", "-r", "--name-only", "add-permit-status");
    expect(files).toContain(`${landing}/SKILL.md\n`);
    expect(files).toContain(`${landing}/scripts/run.py\n`);
    // Nothing doubled up by `cp` nesting the folder inside itself.
    expect(files).not.toContain(`${landing}/permit-status/`);
  });

  it("leaves the registry exactly as it was", () => {
    const before = refs(registry);
    run(text());
    expect(refs(registry)).toBe(before);
  });

  it("commits the new files themselves, not just edits to tracked ones", () => {
    run(text());
    const msg = git(root, "--git-dir", fork, "log", "-1", "--format=%s", "add-permit-status");
    expect(msg.trim()).toBe(`Add ${listing}`);
  });

  it("keeps the validator line, pointed at the listing directory", () => {
    expect(text().split("\n")).toContain(`npx tsx validator/src/cli.ts ${listing}`);
  });

  it("installs dependencies on its own line before the validator runs", () => {
    // A fresh clone has no tsx and no yaml, so the validator line fails without it.
    const lines = text().split("\n");
    const ci = lines.indexOf("npm ci");
    expect(ci).toBeGreaterThan(-1);
    expect(ci).toBeLessThan(lines.findIndex((l) => l.startsWith("npx tsx validator")));
  });

  it("has no indentation and no comment on any line", () => {
    for (const line of text().split("\n")) {
      expect(line).toBe(line.trimStart());
      expect(line.startsWith("#")).toBe(false);
    }
  });
});

// docs/SUBMITTING.md carries the same recipes with placeholders in braces. They
// are compared with the rendered text, line for line, so the two cannot drift.
describe("docs/SUBMITTING.md", () => {
  const doc = readFileSync(join(__dirname, "../../../docs/SUBMITTING.md"), "utf8");
  const blocks = [...doc.matchAll(/```bash\n([\s\S]*?)```/g)].map((m) => m[1]!.trimEnd());
  const placeholder = (kind: string, tree: "skills" | "plugins") => recipe({
    ...recipeInput(REPO, "", { author: "{your-github-username}", name: `{${kind}-name}` }, tree, "x"),
    forkUrl: "https://github.com/{your-github-username}/civic-skill-exchange.git",
    cloneDir: "civic-skill-exchange",
  });

  it("shows the skill recipe exactly as the page renders it", () => {
    expect(blocks).toContain(placeholder("skill", "skills"));
  });

  it("shows the plugin recipe exactly as the page renders it", () => {
    expect(blocks).toContain(placeholder("plugin", "plugins"));
  });
});

describe("what the recipe is made of", () => {
  it("clones the fork and pushes to origin, which is then the fork", () => {
    const lines = recipe(recipeInput(
      REPO, "sgarcese/my-copy", draft, "skills", "x")).split("\n");
    expect(lines[0]).toBe("git clone https://github.com/sgarcese/my-copy.git");
    expect(lines[1]).toBe("cd my-copy");
    expect(lines.at(-1)).toBe("git push -u origin add-permit-status");
    expect(lines.join("\n")).not.toContain("commit -am");
  });

  it("stands a placeholder in for a fork not yet pasted, never the registry", () => {
    const text = recipe(recipeInput(REPO, "", draft, "skills", "x"));
    expect(text).toContain("git clone https://github.com/YOUR-USERNAME/civic-skill-exchange.git");
    expect(text).not.toContain(`github.com/${REPO}`);
  });
});
