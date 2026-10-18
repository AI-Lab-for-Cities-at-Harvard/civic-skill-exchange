/** The site reads the validator by subpath, never through its barrel (#213).
 *
 *  `@civic-skill-exchange/validator` re-exports plugin-core. A value import of
 *  the barrel from anything in the entry chunk puts plugin-core there too, the
 *  moment the lazily loaded plugin form uses any of it — about 10 kB the
 *  English visitor pays for a form most never open. A type import is erased
 *  and costs nothing, so it is allowed.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === "test" ? [] : sources(path);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("validator imports", () => {
  it("never take a value from the barrel", () => {
    const offenders = sources(SRC).filter((path) =>
      /import\s+\{[^}]*\}\s+from\s+"@civic-skill-exchange\/validator"/.test(
        readFileSync(path, "utf8")))
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });
});
