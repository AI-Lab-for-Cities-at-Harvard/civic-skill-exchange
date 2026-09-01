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
const EXEMPT = /^skills\/[^/]+\/[^/]+\/(references|assets)\/.*SKILL\.md$/;

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
