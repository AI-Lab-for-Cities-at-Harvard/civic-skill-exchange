import { describe, it, expect } from "vitest";
import { extname as nodeExtname } from "node:path";
import { checkChangedLayout } from "./layout";
import {
  checkStructureCore,
  checkPathSafety,
  extname,
  type Entry,
  MAX_FILE_BYTES,
  MAX_FILES_PER_SKILL,
  MAX_SKILL_BYTES,
  ALLOWED_SUFFIXES,
  isRepositoryFurniture,
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
    expect(messages(checkStructureCore(entries)))
      .toMatch(new RegExp(`over the ${MAX_FILES_PER_SKILL}-file cap`));
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

/**
 * The caps were re-derived from anthropics/skills, so these test the shapes
 * that measurement turned on rather than the numbers themselves. A literal
 * assertion would only restate the constant; these fail if somebody tightens a
 * cap back to where it refuses real work, or loosens the type rule.
 */
describe("the caps admit real skills and still refuse binaries", () => {
  /** The document skills: many files, ~1.1 MB, a 237 KB schema. */
  const documentSkill = (): Entry[] => {
    const entries: Entry[] = [
      { path: "SKILL.md", kind: "file", bytes: bytes("---\nname: docx\n---\n\nBody.\n") },
      { path: "schemas/wml.xsd", kind: "file", bytes: bytes("<xs:schema/>".padEnd(237 * 1024, " ")) },
    ];
    for (let i = 0; i < 59; i += 1) {
      entries.push({ path: `schemas/part-${i}.xsd`, kind: "file", bytes: bytes("<x/>".padEnd(14 * 1024, " ")) });
    }
    return entries;
  };

  it("accepts a document skill — 61 files, a 237 KB schema, ~1.1 MB", () => {
    const entries = documentSkill();
    const total = entries.reduce((n, e) => n + (e.kind === "file" ? e.bytes.length : 0), 0);
    expect(entries.length).toBeGreaterThan(60);          // over the old count cap
    expect(total).toBeGreaterThan(1024 * 1024);          // over the old size cap
    expect(checkStructureCore(entries)).toEqual([]);
  });

  it("allows .xsd, because .xml was already allowed and it is the same thing", () => {
    expect(ALLOWED_SUFFIXES.has(".xsd")).toBe(true);
    expect(ALLOWED_SUFFIXES.has(".xml")).toBe(true);
  });

  it.each([".ttf", ".pdf", ".gz", ".zip", ".png", ".docx"])(
    "still refuses %s — the text-only line is not a cap", (suffix) => {
      expect(ALLOWED_SUFFIXES.has(suffix)).toBe(false);
      expect(messages(checkStructureCore([file(`asset${suffix}`, "x")])))
        .toMatch(/not an allowed file type/);
    });

  it("keeps a ceiling GitHub's upload interface can actually honour", () => {
    // Above a hundred files that interface hard-fails, so a higher cap here
    // would promise something the submission path cannot deliver.
    expect(MAX_FILES_PER_SKILL).toBeLessThanOrEqual(100);
  });

  it("still refuses something that is a project rather than a skill", () => {
    const entries: Entry[] = Array.from({ length: MAX_FILES_PER_SKILL + 1 },
      (_, i) => file(`f-${i}.md`, "x"));
    expect(messages(checkStructureCore(entries)))
      .toMatch(new RegExp(`over the ${MAX_FILES_PER_SKILL}-file cap`));

    const heavy: Entry[] = Array.from({ length: 10 },
      (_, i) => file(`big-${i}.md`, "x".repeat(MAX_FILE_BYTES)));
    expect(messages(checkStructureCore(heavy)))
      .toMatch(new RegExp(`over the ${MAX_SKILL_BYTES}-byte cap`));
  });
});

/** #63: a skill imported from its own repository arrives with the repository's
 *  files beside it. They are not skill content and the allowlist has nothing
 *  useful to say about them. */
describe("isRepositoryFurniture", () => {
  it("names the files every repository has", () => {
    for (const path of ["LICENSE", ".gitignore", ".gitattributes", "Makefile"]) {
      expect(isRepositoryFurniture(path)).toBe(true);
    }
  });

  it("is not a second allowlist — a disallowed extension is still disallowed", () => {
    for (const path of ["payload.exe", "image.png", "archive.tar"]) {
      expect(isRepositoryFurniture(path)).toBe(false);
    }
  });

  it("leaves real skill content alone", () => {
    for (const path of ["SKILL.md", "scripts/run.py", "references/notes.md"]) {
      expect(isRepositoryFurniture(path)).toBe(false);
    }
  });
});

/** One directory is one skill (#78).
 *
 *  Load-bearing rather than conventional since #73: the marketplace generator
 *  emits one plugin per directory on exactly that assumption. A directory
 *  holding a second SKILL.md indexed as one skill, showed the nested one as an
 *  ordinary file, and installed as a plugin whose nested skill a client would
 *  load — the site and the client disagreeing about what the listing contains,
 *  with nothing saying so.
 *
 *  The line between "a client loads this" and "this is documentation" is the one
 *  layout.ts already draws for changed paths: `references/` and `assets/` are
 *  where the Agent Skills specification puts templates, and no client loads a
 *  skill from either. A skill about writing skills legitimately ships an
 *  example, and in this registry's domain that is likely rather than
 *  hypothetical.
 */
describe("a second SKILL.md", () => {
  const nested = (path: string) => [
    file("SKILL.md", "---\nname: a\n---\n"),
    file(path, "---\nname: b\n---\n"),
  ];

  it("is reported when a client would load it", () => {
    const findings = checkStructureCore(nested("nested/SKILL.md"));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.where).toBe("nested/SKILL.md");
    expect(findings[0]?.message).toMatch(/one directory is one skill/i);
  });

  it("names the path, so the author does not have to hunt for it", () => {
    expect(checkStructureCore(nested("deep/inside/here/SKILL.md"))[0]?.message)
      .toContain("deep/inside/here/SKILL.md");
  });

  it.each(["references/SKILL.md", "references/examples/SKILL.md", "assets/SKILL.md"])(
    "%s is documentation and still validates", (path) => {
      expect(checkStructureCore(nested(path))).toEqual([]);
    });

  it("leaves the skill's own SKILL.md alone", () => {
    expect(checkStructureCore([file("SKILL.md", "---\nname: a\n---\n")])).toEqual([]);
  });

  it("reports a nested SKILL.md even with no SKILL.md at the root", () => {
    // Discovery would not call this a skill at all, but the submission page
    // runs this module on a dropped folder, where anything is possible.
    expect(checkStructureCore([file("nested/SKILL.md", "x")])).toHaveLength(1);
  });
});

/** layout.ts draws the same line for changed paths. Two copies of a rule is how
 *  one of them goes stale, so this holds them to each other. */
describe("the documentation exemption agrees with layout.ts", () => {
  it.each(["references/SKILL.md", "assets/templates/SKILL.md"])(
    "%s is exempt in both", (path) => {
      expect(checkStructureCore([file("SKILL.md", "x"), file(path, "x")])).toEqual([]);
      expect(checkChangedLayout([`skills/ns/name/${path}`])).toEqual([]);
    });

  it.each(["nested/SKILL.md", "scripts/SKILL.md"])("%s is rejected by both", (path) => {
    expect(checkStructureCore([file("SKILL.md", "x"), file(path, "x")])).toHaveLength(1);
    expect(checkChangedLayout([`skills/ns/name/${path}`])).toHaveLength(1);
  });
});

/** Plugin-level files a client acts on (#151).
 *
 *  `build_marketplace.py` makes the skill directory the Claude plugin root, so
 *  a plugin-level file an author ships is honoured on `/plugin install`. The
 *  worst of them is `hooks/hooks.json`: it runs shell commands at session start
 *  with no model in the path, which is the class SECURITY.md §3 says an LLM
 *  cannot gate. `.json` is allowlisted, so a hook shipped inside a skill passed
 *  L0 with one soft `external-url` flag.
 *
 *  `.mcp.json` is the ruled exception — an MCP server can be useful to a skill,
 *  so it stays, and `build_index.py` publishes it as executed instead.
 */
describe("plugin-level files a skill may not ship", () => {
  const withRoot = (path: string) =>
    [file("SKILL.md", "---\nname: a\n---\n"), file(path, "{}\n")];

  it.each([
    "hooks/hooks.json",
    "settings.json",
    "settings.local.json",
    ".lsp.json",
    ".claude-plugin/plugin.json",
  ])("%s is rejected, and the finding names the path", (path) => {
    const findings = checkStructureCore(withRoot(path));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.where).toBe(path);
    expect(findings[0]?.message.length).toBeGreaterThan(40);
  });

  it("says why a hook is the one no later check can gate", () => {
    expect(checkStructureCore(withRoot("hooks/hooks.json"))[0]?.message)
      .toMatch(/no model/i);
  });

  it("rejects anything under hooks/, not only hooks.json", () => {
    expect(checkStructureCore(withRoot("hooks/install.sh"))).toHaveLength(1);
  });

  it("reports a rejected directory once, not once per file inside it", () => {
    // The finding lands in a pull request comment. Three lines for one mistake
    // is how a comment stops being read.
    expect(checkStructureCore([
      file("SKILL.md", "x"),
      { path: "hooks", kind: "dir" },
      file("hooks/hooks.json", "{}"),
      file("hooks/run.sh", "x"),
    ]).map((f) => f.where)).toEqual(["hooks"]);
  });

  it("still reports the file when no directory entry was passed", () => {
    // An entry list assembled from an archive may carry no directories at all.
    expect(checkStructureCore([file("hooks/hooks.json", "{}")])).toHaveLength(1);
  });

  it("keeps .mcp.json, which the ruling on #151 allows", () => {
    expect(checkStructureCore(withRoot(".mcp.json"))).toEqual([]);
  });

  it("leaves the generated .codex-plugin manifest alone", () => {
    // build_marketplace.py writes one into every listing, so rejecting it
    // would fail every skill in the registry.
    expect(checkStructureCore(withRoot(".codex-plugin/plugin.json"))).toEqual([]);
  });

  it.each([
    "references/hooks/hooks.json",
    "references/settings.json",
    "assets/settings.json",
  ])("%s is documentation — nothing loads it, so it stays", (path) => {
    // The same line the second-SKILL.md rule draws. A skill about writing
    // skills ships examples, and in this registry's domain that is likely.
    expect(checkStructureCore(withRoot(path))).toEqual([]);
  });
});
