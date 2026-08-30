import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkStructure, checkYamlSafety, splitFrontmatter,
  MAX_FILE_BYTES, MAX_FRONTMATTER_BYTES, MAX_FILES_PER_SKILL, MAX_SKILL_BYTES,
} from "./structure";

let dir: string;
let skill: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cse-"));
  skill = join(dir, "skills", "testuser", "example-skill");
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, "SKILL.md"), "---\nname: example-skill\n---\n\nBody.\n");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const messages = (f: { where: string; message: string }[]) =>
  f.map((x) => `${x.where}: ${x.message}`).join(" | ");

describe("checkStructure", () => {
  it("accepts a minimal well-formed skill", () => {
    expect(checkStructure(skill)).toEqual([]);
  });

  it("rejects symlinks", () => {
    writeFileSync(join(dir, "outside.txt"), "secrets");
    symlinkSync(join(dir, "outside.txt"), join(skill, "link.md"));
    expect(messages(checkStructure(skill))).toMatch(/symlink/);
  });

  it("rejects a nested git directory", () => {
    mkdirSync(join(skill, ".git"));
    expect(messages(checkStructure(skill))).toMatch(/nested git/);
  });

  it("rejects a file type outside the allowlist", () => {
    writeFileSync(join(skill, "payload.exe"), "MZ");
    expect(messages(checkStructure(skill))).toMatch(/not an allowed file type/);
  });

  it("rejects a file over the size cap", () => {
    writeFileSync(join(skill, "big.md"), "x".repeat(MAX_FILE_BYTES + 1));
    expect(messages(checkStructure(skill))).toMatch(/file cap/);
  });

  it("rejects content that is not valid UTF-8", () => {
    writeFileSync(join(skill, "bad.md"), Buffer.from([0xff, 0xfe, 0x00, 0x80]));
    expect(messages(checkStructure(skill))).toMatch(/UTF-8/);
  });

  it("walks nested directories", () => {
    mkdirSync(join(skill, "scripts", "deep"), { recursive: true });
    writeFileSync(join(skill, "scripts", "deep", "payload.exe"), "MZ");
    expect(messages(checkStructure(skill))).toMatch(/not an allowed file type/);
  });

  it("accepts the file types a real skill uses", () => {
    mkdirSync(join(skill, "scripts"), { recursive: true });
    mkdirSync(join(skill, "references"), { recursive: true });
    writeFileSync(join(skill, "scripts", "helper.py"), "print('hi')\n");
    writeFileSync(join(skill, "references", "notes.md"), "# Notes\n");
    expect(checkStructure(skill)).toEqual([]);
  });
});

/**
 * Characterization tests, written before the pure/filesystem split in #41.
 *
 * These pin behaviour the refactor must preserve exactly. The order test is the
 * one that matters most: it is what catches a seam that splits the walk into
 * two passes and silently reshuffles what CI reports.
 */
describe("checkStructure — behaviour the split must preserve", () => {
  it("reports findings in one sorted pass over the tree", () => {
    writeFileSync(join(dir, "outside.txt"), "secrets");
    mkdirSync(join(skill, ".git"));
    symlinkSync(join(dir, "outside.txt"), join(skill, "a-link.md"));
    writeFileSync(join(skill, "b-big.md"), "x".repeat(MAX_FILE_BYTES + 1));
    writeFileSync(join(skill, "c-bad.md"), Buffer.from([0xff, 0xfe, 0x00, 0x80]));
    writeFileSync(join(skill, "d-payload.exe"), "MZ");

    // Asserting the array, not a regex over the joined string: a bad seam
    // reorders these without changing which findings appear.
    expect(checkStructure(skill).map((f) => f.where)).toEqual([
      ".git",
      "a-link.md",
      "b-big.md",
      "c-bad.md",
      "d-payload.exe",
    ]);
  });

  it("counts a disallowed file toward the totals before rejecting its type", () => {
    // The `total +=` sits above the `continue`, so a rejected file still
    // consumes budget. Pinning it: a naive port would count only the files it
    // finished checking.
    writeFileSync(join(skill, "payload.exe"), "x".repeat(2048));
    const findings = checkStructure(skill);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toMatch(/not an allowed file type/);
  });

  it("rejects more files than the cap allows", () => {
    for (let i = 0; i <= MAX_FILES_PER_SKILL; i += 1) {
      writeFileSync(join(skill, `note-${i}.md`), "x\n");
    }
    expect(messages(checkStructure(skill)))
      .toMatch(new RegExp(`over the ${MAX_FILES_PER_SKILL}-file cap`));
  });

  it("accepts exactly the cap", () => {
    // SKILL.md already exists, so add one fewer.
    for (let i = 0; i < MAX_FILES_PER_SKILL - 1; i += 1) {
      writeFileSync(join(skill, `note-${i}.md`), "x\n");
    }
    expect(checkStructure(skill)).toEqual([]);
  });

  it("rejects a directory over the total-bytes cap", () => {
    // Under the per-file cap individually, over the directory cap together.
    const per = MAX_FILE_BYTES - 1;
    for (let i = 0; i < Math.ceil(MAX_SKILL_BYTES / per) + 1; i += 1) {
      writeFileSync(join(skill, `bulk-${i}.md`), "x".repeat(per));
    }
    expect(messages(checkStructure(skill)))
      .toMatch(new RegExp(`over the ${MAX_SKILL_BYTES}-byte cap`));
  });

  it("rejects an extension-less file, naming the path when there is no suffix", () => {
    writeFileSync(join(skill, ".gitignore"), "node_modules\n");
    const findings = checkStructure(skill);
    expect(findings).toHaveLength(1);
    // extname(".gitignore") is "" in Node, so the message falls back to the path.
    expect(findings[0]?.message).toMatch(/'\.gitignore' is not an allowed file type/);
  });

  it("matches the extension case-insensitively", () => {
    writeFileSync(join(skill, "NOTES.MD"), "# Notes\n");
    expect(checkStructure(skill)).toEqual([]);
  });
});

describe("checkYamlSafety", () => {
  it("accepts ordinary frontmatter", () => {
    expect(checkYamlSafety("name: a-skill\ndescription: something\n")).toEqual([]);
  });

  it("rejects anchors and aliases, the billion-laughs vector", () => {
    expect(messages(checkYamlSafety("a: &anchor [1, 2]\nb: *anchor\n"))).toMatch(/alias/i);
  });

  it("rejects oversized frontmatter", () => {
    expect(messages(checkYamlSafety("k: " + "v".repeat(MAX_FRONTMATTER_BYTES)))).toMatch(/exceeds/);
  });

  it("reports malformed YAML rather than throwing", () => {
    expect(messages(checkYamlSafety("key: [unclosed\n"))).toMatch(/not valid YAML/);
  });

  it("rejects empty frontmatter", () => {
    expect(checkYamlSafety("").length).toBeGreaterThan(0);
  });
});

describe("splitFrontmatter", () => {
  it("splits frontmatter from body", () => {
    const r = splitFrontmatter("---\nname: x\n---\n\nBody text.\n");
    expect(r.raw).toBe("name: x");
    expect(r.body.trim()).toBe("Body text.");
  });

  it("returns null when there is no frontmatter block", () => {
    expect(splitFrontmatter("# Just a heading\n").raw).toBeNull();
  });

  it("does not treat a horizontal rule mid-document as frontmatter", () => {
    expect(splitFrontmatter("# Heading\n\n---\n\nMore text.\n").raw).toBeNull();
  });
});
