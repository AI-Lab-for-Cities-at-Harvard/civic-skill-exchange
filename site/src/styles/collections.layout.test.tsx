/** The collection tiles' stylesheet (#209, ADR 0008 decision 10 as amended by
 *  ruling 10): an even grid, every tile the same width and height, with the
 *  counts along the bottom. The width is the Grid's (Collections.test.tsx holds
 *  the markup); the height and the bottom are these rules. */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP = readFileSync(join(__dirname, "app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const RULES = [...APP.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ selector: m[1]!.trim().replace(/^@media[^{]*\{\s*/, ""), body: m[2]! }));
const bodies = (selector: string) =>
  RULES.filter((r) => r.selector.split(/\s*,\s*/).includes(selector)).map((r) => r.body).join(";");

describe("the collection tiles", () => {
  it("give every row of tiles the same height", () => {
    expect(bodies(".collections__list")).toMatch(/grid-auto-rows:\s*1fr/);
  });

  it("push each tile's count to its bottom edge, so the counts line up", () => {
    expect(bodies(".tile")).toMatch(/justify-content:\s*space-between/);
  });

  it("are not edged in crimson, which reads as an error notice's edge (#101 ruling 5)", () => {
    expect(bodies(".tile")).not.toMatch(/--c-spot/);
  });

  it("are a list with no bullets and no indent", () => {
    expect(bodies(".collections__list")).toMatch(/list-style:\s*none/);
    expect(bodies(".collections__list")).toMatch(/padding:\s*0/);
  });
});
