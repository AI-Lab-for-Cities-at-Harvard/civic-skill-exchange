/** Layout primitives (#316, ADR 0007), after "Every Layout".
 *
 *  A primitive owns the space between its children and nothing else: a child
 *  never brings its own margin into one. The gap is a step of the scale, and
 *  the type says which steps exist, so `gap="7"` or `gap="13px"` does not
 *  compile. Their CSS is styles/layout.css, in a cascade layer above app.css.
 *
 *  Two only, until a page being migrated needs a third (ADR 0007, decision 1).
 */

import type { ElementType, HTMLAttributes } from "react";

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
