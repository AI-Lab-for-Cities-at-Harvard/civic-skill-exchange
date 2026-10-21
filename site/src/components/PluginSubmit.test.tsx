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
import { MCP_SCHEMA_ID, checkMcpConfig } from "@civic-skill-exchange/validator/plugin-core";
import { Submit } from "./Submit";
import { setLocale } from "../i18n/strings";
import { en } from "../i18n/en";
import { strings as es } from "../i18n/es";
import { readSkillZip } from "../lib/zip";
import { settleUserLookup, stubUserLookup } from "../test/lookup";

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

});

// --------------------------------------------------------------------------- //
// A plugin exported from Claude Code, converted by the page (#246).

const CLAUDE_MANIFEST = JSON.stringify({
  name: "housing-dashboards", version: "0.3.4", license: "MIT",
  description: "Housing dashboards, refreshes and briefs for any U.S. city or county.",
  hooks: "./hooks/hooks.json",
}, null, 2);

const CLAUDE_MCP = JSON.stringify({
  mcpServers: {
    census: { type: "http", url: "https://census-mcp.responsive.city/mcp" },
    hud: { type: "http", url: "${HOUSING_HUD_MCP_URL}" },
  },
}, null, 2);

const EXPORT = (extra: Record<string, string> = {}) => zip("housing-dashboards-0.3.4.plugin", {
  ".claude-plugin/plugin.json": CLAUDE_MANIFEST,
  ".mcp.json": CLAUDE_MCP,
  ".codex-plugin/plugin.json": "{}",
  "skills/housing-brief/SKILL.md": COMPLETE,
  "skills/refresh-housing-dashboard/SKILL.md": BARE,
  "hooks/hooks.json": "{}",
  ...extra,
});

describe("PluginSubmit — a Claude Code export", () => {
  it("enters the plugin form, and says it rearranged a Claude Code plugin", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, EXPORT());
    const note = screen.getByTestId("converted");
    expect(note).toHaveTextContent("Claude Code");
    expect(note).toHaveTextContent(".claude-plugin/plugin.json");
    expect(screen.queryByTestId("client-package")).not.toBeInTheDocument();
    expect(screen.getByTestId("plugin-summary")).toHaveTextContent("census-mcp.responsive.city");
    expect(screen.getByTestId("skill-refresh-housing-dashboard")).toHaveAttribute("open");
  });

  it("lists what it could not carry across: the hooks, the ${VAR} server, the hooks/ folder", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, EXPORT());
    const findings = screen.getByTestId("conversion-findings");
    expect(findings).toHaveTextContent(".claude-plugin/plugin.json#hooks");
    expect(findings).toHaveTextContent(".mcp.json#hud.url");
    expect(findings).toHaveTextContent("${HOUSING_HUD_MCP_URL}");
    expect(findings).toHaveTextContent("hooks/");
    // Left out of the conversion is not structural: the hand-off is not blocked.
    expect(screen.queryByTestId("blocked")).not.toBeInTheDocument();
    expect(screen.getByTestId("left-out")).toHaveTextContent(".codex-plugin/plugin.json");
  });

  it("shows the new plugin.json and mcp.json in what we added", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, EXPORT());
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    const manifest = screen.getByTestId("added-plugin.json").textContent ?? "";
    expect(manifest).toContain(`"$schema": "${PLUGIN_SCHEMA_ID}"`);
    expect(manifest).toContain('"name": "sgarcese-housing-dashboards"');
    expect(manifest).toContain('"license": "MIT"');
    const mcp = screen.getByTestId("added-mcp.json").textContent ?? "";
    expect(mcp).toContain('"type": "streamable-http"');
    expect(mcp).toContain("census-mcp.responsive.city");
    expect(mcp).not.toContain("${");
  });

  it("hands back the converted files and none of the client ones", async () => {
    const user = userEvent.setup();
    let blob: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((b) => { blob = b as Blob; return "blob:x"; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await dropPlugin(user, EXPORT());
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await user.click(screen.getByTestId("download-folder"));

    const read = readSkillZip(new Uint8Array(await blob!.arrayBuffer()));
    const paths = read.entries.map((e) => e.path).sort();
    expect(read.plugin).toBe(true);
    expect(read.directoryName).toBe("housing-dashboards");
    expect(paths).toEqual([
      "mcp.json", "plugin.json",
      "skills/housing-brief/SKILL.md", "skills/refresh-housing-dashboard/SKILL.md",
    ]);
    const text = (p: string) => {
      const e = read.entries.find((x) => x.path === p);
      return e?.kind === "file" ? strFromU8(e.bytes) : "";
    };
    expect(JSON.parse(text("plugin.json")).name).toBe("sgarcese-housing-dashboards");
    expect(JSON.parse(text("mcp.json")).mcpServers.census.type).toBe("streamable-http");
  });

  it("converts one imported from a repository", async () => {
    const files: Record<string, string> = {
      ".claude-plugin/plugin.json": CLAUDE_MANIFEST,
      ".mcp.json": CLAUDE_MCP,
      "skills/housing-brief/SKILL.md": COMPLETE,
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
      "https://github.com/sgarcese/housing-dashboards");
    await user.click(screen.getByTestId("import"));
    expect(await screen.findByTestId("converted")).toBeInTheDocument();
    expect(screen.getByTestId("added-mcp.json")).toHaveTextContent("streamable-http");
  });

  it("says so in Spanish too", async () => {
    setLocale("es");
    try {
      const user = userEvent.setup();
      await dropPlugin(user, EXPORT());
      expect(screen.getByTestId("converted")).toHaveTextContent("Claude Code");
      expect(screen.getByTestId("conversion-findings"))
        .toHaveTextContent(es.submit.plugin.convertedFindings);
    } finally {
      setLocale("en");
    }
  });
});

// --------------------------------------------------------------------------- //
// Pasting the address of a server left out for a placeholder (#250).

describe("PluginSubmit — pasting a server's address", () => {
  const address = () => screen.getByLabelText(en.submit.plugin.addressLabel("hud"));
  const added = () => screen.queryByTestId("added-mcp.json")?.textContent ?? "";

  /** What the validator says about this address as a server's url. */
  const validator = (url: string) => checkMcpConfig(JSON.stringify({
    $schema: MCP_SCHEMA_ID, mcpServers: { hud: { type: "streamable-http", url } },
  })).find((f) => f.where === "mcp.json#hud.url")!.message;

  it("asks for it, empty, with the hint, and changes nothing until it is filled in", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, EXPORT());
    expect(address()).toHaveValue("");
    expect(screen.getByTestId("server-address-hud"))
      .toHaveTextContent(en.submit.plugin.addressHint.replace(/[*`]/g, ""));
    expect(en.submit.plugin.addressHint).toMatch(/setting on your computer.*https:\/\//s);
    expect(screen.getByTestId("conversion-findings")).toHaveTextContent(".mcp.json#hud.url");
    expect(added()).not.toContain("hud");
  });

  it("puts a valid https address into mcp.json, and shows it in what we added", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, EXPORT());
    await user.type(address(), "https://hud.responsive.city/mcp");
    expect(added()).toContain('"hud"');
    expect(added()).toContain("https://hud.responsive.city/mcp");
    expect(screen.getByTestId("plugin-summary")).toHaveTextContent("hud.responsive.city");
    expect(screen.getByTestId("conversion-findings")).not.toHaveTextContent(".mcp.json#hud.url");
    expect(screen.getByTestId("server-address-hud")).toHaveTextContent(
      en.submit.plugin.addressAdded("hud", "hud.responsive.city").replace(/[*`]/g, ""));
    // Still there, answered, rather than gone from under the cursor.
    expect(address()).toHaveValue("https://hud.responsive.city/mcp");
  });

  it("refuses an http address with the validator's message, and keeps the server out", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, EXPORT());
    await user.type(address(), "http://hud.responsive.city/mcp");
    expect(screen.getByTestId("server-address-hud"))
      .toHaveTextContent(validator("http://hud.responsive.city/mcp"));
    expect(added()).not.toContain("hud.responsive.city");
    expect(screen.getByTestId("conversion-findings")).toHaveTextContent(".mcp.json#hud.url");
  });

  it("refuses a placeholder too", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, EXPORT());
    await user.click(address());
    await user.paste("${HUD_URL}");
    expect(screen.getByTestId("server-address-hud")).toHaveTextContent(validator("${HUD_URL}"));
    expect(added()).not.toContain('"hud"');
  });

  it("hands back the server in mcp.json", async () => {
    const user = userEvent.setup();
    let blob: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((b) => { blob = b as Blob; return "blob:x"; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await dropPlugin(user, EXPORT());
    await user.type(address(), "https://hud.responsive.city/mcp");
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await user.click(screen.getByTestId("download-folder"));
    const read = readSkillZip(new Uint8Array(await blob!.arrayBuffer()));
    const mcp = read.entries.find((x) => x.path === "mcp.json");
    expect(JSON.parse(mcp?.kind === "file" ? strFromU8(mcp.bytes) : "{}").mcpServers.hud).toEqual({
      type: "streamable-http", url: "https://hud.responsive.city/mcp",
    });
  });

  it("asks nothing of an sse server or one run through ${CLAUDE_PLUGIN_ROOT}", async () => {
    const user = userEvent.setup();
    await dropPlugin(user, EXPORT({
      ".mcp.json": JSON.stringify({ mcpServers: {
        legacy: { type: "sse", url: "${LEGACY_URL}" },
        local: { command: "${CLAUDE_PLUGIN_ROOT}/run.sh" },
      } }),
    }));
    expect(screen.getByTestId("conversion-findings")).toHaveTextContent(".mcp.json#legacy.type");
    expect(screen.queryByTestId("server-address-legacy")).not.toBeInTheDocument();
    expect(screen.queryByTestId("server-address-local")).not.toBeInTheDocument();
  });

  it("asks in Spanish too", async () => {
    setLocale("es");
    try {
      const user = userEvent.setup();
      await dropPlugin(user, EXPORT());
      const field = screen.getByLabelText(es.submit.plugin.addressLabel("hud"));
      expect(screen.getByTestId("server-address-hud"))
        .toHaveTextContent(es.submit.plugin.addressHint.replace(/[*`]/g, ""));
      await user.type(field, "http://hud.responsive.city/mcp");
      expect(screen.getByTestId("server-address-hud")).toHaveTextContent(
        es.submit.plugin.addressRefused(validator("http://hud.responsive.city/mcp")));
    } finally {
      setLocale("en");
    }
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
    stubUserLookup("sgarcese");
    await dropPlugin(user);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await settleUserLookup();
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

  it("gives a recipe that copies the folder in and pushes to the fork, unindented (S-7)", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await user.type(screen.getByLabelText(/address of your copy/i), "sgarcese/my-copy");
    const text = screen.getByTestId("command-line").textContent ?? "";
    expect(text.split("\n")[0]).toBe("git clone https://github.com/sgarcese/my-copy.git");
    expect(text).toContain(
      "cp -R /path/to/housing-dashboards plugins/sgarcese/housing-dashboards");
    expect(text).toContain("git add plugins/sgarcese/housing-dashboards\n");
    expect(text).toContain("git push -u origin add-housing-dashboards");
    for (const line of text.split("\n")) expect(line).toBe(line.trimStart());
  });

  it("hands back every file, the patched plugin.json and SKILL.md, and no root SKILL.md", async () => {
    const user = userEvent.setup();
    let blob: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((b) => { blob = b as Blob; return "blob:x"; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    stubUserLookup("sgarcese");
    await dropPlugin(user);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await settleUserLookup();
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

/** #300: a plugin's pull request is reviewed by a maintainer who is asked
 *  automatically (CODEOWNERS owns /plugins/), and the page says so. */
describe("PluginSubmit — after the hand-off", () => {
  it("says a maintainer is asked automatically, and pre-fills the pull request", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await user.type(screen.getByLabelText(/address of your copy/i), "sgarcese/my-copy");
    expect(screen.getByTestId("review-who")).toHaveTextContent(/asked automatically/i);
    const q = new URL(screen.getByTestId("step-pr").getAttribute("href")!).searchParams;
    expect(q.get("title")).toBe("Add plugin sgarcese/housing-dashboards");
    expect(q.get("body")).toContain("`plugins/sgarcese/housing-dashboards`");
  });
});
