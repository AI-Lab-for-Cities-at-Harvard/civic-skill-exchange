/** Writing the registry's fields into somebody else's SKILL.md.
 *
 *  The rule these tests exist to hold: the submitter's file is *edited*, never
 *  rebuilt. Everything the registry has no opinion about — the body, the
 *  comments, the key order, the quoting style someone chose — comes out the
 *  other side unchanged.
 */

import { describe, it, expect } from "vitest";
import { patchSkillMd } from "./patch";

const FILE = `---
name: permit-status-explainer
description: Explains why a building permit is stuck, in plain language.
license: MIT
---

# Permit status explainer

Body prose that must survive.

\`\`\`
---
not frontmatter
---
\`\`\`
`;

describe("patchSkillMd", () => {
  it("preserves the body byte for byte", () => {
    const out = patchSkillMd(FILE, { "civic.category": "permits" });
    const body = out.skillMd.slice(out.skillMd.indexOf("\n---\n") + 5);
    expect(body).toBe(FILE.slice(FILE.indexOf("\n---\n") + 5));
  });

  it("keeps the keys it was not asked to change", () => {
    const out = patchSkillMd(FILE, { "civic.category": "permits" });
    expect(out.skillMd).toContain("name: permit-status-explainer");
    expect(out.skillMd).toContain("license: MIT");
  });

  it("adds a metadata block when the file has none", () => {
    const out = patchSkillMd(FILE, { "civic.category": "permits" });
    expect(out.skillMd).toMatch(/metadata:\s*\n\s+civic\.category: permits/);
  });

  it("writes into an existing metadata block, leaving its other keys alone", () => {
    const withMeta = `---
name: x
metadata:
  civic.category: housing
  something.else: keep me
---

Body.
`;
    const out = patchSkillMd(withMeta, { "civic.category": "permits" });
    expect(out.skillMd).toContain("civic.category: permits");
    expect(out.skillMd).toContain("something.else: keep me");
    expect(out.skillMd).not.toContain("housing");
  });

  it("keeps comments", () => {
    const commented = `---
name: x  # chosen deliberately
---

Body.
`;
    const out = patchSkillMd(commented, { "civic.category": "permits" });
    expect(out.skillMd).toContain("# chosen deliberately");
  });

  it("updates a top-level field when the form changed it", () => {
    const out = patchSkillMd(FILE, { name: "permit-status" });
    expect(out.skillMd).toContain("name: permit-status");
    expect(out.skillMd).not.toContain("name: permit-status-explainer");
  });

  it("removes a field the submitter cleared rather than writing it empty", () => {
    const withMeta = `---
name: x
metadata:
  civic.category: housing
---

Body.
`;
    const out = patchSkillMd(withMeta, { "civic.category": "" });
    expect(out.skillMd).not.toContain("civic.category");
  });

  it("never writes an empty value for a field that was absent", () => {
    const out = patchSkillMd(FILE, { "civic.jurisdiction": "" });
    expect(out.skillMd).not.toContain("civic.jurisdiction");
  });

  it("reports which registry fields the file already carried", () => {
    const withMeta = `---
name: x
metadata:
  civic.category: housing
---

Body.
`;
    expect(patchSkillMd(withMeta, {}).present).toContain("civic.category");
    expect(patchSkillMd(withMeta, {}).present).toContain("name");
    expect(patchSkillMd(withMeta, {}).present).not.toContain("civic.jurisdiction");
  });

  it("refuses a file with no frontmatter rather than inventing one", () => {
    const out = patchSkillMd("# Just a heading\n", { "civic.category": "permits" });
    expect(out.problems.length).toBeGreaterThan(0);
    expect(out.skillMd).toBe("# Just a heading\n");
  });

  it("refuses frontmatter that is not safe to parse", () => {
    const bomb = `---
a: &x ["v","v","v","v","v","v","v","v","v"]
b: &y [*x,*x,*x,*x,*x,*x,*x,*x,*x]
c: [*y,*y,*y,*y,*y,*y,*y,*y,*y]
---

Body.
`;
    const out = patchSkillMd(bomb, { "civic.category": "permits" });
    expect(out.problems.length).toBeGreaterThan(0);
    expect(out.skillMd).toBe(bomb);
  });

  it("round-trips: patching with nothing to change leaves the file alone", () => {
    expect(patchSkillMd(FILE, {}).skillMd).toBe(FILE);
  });
});
