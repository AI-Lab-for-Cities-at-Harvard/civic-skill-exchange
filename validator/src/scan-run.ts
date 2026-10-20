/** What check.ts says when scan.py ran but wrote no findings.
 *
 *  Two different failures end that way. The interpreter could not run the
 *  scan — no pyyaml, the wrong Python — which is the reader's setup to fix. Or
 *  scan.py stopped on a listing whose own SKILL.md it could not find, or found
 *  as a symlink (build_index.skill_dir_of, ADR 0006), which is the listing to
 *  fix. Telling the second person to install pyyaml sends them the wrong way.
 *
 *  Kept out of check.ts, which runs on import, so it can be tested. */

/** scan.py's stderr line for a listing it could not scan, exit code 2.
 *  tests/test_scan_nested.py holds scan.py to this shape. */
const NO_SKILL_MD = /^scan\.py: cannot scan (\S+): (.+)$/m;

export interface ScanRun {
  python: string;
  status: number | null;
  stderr: string;
  error?: Error;
}

export function describeScanFailure({ python, status, stderr, error }: ScanRun): string {
  const listing = !error && status === 2 ? NO_SKILL_MD.exec(stderr) : null;
  if (listing) {
    const [, id, why] = listing;
    return `\nCould not scan ${id}: ${why}\n\n` +
      "A single skill's own SKILL.md is a regular file, at the listing's root or " +
      "in skills/{name}/ inside it. The scan stopped there rather than report " +
      "this listing clean with its frontmatter checks switched off.";
  }
  const why = error ? error.message : stderr.trim();
  return `\nCould not run the signature scan with '${python}'.\n${why}\n\n` +
    "scan.py needs pyyaml. See docs/DEVELOPMENT.md — Setup. Set $PYTHON to " +
    "choose a different interpreter.";
}
