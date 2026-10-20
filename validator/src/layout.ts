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

import { deepSkillMessage } from "./structure-core";
import type { Finding } from "./types";

const finding = (where: string, message: string): Finding => ({ where, message });

/** Where a skill's own SKILL.md may be, and nowhere else:
 *
 *  - a single skill, `skills/{namespace}/{name}/skills/{name}/SKILL.md`, whose
 *    inner directory carries the listing's own name (ADR 0006);
 *  - a plugin's skill, `plugins/{namespace}/{name}/skills/{skill}/SKILL.md`,
 *    which is where the Agent Plugins layout puts them (ADR 0005).
 *
 *  There is no exemption for `references/` or `assets/` any more. #78 had one
 *  for examples, and ADR 0006 (decision 4) reversed it: Codex loads any
 *  SKILL.md under a plugin's `skills/`, however deep. */
const CORRECT =
  /^(?:skills\/[^/]+\/([^/]+)\/skills\/\1|plugins\/[^/]+\/[^/]+\/skills\/[^/]+)\/SKILL\.md$/;

/** The flat layout the move retired: SKILL.md at the listing root. */
const FLAT = /^(skills\/[^/]+\/([^/]+))\/SKILL\.md$/;

/** A single skill whose inner directory is named something else. */
const MISNAMED_NESTED = /^(skills\/[^/]+\/([^/]+))\/skills\/[^/]+\/SKILL\.md$/;

/** A SKILL.md inside a listing, below where its skill's own lives. */
const INSIDE_LISTING = /^(?:skills|plugins)\/[^/]+\/[^/]+\/.+\/SKILL\.md$/;

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
    if (CORRECT.test(clean)) continue;

    const flat = FLAT.exec(clean);
    if (flat) {
      const [, listing, name] = flat;
      findings.push(finding(clean,
        `a single skill's files go one level down, in ${listing}/skills/${name}/ ` +
        `(ADR 0006), so this belongs at ${listing}/skills/${name}/SKILL.md. ` +
        `No client loads a SKILL.md at the listing root. Move it there with ` +
        `everything else you wrote.`));
      continue;
    }
    const misnamed = MISNAMED_NESTED.exec(clean);
    if (misnamed) {
      const [, listing, name] = misnamed;
      findings.push(finding(clean,
        `a single skill's directory is named after its listing, so this one ` +
        `belongs at ${listing}/skills/${name}/SKILL.md. Rename the inner ` +
        `directory, or, if the listing has several skills, submit it as a ` +
        `plugin under plugins/.`));
      continue;
    }
    if (INSIDE_LISTING.test(clean)) {
      findings.push(finding(clean, deepSkillMessage(clean)));
      continue;
    }

    const suggestion = clean.includes("/")
      ? clean.slice(0, clean.lastIndexOf("/"))
      : "your-skill";
    const folder = suggestion.slice(suggestion.lastIndexOf("/") + 1);
    findings.push(finding(clean,
      `a skill must live at skills/{your-github-username}/{skill-name}/` +
      `skills/{skill-name}/SKILL.md, or inside a plugin at ` +
      `plugins/{your-github-username}/{plugin-name}/skills/{skill-name}/SKILL.md. ` +
      `This one is at ${clean}, so nothing in the registry reads it. Move ` +
      `${suggestion} into skills/{your-github-username}/${folder}/skills/.`));
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
    if ((parts[0] !== "skills" && parts[0] !== "plugins") || !parts[1]) continue;

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
