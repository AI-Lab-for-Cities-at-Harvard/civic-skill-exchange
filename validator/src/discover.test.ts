/** Which skills a pull request is treated as having changed.
 *
 *  This decides what L0 validates and, more importantly, whose namespace L1
 *  checks ownership of. A generated file inside somebody else's skill directory
 *  must not make a maintenance pull request look like an attempt to write into
 *  their namespace.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
    mkdirSync(join(root, dir, ".codex-plugin"), { recursive: true });
    writeFileSync(join(root, dir, "SKILL.md"), "---\nname: x\n---\n");
    writeFileSync(join(root, dir, ".codex-plugin", "plugin.json"), "{}");
  }
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("discoverChanged", () => {
  it("finds a skill whose content changed", () => {
    expect(changedPaths(["skills/alice/one/SKILL.md"])).toEqual(["skills/alice/one"]);
  });

  it("finds one whose supporting files changed", () => {
    expect(changedPaths(["skills/alice/one/scripts/thing.py"]))
      .toEqual(["skills/alice/one"]);
  });

  /* scripts/build_marketplace.py writes .codex-plugin/plugin.json into every
     listed skill, so regenerating the manifests touches every namespace at
     once. Counting that as a change made L1's ownership check fire on
     maintenance work — a maintainer regenerating manifests failed because
     somebody else's namespace was in the diff. */
  it("ignores a generated plugin manifest on its own", () => {
    expect(changedPaths(["skills/bob/two/.codex-plugin/plugin.json"])).toEqual([]);
  });

  it("ignores generated manifests across every namespace at once", () => {
    expect(changedPaths([
      "skills/alice/one/.codex-plugin/plugin.json",
      "skills/bob/two/.codex-plugin/plugin.json",
      ".agents/plugins/marketplace.json",
      ".claude-plugin/marketplace.json",
    ])).toEqual([]);
  });

  it("still validates a skill that changed for a real reason alongside them", () => {
    expect(changedPaths([
      "skills/alice/one/SKILL.md",
      "skills/alice/one/.codex-plugin/plugin.json",
      "skills/bob/two/.codex-plugin/plugin.json",
    ])).toEqual(["skills/alice/one"]);
  });

  it("does not exempt a file that merely sits near one", () => {
    writeFileSync(join(root, "skills/bob/two", "plugin.json"), "{}");
    expect(changedPaths(["skills/bob/two/plugin.json"])).toEqual(["skills/bob/two"]);
  });

  it("ignores paths outside skills/, and blank lines", () => {
    expect(changedPaths(["", "  ", "README.md", "site/src/App.tsx"])).toEqual([]);
  });
});

/* The exemption has to be exactly what scripts/build_marketplace.py writes into
   a skill directory. A pattern that matched `.codex-plugin/plugin.json` at any
   depth exempted a hand-written file the generator never touches, and the
   exemption is what stops L1 seeing a path at all — so this asks the generator
   for the shape rather than keeping a second copy of it. */
describe("the generated-file exemption matches the generator", () => {
  const source = () => readFileSync(
    join(GENERATOR_ROOT, "scripts", "build_marketplace.py"), "utf8");

  it("finds the generator's per-skill loop and the file it writes", () => {
    // Guards the guard: the assertions below pass trivially if these drift.
    expect(source()).toContain('(root / "skills").glob("*/*")');
    expect(generatedInSkill()).not.toBeNull();
  });

  it("exempts the path the generator writes", () => {
    const [dir, file] = generatedInSkill()!;
    expect(isGeneratedInSkill(`skills/ns/name/${dir}/${file}`)).toBe(true);
  });

  it("exempts it nowhere else in the tree", () => {
    const [dir, file] = generatedInSkill()!;
    expect(isGeneratedInSkill(`skills/ns/name/nested/${dir}/${file}`)).toBe(false);
    expect(isGeneratedInSkill(`skills/ns/${dir}/${file}`)).toBe(false);
    expect(isGeneratedInSkill(`skills/ns/name/${file}`)).toBe(false);
  });

  /** The `skill_dir / "..." / "..."` the generator writes, as its two segments. */
  function generatedInSkill(): [string, string] | null {
    const m = source().match(/skill_dir \/ "([^"]+)" \/ "([^"]+)"/);
    return m ? [m[1]!, m[2]!] : null;
  }
});
