/** Responsive invariants that can be checked without a browser.
 *
 *  jsdom lays nothing out, so this cannot measure a rendered page. What it can
 *  do is hold the stylesheet to the rules that make a layout survive a narrow
 *  screen — and those are the ones that get broken by accident, usually by
 *  someone reaching for a pixel width in a hurry.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const APP = readFileSync(join(__dirname, "app.css"), "utf8");
const TOKENS = readFileSync(join(__dirname, "tokens.css"), "utf8");
const HTML = readFileSync(join(ROOT, "index.html"), "utf8");

describe("the page adapts to the screen it is on", () => {
  it("declares the viewport, without which none of the rest applies", () => {
    expect(HTML).toMatch(/<meta[^>]+name="viewport"[^>]+width=device-width/);
    // A page that forbids zoom is unusable for anyone who needs to enlarge it.
    expect(HTML).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/);
  });

  it("sets no fixed pixel width on a container", () => {
    // A max-width in px is fine — it only stops growth. A width or min-width in
    // px is what forces a horizontal scrollbar on a phone.
    const offenders = [...APP.matchAll(/^\s*(width|min-width)\s*:\s*(\d+)px/gm)]
      .filter((m) => Number(m[2]) > 320)
      .map((m) => m[0].trim());
    expect(offenders).toEqual([]);
  });

  it("scrolls wide content inside its own box", () => {
    // Code blocks and command lines are the widest things on the site. Without
    // this the whole page scrolls sideways instead.
    for (const cls of [".submit__yaml"]) {
      const block = new RegExp(`\\${cls}\\s*\\{[^}]*overflow-x:\\s*auto`);
      expect(APP).toMatch(block);
    }
  });

  it("has a breakpoint that collapses the two-column layouts", () => {
    expect(APP).toMatch(/@media\s*\(max-width:\s*1023px\)/);
  });

  it("sizes spacing and type against the viewport rather than in fixed steps", () => {
    expect(TOKENS).toMatch(/clamp\(/);
  });

  it("respects a reader who asked for less motion", () => {
    expect(APP).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it("wraps rows rather than letting them overflow", () => {
    for (const cls of [".modes", ".submit__row", ".cta-row", ".card__badges"]) {
      const rule = new RegExp(`\\${cls}\\s*\\{[^}]*flex-wrap:\\s*wrap`);
      expect(APP, `${cls} should wrap`).toMatch(rule);
    }
  });
});
