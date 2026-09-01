/** Handing the corrected skill back.
 *
 *  The submitter drags the folder this produces onto GitHub's upload page, so
 *  the subdirectories have to survive the trip — a flattened `scripts/` is a
 *  broken skill, not an untidy one.
 */

import { describe, it, expect } from "vitest";
import { strToU8, strFromU8 } from "fflate";
import { buildSkillZip } from "./folder";
import { readSkillZip } from "./zip";
import type { Entry } from "@civic-skill-exchange/validator";

const file = (path: string, text: string): Entry =>
  ({ path, kind: "file", bytes: strToU8(text) });

const ENTRIES: Entry[] = [
  file("SKILL.md", "---\nname: x\n---\n\nOld body.\n"),
  file("scripts/reading_level.py", "print(1)\n"),
  file("references/swaps.md", "# Swaps\n"),
];

describe("buildSkillZip", () => {
  it("roots every path at the skill directory", () => {
    const zip = buildSkillZip(ENTRIES, "permit-status-explainer", "---\nname: x\n---\n");
    const read = readSkillZip(zip);
    expect(read.directoryName).toBe("permit-status-explainer");
    expect(read.entries.map((e) => e.path).sort()).toEqual([
      "SKILL.md", "references/swaps.md", "scripts/reading_level.py",
    ]);
  });

  it("substitutes the patched SKILL.md and leaves every other file untouched", () => {
    const patched = "---\nname: x\nmetadata:\n  civic.category: permits\n---\n\nOld body.\n";
    const zip = buildSkillZip(ENTRIES, "x", patched);
    const read = readSkillZip(zip);
    expect(read.skillMd).toBe(patched);
    const script = read.entries.find((e) => e.path === "scripts/reading_level.py");
    expect(script?.kind === "file" && strFromU8(script.bytes)).toBe("print(1)\n");
  });

  it("round-trips through the reader with nothing dropped", () => {
    const zip = buildSkillZip(ENTRIES, "x", "---\nname: x\n---\n");
    expect(readSkillZip(zip).problems).toEqual([]);
  });
});
