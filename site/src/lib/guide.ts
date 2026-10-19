/** The guide's structure (#258): which tasks and products it has, the words
 *  its glossary defines, the commands it shows, and when it was checked. Ids
 *  and commands only; the words are in the strings table. Apart from the
 *  component, so the page file exports nothing but the page. */

import type { Strings } from "../i18n/strings";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
const MARKETPLACE = "civic-skill-exchange";
export const SECURITY = `https://github.com/${REPO}/blob/main/docs/SECURITY.md`;

/** When every step on this page was last checked against the product it
 *  describes. One record, so a recheck is a one-line change (#224, ruling 4d
 *  on its design note). */
export const CHECKED_ON = "2026-10-18";

export type G = Strings["guide"];
export type Task = "install" | "marketplace";
export type Product = keyof G["install"]["products"] | keyof G["marketplace"]["products"];

/** The tasks and, inside each, the products — by task rather than by product
 *  (#224, ruling 2). Ids only: they are route slugs and element ids, so they
 *  do not translate; the words come off the table keyed by them. */
export const TASKS: { id: Task; products: { id: Product; anchor: string }[] }[] = [
  {
    id: "install",
    products: [
      { id: "claude", anchor: "claude" },
      { id: "claudeCode", anchor: "claude-code" },
      { id: "chatgpt", anchor: "chatgpt" },
      { id: "gemini", anchor: "gemini" },
      { id: "codex", anchor: "codex" },
    ],
  },
  {
    id: "marketplace",
    products: [
      { id: "claudeCode", anchor: "marketplace-claude-code" },
      { id: "codex", anchor: "marketplace-codex" },
    ],
  },
];

/** The GitHub words, in the order somebody meets them sharing a skill. */
export const GLOSSARY = ["fork", "branch", "commit", "pullRequest", "review"] as const;
export const glossaryAnchor = (word: string) =>
  `glossary-${word.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** Commands are what a reader types, so they are the same in every locale and
 *  live here rather than in the strings. */
export const COMMANDS: Partial<Record<`${Task}.${Product}`, string[]>> = {
  "install.claudeCode": [
    `/plugin marketplace add ${REPO} --sparse .claude-plugin skills plugins`,
    `/plugin install {namespace}-{skill-name}@${MARKETPLACE}`,
  ],
  "marketplace.claudeCode": [
    `/plugin marketplace add ${REPO} --sparse .claude-plugin skills plugins`,
    `/plugin install {namespace}-{name}@${MARKETPLACE}`,
  ],
  "marketplace.codex": [
    `codex plugin marketplace add ${REPO}`,
    `codex plugin add {namespace}-{plugin-name}@${MARKETPLACE}`,
  ],
};

/** Every element id a link may name, for the route and the tests. */
export const GUIDE_SECTIONS: string[] = [
  ...TASKS.flatMap((t) => [t.id, ...t.products.map((p) => p.anchor)]),
  "safety", "share", "glossary",
  ...GLOSSARY.map(glossaryAnchor),
];
