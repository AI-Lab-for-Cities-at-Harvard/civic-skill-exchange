/** Spacing comes only from the scale (#316, ADR 0007).
 *
 *  The type in components/Layout.tsx refuses a step the scale does not have,
 *  at compile time. This holds the other half: layout.css gives every step a
 *  class, uses only tokens, sits above app.css, and a primitive really does
 *  clear the margins its children bring.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { Cluster, Grid, Stack, type Space } from "../components/Layout";

const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const LAYOUT = strip(readFileSync(join(__dirname, "layout.css"), "utf8"));
const ENTRY = strip(readFileSync(join(__dirname, "index.css"), "utf8"));
const TOKENS = readFileSync(join(__dirname, "tokens.css"), "utf8");
const MAIN = readFileSync(join(__dirname, "..", "main.tsx"), "utf8");

const STEPS: Space[] = ["0", "1", "2", "3", "4", "5", "6", "sm", "md", "lg", "xl"];

describe("the layout primitives' stylesheet", () => {
  it("has a class for every step of the scale", () => {
    for (const s of STEPS) expect(LAYOUT).toMatch(new RegExp(`\\.l-gap-${s}\\s*\\{`));
  });

  it("uses no bare length, only tokens", () => {
    const values = [...LAYOUT.matchAll(/(?:gap|margin[\w-]*|padding[\w-]*)\s*:\s*([^;}]+)/g)]
      .map((m) => m[1]!.trim())
      .filter((v) => v !== "0" && !/^var\(--[\w-]+\)$/.test(v));
    expect(values).toEqual([]);
  });

  it("names only tokens tokens.css defines", () => {
    const defined = new Set([...TOKENS.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    const used = [...LAYOUT.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    // --l-grid-min is a primitive's own input, set by <Grid min>, not a token.
    expect(used.filter((u) => !defined.has(u) && u !== "--l-grid-min")).toEqual([]);
  });

  it("keeps [hidden] working, since display:flex in a layer beats the browser's", () => {
    expect(LAYOUT).toMatch(/\.l-stack\[hidden\],\s*\.l-cluster\[hidden\],\s*\.l-grid\[hidden\]\s*\{\s*display:\s*none;?\s*\}/);
  });

  it("has a class for each Cluster alignment", () => {
    for (const a of ["start", "center", "end", "stretch", "baseline"]) {
      expect(LAYOUT).toMatch(new RegExp(`\\.l-align-${a}\\s*\\{`));
    }
  });
});

describe("the cascade layers", () => {
  it("are declared in order, legacy then layout", () => {
    expect(ENTRY).toMatch(/@layer legacy, layout;/);
  });

  it("hold tokens.css and app.css in legacy and layout.css in layout", () => {
    expect(ENTRY).toMatch(/@import "\.\/tokens\.css" layer\(legacy\)/);
    expect(ENTRY).toMatch(/@import "\.\/app\.css" layer\(legacy\)/);
    expect(ENTRY).toMatch(/@import "\.\/layout\.css" layer\(layout\)/);
  });

  it("declare the order before any import that uses it", () => {
    expect(ENTRY.indexOf("@layer legacy, layout;")).toBeLessThan(ENTRY.indexOf("@import"));
  });

  it("are the only way the site loads its styles", () => {
    expect(MAIN).toMatch(/import "\.\/styles\/index\.css"/);
    expect(MAIN).not.toMatch(/tokens\.css|app\.css|layout\.css/);
  });
});

describe("Stack and Cluster", () => {
  it("put the gap on the element and nothing inline", () => {
    const { container } = render(<Stack as="ol" gap="5"><li>a</li></Stack>);
    const ol = container.querySelector("ol")!;
    expect(ol).toHaveClass("l-stack", "l-gap-5");
    expect(ol.getAttribute("style")).toBeNull();
  });

  it("take every step of the scale", () => {
    for (const s of STEPS) {
      const { container, unmount } = render(<><Stack gap={s} /><Cluster gap={s} /></>);
      expect(container.querySelector(".l-stack")).toHaveClass(`l-gap-${s}`);
      expect(container.querySelector(".l-cluster")).toHaveClass(`l-gap-${s}`);
      unmount();
    }
  });

  it("refuse a gap that is not on the scale, at compile time", () => {
    // `tsc` is the assertion: if either @ts-expect-error stopped being an
    // error, the unused directive would fail `npm run typecheck`.
    const bad = () => (
      <>
        {/* @ts-expect-error 7 is not a step */}
        <Stack gap="7" />
        {/* @ts-expect-error a length is not a step */}
        <Cluster gap="13px" />
      </>
    );
    expect(typeof bad).toBe("function");
  });

  it("render the element asked for and pass the rest through", () => {
    const { container } = render(
      <Stack as="li" className="steps__item" data-testid="x" hidden>a</Stack>,
    );
    const li = container.querySelector("li")!;
    expect(li).toHaveClass("l-stack", "steps__item");
    expect(li).toHaveAttribute("data-testid", "x");
    expect(li).toHaveAttribute("hidden");
  });

  it("lets a Cluster align its children, centred by default", () => {
    const { container } = render(
      <>
        <Cluster />
        {(["start", "center", "end", "stretch", "baseline"] as const).map((a) => (
          <Cluster key={a} align={a} />
        ))}
      </>,
    );
    const [dflt, ...rest] = [...container.querySelectorAll(".l-cluster")];
    expect(dflt).toHaveClass("l-align-center");
    expect(rest.map((e) => e.className.match(/l-align-(\w+)/)![1])).toEqual(
      ["start", "center", "end", "stretch", "baseline"],
    );
  });

  it("refuse an alignment Cluster does not have, at compile time", () => {
    const bad = () => (
      // @ts-expect-error not an alignment
      <Cluster align="middle" />
    );
    expect(typeof bad).toBe("function");
  });
});

describe("Grid (#320)", () => {
  it("takes a gap from the scale and a minimum column width, and sets nothing else inline", () => {
    const { container } = render(<Grid gap="5" min="14rem" as="ul"><li>a</li></Grid>);
    const ul = container.querySelector("ul")!;
    expect(ul).toHaveClass("l-grid", "l-gap-5");
    expect(ul.style.getPropertyValue("--l-grid-min")).toBe("14rem");
    expect(ul.getAttribute("style")).toBe("--l-grid-min: 14rem;");
  });

  it("takes a row gap from the scale, for rows closer than the columns", () => {
    for (const s of STEPS) {
      const { container, unmount } = render(<Grid min="10rem" gap="6" rowGap={s} />);
      expect(container.firstElementChild).toHaveClass("l-gap-6", `l-row-gap-${s}`);
      expect(LAYOUT).toMatch(new RegExp(`\\.l-row-gap-${s}\\s*\\{\\s*row-gap:`));
      unmount();
    }
    const { container } = render(<Grid min="10rem" />);
    expect(container.firstElementChild!.className).not.toMatch(/row-gap/);
    // The row gap follows the gap in the file, so it wins at equal specificity.
    expect(LAYOUT.indexOf(".l-row-gap-0")).toBeGreaterThan(LAYOUT.indexOf(".l-gap-xl"));
  });

  it("defaults to a gap of 16px (gap 4)", () => {
    const { container } = render(<Grid min="10rem" />);
    expect(container.firstElementChild).toHaveClass("l-gap-4");
  });

  it("refuses an off-scale gap and a minimum that is not a rem length, at compile time", () => {
    const bad = () => (
      <>
        {/* @ts-expect-error 7 is not a step */}
        <Grid gap="7" min="10rem" />
        {/* @ts-expect-error a minimum is rem, so it follows the user's text size */}
        <Grid min="260px" />
        {/* @ts-expect-error a minimum is required */}
        <Grid />
      </>
    );
    expect(typeof bad).toBe("function");
  });

  it("is the auto-fit columns, each at most the row, in the layout layer", () => {
    expect(LAYOUT).toMatch(
      /\.l-grid\s*\{[^}]*display:\s*grid;[^}]*repeat\(auto-fit,\s*minmax\(min\(var\(--l-grid-min\),\s*100%\),\s*1fr\)\)/);
    expect(LAYOUT).toMatch(/\.l-grid\s*>\s*\*\s*\{\s*margin:\s*0;?\s*\}/);
  });
});
