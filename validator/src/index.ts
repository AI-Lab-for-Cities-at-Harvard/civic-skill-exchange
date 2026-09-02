export * from "./rules";
export * from "./types";

// Structural rules, minus the filesystem. structure.ts itself stays out — it
// imports node:fs, and re-exporting it here would drag that into every
// consumer, including the browser.
//
// Enforced by validator/src/purity.test.ts, which reads the source. The
// obvious mechanism — the site's tsc having no node lib — does not work: an
// explicit `import from "node:fs"` still resolves through the hoisted
// @types/node and compiles cleanly.
export * from "./structure-core";
export * from "./yaml-safety";

export { checkChangedLayout } from "./layout";

// The pull request comment. Exported so .github/workflows/report.yml and the
// local check in cli/check.ts render from one implementation rather than two
// that drift (#8).
export * from "./report";
