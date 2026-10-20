/** Which skills a pull request is treated as having changed.
 *
 *  This decides what L0 validates and, more importantly, whose namespace L1
 *  checks ownership of. A generated file inside somebody else's skill directory
 *  must not make a maintenance pull request look like an attempt to write into
 *  their namespace.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pythonCommand } from "./scan-run";
import { discoverChanged, isGeneratedInSkill } from "./skill";

/** The repository, so the generator can be asked what it writes. */
const GENERATOR_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

let root: string;
let changed: string;

const changedPaths = (paths: string[]) => {
  writeFileSync(changed, paths.join("\n"));
  return discoverChanged(root, changed).map((p) => p.slice(root.length + 1));
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "discover-"));
  changed = join(root, "changed.txt");
  for (const dir of ["skills/alice/one", "skills/bob/two"]) {
    const name = dir.split("/").pop()!;
    mkdirSync(join(root, dir, ".codex-plugin"), { recursive: true });
    mkdirSync(join(root, dir, ".claude-plugin"), { recursive: true });
    mkdirSync(join(root, dir, "skills", name), { recursive: true });
    writeFileSync(join(root, dir, "skills", name, "SKILL.md"), "---\nname: x\n---\n");
    writeFileSync(join(root, dir, ".codex-plugin", "plugin.json"), "{}");
    writeFileSync(join(root, dir, ".claude-plugin", "plugin.json"), "{}");
  }
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("discoverChanged", () => {
  it("finds a skill whose content changed", () => {
    expect(changedPaths(["skills/alice/one/skills/one/SKILL.md"])).toEqual(["skills/alice/one"]);
  });

  it("finds one whose supporting files changed", () => {
    expect(changedPaths(["skills/alice/one/skills/one/scripts/thing.py"]))
      .toEqual(["skills/alice/one"]);
  });

  /* scripts/build_marketplace.py writes .codex-plugin/plugin.json into every
     listed skill, so regenerating the manifests touches every namespace at
     once. Counting that as a change made L1's ownership check fire on
     maintenance work — a maintainer regenerating manifests failed because
     somebody else's namespace was in the diff. */
  it("ignores a generated plugin manifest on its own", () => {
    expect(changedPaths(["skills/bob/two/.codex-plugin/plugin.json"])).toEqual([]);
    expect(changedPaths(["skills/bob/two/.claude-plugin/plugin.json"])).toEqual([]);
  });

  it("ignores generated manifests across every namespace at once", () => {
    expect(changedPaths([
      "skills/alice/one/.codex-plugin/plugin.json",
      "skills/alice/one/.claude-plugin/plugin.json",
      "skills/bob/two/.codex-plugin/plugin.json",
      "skills/bob/two/.claude-plugin/plugin.json",
      ".agents/plugins/marketplace.json",
      ".claude-plugin/marketplace.json",
    ])).toEqual([]);
  });

  it("still validates a skill that changed for a real reason alongside them", () => {
    expect(changedPaths([
      "skills/alice/one/skills/one/SKILL.md",
      "skills/alice/one/.codex-plugin/plugin.json",
      "skills/bob/two/.codex-plugin/plugin.json",
    ])).toEqual(["skills/alice/one"]);
  });

  it("does not exempt a file that merely sits near one", () => {
    writeFileSync(join(root, "skills/bob/two", "plugin.json"), "{}");
    expect(changedPaths(["skills/bob/two/plugin.json"])).toEqual(["skills/bob/two"]);
  });

  it("does not exempt another file inside a generated directory", () => {
    writeFileSync(join(root, "skills/bob/two/.claude-plugin", "other.json"), "{}");
    expect(changedPaths(["skills/bob/two/.claude-plugin/other.json"]))
      .toEqual(["skills/bob/two"]);
  });

  it("ignores paths outside skills/, and blank lines", () => {
    expect(changedPaths(["", "  ", "README.md", "site/src/App.tsx"])).toEqual([]);
  });
});

/* The exemption has to be exactly what scripts/build_marketplace.py writes into
   a listing. A pattern that matched `.codex-plugin/plugin.json` at any depth
   exempted a hand-written file the generator never touches, and the exemption
   is what stops L1 seeing a path at all — so this asks the generator for the
   paths rather than keeping a second copy of them.

   Asked, not read: `build_marketplace.py --paths` prints every path it owns,
   and is the same question the Manifest workflow asks before it stages what it
   regenerated (#188). This used to match `skill_dir / "x" / "y"` in the
   generator's source, so renaming a Python variable broke it (#276). It runs
   the real generator over a throwaway tree, with one single-skill listing and
   one plugin, so no listed skill is read (test_no_listing_coupling.py). */
let generatorTree: string;
let owned: string[];

beforeAll(() => {
  generatorTree = mkdtempSync(join(tmpdir(), "generator-"));
  const write = (rel: string, content: string) => {
    mkdirSync(dirname(join(generatorTree, rel)), { recursive: true });
    writeFileSync(join(generatorTree, rel), content);
  };
  // The generator resolves its root from where the script sits, so it is
  // copied in beside the module it imports.
  mkdirSync(join(generatorTree, "scripts"));
  for (const script of ["build_marketplace.py", "build_index.py"]) {
    copyFileSync(join(GENERATOR_ROOT, "scripts", script), join(generatorTree, "scripts", script));
  }
  const skill = (name: string) =>
    `---\nname: ${name}\ndescription: A skill.\nlicense: MIT\n` +
    `metadata:\n  civic.maintainer: Test\n---\n\nBody.\n`;
  write("skills/alice/one/skills/one/SKILL.md", skill("one"));
  write("plugins/carol/kit/plugin.json", JSON.stringify({
    name: "carol-kit", description: "A kit.", author: { name: "Carol" },
  }));
  write("plugins/carol/kit/mcp.json", JSON.stringify({
    mcpServers: { s: { type: "streamable-http", url: "https://s.example.org/mcp" } },
  }));
  write("plugins/carol/kit/skills/brief/SKILL.md", skill("brief"));

  const python = pythonCommand(GENERATOR_ROOT);
  const run = spawnSync(python,
    [join(generatorTree, "scripts", "build_marketplace.py"), "--paths"], { encoding: "utf8" });
  if (run.status !== 0) {
    throw new Error(`'${python} scripts/build_marketplace.py --paths' failed ` +
      `(${run.error?.message ?? `exit ${run.status}`}): ${run.stderr}\n` +
      "It needs pyyaml: see docs/DEVELOPMENT.md — Setup, or set $PYTHON.");
  }
  owned = run.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
});
afterAll(() => rmSync(generatorTree, { recursive: true, force: true }));

/** What the generator writes inside every listing under `tree`, relative to
 *  the listing: `skills/{ns}/{name}/` or `plugins/{ns}/{name}/`. */
const ownedIn = (tree: string): string[] => [...new Set(owned
  .filter((p) => p.startsWith(`${tree}/`))
  .map((p) => p.split("/").slice(3).join("/")))].sort();

describe("the generated-file exemption matches the generator", () => {
  it("asks the generator, and hears about a single skill's manifests", () => {
    // Guards the guard: the assertions below pass trivially if this is empty.
    expect(ownedIn("skills")).toEqual([".claude-plugin/plugin.json", ".codex-plugin/plugin.json"]);
  });

  it("exempts every path the generator writes", () => {
    for (const rel of ownedIn("skills")) {
      expect(isGeneratedInSkill(`skills/ns/name/${rel}`)).toBe(true);
    }
  });

  it("exempts them nowhere else in the tree", () => {
    for (const rel of ownedIn("skills")) {
      const [dir, file] = rel.split("/");
      expect(isGeneratedInSkill(`skills/ns/name/skills/name/${rel}`)).toBe(false);
      expect(isGeneratedInSkill(`skills/ns/name/nested/${rel}`)).toBe(false);
      expect(isGeneratedInSkill(`skills/ns/${rel}`)).toBe(false);
      expect(isGeneratedInSkill(`skills/ns/name/${file}`)).toBe(false);
      expect(isGeneratedInSkill(`skills/ns/name/${dir}/other.json`)).toBe(false);
    }
  });
});

/* The same guard for plugins (ADR 0005), from the same answer. */
describe("the plugin exemption matches the generator", () => {
  it("finds the paths the generator writes into a plugin", () => {
    expect(ownedIn("plugins")).toEqual([".claude-plugin/plugin.json", ".mcp.json"]);
  });

  it("exempts each of them at a plugin root, and nowhere deeper", () => {
    for (const rel of ownedIn("plugins")) {
      expect(isGeneratedInSkill(`plugins/ns/name/${rel}`)).toBe(true);
      expect(isGeneratedInSkill(`plugins/ns/name/skills/s/${rel}`)).toBe(false);
      expect(isGeneratedInSkill(`plugins/ns/${rel}`)).toBe(false);
    }
  });
});
