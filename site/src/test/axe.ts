/** axe, wired for this suite.
 *
 *  Run against rendered components rather than a live page, so a violation
 *  fails the build on the pull request that introduced it. jsdom cannot lay
 *  anything out, so the rules that need geometry — colour contrast above all —
 *  return "incomplete" here and are covered separately by contrast.test.ts,
 *  which computes the ratios from the tokens themselves.
 */

import axe from "axe-core";

/** A violation, flattened into something a failure message can print. */
export interface Violation {
  id: string;
  impact: string;
  help: string;
  nodes: string[];
}

export async function findViolations(container: Element): Promise<Violation[]> {
  const results = await axe.run(container, {
    // Geometry-dependent rules cannot pass or fail meaningfully in jsdom.
    // Leaving them on would produce noise that trains people to ignore this.
    rules: { "color-contrast": { enabled: false } },
    resultTypes: ["violations"],
  });
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? "unknown",
    help: v.help,
    nodes: v.nodes.map((n) => n.html),
  }));
}

export function describeViolations(violations: Violation[]): string {
  return violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.join("\n    ")}`)
    .join("\n");
}
