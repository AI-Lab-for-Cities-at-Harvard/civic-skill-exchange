/** What check.ts says when scan.py doesn't produce findings (#273).
 *
 *  scan.py stops with exit 2 when a listing's own SKILL.md can't be found, or
 *  is a symlink (build_index.skill_dir_of). That used to be reported as "needs
 *  pyyaml", which sends the author to fix their Python instead of their
 *  listing. The stderr line is scan.py's, held to it by
 *  tests/test_scan_nested.py. */

import { describe, it, expect } from "vitest";
import { describeScanFailure } from "./scan-run";

const NO_SKILL_MD =
  "scan.py: cannot scan testuser/example-skill: /tmp/x/skills/testuser/example-skill " +
  "has no SKILL.md, at its root or in skills/example-skill/.\n";
const SYMLINK =
  "scan.py: cannot scan testuser/example-skill: /tmp/x/skills/testuser/example-skill/" +
  "skills/example-skill/SKILL.md is a symlink; a skill's own files must be in the listing.\n";

describe("describeScanFailure", () => {
  it("names the listing with no SKILL.md, and doesn't blame pyyaml", () => {
    const text = describeScanFailure({ python: "python3", status: 2, stderr: NO_SKILL_MD });
    expect(text).toContain("testuser/example-skill");
    expect(text).toMatch(/no SKILL\.md/);
    expect(text).not.toMatch(/pyyaml/i);
  });

  it("says so for a symlinked SKILL.md too", () => {
    const text = describeScanFailure({ python: "python3", status: 2, stderr: SYMLINK });
    expect(text).toContain("testuser/example-skill");
    expect(text).toMatch(/symlink/);
    expect(text).not.toMatch(/pyyaml/i);
  });

  it("keeps the setup hint when the interpreter is what failed", () => {
    const text = describeScanFailure({
      python: "python3", status: 1,
      stderr: "ModuleNotFoundError: No module named 'yaml'\n",
    });
    expect(text).toMatch(/pyyaml/);
    expect(text).toContain("python3");
  });

  it("keeps the setup hint when the interpreter could not be started", () => {
    const text = describeScanFailure({
      python: "nope", status: null, stderr: "", error: new Error("spawn nope ENOENT"),
    });
    expect(text).toMatch(/pyyaml/);
    expect(text).toContain("ENOENT");
  });

  it("does not read a stray exit 2 as a missing SKILL.md", () => {
    // argparse exits 2 on a usage error, with no such line.
    const text = describeScanFailure({
      python: "python3", status: 2, stderr: "usage: scan.py [-h] ...\n",
    });
    expect(text).toMatch(/pyyaml/);
  });
});
