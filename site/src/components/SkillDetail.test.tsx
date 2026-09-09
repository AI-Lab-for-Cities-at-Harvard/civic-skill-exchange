/** What the detail page says about which files run (#151).
 *
 * The page publishes structure rather than content, so "which of these does the
 * agent execute" is one of the few things it can tell a reader — and after the
 * ruling on #151 the answer is no longer only `scripts/`. The skill directory is
 * the Claude plugin root, so a client launches the MCP servers `.mcp.json`
 * declares on install, and `build_index.py` marks it executed.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { makeSkill } from "../test/fixtures";
import { SkillDetail } from "./SkillDetail";
import type { SkillDetail as Detail } from "../lib/types";

const detail = (over: Partial<Detail> = {}): Detail => ({
  ...makeSkill(),
  files: [{ path: "SKILL.md", size: 4096, executed: false }],
  archive: { path: "data/skills/ns/example-skill.zip", size: 5697 },
  ...over,
});

const served = (payload: Detail) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, json: () => Promise.resolve(payload),
  }));

const structure = () => screen.findByRole("region", { name: /what is in it/i });

afterEach(() => vi.unstubAllGlobals());

describe("the structure section says what runs", () => {
  it("names .mcp.json beside scripts/, because both are executed", async () => {
    served(detail());
    render(<SkillDetail namespace="ns" name="example-skill" />);
    expect((await structure()).textContent).toMatch(/\.mcp\.json/);
  });

  it("tags an executed file wherever it sits in the tree", async () => {
    served(detail({ files: [
      { path: ".mcp.json", size: 120, executed: true },
      { path: "SKILL.md", size: 4096, executed: false },
      { path: "references/notes.md", size: 20, executed: false },
    ] }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    await structure();

    expect(screen.getByText(".mcp.json").closest("li")?.textContent)
      .toContain("executed");
    expect(screen.getByText("references/notes.md").closest("li")?.textContent)
      .not.toContain("executed");
  });
});
