/** Pages most readers never open stay out of the entry chunk (#314). The
 *  size gate measures what a browse reader downloads; a page imported eagerly
 *  by App.tsx lands in it whether or not anyone goes there. */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const APP = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "App.tsx"), "utf8");

describe("routes loaded on demand", () => {
  for (const page of ["Submit", "PluginDetail", "Guide"]) {
    it(`loads ${page} with lazy(), not a static import`, () => {
      expect(APP).not.toMatch(new RegExp(`^import[^;]*from "\\./components/${page}";`, "m"));
      expect(APP).toMatch(new RegExp(`lazy\\(\\(\\) =>\\s*import\\("\\./components/${page}"\\)`));
    });
  }
});
