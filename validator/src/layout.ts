/** Where a SKILL.md may live.
 *
 *  A file named SKILL.md is a submission wherever it sits, and the registry
 *  only reads `skills/{namespace}/{name}/SKILL.md`. Three attempts landed one at
 *  the repository root instead, and every one passed CI — because the gate that
 *  would have caught it was itself conditioned on the submission being in the
 *  right place (#85).
 *
 *  So this takes the raw changed-path list rather than a discovered skill
 *  directory. Nothing about it depends on the submission being well-formed,
 *  which is the point.
 */

import { DOC_DIRECTORIES } from "./structure-core";
import type { Finding } from "./types";

const finding = (where: string, message: string): Finding => ({ where, message });

/** `skills/{namespace}/{name}/SKILL.md`, and nothing else at the top level of a
 *  skill. Two path segments under `skills/`, no more and no fewer. */
const CORRECT = /^skills\/[^/]+\/[^/]+\/SKILL\.md$/;

/** A SKILL.md that is documentation rather than a skill.
 *
 *  A skill about writing skills legitimately ships an example or a template, and
 *  this registry's own domain makes that likely rather than hypothetical — see
 *  #78. `references/` and `assets/` are where the Agent Skills specification puts
 *  documentation and templates, and no client loads a skill from either.
 */
const EXEMPT = new RegExp(
  `^skills/[^/]+/[^/]+/(${DOC_DIRECTORIES.join("|")})/.*SKILL\\.md$`);

const isSkillFile = (path: string) =>
  path === "SKILL.md" || path.endsWith("/SKILL.md");

/**
 * Check a list of changed paths for a SKILL.md in a place nothing reads.
 *
 * Paths are repository-relative and POSIX-separated, as `git diff --name-only`
 * emits them. Deleted paths should not be passed — a removal is not a
 * misplacement.
 */
export function checkChangedLayout(paths: string[]): Finding[] {
  const findings: Finding[] = [];

  for (const path of paths) {
    const clean = path.trim();
    if (!clean || !isSkillFile(clean)) continue;
    if (CORRECT.test(clean) || EXEMPT.test(clean)) continue;

    const suggestion = clean.includes("/")
      ? clean.slice(0, clean.lastIndexOf("/"))
      : "your-skill";
    findings.push(finding(clean,
      `a skill must live at skills/{your-github-username}/{skill-name}/SKILL.md. ` +
      `This one is at ${clean}, so nothing in the registry reads it — the index ` +
      `and the checks both look under skills/ only. Move ${suggestion} into ` +
      `skills/{your-github-username}/.`));
  }

  return findings;
}

/**
 * Two namespaces in the same changed-file list that agree once case is
 * ignored — 'alice' and 'ALICE' name the same GitHub account, since logins
 * are case-insensitive, so both landing under skills/ at once reads as one
 * person holding two different-looking namespaces.
 *
 * rules.ts's checkNamespaceCase rejects any single uppercase namespace on its
 * own — it does not need this, since every non-lowercase directory fails
 * regardless of what else is being submitted. What that per-skill check
 * cannot see is a *pair*: two namespaces, each well-formed enough to reach
 * this far, that collide with each other only because case was ignored
 * somewhere upstream. This takes the same changed-path shape checkChangedLayout
 * does, since it runs from the same `--layout changed.txt` step.
 */
export function checkNamespaceCollisions(paths: string[]): Finding[] {
  const findings: Finding[] = [];
  const firstSeen = new Map<string, string>(); // lowercase namespace -> first exact spelling
  const reportedKeys = new Set<string>();

  for (const path of paths) {
    const clean = path.trim();
    if (!clean) continue;
    const parts = clean.split("/");
    if (parts[0] !== "skills" || !parts[1]) continue;

    const namespace = parts[1];
    const key = namespace.toLowerCase();
    const existing = firstSeen.get(key);

    if (existing === undefined) {
      firstSeen.set(key, namespace);
    } else if (existing !== namespace && !reportedKeys.has(key)) {
      reportedKeys.add(key);
      findings.push(finding(namespace,
        `namespace '${namespace}' differs from 'skills/${existing}/' only by ` +
        `case. GitHub logins are case-insensitive, so these would be read as ` +
        `the same account under two directories — use one namespace, in ` +
        `lowercase.`));
    }
  }

  return findings;
}
