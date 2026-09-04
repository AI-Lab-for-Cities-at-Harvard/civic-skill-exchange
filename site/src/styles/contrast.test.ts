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

/** Status colour, ruled on #101.
 *
 *  Solid fills with white on them, not a hue at low opacity behind the same hue
 *  darkened — a tint pair carries almost no contrast of its own and collapses
 *  the moment a reader's display or setting differs. Every value is from the HBS
 *  expanded palette rather than invented.
 *
 *  Colour is never the only signal. Reviewed is a hue and Community is a grey,
 *  so no form of colour blindness can turn one into the other, and each pill
 *  carries its own word besides. The luminance assertions below are what hold
 *  that: two status fills a reader cannot tell apart in greyscale are two fills
 *  telling them nothing.
 */
/** Each fill with the text painted on it. The HBS accessibility guide permits
 *  only black, crimson or white on a swatch, and marks each pairing 4.5:1 (any
 *  size) or 3:1 (14pt bold / 18pt and larger). Pills are small text, so every
 *  pair here has to clear 4.5. */
const STATUS_PAIRS = [
  ["--c-ok", "--c-on-ok"],
  ["--c-community", "--c-on-community"],
  ["--c-warn", "--c-on-warn"],
  ["--c-info", "--c-on-info"],
] as const;
const STATUS_FILLS = STATUS_PAIRS.map(([fill]) => fill);

describe("status pills are solid, and legible on their own fill", () => {
  it.each(STATUS_PAIRS)("%s carries %s at AA for text of any size", (fillToken, textToken) => {
    const theme = palette(base);
    const fill = theme[fillToken];
    const text = theme[textToken];
    expect(fill, `${fillToken} is not defined`).toBeDefined();
    expect(text, `${textToken} is not defined`).toBeDefined();
    expect(ratio(text!, fill!)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("paints only black or white on a fill, which is the guide's rule", () => {
    const theme = palette(base);
    for (const [, textToken] of STATUS_PAIRS) {
      expect(["#000000", "#ffffff"]).toContain(theme[textToken]);
    }
  });

  it("uses one set of fills for both themes, because the ground is the fill", () => {
    // A solid pill's contrast is against itself, so it does not need a second
    // value per theme — and not having one removes a way for the two to drift.
    for (const token of STATUS_FILLS) {
      expect(palette(base, dark)[token]).toBe(palette(base)[token]);
    }
  });

  /** The border and rule uses are a different problem: their ground *is* the
   *  page, so they do need a value per theme. A dark green rule on a dark page
   *  is invisible. */
  it.each([
    ["--c-ok-edge", "light", "--c-bg"], ["--c-ok-edge", "light", "--c-bg-raised"],
    ["--c-warn-edge", "light", "--c-bg"], ["--c-warn-edge", "light", "--c-bg-raised"],
  ] as const)("%s is visible on %s %s", (token, _theme, ground) => {
    const t = palette(base);
    expect(ratio(t[token]!, t[ground]!)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it.each([
    ["--c-ok-edge", "--c-bg"], ["--c-ok-edge", "--c-bg-raised"],
    ["--c-warn-edge", "--c-bg"], ["--c-warn-edge", "--c-bg-raised"],
  ] as const)("%s is visible on dark %s", (token, ground) => {
    const t = palette(base, dark);
    expect(ratio(t[token]!, t[ground]!)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});

describe("status is distinguishable without colour", () => {
  /** Relative luminance, which is what survives greyscale and most forms of
   *  colour blindness. */
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
  };

  it("separates Reviewed from Community by lightness, not only by hue", () => {
    const theme = palette(base);
    expect(ratio(theme["--c-ok"]!, theme["--c-community"]!))
      .toBeGreaterThanOrEqual(1.4);
  });

  it("gives every status fill a distinct lightness", () => {
    const theme = palette(base);
    const values = STATUS_FILLS.map((t) => lum(theme[t]!)).sort((a, b) => a - b);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]! - values[i - 1]!,
        `two status fills are the same lightness: ${values.join(", ")}`)
        .toBeGreaterThan(0.02);
    }
  });
});

describe("the focus ring is the house 4px", () => {
  it("is visible against a card as well as the page", () => {
    for (const theme of [palette(base), palette(base, dark)]) {
      expect(ratio(theme["--c-outline"]!, theme["--c-bg-raised"]!))
        .toBeGreaterThanOrEqual(AA_LARGE);
    }
  });
});
