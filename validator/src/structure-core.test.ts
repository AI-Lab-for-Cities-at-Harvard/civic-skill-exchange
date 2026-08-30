import { describe, it, expect } from "vitest";
import { extname as nodeExtname } from "node:path";
import {
  checkStructureCore, checkPathSafety, extname, type Entry,
  MAX_FILE_BYTES, MAX_FILES_PER_SKILL,
} from "./structure-core";

const bytes = (s: string) => new TextEncoder().encode(s);
const file = (path: string, content = "x\n"): Entry =>
  ({ path, kind: "file", bytes: bytes(content) });
const messages = (f: { where: string; message: string }[]) =>
  f.map((x) => `${x.where}: ${x.message}`).join(" | ");

describe("extname — held to Node's behaviour", () => {
  // Node is the oracle. The dotfile case is the one that bites: extname of
  // ".gitignore" is "", which is why such a file gets reported by path.
  it.each([
    "SKILL.md", "scripts/helper.py", ".gitignore", ".env",
    "archive.tar.gz", "Makefile", "notes.", "a/b/c.MD",
    "references/x.y.z.json", "", "no-extension", "dir/.hidden",
  ])("matches node for %o", (path) => {
    expect(extname(path)).toBe(nodeExtname(path));
  });
});

describe("checkStructureCore", () => {
  it("accepts a well-formed skill", () => {
    expect(checkStructureCore([
      { path: "scripts", kind: "dir" },
      file("SKILL.md", "---\nname: x\n---\n\nBody.\n"),
      file("scripts/helper.py", "print('hi')\n"),
    ])).toEqual([]);
  });

  it("rejects a symlink without needing a filesystem to spot it", () => {
    // The whole reason entries are kind-tagged: a caller that knows an entry is
    // a symlink can say so, and this rule stays shared rather than duplicated.
    expect(messages(checkStructureCore([{ path: "link.md", kind: "symlink" }])))
      .toMatch(/symlinks are not permitted/);
  });

  it("rejects a nested git directory", () => {
    expect(messages(checkStructureCore([{ path: ".git", kind: "dir" }])))
      .toMatch(/nested git/);
  });

  it("rejects a file over the per-file cap", () => {
    expect(messages(checkStructureCore([file("big.md", "x".repeat(MAX_FILE_BYTES + 1))])))
      .toMatch(/file cap/);
  });

  it("rejects a disallowed extension", () => {
    expect(messages(checkStructureCore([file("payload.exe", "MZ")])))
      .toMatch(/not an allowed file type/);
  });

  it("rejects bytes that are not valid UTF-8 under an allowed extension", () => {
    expect(messages(checkStructureCore([
      { path: "bad.md", kind: "file", bytes: new Uint8Array([0xff, 0xfe, 0x00, 0x80]) },
    ]))).toMatch(/UTF-8/);
  });

  it("counts a rejected file toward the totals", () => {
    const entries = Array.from({ length: MAX_FILES_PER_SKILL + 1 },
      (_, i) => file(`payload-${i}.exe`, "MZ"));
    expect(messages(checkStructureCore(entries))).toMatch(/over the 60-file cap/);
  });

  it("emits findings in the order the entries arrive", () => {
    expect(checkStructureCore([
      { path: ".git", kind: "dir" },
      { path: "a-link.md", kind: "symlink" },
      file("b-payload.exe", "MZ"),
    ]).map((f) => f.where)).toEqual([".git", "a-link.md", "b-payload.exe"]);
  });
});

describe("checkPathSafety — paths a filesystem walk cannot produce", () => {
  it("passes ordinary relative paths", () => {
    expect(checkPathSafety([file("SKILL.md"), file("scripts/helper.py")])).toEqual([]);
  });

  it.each([
    ["../escape.md", /escapes the skill directory/],
    ["a/../../escape.md", /escapes the skill directory/],
    ["/etc/passwd", /must be relative/],
    ["C:\\Windows\\x.md", /must be relative/],
    ["a\\b.md", /illegal character/],
    ["a\u0000b.md", /illegal character/],
  ])("rejects %o", (path, pattern) => {
    expect(messages(checkPathSafety([file(path)]))).toMatch(pattern);
  });

  it("rejects duplicate paths, which collapse silently in a map", () => {
    // Two entries named SKILL.md under-report both the file count and the byte
    // total wherever entries are keyed by name.
    expect(messages(checkPathSafety([file("SKILL.md"), file("SKILL.md")])))
      .toMatch(/duplicate entry path/);
  });

  it("does not confuse a dotted filename with a traversal", () => {
    expect(checkPathSafety([file("..hidden.md"), file("a..b.md")])).toEqual([]);
  });
});
