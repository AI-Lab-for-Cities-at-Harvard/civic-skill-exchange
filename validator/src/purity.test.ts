/**
 * The browser-facing modules must not import Node.
 *
 * The obvious enforcement — "the site's tsc has no node lib" — does not work:
 * `types: ["vite/client"]` gates which @types are loaded as globals, but an
 * explicit `import from "node:fs"` still resolves through the hoisted
 * @types/node and compiles cleanly. Verified by trying it.
 *
 * Vite would fail at bundle time, but only once site code actually imports the
 * module — so the failure would arrive whenever someone next wires it up, not
 * when the import was added.
 *
 * So the check reads the source. Blunt, but it fires every time, which is the
 * only property that matters in a guardrail.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)));

/** Everything reachable from the package entry point, which the site imports. */
const BROWSER_SAFE = [
  "index.ts", "rules.ts", "types.ts", "structure-core.ts", "yaml-safety.ts",
  // layout.ts takes a list of path strings and returns findings. It reads
  // nothing, so it belongs here — and the submission page has a use for it.
  "layout.ts",
];

/** Comments are stripped first: these files explain the rule in prose, and
 *  prose that names `node:fs` is not an import of it. Found the hard way. */
const importsOf = (file: string): string[] => {
  const code = readFileSync(join(SRC, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return [...code.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map((m) => m[1]!);
};

describe("the browser-facing modules stay free of Node", () => {
  it.each(BROWSER_SAFE)("%s imports no node: builtin", (file) => {
    expect(importsOf(file).filter((s) => s.startsWith("node:"))).toEqual([]);
  });

  it.each(BROWSER_SAFE)("%s does not reach Node through a relative import", (file) => {
    // structure.ts is the filesystem adapter and is deliberately not on the
    // list; pulling it in from a browser-safe module would drag node:fs along.
    const local = importsOf(file).filter((s) => s.startsWith("."));
    for (const dep of local) {
      const name = `${dep.replace(/^\.\//, "")}.ts`;
      expect(BROWSER_SAFE, `${file} imports ${dep}`).toContain(name);
    }
  });

  it("the filesystem adapter is not exported from the entry point", () => {
    // structure.ts re-exports the core for existing callers, but "." must not
    // re-export structure.ts, or every consumer inherits node:fs.
    expect(importsOf("index.ts")).not.toContain("./structure");
  });
});
