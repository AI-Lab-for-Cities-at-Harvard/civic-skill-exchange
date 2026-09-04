# Where this site agrees with the HBS design system, and where it invented

Analysis for [#101](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/101).
Scope as asked: **form elements, badges, and warnings.** No logos, no wordmark,
no name, and the free typefaces stay.

**Ruled and built.** The eight questions below are answered in
[Rulings](#rulings) at the end, and the changes they call for have landed. The
analysis is kept as the reasoning behind them.

Two of the three areas had **no upstream component at all**, which is the
finding that shaped the work.

---

## Where the specifications actually live

`identity.hbs.edu` is the brand guide — colour, fonts, logos, grid. It carries no
component specifications. The real source is the Storybook it links to once:

- **<https://designsystem.hbs.edu>** — 737 stories across 243 components.
- `https://designsystem.hbs.edu/index.json` is the machine-readable index.
- The compiled CSS is one file, `assets/iframe-*.css`, ~560 KB, and it carries
  the real values. Everything quoted below is from it rather than from a
  screenshot or a guess.

Worth knowing for later: the eight web themes are `#F6F4F2` light, `#FFFFFF`
white, `#222222` dark, `#000000` black, `#A41034` crimson, `#E80538` red,
`#85609F` purple, `#AAC8EB` blue. The Storybook shows more (`Teal 1`, `Blue 3`,
`Orange 3`), so the theme set is wider than the brand guide admits.

## What already agrees

More than expected. Nine of our light-theme tokens are **character-for-character
identical** to `[data-theme=light]` upstream:

`--c-bg` · `--c-solid` · `--c-solid-inverse` · `--c-text` · `--c-text-link` ·
`--c-text-light` · `--c-text-lighter` · `--c-border-dark` · `--c-border-light`

The token *names* are theirs too, and so is the `data-theme` attribute
convention and the `topper` vocabulary. This site's palette was derived from
this system, faithfully, and that groundwork holds.

`--c-spot` and `--c-outline` read as differing only because ours go through
`var(--brand-accent)`. They resolve to the same `#a41034`, and the indirection is
the one-line de-identification lever `tokens.css` requires. Keep it.

## What differs, and what we invented

**One drifted token.** `--c-border` is `rgba(0,0,0,.44)` here and
`rgba(0,0,0,.34)` upstream. Ours is darker, almost certainly to clear the
contrast gate in `styles/contrast.test.ts`. That is a defensible reason but it is
not written down anywhere.

**Three tokens we do not carry.** `--c-highlight: #e80538`,
`--c-accent-dark: #85609f`, `--c-accent-light: #aac8eb`.

**Six tokens we invented, with no upstream counterpart:**

```
--c-ok / --c-ok-bg      #2c6a4a on #dfeee6     green
--c-warn / --c-warn-bg  #8a6108 on #f5ebd8     amber
--c-info / --c-info-bg  #2f5c86 on #dce9f4     blue
```

**HBS has no status palette.** No green, no amber, and no semantic
success/warning/error trio anywhere in 560 KB of CSS. That is not an oversight on
their part — a school website has no Community-versus-Reviewed distinction to
carry. We do, and it is the most load-bearing thing on a card.

These six tokens paint the tier badges, the notice borders, the tier cards, the
avoid-when marker, and the "this file is executed" marker in the file tree.

## Form elements — there is an upstream, and we differ from it

`Primitives/Forms` is real and specific.

```css
/* inputs, textareas and selects */
background: transparent;
border: none;
padding: 12px 12px 12px 0;      /* no left padding: an underline field */
font-size: 16px;                 /* fluid: calc(16px + 4 * (100vw - 300px) / 1040) */
font-family: Graphik, sans-serif;
-webkit-appearance: none;
::placeholder { color: var(--c-text-light) }

/* focus, and this is the house signature — it is on links too */
outline: 4px solid var(--c-outline);   /* #a41034 in light */
outline-offset: 1px;

/* validation, and this is all of it */
.field-error label            { color: #a41034 }
.field-error input            { border: 1px solid #a41034 !important }
```

Three things to notice.

**Fields are underlines, not boxes** — transparent background, no border, and no
left padding so the text sits flush with the label above it.

**Validation is crimson and nothing else.** No icon, no background tint, no
amber. The label turns crimson and the field gains a 1px crimson border. Note
what this means: upstream, *error* and *brand* are the same colour.

**The focus ring is 4px at 1px offset.** Ours is 2px in most places and 3px in
one. That is the single most visible disagreement on the site, and it is an
accessibility-relevant one.

## Badges — there is no upstream at all

No badge, tag, pill, or chip primitive exists. The closest things are
`Example Pages/Archive Pages/Tag Archive` and the tease components, none of which
is a status marker.

So "align the badges to HBS" is not available. The choice is whether our badges
adopt HBS's *geometry and type* while keeping colour that carries meaning, or
stop using colour to carry meaning at all.

Relevant: `border-radius: 4px` is the house radius — 30 of 55 uses, against
`50%` for circles and a handful of 3px and 5px. Ours is `--radius: 2px`.

## Warnings — the nearest upstream is a callout, not an alert

No alert, banner, or notice component either. The nearest is
`Content Components/Blocks/Text Callout`:

```css
.hbs-text-callout {
  background-color: #fff;
  border: 1px solid var(--c-border-light);
  border-radius: 4px;
  padding: 24px;
  color: #000000d9;
}
.hbs-text-callout__header {
  border-bottom: 1px solid rgba(0,0,0,.08);
  margin-bottom: 24px; padding-bottom: 24px;
  font-size: 16px; font-weight: 600; line-height: 1.55;
}
```

A neutral box with a ruled header. No colour coding, no severity, no icon —
because it is emphasis, not warning. `Primitives/Toast` exists for transient
messages and is not what our disclaimers are.

This matters for us more than it looks. The registry's disclaimers are its most
important copy: a Community listing is not an endorsement, a pass is never a
statement that a skill is safe. Rendering them as a neutral callout is closer to
upstream and arguably *more* credible than an amber alert, which reads as a
browser warning. But a neutral box is also easier to skim past.

---

## Decision questions

**1. Do we keep a status palette HBS does not have?**

Recommend **yes, but derive it rather than invent it.** Community-versus-Reviewed
is the most consequential distinction on the site and colour is what makes it
legible at a glance; removing it to match a system that never needed it would be
alignment at the cost of meaning. But the current hues are invented from
nothing. HBS publishes greens and teals in its course-topic palette (`#b3d56a`,
`#9bd6c4`) alongside purple, blue and red, and drawing the status hues from that
set makes them belong without pretending they are upstream components.

**2. The focus ring: 4px at 1px offset?**

Recommend **yes**, everywhere, replacing the 2px and 3px variants. It is the most
visible single change, it is unambiguously theirs, and a bigger focus ring is
better for keyboard users. It has to clear the contrast gate on every band.

**3. Border radius: 4px?**

Recommend **yes** — change `--radius` from 2px to 4px and leave the pill alone.
One token, and the site stops reading as slightly-sharper-than-HBS.

**4. Do form fields become underlines?**

Recommend **not yet, and possibly not at all.** Underline fields suit a
marketing form of five fields; the submission form has more than twenty,
including selects, and boxed fields are easier to scan and to associate with
their labels. Worth a deliberate divergence, written down, rather than a silent
one. The parts to take now are the fluid 16px type, the placeholder token, and
the focus ring.

**5. Does validation become crimson?**

Recommend **yes for the field-level treatment** — crimson label plus a 1px
crimson border, via `--brand-accent`, never the literal hex. Two consequences to
accept deliberately: error and brand share a colour, as they do upstream; and
`--c-warn` then stops meaning "error" and means only "caution", which is what
the tier badge and the avoid-when marker actually use it for.

**6. Do the disclaimers become neutral callouts?**

This one is genuinely open and I do not have a confident recommendation. The
upstream pattern is a neutral ruled box, which is calmer and more credible; the
current amber notice is harder to skim past, and these particular sentences are
the ones we least want skimmed past. Worth deciding on what the disclaimers are
*for* rather than on what matches.

**7. Do we adopt `--c-highlight`, `--c-accent-dark`, `--c-accent-light`?**

Recommend **only if something needs them.** Three unused tokens is three ways to
drift. They are listed here so the next person knows they exist upstream.

**8. Is the `--c-border` drift kept?**

Recommend **keep ours and write down why** — `.44` clears WCAG AA on our
backgrounds where `.34` does not, and the contrast gate is a harder constraint
than fidelity. Worth a comment in `tokens.css` beside the token, because right
now it looks like a transcription error.

---

## What this does not touch

No logo, wordmark, shield, or the name — unchanged, and `tokens.css` already
forbids them. Graphik and Tiempos stay out: they are commercially licensed and
cannot be redistributed, so Inter and Source Serif 4 continue to hold the
grotesque/serif pairing. Anywhere upstream specifies `font-family: Graphik`,
read it as "the grotesque".

De-identification stays a one-line change. Every recommendation above goes
through a token, and `--brand-accent` remains the only place `#a41034` appears.

---

## Rulings

Owner's answers, recorded here because none of these overturns a decision an ADR
is holding.

**1. Keep a status palette, and make it solid.** Not one hue at two opacities:
two contrasting colours, solid fills, from the HBS expanded palette, and legible
to a reader with colour blindness or low vision. Three things followed.

| | fill | text | ratio | why |
|---|---|---|---|---|
| Reviewed | `#026833` Green 1 | white | 6.93 | a hue |
| Community | `#D5D0CA` Gray 3 | black | 13.7 | **a grey — no colour blindness turns it into the green** |
| Caution | `#C29D00` Yellow 1 | black | 8.12 | the universal caution pair |
| Localization | `#3B2883` Blue 1 | white | 11.56 | |

*Community is grey, not amber.* It is not a warning. It means nobody has
reviewed the skill, which is honest and common, and amber would say something
about the skill that the registry does not.

*Text is black or white only.* The accessibility guide permits black, crimson or
white on a swatch and nothing else, marking each pairing 4.5:1 (any size) or
3:1 (14pt bold / 18pt and larger). Pills are small text, so every pair clears
4.5. `#AE6429` with white came to 4.51 — one hundredth over the line — and was
dropped for the yellow at 8.12 rather than shipped on it.

*Lightness carries it too.* The four fills differ in luminance by 0.06, 0.25 and
0.28, so they separate in greyscale as well as in hue, and each pill carries its
own word besides. `styles/contrast.test.ts` asserts every part of this.

The fills are theme-independent, because a solid pill's ground is itself. Only
the rule and border uses vary by theme — `--c-ok-edge`, `--c-warn-edge` — since
a dark green rule on a dark page is invisible.

**2. The 4px focus ring at 1px offset**, everywhere, replacing the 2px and 3px
variants. Held to 3:1 against the page *and* a card, in both themes.

**3. `--radius` 2px → 4px.** The house radius.

**4. Underline form fields — against this spike's recommendation.** Chosen for
consistency, accepting that boxes scan more easily on a form this long.
Transparent ground, a rule beneath, no left padding, placeholder on
`--c-text-light`; the select keeps its native arrow. Reverting is one CSS block,
and the code says so.

**5. Validation is crimson**, through `--c-spot`, never the literal hex. The
label turns crimson and the control's rule thickens to 2px. Error and brand
therefore share a colour, as upstream, and `--c-warn` goes back to meaning
caution rather than error.

**6. Disclaimers are a distinct box, italic at a lighter weight** — the question
this spike had no recommendation on. Not a coloured alert: the nearest thing
upstream is a neutral ruled panel, and an amber alert reads as a browser warning
rather than as the registry being careful. Italic at weight 300 sets them apart
without hue, so they stay set apart with no colour at all. An error notice keeps
upright type, being the one notice that is not a caveat.

**7. `--c-highlight`, `--c-accent-dark`, `--c-accent-light`: only when needed.**
Not added.

**8. `--c-border` stays at `.44`.** Darker than the `.34` upstream because `.34`
does not clear 3:1 against our grounds, and the contrast gate is a harder
constraint than fidelity. Now said beside the token.

### Still open

None of the eight. Two things nobody asked about: the wider theme set the
Storybook shows (`Teal 1`, `Blue 3`, `Orange 3`) against the eight the brand
guide admits, and the fluid type scale
`calc(16px + 4 * (100vw - 300px) / 1040)`, which this site does not use.
