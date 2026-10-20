# ADR 0007 — Layout primitives over the existing tokens

**Status:** accepted, 2026-10-20
**Analysis:** [spikes/a-better-way-to-manage-spacing.md](../spikes/a-better-way-to-manage-spacing.md)
**Rulings:** [#310](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/issues/310), all eight recommendations accepted

## Context

- **What prompted it.** After the spacing audit (#287, #308), the owner asked whether hand-writing spacing in CSS is the wrong approach, and whether Tailwind or another framework would manage spacing and alignment better.
- **What the spike measured.** It rebuilt one real section, the numbered steps, with Tailwind CSS v4 and with hand-written layout primitives. It measured component libraries separately.
- **What it found:**
  - Both approaches produced the same pixels, fixed a right-to-left bug, and passed axe in light and dark, LTR and RTL.
  - Each added under 0.5 kB to the entry chunk.
  - Tailwind brought two dependencies and 35 lockfile entries. The primitives brought none.
  - The lightest component library, Mantine, adds about 46 kB, against a size gate with about 8 kB of headroom. Its controls also contradict the rulings of the HBS design-system spike (#101).

## Decision

**1. Hand-written layout primitives over the existing tokens. No CSS framework, and no component library.**
- `Stack` and `Cluster` to start. Others (`Grid`, `Sidebar`, `Center`) only when a page being migrated needs one.
- **Their `gap` takes only a value from the token scale,** so spacing off the scale fails the type check.

**2. CSS layers end the specificity fights.** `@layer legacy, layout`: `tokens.css` and `app.css` go in `legacy`, and the primitives in `layout`. The foundation lands first, as one small PR with the numbered steps as its first user (#316).

**3. One page per PR, each deleting the rules it replaces,** and converting that page's physical `left`/`right` to logical properties as it goes:
1. the numbered steps (#316);
2. the submit page, with #309;
3. the plugin submit page (#317);
4. the skill and plugin pages (#318);
5. browse (#319);
6. About (#320);
7. the guide (#321).

**4. #308's rhythm block stays.**
- **The division of labour:** the rhythm block spaces sections and headings, primitives space the parts within a section, and component CSS keeps a component's own padding.
- **One edit as pages migrate:** a rhythm entry is removed only where a primitive makes it redundant.

**5. #309 is built on the primitives,** as migration step 2.

**6. Four guards against regression:**
1. the `Space` type;
2. `layout.test.tsx`, which checks for tokens only, every step present and the layer order;
3. `rhythm.test.tsx`, unchanged;
4. a new ratchet: the counts of `app.css` rules that set spacing (148 at the start) and of physical `left`/`right` declarations (19) may only go down.

A real-browser layout check stays a spike tool until a regression gets past these four.

**7. Tailwind was the close second.** If this is ever revisited, the conditions the spike lists are the starting point: exact-pinned dev dependencies, only our tokens in `@theme`, the `tw:` prefix, no preflight, and no per-element focus-ring overrides.

**8. No component libraries.**

## Consequences

- **No new runtime or build dependency.** The design-system tokens and the #101 rulings stay as they are.
- **Spacing within a section** moves from hand-written margins to typed components, one page at a time. The ratchet makes the migration visible and one-way.
- **Contributors** learn two components and a scale, not a framework.

## When to revisit

- If several pages need primitives beyond `Stack` and `Cluster`, and hand-writing them starts to cost more than adopting a library would.
- If the size gate is relaxed enough that a component library's controls are worth their weight, and they can meet the #101 rulings.
- If a layout regression gets past all four guards.
