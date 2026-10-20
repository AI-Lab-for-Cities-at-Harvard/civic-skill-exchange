/** Asking for a license instead of assuming one (#296, finding S-4).
 *
 *  The skill route used to start the license at MIT, so it reached the
 *  frontmatter unasked. On the plugin route the manifest needs one but each
 *  skill was flagged for lacking its own. CI reads a plugin's skills with
 *  checkFrontmatter, which requires `license` in every SKILL.md whether or not
 *  the skill is in a plugin — so the page writes the plugin's license into each
 *  skill that has none, and stops flagging the gap per skill.
 */

import { describe, it, expect } from "vitest";
import { strToU8 } from "fflate";
import { checkFrontmatter, type Entry } from "@civic-skill-exchange/validator";
import { EMPTY_DRAFT, toFrontmatter } from "./submit";
import { draftFromSkillMd } from "./parse";
import { patchSkillMd } from "./patch";
import {
  EMPTY_PLUGIN_DRAFT, checkPlugin, patchPluginSkill, readPluginSource,
  sharedSkillLicense, skillDraftFromFile,
} from "./plugin";

const file = (path: string, text: string): Entry =>
  ({ path, kind: "file", bytes: strToU8(text) });

const skill = (name: string, license?: string) => `---
name: ${name}
description: A housing dashboard skill that turns federal open data into something a city can use.
${license ? `license: ${license}\n` : ""}---

# Body
`;

const entries = (manifestLicense: string | null, a?: string, b?: string): Entry[] => [
  file("plugin.json", JSON.stringify({
    name: "x-housing", description: "Housing dashboards for any U.S. city or county.",
    ...(manifestLicense ? { license: manifestLicense } : {}),
  })),
  file("skills/one/SKILL.md", skill("one", a)),
  file("skills/two/SKILL.md", skill("two", b)),
];

describe("the skill route asks, and does not assume", () => {
  it("starts with no license", () => {
    expect(EMPTY_DRAFT.license).toBe("");
  });

  it("reads none from a file that declares none", () => {
    expect(draftFromSkillMd(skill("one")).draft.license).toBe("");
    expect(draftFromSkillMd(skill("one", "Apache-2.0")).draft.license).toBe("Apache-2.0");
  });

  it("leaves a license out of the frontmatter until one is chosen", () => {
    expect(toFrontmatter({ ...EMPTY_DRAFT, name: "one" })).not.toHaveProperty("license");
    expect(toFrontmatter({ ...EMPTY_DRAFT, name: "one", license: "MIT" }).license).toBe("MIT");
  });

  it("does not write a license into a file that has none", () => {
    const out = patchSkillMd(skill("one"), { license: "" });
    expect(out.skillMd).toBe(skill("one"));
  });
});

describe("a plugin's skills take the plugin's license", () => {
  it("writes the plugin's license into a skill that declares none", () => {
    const out = patchPluginSkill(skill("one"), skillDraftFromFile(skill("one")), "CC-BY-4.0");
    expect(out.skillMd).toContain("license: CC-BY-4.0");
  });

  it("keeps a license a skill already declares", () => {
    const own = skill("one", "Apache-2.0");
    const out = patchPluginSkill(own, skillDraftFromFile(own), "MIT");
    expect(out.skillMd).toContain("license: Apache-2.0");
    expect(out.skillMd).not.toContain("MIT");
  });

  it("writes nothing while the plugin has no license", () => {
    const out = patchPluginSkill(skill("one"), skillDraftFromFile(skill("one")), "");
    expect(out.skillMd).toBe(skill("one"));
  });

  it("leaves CI's own license rule satisfied once written", () => {
    const out = patchPluginSkill(skill("one"), skillDraftFromFile(skill("one")), "MIT");
    expect(out.skillMd).toMatch(/^license: MIT$/m);
    const found = checkFrontmatter(
      { name: "one", description: "x".repeat(50), license: "MIT", metadata: {} },
      { categories: [], directoryName: "one", inPlugin: true });
    expect(found.map((f) => f.where)).not.toContain("license");
    const without = checkFrontmatter(
      { name: "one", description: "x".repeat(50), metadata: {} },
      { categories: [], directoryName: "one", inPlugin: true });
    expect(without.map((f) => f.where)).toContain("license");
  });
});

describe("the plugin check", () => {
  const check = (e: Entry[], license: string) => {
    const source = readPluginSource(e, "housing");
    return checkPlugin(source, {
      manifest: JSON.stringify({ ...JSON.parse(source.manifest), license }),
      skills: {}, namespace: "x", author: "x", directoryName: "housing",
    });
  };

  it("does not flag a skill for a missing license", () => {
    const found = check(entries("MIT"), "MIT");
    for (const name of ["one", "two"]) {
      expect(found.skills[name]!.map((f) => f.where)).not.toContain("license");
    }
  });

  it("still flags the plugin's own missing license, on plugin.json", () => {
    const found = check(entries(null), "");
    expect(found.manifest.map((f) => f.where)).toContain("plugin.json#license");
  });
});

describe("what the files already declare", () => {
  it("is the license every skill shares, when plugin.json has none", () => {
    const source = readPluginSource(entries(null, "MIT", "MIT"), "housing");
    expect(sharedSkillLicense(source)).toBe("MIT");
  });

  it("is nothing when the skills disagree", () => {
    const source = readPluginSource(entries(null, "MIT", "Apache-2.0"), "housing");
    expect(sharedSkillLicense(source)).toBe("");
  });

  it("is nothing when a skill declares none", () => {
    const source = readPluginSource(entries(null, "MIT"), "housing");
    expect(sharedSkillLicense(source)).toBe("");
  });

  it("starts the plugin draft with no license", () => {
    expect(EMPTY_PLUGIN_DRAFT.license).toBe("");
  });
});
