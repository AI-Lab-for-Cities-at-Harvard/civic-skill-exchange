/** Layout primitives (#316, ADR 0007), after "Every Layout".
 *
 *  A primitive owns the space between its children and nothing else: a child
 *  never brings its own margin into one. The gap is a step of the scale, and
 *  the type says which steps exist, so `gap="7"` or `gap="13px"` does not
 *  compile. Their CSS is styles/layout.css, in a cascade layer above app.css.
 *
 *  Stack and Cluster, and Grid, which About (#320) needed: three auto-fit
 *  tables of equal columns that a Cluster cannot make (its last row stretches).
 *  Another only when a page being migrated needs one (ADR 0007, decision 1).
 */

import type { CSSProperties, ElementType, HTMLAttributes } from "react";

/** The scale in tokens.css: --gap-1 … --gap-6, then the HBS block spacing. */
export type Space = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "sm" | "md" | "lg" | "xl";

/** How a Cluster's children sit on the cross axis (CSS `align-items`). */
export type Align = "start" | "center" | "end" | "stretch" | "baseline";

type Props = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  gap?: Space;
};

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

/** Children in a column, spaced by the gap alone. */
export function Stack({ as: Tag = "div", gap = "4", className, ...rest }: Props) {
  return <Tag className={cx("l-stack", `l-gap-${gap}`, className)} {...rest} />;
}

/** Children in a row that wraps — buttons, badges, a line of links. Each keeps
 *  its own width, so a button in a stack sits in one of these. */
export function Cluster(
  { as: Tag = "div", gap = "3", align = "center", className, ...rest }: Props & { align?: Align },
) {
  return <Tag className={cx("l-cluster", `l-gap-${gap}`, `l-align-${align}`, className)} {...rest} />;
}

/** Equal columns as many as fit: each at least `min`, sharing the row, and a
 *  last row that is short leaves its cells their column's width instead of
 *  stretching them (which a wrapping Cluster would). `min` is a measure, not a
 *  space, so it is a length in rem rather than a step of the scale; it is the
 *  only inline style a primitive sets, and only as a custom property. `rowGap`,
 *  when the rows are to sit closer (or further) than the columns do, is a step
 *  of the same scale. */
export function Grid(
  { as: Tag = "div", gap = "4", rowGap, min, className, style, ...rest }:
    Props & { min: `${number}rem`; rowGap?: Space },
) {
  return (
    <Tag className={cx("l-grid", `l-gap-${gap}`, rowGap && `l-row-gap-${rowGap}`, className)}
      style={{ ...style, "--l-grid-min": min } as CSSProperties} {...rest} />
  );
}
