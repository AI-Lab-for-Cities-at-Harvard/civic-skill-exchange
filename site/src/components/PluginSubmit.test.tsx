/** Submitting a plugin from the page (#213).
 *
 *  The acceptance criteria on the issue, as the submitter meets them: drop a
 *  plugin and the page switches by itself; a summary first; the plugin's
 *  questions once and each skill's only where its SKILL.md is silent; the
 *  answers written into the right file; and the folder handed back for the
 *  multi-file upload into plugins/{namespace}.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zipSync, strToU8, strFromU8 } from "fflate";
import { PLUGIN_SCHEMA_ID, REGISTRY_EXTENSION } from "@civic-skill-exchange/validator";
import { Submit } from "./Submit";
import { setLocale } from "../i18n/strings";
import { strings as es } from "../i18n/es";
import { readSkillZip } from "../lib/zip";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

const COMPLETE = `---
name: housing-brief
description: Writes a short housing conditions brief for a U.S. city or county.
license: MIT
metadata:
  civic.category: policy
  civic.scope: municipal
  civic.language: en
  civic.localization: generalized
  civic.data-sensitivity: none
  civic.human-review: advisory-only
---

# Housing brief
`;

const BARE = `---
name: refresh-housing-dashboard
description: Refreshes an existing housing dashboard with the latest releases.
license: MIT
---

# Refresh
`;

const MANIFEST = JSON.stringify({
  name: "housing-dashboards", version: "0.3.4", license: "MIT",
  description: "Housing dashboards, refreshes and briefs for any U.S. city or county.",
}, null, 2);

const MCP = JSON.stringify({
  mcpServers: {
    census: { type: "streamable-http", url: "https://census-mcp.responsive.city/mcp" },
    geo: { type: "streamable-http", url: "https://geo-mcp.responsive.city/mcp" },
  },
});

function zip(name: string, entries: Record<string, string>): File {
  const bytes = zipSync(Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k, strToU8(v)]),
  ));
  return new File([bytes], name, { type: "application/zip" });
}

const PLUGIN = (extra: Record<string, string> = {}) => zip("housing-dashboards.zip", {
  "housing-dashboards/plugin.json": MANIFEST,
  "housing-dashboards/mcp.json": MCP,
  "housing-dashboards/skills/housing-brief/SKILL.md": COMPLETE,
  "housing-dashboards/skills/housing-brief/references/brief.md": "# Brief\n",
  "housing-dashboards/skills/refresh-housing-dashboard/SKILL.md": BARE,
  ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [`housing-dashboards/${k}`, v])),
});

const archiveInput = () => screen.getByLabelText(/upload the skill folder/i);

async function dropPlugin(user: ReturnType<typeof userEvent.setup>, file = PLUGIN()) {
  render(<Submit repo={REPO} skills={[]} mode="new" />);
  await user.upload(archiveInput(), file);
  return screen.findByTestId("plugin-mode");
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("PluginSubmit — detection", () => {
  it("enters plugin mode for a dropped plugin, and replaces the skill form", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    expect(screen.queryByTestId("yaml")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Skill name/i)).not.toBeInTheDocument();
  });

  it("stays a skill for a skill zip", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), zip("s.zip", { "s/SKILL.md": BARE }));
    await screen.findByTestId("archive-result");
    expect(screen.queryByTestId("plugin-mode")).not.toBeInTheDocument();
  });

  it("accepts the .plugin file a client exports", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(archiveInput().getAttribute("accept")).toContain(".plugin");
  });

  it("says what a Claude Code package is missing, rather than 'no SKILL.md'", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), zip("h.plugin", {
      ".claude-plugin/plugin.json": "{}", ".mcp.json": "{}",
      "skills/a/SKILL.md": BARE,
    }));
    const note = await screen.findByTestId("client-package");
    expect(note).toHaveTextContent("plugin.json");
    expect(note).toHaveTextContent("mcp.json");
    expect(screen.queryByTestId("plugin-mode")).not.toBeInTheDocument();
  });
});

describe("PluginSubmit — the summary", () => {
  it("names each skill and each MCP server with its host, and says a maintainer reviews it", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    const summary = screen.getByTestId("plugin-summary");
    expect(summary).toHaveTextContent("housing-brief");
    expect(summary).toHaveTextContent("refresh-housing-dashboard");
    expect(summary).toHaveTextContent("census");
    expect(summary).toHaveTextContent("census-mcp.responsive.city");
    expect(summary).toHaveTextContent("geo-mcp.responsive.city");
    expect(summary).toHaveTextContent(/maintainer reviews every plugin/i);
  });
});

describe("PluginSubmit — one form, split by what each answer describes", () => {
  it("opens a complete skill closed and marked complete", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    const section = screen.getByTestId("skill-housing-brief");
    expect(section).not.toHaveAttribute("open");
    expect(within(section).getByTestId("skill-status")).toHaveTextContent(/complete/i);
  });

  it("asks a skill with gaps exactly them", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    const section = screen.getByTestId("skill-refresh-housing-dashboard");
    expect(section).toHaveAttribute("open");
    const asked = within(section).getAllByRole("combobox").map((el) => el.id);
    expect(asked).toEqual([
      "skills/refresh-housing-dashboard:civic.category",
      "skills/refresh-housing-dashboard:civic.scope",
      "skills/refresh-housing-dashboard:civic.language",
      "skills/refresh-housing-dashboard:civic.data-sensitivity",
      "skills/refresh-housing-dashboard:civic.human-review",
    ]);
  });

  it("keeps a question in view once it is answered", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    const section = screen.getByTestId("skill-refresh-housing-dashboard");
    await user.selectOptions(
      within(section).getByRole("combobox", { name: /category/i }), "policy");
    expect(within(section).getByRole("combobox", { name: /category/i })).toBeInTheDocument();
  });

  it("writes plugin-level answers into plugin.json and per-skill ones into SKILL.md", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await user.type(screen.getByLabelText(/who maintains it/i), "Santiago");
    const section = screen.getByTestId("skill-refresh-housing-dashboard");
    await user.selectOptions(
      within(section).getByRole("combobox", { name: /category/i }), "policy");

    const manifest = screen.getByTestId("added-plugin.json").textContent ?? "";
    expect(manifest).toContain(`"$schema": "${PLUGIN_SCHEMA_ID}"`);
    expect(manifest).toContain('"name": "sgarcese-housing-dashboards"');
    expect(manifest).toContain('"civic.maintainer": "Santiago"');
    expect(manifest).not.toContain("civic.category");

    const skill = screen.getByTestId(
      "added-skills/refresh-housing-dashboard/SKILL.md").textContent ?? "";
    expect(skill).toContain("civic.category: policy");
    expect(skill).not.toContain("civic.maintainer");
  });

  it("names the file a finding is about", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, PLUGIN({
      "mcp.json": JSON.stringify({ mcpServers: { x: { type: "sse", url: "https://a.example/sse" } } }),
    }));
    expect(screen.getByTestId("findings-mcp.json")).toHaveTextContent("mcp.json");
  });
});

describe("PluginSubmit — the hand-off", () => {
  it("is always the multi-file upload, into plugins/{namespace}", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await user.type(screen.getByLabelText(/address of your copy/i), "sgarcese/my-copy");
    expect(screen.getByTestId("manual-steps")).toBeInTheDocument();
    expect(screen.queryByTestId("handoff")).not.toBeInTheDocument();
    expect(screen.getByTestId("step-upload")).toHaveAttribute(
      "href", "https://github.com/sgarcese/my-copy/upload/main/plugins/sgarcese");
    expect(screen.getByTestId("upload-step-body"))
      .toHaveTextContent("plugins/sgarcese/housing-dashboards");
    expect(screen.getByTestId("command-line"))
      .toHaveTextContent("plugins/sgarcese/housing-dashboards");
  });

  it("hands back every file, the patched plugin.json and SKILL.md, and no root SKILL.md", async () => {
    const user = userEvent.setup();
    let blob: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((b) => { blob = b as Blob; return "blob:x"; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await dropPlugin(user);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    const section = screen.getByTestId("skill-refresh-housing-dashboard");
    await user.selectOptions(
      within(section).getByRole("combobox", { name: /category/i }), "policy");
    await user.click(screen.getByTestId("download-folder"));

    expect(blob).toBeDefined();
    const read = readSkillZip(new Uint8Array(await blob!.arrayBuffer()));
    const text = (p: string) => {
      const e = read.entries.find((x) => x.path === p);
      return e?.kind === "file" ? strFromU8(e.bytes) : undefined;
    };
    expect(read.directoryName).toBe("housing-dashboards");
    expect(text("skills/housing-brief/references/brief.md")).toBe("# Brief\n");
    expect(JSON.parse(text("plugin.json")!).extensions).toHaveProperty(REGISTRY_EXTENSION);
    expect(text("skills/refresh-housing-dashboard/SKILL.md")).toContain("civic.category: policy");
    expect(text("SKILL.md")).toBeUndefined();
  });

  it("blocks the hand-off on a structural finding", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, PLUGIN({ "hooks/hooks.json": "{}" }));
    expect(screen.getByTestId("blocked")).toBeInTheDocument();
    expect(screen.getByTestId("download-folder")).toBeDisabled();
  });
});

describe("PluginSubmit — importing a plugin repository", () => {
  it("enters plugin mode from a sub-folder address", async () => {
    const files: Record<string, string> = {
      "plugins/h/plugin.json": MANIFEST,
      "plugins/h/skills/housing-brief/SKILL.md": COMPLETE,
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const raw = /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[0-9a-f]{40}\/(.+)$/.exec(url);
      const body = /\/git\/trees\//.test(url)
        ? { sha: "c".repeat(40), truncated: false,
            tree: Object.keys(files).map((path) => ({ path, type: "blob", size: 10 })) }
        : { default_branch: "main" };
      const bytes = strToU8(raw ? files[raw[1]!] ?? "" : "");
      return { status: 200, ok: true, json: async () => body, arrayBuffer: async () => bytes.buffer };
    }));
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub repository/i),
      "https://github.com/sgarcese/plugins/tree/main/plugins/h");
    await user.click(screen.getByTestId("import"));
    expect(await screen.findByTestId("plugin-mode")).toBeInTheDocument();
    expect(screen.getByTestId("plugin-summary")).toHaveTextContent("housing-brief");
    const note = screen.getByTestId("imported");
    expect(note).toHaveTextContent("plugins/h");
    expect(note).toHaveTextContent("main");
    expect(note).toHaveTextContent("sgarcese/plugins");
  });
});

// --------------------------------------------------------------------------- //
// From a walkthrough as a submitter who does not use git (#213).

const MAINTAINED = JSON.stringify({
  name: "housing-dashboards", description: "Housing dashboards, refreshes and briefs for any city.",
  license: "MIT",
  extensions: { [REGISTRY_EXTENSION]: { "civic.maintainer": "Santiago Garcés", "civic.affiliation": "academic" } },
});

describe("PluginSubmit — for someone who does not use git", () => {
  it("refuses a username GitHub would not allow, and says what one looks like", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    await user.type(screen.getByLabelText(/GitHub username/i), "Maria Lopez");
    expect(screen.getByTestId("bad-login")).toHaveTextContent("Maria Lopez");
    expect(screen.getByTestId("download-folder")).toBeDisabled();
  });

  it("says why the download is not ready", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    expect(screen.getByTestId("download-why")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/GitHub username/i), "maria-lopez");
    expect(screen.queryByTestId("download-why")).not.toBeInTheDocument();
  });

  it("says which answers came from the file, maintainer first among them", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, PLUGIN({ "plugin.json": MAINTAINED }));
    expect(screen.getByTestId("plugin-from-file")).toHaveTextContent(/who maintains it/i);
  });

  it("shows what a complete skill already says", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    const answers = within(screen.getByTestId("skill-housing-brief")).getByTestId("skill-answers");
    expect(answers).toHaveTextContent("Policy");
    expect(answers).toHaveTextContent("No personal data");
  });

  it("speaks of a plugin in the masculine in Spanish", async () => {
    setLocale("es");
    try {
      const user = userEvent.setup();
      await dropPlugin(user);
      expect(screen.getByLabelText(es.submit.plugin.maintainerLabel)).toBeInTheDocument();
      expect(es.submit.plugin.maintainerLabel).not.toMatch(/\bla\b/);
    } finally {
      setLocale("en");
    }
  });
});

describe("Submit — one source at a time", () => {
  it("drops the import note when a file is dropped instead", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const body = /\/git\/trees\//.test(url)
        ? { sha: "c".repeat(40), truncated: false, tree: [{ path: "SKILL.md", type: "blob", size: 10 }] }
        : { default_branch: "main" };
      const bytes = strToU8(BARE);
      return { status: 200, ok: true, json: async () => body, arrayBuffer: async () => bytes.buffer };
    }));
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub repository/i), "a/b");
    await user.click(screen.getByTestId("import"));
    await screen.findByTestId("imported");
    await user.upload(archiveInput(), PLUGIN());
    await screen.findByTestId("plugin-mode");
    expect(screen.queryByTestId("imported")).not.toBeInTheDocument();
  });

  it("counts files in Spanish without inventing a verb", () => {
    expect(es.submit.intake.imported(6, "a/b", "abc1234")).toContain("Se leyeron 6 archivos");
    expect(es.submit.intake.imported(1, "a/b", "abc1234")).toContain("Se leyó 1 archivo");
  });
});
