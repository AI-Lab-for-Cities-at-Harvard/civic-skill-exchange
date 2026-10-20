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
import { Cluster, Stack, type Space } from "../components/Layout";

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
    expect(used.filter((u) => !defined.has(u))).toEqual([]);
  });

  it("keeps [hidden] working, since display:flex in a layer beats the browser's", () => {
    expect(LAYOUT).toMatch(/\.l-stack\[hidden\],\s*\.l-cluster\[hidden\]\s*\{\s*display:\s*none;?\s*\}/);
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
