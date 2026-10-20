# A better way to manage spacing and alignment

**Issue:** [#310](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/310)
**Status:** ruled 2026-10-20, all eight recommendations accepted; see [ADR 0007](../adr/0007-layout-primitives-over-the-existing-tokens.md) and the rulings at the end. Written against `65a78ca` (main, with #308 merged). The two proofs are local branches, measured and never pushed.

## The question

The owner, on 2026-10-20: hand-written spacing seems like the wrong approach. Should the site use Tailwind CSS, or another framework?

One fact changed while this was being written. The brief said #308 was on hold. It merged as `9958d3a`, and its site tree is the same as the reviewed branch. So its bug fixes and its rhythm tests are already on main. The question is no longer whether to land them. It is what each option does with them.

## What is true now

The numbers are counted from `site/src/styles/app.css` and `site/src/components/` at `65a78ca`.

| | count |
|---|---|
| Lines in `app.css` | 988 |
| Style rules | 278 |
| Rules that set any margin, padding or gap | 148 |
| Spacing declarations | 203 |
| …of which with a bare length rather than a token | 15, nearly all a pill's or badge's own padding in `em` |
| Rules that make a flex or grid container | 44 |
| Physical `left`/`right` declarations (margin, padding, border, inset) | 19 |
| `!important` | 8 |
| `className` attributes in components | 475, across 21 files |
| Distinct class names in markup | 163 |
| Inline `style={{…}}` | 0 |

**#308 fixed the drift, and put a test on it.** Section and heading spacing now comes from one rhythm block at the end of `app.css`, through two role tokens, `--space-section` and `--space-subsection`. `styles/rhythm.test.tsx` checks six things:
- no rule outside that block gives a section or heading vertical space;
- the block uses no bare lengths;
- `app.css` names no undefined token;
- no bare class is laid out twice;
- no component sets inline spacing;
- About's steps use the step markup.

The undefined `--space-xs` and `--s-2`, the duplicate `.steps` rule, the clipped code blocks and the guide's heading flush against the hero are all gone.

**What #308 left: the cause of the drift.** Every bug in its audit had one cause. A margin came from whichever rule won on specificity, not from the component that owned the element. `.prose p` (0,1,1) outranks `.steps__body` (0,1,0). So a paragraph inside a step took `.prose p`'s `margin-bottom: 1rem` and ignored its own `0.75rem`.

The first run of this spike was against `ff58c33`, before #308, and it measured exactly that. Inside a hand-off step, the gaps between parts were 8, 0, 0 and **−5 px**: a link-button overlapped the line above it. #308 fixed this with a stronger selector, `.steps .steps__item > *`. That fixes this component. It does not stop the next one. Any approach that is better than hand-written CSS has to remove this cause, and every option below does it the same way: **cascade layers**.

**Right-to-left is broken, and nobody can see it.** The site has no RTL locale (en and es). The step marker, though, is drawn with `left: 0` and the text is indented with `padding-left`. With `dir="rtl"`, the measured text indent is 0 and the marker sits on the wrong side, over the text. The same pattern recurs 19 times.

## The options

### (a) Tailwind CSS v4, on the existing tokens

```css
/* styles/index.css */
@layer theme, legacy, utilities;
@import "./tokens.css" layer(legacy);
@import "./app.css" layer(legacy);
@import "tailwindcss/theme.css" layer(theme) prefix(tw);
@import "tailwindcss/utilities.css" layer(utilities) source(none) prefix(tw);
@source "../components";

@theme inline {
  --*: initial;                         /* no default palette, no spacing multiplier */
  --spacing-3: var(--gap-3);
  --spacing-5: var(--gap-5);
  --spacing-step: calc(var(--gap-6) + var(--gap-4));
  /* … the rest of the scale */
}
```

```tsx
<ol className="steps tw:my-5 tw:p-0 tw:grid tw:gap-5">
  <li className="steps__item tw:flex tw:flex-col tw:gap-3 tw:ps-step tw:*:m-0">
```

Spacing and alignment are utilities in the markup. The tokens map in through `@theme inline`, so a utility emits `gap: var(--gap-3)` and the value still changes with `data-theme`.

Optionally, a few layout components could wrap common utility sets. The proof did not need any.

### (b) Hand-written layout primitives, after Every Layout

The pattern is from Heydon Pickering and Andy Bell's *Every Layout*.

```tsx
// components/Layout.tsx
export type Space = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "sm" | "md" | "lg" | "xl";
export function Stack({ as: Tag = "div", gap = "4", className, ...rest }: Props) {
  return <Tag className={cx("l-stack", `l-gap-${gap}`, className)} {...rest} />;
}
```

```css
/* styles/layout.css, in @layer layout, above @layer legacy */
.l-stack { display: flex; flex-direction: column; }
.l-stack > * { margin-block: 0; }
.l-cluster { display: flex; flex-wrap: wrap; align-items: center; }
.l-gap-3 { gap: var(--gap-3); }
```

```tsx
<Stack as="ol" gap="5" className="steps">
  <Stack as="li" gap="3" className="steps__item">
    <h3 className="steps__title">…</h3>
    <Cluster><a className="btn" href={uploadHref}>…</a></Cluster>
```

A primitive owns the space between its children, and nothing else does. The gap is a typed step of the scale, so `gap="7"` does not compile. The proof checked this: TS2322. Sidebar, Center, Grid and Switcher follow the same pattern, when a page needs one.

### (c) A component library: Mantine is the most plausible

Three were measured: Radix Themes, Mantine and Chakra UI. Each was installed in a scratch directory, and esbuild bundled the provider plus a stack and a row, minified, against a React-only baseline.

| | version, released | JS added | as a share of today's entry chunk | transitive packages | npm maintainers |
|---|---|---|---|---|---|
| Mantine `@mantine/core` | 9.7.3, 2026-10-17 | +45.7 kB (+13.5 kB gzip) | +10.2% | 20 | 1 |
| Radix Themes | 3.3.0, 2026-01-31 (previous: 3.2.1, 2025-02-27) | +73.0 kB (+24.7 kB gzip) | +16.4% | 68 | 4 |
| Chakra UI | 3.37.0, 2026-08-28 | +273.3 kB (+69.1 kB gzip), Emotion runtime | +61.2% | 97 | 2 |

Mantine is the plausible one for four reasons:
- it is actively released;
- its JS cost is the smallest of the three;
- its CSS is plain files with a cascade-layer build, `styles.layer.css`, and can be imported per component (`Stack.css` is 208 B);
- its spacing scale (`xs`–`xl`) maps onto our tokens in its theme object.

```tsx
<MantineProvider theme={{ spacing: { xs: "var(--gap-2)", sm: "var(--gap-3)", md: "var(--gap-5)" } }}>
  <Stack gap="sm"><Group>…</Group></Stack>
</MantineProvider>
```

Radix Themes has slowed: eleven months between its last two releases, and its `layout.css` alone is 246 kB unminified. Chakra carries a CSS-in-JS runtime.

### (d) Other credible options, briefly

- **Open Props** 1.7.23. A token set, not a way of laying out. The site already has tokens, derived from HBS. Adding a second scale beside them is the drift this issue is about.
- **Panda CSS** 2.3.0. Zero-runtime CSS-in-JS. Its `strictTokens` makes an off-scale value a type error, which is the strongest enforcement of any option. The cost is a code-generation step (`styled-system/`), a PostCSS pipeline, and rewriting styles into its object syntax.
- **vanilla-extract** 1.21.3. Styles are authored in TypeScript, and `sprinkles` gives typed atomic properties restricted to our tokens. Strong enforcement, but every stylesheet becomes a `.css.ts` file.
- **stylelint** with `stylelint-declaration-strict-value`. Not a layout method: a lint that rejects a bare length in hand-written CSS. `rhythm.test.tsx` already does this for the rhythm block with no dependency.

### How they compare

| | (a) Tailwind | (b) primitives | (c) Mantine | (d) Panda / vanilla-extract |
|---|---|---|---|---|
| **JS entry chunk** | +168 B, measured | +452 B, measured | +45.7 kB, over the gate on day one | about 0 at runtime (codegen) |
| **CSS** | +189 B, measured; grows with each distinct utility | +311 B, measured; fixed cost | up to 295 kB unminified for all of it, or per component | per use |
| **Accessibility** | Neutral. Keep the house focus ring and forbid `outline-*`/`ring-*` utilities | Neutral | Brings its own focus ring and form controls, against #101 rulings 2, 4 and 5 | Neutral |
| **Light and dark** | Works through the tokens. Never use the `dark:` variant: it defaults to `prefers-color-scheme`, which disagrees with the site's own toggle | Works through the tokens | A second colour-scheme system (`data-mantine-color-scheme`) beside `data-theme` | Works through the tokens |
| **Logical properties and RTL** | `ps-`, `ms-`, `start-` exist. A test can forbid `pl-`/`ml-` | Our own CSS: `margin-block`, `padding-inline-start` | Its own CSS; not checked | Our own CSS |
| **How the HBS tokens map in** | `@theme inline` names our tokens; `--*: initial` removes Tailwind's | Used directly | Spacing maps. Colours expect 10-shade palettes, and the scoped `[data-theme=crimson]` bands do not fit | Imported as a typed theme |
| **"Only from the scale" enforced by** | A source-scanning test, because Tailwind fails open (see below) | The TypeScript type, plus a CSS test | The theme object; arbitrary values are still props | The type checker |
| **Migration** | Spacing moves into markup: the 148 spacing rules, and most of the 475 `className`s | The 44 containers become primitives; the margins under them go | Every component's markup and theme | Every stylesheet rewritten |
| **Lock-in** | Medium. A class vocabulary in every component; v3 to v4 moved the configuration from JavaScript into CSS | None. About 60 lines we own | High | High |
| **One page at a time** | Yes, with layers and a prefix | Yes, with layers | Partly: provider and global CSS at the root | Yes, with the toolchain installed first |
| **Dependencies** | 2 dev, 35 lockfile entries (below) | 0 | 20 transitive, runtime | Codegen toolchain, dev |

## The proof

**The section.** The numbered steps: the submit page's hand-off (`UploadSteps.tsx`, also used by the plugin form), and About's by-hand steps. #308 made the two share the `.steps` markup, so the one component has two call sites. Each branch moved the steps' spacing out of `app.css`. The counter and its drawing stayed behind as component CSS. Each branch also made the marker and indent logical.

**The branches.** Both are local and unmerged, and both are built on `65a78ca`:

- **`spike/310-tailwind`** (`bf35a2e`):
  - `tailwindcss` 4.3.3 and `@tailwindcss/vite` 4.3.3, exact pins, dev-only;
  - `styles/index.css` as above;
  - `components/steps.ts`, holding the two class strings both call sites use;
  - `styles/scale.test.ts`.
- **`spike/310-primitives`** (`d787969`):
  - `components/Layout.tsx` (Stack, Cluster);
  - `styles/layout.css`;
  - `styles/index.css`, which declares the layers;
  - `styles/layout.test.tsx`.

The first run is kept for its gap measurement against pre-#308 main: `spike/310-tailwind-ff58c33` (`959296a`) and `spike/310-primitives-ff58c33` (`cb86884`), both on `ff58c33`.

**How it was checked.**
- `npm ci`, then `npm run build --workspaces --if-present` and the whole vitest suite on each branch, including:
  - the jsdom axe suites (`a11y.test.tsx`, `App.a11y.test.tsx`) in both locales;
  - `contrast.test.ts`, `responsive.test.ts` and #308's `rhythm.test.tsx`.
- jsdom cannot lay anything out, so the steps' markup was also rendered from each branch's own component into a page with that branch's built CSS. Headless Chromium then measured every gap and ran axe with colour contrast on. That made eight configurations per branch: 1280 and 375 px wide, light and dark, LTR and RTL.

The harness was scratch and not committed. It used Playwright 1.56.1 outside the repository.

| | main `65a78ca` | Tailwind | Primitives |
|---|---|---|---|
| **Size line** | `index-CEXbKpWG.js 435.8 kB — baseline 430.6 kB, +1.2%, limit 443.6 kB` | `index-BL-bn6K2.js 436.0 kB — baseline 430.6 kB, +1.2%, limit 443.6 kB` | `index-CZnNXx7w.js 436.2 kB — baseline 430.6 kB, +1.3%, limit 443.6 kB` |
| **Entry chunk, bytes** | 446,264 | 446,432 (+168) | 446,716 (+452) |
| **CSS, bytes** | 27,929 | 28,118 (+189) | 28,240 (+311) |
| **CSS, gzip -9** | 5,652 | 5,794 (+142) | 5,753 (+101) |
| **Lines changed, without the lockfile** | | +131 / −30, 9 files | +173 / −50, 8 files |
| …one-time foundation | | +103 / −3 | +121 / −2 |
| …the section itself | | +28 / −27 | +52 / −48 |
| **Lockfile** | | +619 / −48 | unchanged |
| **Vitest** | 1504 pass | 1509 pass (+5 scale tests) | 1509 pass (+5 layout tests) |
| **jsdom axe suites** | pass | pass | pass |
| **Real-browser axe, 8 configurations** | 1 finding, the harness page's missing `h1` | the same | the same |
| **Gaps between steps / inside a step** | 24 / 12 px | identical | identical |
| **RTL text indent; marker side** | 0 px; wrong side, over the text | 48 px; correct | 48 px; correct |

In LTR, both proofs are pixel-identical to main in every measured value. Both fix RTL. Both stay well inside the size gate, which has about 7.9 kB of headroom today.

## What the proof found

**Tailwind fails open, twice.**
- A utility naming a step the theme does not have produces no CSS and no warning. `tw:gap-7` was built and grepped for: nothing.
- An arbitrary value, `tw:pl-[13px]`, is always legal.

So "spacing only from the scale" needs a source-scanning test. The proof's `scale.test.ts` checks that:
- Tailwind's default theme is reset;
- no utility takes `[…]`;
- every spacing utility names a key the theme defines;
- no utility uses a physical side.

Both mutations above turned it red.

**Unprefixed, the scanner wrote CSS nobody asked for.** Before the prefix, the build emitted `.grid`, `.table`, `.contents`, `.container`, `.fixed`, `.visible`, `.collapse` and a `.filter` with thirteen `@property` rules. It took them from words in the code (`.filter(`, `visible`), and one of them, `.grid`, is the site's own class. The prefix `tw:` and `source(none)` plus `@source "../components"` brought the cost of the setup alone to +111 B of CSS (measured in the first run). Without the second change, the i18n copy is scanned too.

**Tailwind's supply chain** (all checked on npm):
- 35 new lockfile entries: 12 packages, and 23 optional platform builds of two native binaries. One is the Rust `@tailwindcss/oxide`. The other is a second copy of `lightningcss` (1.32.0, pinned by `@tailwindcss/node`, beside Vite's 1.33.0).
- No install scripts.
- MIT, with `lightningcss` under MPL-2.0, which is already in the tree through Vite.
- npm provenance attestations (SLSA v1) on both packages.
- Three npm maintainers. 4.3.3 was released on 2026-07-16.
- Everything is build-time; the browser gets only the generated CSS.
- The npm Dependabot group in `.github/dependabot.yml` would carry its updates. Actions pinning in `tests/test_workflows.py` is not affected.

**Both proofs needed the same foundation.** Neither option works one page at a time without first putting `app.css` in a lower cascade layer. Without it, `.prose p` beats a utility and a stack's reset alike.

That one move is most of what makes either option better than today. It turns "whichever selector is most specific" into "the layout layer decides".

**Primitives cost more lines per section; Tailwind costs more per page.** In this section, wrapping each button in a `<Cluster>` and the re-indentation made the primitives diff about twice Tailwind's. Across a page, the balance turns:
- a primitive replaces a container and the margins of everything in it;
- utilities have to be written on every element that had spacing.

**Tailwind and #308 pull in opposite directions.** #308's ruling, now on main, is that a page's rhythm is decided in one place, where the next reader will find it. Utilities put that decision on each element. Under (a), the rhythm block either stays, which leaves two systems, or is spread back across the markup #308 just took it out of.

Primitives sit beside it without conflict. The rhythm block spaces sections; a primitive spaces the parts inside one; component CSS keeps a component's own padding. The proof removed `.steps__title { margin: 0 }` from the rhythm block, because a stack now does it, and `rhythm.test.tsx` still passed unchanged.

## Recommendations

**1. The choice.** Recommend **(b), hand-written layout primitives over the existing tokens, with no framework.** The proof shows it does everything (a) does for this site:
- the same pixels;
- RTL fixed;
- the scale enforced, by the type checker rather than by a scanning test;
- one page at a time.

It also adds no dependency, keeps #308's single rhythm block meaningful, and leaves the #101 token rulings untouched.

Tailwind is the close second. It is the right answer if the owner wants a framework for its own sake, as a shared vocabulary for future contributors. If so, build it exactly as the proof did, under recommendation 7. Component libraries are not recommended (recommendation 8).

**2. The foundation, first, as one small PR.** Recommend:
- `styles/index.css` declaring `@layer legacy, layout`, with `tokens.css` and `app.css` imported into `legacy`;
- `Layout.tsx` with `Stack` and `Cluster` only;
- `layout.css` and `layout.test.tsx`;
- the numbered steps as the first user.

That is the `spike/310-primitives` branch, rebuilt test-first. Add `Grid`, `Sidebar`, `Center` or `Switcher` only when a page in the migration needs one. Do not build them ahead.

**3. The migration order.** Recommend one page per PR, each deleting the rules it replaces:
1. the numbered steps, in the foundation PR;
2. the submit page, together with #309;
3. the plugin submit page;
4. the skill and plugin pages' sections and asides;
5. browse: facets, cards, the results grid;
6. About;
7. the guide.

Convert each page's physical `left`/`right` declarations to logical properties in the same PR, rather than as a separate sweep. RTL is not a goal in its own right while the locales are en and es, but it is free when the line is being touched anyway.

**4. #308's bug fixes and rhythm tests.** #308 is already merged. Recommend **keeping all of it**, and stating the division of labour in the rhythm block's comment:
- the rhythm block spaces sections and headings;
- primitives space the parts within a section;
- component CSS keeps a component's own padding.

Its tests stay as they are, and the proof shows they pass. One edit as pages migrate: remove a rhythm-block entry once a primitive has made it redundant, as the proof did for `.steps__title`.

**5. #309: compact submit header, primary button on every step.** Recommend building #309 **on the primitives, as migration step 2**, after the foundation PR, rather than with more hand-written margins:
- the compact header is a `Cluster`;
- "a primary button on every step" is each step's action `Cluster` holding one `.btn--strong`, which #309's own test can assert.

If #309 is wanted before the foundation lands, it can go first. The foundation PR then migrates whatever #309 added.

**6. How the regression test changes.** Recommend four layers:
1. **The type.** `gap` takes only a `Space`, so an off-scale step fails `tsc`.
2. **`layout.test.tsx`.** Checks that `layout.css` uses only defined tokens and no bare lengths, that it has a class for every step, and that the layer order holds.
3. **`rhythm.test.tsx`**, unchanged.
4. **A ratchet, new.** Like the size baseline: the count of `app.css` rules that set spacing (148 today) and of physical `left`/`right` declarations (19) may only go down. Each migration PR lowers the recorded numbers, and nothing can quietly add a margin back.

A real-browser layout check, like this spike's harness, would catch what jsdom cannot. It would also add Playwright and a browser download to CI. Recommend **not now**: keep it as a spike tool, and decide if a layout regression gets past the four checks above.

**7. If the owner prefers Tailwind instead.** Recommend these conditions, all from the proof:
- `tailwindcss` and `@tailwindcss/vite` as exact-pinned dev dependencies;
- `@theme inline { --*: initial; … }` naming only our tokens;
- the `tw:` prefix;
- `source(none)` and `@source "../components"`;
- `app.css` in a layer below utilities;
- no preflight;
- no `dark:` variant;
- `scale.test.ts` extended to forbid `outline-*` and `ring-*`, so the 4px focus ring of #101 ruling 2 cannot be overridden per element;
- an explicit ruling on #308's rhythm block: kept as the one exception to utilities, or dissolved into them.

**8. Component libraries: no.** Recommend against all three:
- the lightest, Mantine, adds about 45.7 kB to an entry chunk with about 7.9 kB of headroom under the gate;
- its controls and focus ring contradict #101's rulings on underline fields, crimson validation and the 4px ring;
- its colour-scheme system would run beside `data-theme`.

Using only its layout components would be a heavy way to get `Stack`.

## What this could not verify

- **The real pages.** The browser measurements were made on the steps rendered into a stand-in page, not on the deployed submit or About page. Nothing was deployed or previewed.
- **Component-library numbers.** They come from esbuild in a scratch directory, not from this site's Vite build. They are an order of magnitude, not a gate reading.
- **Tailwind's browser support.** Its stated floor (Safari 16.4, Chrome 111, Firefox 128) is from its documentation, not tested. The proof's generated CSS used only `@layer`, `:is()` and logical properties.
- **Migration counts.** They are counted by regex over the stylesheet and components. They estimate the scope; they are not an inventory.
- **#309.** Its scope was read from the brief, not from the issue: there was no `gh` in this session.
- **A list-semantics question, noticed in passing and outside this issue.** Safari is reported to drop list semantics from a list with `list-style: none`. The `.steps` comment relies on "3 of 4" being announced. Not checked here.

## Rulings (owner, 2026-10-20)

All eight recommendations were accepted as written: hand-written `Stack` and `Cluster` primitives over the existing tokens, with no framework and no component library. [ADR 0007](../adr/0007-layout-primitives-over-the-existing-tokens.md) records them.

| Step | Issue |
|---|---|
| Foundation: layers, primitives, ratchet, the numbered steps | #316 |
| Submit page, with the compact header and a primary button on every step | #309 |
| Plugin submit page | #317 |
| Skill and plugin pages | #318 |
| Browse | #319 |
| About | #320 |
| Guide | #321 |

