/** Colour contrast, computed from the tokens rather than measured in a browser.
 *
 *  axe's colour-contrast rule needs layout, so it cannot run in jsdom and is
 *  switched off in the axe harness. This covers the same ground from the other
 *  end: parse tokens.css, resolve each theme's palette, and hold every
 *  foreground-on-background pair the design system actually uses to WCAG AA.
 *
 *  Both themes and both scoped bands, because a pair that passes in light can
 *  fail in dark and nobody would see it until someone with the other setting
 *  arrives.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Comments are stripped first. Splitting on ";" otherwise leaves the comment
// glued to the declaration that follows it, and the key is silently dropped —
// which is most of the palette, since nearly every group is introduced by one.
const CSS = readFileSync(join(__dirname, "tokens.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/** WCAG AA: 4.5:1 for body text, 3:1 for large text and interface borders. */
const AA_TEXT = 4.5;
const AA_LARGE = 3;

function block(selector: string): Record<string, string> {
  // Escape the selector for a regex, then take the last block that opens with
  // it — later definitions win in CSS, and so should the test.
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...CSS.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g"))];
  const body = matches.at(-1)?.[1];
  if (!body) throw new Error(`no such block in tokens.css: ${selector}`);
  const out: Record<string, string> = {};
  for (const line of body.split(";")) {
    const [name, value] = line.split(":").map((s) => s.trim());
    if (name?.startsWith("--") && value) out[name] = value;
  }
  return out;
}

/** Resolve var() chains, and flatten a theme onto the base palette. */
function palette(...blocks: Record<string, string>[]): Record<string, string> {
  const merged = Object.assign({}, ...blocks) as Record<string, string>;
  const resolve = (value: string, depth = 0): string => {
    const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
    if (!m || depth > 10) return value.trim();
    const next = merged[m[1]!];
    return next ? resolve(next, depth + 1) : value.trim();
  };
  return Object.fromEntries(
    Object.entries(merged).map(([k, v]) => [k, resolve(v)]),
  );
}

function rgb(color: string): [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(color.trim());
  if (fn) {
    const parts = fn[1]!.split(",").map((s) => parseFloat(s));
    return [parts[0]!, parts[1]!, parts[2]!];
  }
  throw new Error(`cannot parse colour: ${color}`);
}

/** Alpha channel, or 1 when the colour is opaque. */
function alpha(color: string): number {
  const fn = /^rgba\(([^)]+)\)$/.exec(color.trim());
  if (!fn) return 1;
  const parts = fn[1]!.split(",").map((s) => parseFloat(s));
  return parts[3] ?? 1;
}

/** Text tokens are rgba over the page ground, so the effective colour has to be
 *  composited before the ratio means anything. */
function over(fg: string, bg: string): [number, number, number] {
  const a = alpha(fg);
  if (a === 1) return rgb(fg);
  const [fr, fg_, fb] = rgb(fg);
  const [br, bg_, bb] = rgb(bg);
  return [
    fr * a + br * (1 - a),
    fg_ * a + bg_ * (1 - a),
    fb * a + bb * (1 - a),
  ];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(fg: string, bg: string): number {
  const a = luminance(over(fg, bg));
  const b = luminance(rgb(bg));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const base = block(":root");
const dark = block(':root[data-theme="dark"]');
const crimson = block('[data-theme="crimson"]');
const plainDark = block('[data-theme="plain-dark"]');
const contrast = block('[data-theme="contrast"]');

const THEMES: [string, Record<string, string>][] = [
  ["light", palette(base)],
  ["dark", palette(base, dark)],
  ["crimson band", palette(base, crimson)],
  ["plain-dark band", palette(base, plainDark)],
  ["contrast band", palette(base, contrast)],
];

/** Every pair the components actually paint. */
const TEXT_PAIRS: [string, string, string][] = [
  ["body text", "--c-text", "--c-bg"],
  ["body text on a card", "--c-text", "--c-bg-raised"],
  ["secondary text", "--c-text-light", "--c-bg"],
  ["secondary text on a card", "--c-text-light", "--c-bg-raised"],
  ["quiet text", "--c-text-lighter", "--c-bg"],
  ["quiet text on a card", "--c-text-lighter", "--c-bg-raised"],
  ["links", "--c-text-link", "--c-bg"],
];

describe.each(THEMES)("%s theme meets WCAG AA", (_name, theme) => {
  it.each(TEXT_PAIRS)("%s", (_label, fgToken, bgToken) => {
    const fg = theme[fgToken];
    const bg = theme[bgToken];
    if (!fg || !bg) return;  // a band that does not redefine this pair
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

/** The status chips carry their own ground, and are the most consequential
 *  thing on a card — a tier badge nobody can read is a tier badge nobody
 *  checks. */
describe.each([["light", palette(base)], ["dark", palette(base, dark)]] as const)(
  "status badges in the %s theme",
  (_name, theme) => {
    it.each([
      ["reviewed", "--c-ok", "--c-ok-bg"],
      ["community", "--c-warn", "--c-warn-bg"],
      ["informational", "--c-info", "--c-info-bg"],
    ])("%s", (_label, fgToken, bgToken) => {
      expect(ratio(theme[fgToken]!, theme[bgToken]!)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  },
);

describe("the Lab badge, which is brand rather than status", () => {
  it("is legible on the accent in either theme, because it is absolute", () => {
    // badge--lab paints white on --brand-accent and does not change with the
    // reader's setting, the same rule the crimson band follows.
    expect(ratio("#ffffff", palette(base)["--brand-accent"]!))
      .toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe("interface borders", () => {
  // Against both grounds. Form controls sit on cards as often as on the page,
  // and checking only the page ground missed the dark theme entirely.
  it.each([
    ["light on the page", palette(base), "--c-bg"],
    ["light on a card", palette(base), "--c-bg-raised"],
    ["dark on the page", palette(base, dark), "--c-bg"],
    ["dark on a card", palette(base, dark), "--c-bg-raised"],
  ] as const)("%s: a form control's edge is visible", (_name, theme, ground) => {
    // 3:1 rather than 4.5 — WCAG 1.4.11 treats a control boundary as non-text
    // contrast.
    expect(ratio(theme["--c-border"]!, theme[ground]!)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it.each([["light", palette(base)], ["dark", palette(base, dark)]] as const)(
    "%s: the focus ring is visible against the page",
    (_name, theme) => {
      expect(ratio(theme["--c-outline"]!, theme["--c-bg"]!))
        .toBeGreaterThanOrEqual(AA_LARGE);
    },
  );
});
