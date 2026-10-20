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

/* #329: a lazy page's own modules stay out of the entry chunk too. App.tsx
   once imported one helper from lib/submit.ts, which put the whole submit
   module back in what every browse reader downloads. */
describe("modules only the lazy pages need", () => {
  for (const mod of ["submit", "patch", "zip", "folder", "import"]) {
    it(`App.tsx does not import lib/${mod}`, () => {
      expect(APP).not.toMatch(new RegExp(`from "\\./lib/${mod}";`));
    });
  }
});

