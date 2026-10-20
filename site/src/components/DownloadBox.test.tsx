/** The archive exists for someone with a browser and nothing else. These tests
 *  pin the two things that makes true: the link is a real download, and the
 *  tier disclaimer from #4 still sits beside it. */

import { afterEach, describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DownloadBox } from "./DownloadBox";
import { DEFAULT_LOCALE, setLocale } from "../i18n/strings";
import { makeSkill } from "../test/fixtures";
import { installCommands } from "../lib/install";
import type { SkillDetail } from "../lib/types";

function detail(over: Partial<SkillDetail> = {}): SkillDetail {
  return {
    ...makeSkill(),
    files: [{ path: "SKILL.md", size: 4096, executed: false }],
    archive: { path: "data/skills/ns/example-skill.zip", size: 5697 },
    ...over,
  };
}

describe("DownloadBox — the no-tooling path", () => {
  it("offers the archive as a real download, not a command", () => {
    render(<DownloadBox skill={detail()} />);
    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute("href", "/data/skills/ns/example-skill.zip");
    expect(link).toHaveAttribute("download");
  });

  it("states the size before somebody starts the download", () => {
    render(<DownloadBox skill={detail()} />);
    expect(screen.getByTestId("download-archive")).toHaveTextContent("5.6 KB");
  });

  it("says what to do with the file, for someone not working in git", () => {
    render(<DownloadBox skill={detail()} />);
    expect(screen.getByTestId("download-archive")).toHaveTextContent(/upload/i);
  });

  it("keeps the command-line paths for people who want them", () => {
    render(<DownloadBox skill={detail()} />);
    expect(screen.getByText(/npx degit/)).toBeInTheDocument();
    expect(screen.getByText(/git clone/)).toBeInTheDocument();
  });

  /* ADR 0006, decision 3: the author's files are at skill_path, one level
     below the listing. degit of the listing would copy the generated
     manifests and leave SKILL.md a folder too deep for any skills directory. */
  it("copies the skill's own folder, at skill_path, with degit", () => {
    render(<DownloadBox skill={detail()} />);
    expect(screen.getByText(
      "npx degit AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/" +
      "skills/ns/example-skill/skills/example-skill example-skill")).toBeInTheDocument();
  });

  it("still carries the Community disclaimer beside the button", () => {
    render(<DownloadBox skill={detail({ tier: "community" })} />);
    expect(screen.getByText(/nobody has reviewed this skill/i)).toBeInTheDocument();
  });

  it("degrades without an archive rather than rendering a broken link", () => {
    const without = detail();
    delete (without as Partial<SkillDetail>).archive;
    render(<DownloadBox skill={without} />);
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
    expect(screen.getByText(/npx degit/)).toBeInTheDocument();
  });
});

/** ADR 0001, ruling 2: the Lab may review its own skills, with disclosure.
 *
 *  The marker is derived, not declared — `civic-skills` is already a reserved
 *  namespace in the validator, so nobody has to remember to set a field. The
 *  disclosure belongs on the review claim itself, which is the sentence that
 *  would otherwise have the Lab vouching for the Lab without saying so. */
describe("DownloadBox discloses self-review", () => {
  const attested = {
    date: "2026-08-30", expires: "2027-08-30",
    reviewers: ["AI Lab for Cities at Harvard"], notes: "",
  };

  it("says so when the Lab reviewed a skill the Lab wrote", () => {
    render(<DownloadBox skill={detail({
      tier: "reviewed", namespace: "civic-skills", reviewed: attested,
    })} />);
    expect(screen.getByText(/by its own author/i)).toBeInTheDocument();
    expect(screen.getByText(/wrote and reviewed this skill/i)).toBeInTheDocument();
  });

  it("stays silent on a Reviewed skill somebody else wrote", () => {
    render(<DownloadBox skill={detail({ tier: "reviewed", reviewed: attested })} />);
    expect(screen.queryByText(/by its own author/i)).not.toBeInTheDocument();
    expect(screen.getByText(/read this exact commit/)).toBeInTheDocument();
  });

  /** #155: a same-looking uppercase namespace is not the reserved one — it is
   *  a different, unreserved directory that happens to read the same to a
   *  human. Folding to lowercase before comparing was exactly what let it
   *  claim self-review disclosure it had not earned. */
  it("does not disclose self-review for a same-looking uppercase namespace", () => {
    render(<DownloadBox skill={detail({
      tier: "reviewed", namespace: "Civic-Skills", reviewed: attested,
    })} />);
    expect(screen.queryByText(/by its own author/i)).not.toBeInTheDocument();
  });

  it("still names the attesting party rather than a count", () => {
    render(<DownloadBox skill={detail({ tier: "reviewed", reviewed: attested })} />);
    expect(screen.getByText(/AI Lab for Cities at Harvard read this exact commit/))
      .toBeInTheDocument();
    expect(screen.queryByText(/two reviewers/i)).not.toBeInTheDocument();
  });
});

/** The card no longer warns on a Lab-authored Community listing (#51, owner's
 *  ruling). This is where that warning has to survive, because it is now the
 *  only place a reader meets it — and it is the moment they are about to run
 *  the thing. */
describe("DownloadBox still warns about an unreviewed Lab skill", () => {
  it("says nobody has reviewed it, exactly as for anyone else's", () => {
    render(<DownloadBox skill={detail({
      namespace: "civic-skills", tier: "community",
    })} />);
    expect(screen.getByText(/Nobody has reviewed this skill/)).toBeInTheDocument();
    expect(screen.getByText(/Read the source on GitHub before you/))
      .toBeInTheDocument();
  });
});

/** #73: the registry is a Claude Code plugin marketplace, so a skill is two
 *  commands rather than a download. The plugin name carries the namespace
 *  because plugin names are unique across a marketplace and two people may
 *  publish the same skill name. */
describe("DownloadBox — installing as a plugin", () => {
  it("offers the marketplace commands", () => {
    render(<DownloadBox skill={detail({ namespace: "cityofx", name: "permit-status" })} />);
    expect(screen.getByText(/\/plugin marketplace add AI-Lab-for-Cities-at-Harvard\/civic-skill-exchange/))
      .toBeInTheDocument();
    expect(screen.getByText("/plugin install cityofx-permit-status@civic-skill-exchange"))
      .toBeInTheDocument();
  });

  it("puts the plugin path first, because it is the one that needs no tooling knowledge", () => {
    render(<DownloadBox skill={detail({ namespace: "cityofx", name: "permit-status" })} />);
    const labels = screen.getAllByText(/Just this skill|The whole registry|add the marketplace|install it/i);
    expect(labels[0]).toHaveTextContent("Inside Claude Code: add the marketplace, once");
  });
});

/** #259: the box links into the guide for the step-by-step version, and gives
 *  the same Claude Code command the guide and README do. */
describe("DownloadBox — the way into the guide", () => {
  it("links each product to its section of the guide", () => {
    render(<DownloadBox skill={detail()} />);
    const steps = screen.getByTestId("guide-steps");
    for (const [name, href] of [
      ["Claude", "#/guide/claude"], ["ChatGPT", "#/guide/chatgpt"],
      ["Gemini", "#/guide/gemini"], ["Codex", "#/guide/codex"],
    ]) {
      expect(within(steps).getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("explains the Claude Code commands in the guide", () => {
    render(<DownloadBox skill={detail()} />);
    expect(screen.getByRole("link", { name: /what these do/i }))
      .toHaveAttribute("href", "#/guide/claude-code");
  });

  it("adds the marketplace with --sparse, as the guide does", () => {
    render(<DownloadBox skill={detail()} />);
    expect(screen.getByText(
      "/plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange " +
      "--sparse .claude-plugin skills plugins")).toBeInTheDocument();
  });
});


/* #289: since the layout move, a single skill installs from Codex's
   marketplace too, so its page gives Codex's lines, as a plugin's page does. */
describe("DownloadBox — both clients' marketplaces", () => {
  it("gives Claude Code's and Codex's lines, from the shared helper", () => {
    const skill = detail();
    render(<DownloadBox skill={skill} />);
    for (const line of Object.values(installCommands(skill.namespace, skill.name))) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  it("labels each line with the client it is for", () => {
    render(<DownloadBox skill={detail()} />);
    expect(screen.getByText("In a terminal, for Codex: install it")).toBeInTheDocument();
    expect(screen.getByText("Inside Claude Code: install it")).toBeInTheDocument();
  });
});

/* #289: the note under the commands said only Claude Code used the /plugin
   lines and Codex took "a skill at a time". Since the layout move Codex
   installs from its marketplace too; the download is for everything else. */
describe("DownloadBox — the note under the commands", () => {
  it("says both clients install from the lines above, and the rest use the download", () => {
    render(<DownloadBox skill={detail()} />);
    const box = screen.getByRole("region", { name: /use this skill/i });
    expect(box.textContent).toMatch(/In Claude Code and Codex, the two marketplace lines below are all you need/);
    expect(box.textContent).not.toMatch(/Codex, Gemini, Copilot/);
  });
});

/* #298 (I-2, I-3): a bare `/plugin install ...` pasted into a terminal fails
   ("no such file or directory: /plugin"). Chosen: label the Claude Code lines
   as typed inside Claude Code, rather than adding a shell form beside each.
   The check lines are shell commands, so they say they are for a terminal.
   Pinned in both locales on the skill page; Plugins.test.tsx does the plugin
   page. */
describe("DownloadBox — where each line is typed, and how to check", () => {
  afterEach(async () => { await setLocale(DEFAULT_LOCALE); });

  const label = (command: string) =>
    (screen.getByText(command).closest(".download__cmd") as HTMLElement)
      .querySelector(".download__cmd-label")?.textContent ?? "";

  it("says the /plugin lines are typed inside Claude Code", () => {
    const skill = detail();
    render(<DownloadBox skill={skill} />);
    const lines = installCommands(skill.namespace, skill.name);
    expect(label(lines.claudeMarketplace)).toMatch(/^Inside Claude Code/);
    expect(label(lines.claudeInstall)).toMatch(/^Inside Claude Code/);
  });

  it("says the Codex lines are typed in a terminal", () => {
    const skill = detail();
    render(<DownloadBox skill={skill} />);
    const lines = installCommands(skill.namespace, skill.name);
    expect(label(lines.codexMarketplace)).toMatch(/^In a terminal/);
    expect(label(lines.codexInstall)).toMatch(/^In a terminal/);
  });

  it("gives each client a line to check the install, from the helper", () => {
    const skill = detail();
    render(<DownloadBox skill={skill} />);
    const lines = installCommands(skill.namespace, skill.name);
    expect(label(lines.claudeCheck)).toBe("In a terminal, for Claude Code: check it worked");
    expect(label(lines.codexCheck)).toBe("In a terminal, for Codex: check it worked");
  });

  it("says the same in Spanish", async () => {
    await setLocale("es");
    const skill = detail();
    render(<DownloadBox skill={skill} />);
    const lines = installCommands(skill.namespace, skill.name);
    expect(label(lines.claudeMarketplace)).toMatch(/^Dentro de Claude Code/);
    expect(label(lines.claudeInstall)).toMatch(/^Dentro de Claude Code/);
    expect(label(lines.codexInstall)).toMatch(/^En una terminal/);
    expect(label(lines.claudeCheck)).toMatch(/^En una terminal, para Claude Code/);
    expect(label(lines.codexCheck)).toMatch(/^En una terminal, para Codex/);
  });
});

/* #302 (I-6): six routes came ahead of the line that says two of them are all
   you need. The line now comes before the first command. */
describe("DownloadBox — the \"all you need\" line comes first (I-6)", () => {
  it("sits before every command", () => {
    render(<DownloadBox skill={detail()} />);
    const box = screen.getByRole("region", { name: /use this skill/i });
    const note = within(box).getByText(/are all you need/i);
    const first = box.querySelector(".download__cmd")!;
    expect(note.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it("is only the download ahead of it", () => {
    render(<DownloadBox skill={detail()} />);
    const box = screen.getByRole("region", { name: /use this skill/i });
    const note = within(box).getByText(/are all you need/i);
    const ahead = [...box.querySelectorAll(".download__cmd")].filter((c) =>
      c.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(ahead).toHaveLength(0);
  });
});
