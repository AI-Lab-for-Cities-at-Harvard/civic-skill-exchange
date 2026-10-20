/** One place for the install commands (#289). A skill's page and a plugin's
 *  page both read them from here, so the two can't come to disagree. The name
 *  is `{namespace}-{name}`, which is what scripts/build_marketplace.py's
 *  plugin_name writes into both marketplaces. */

import { describe, it, expect } from "vitest";
import { installCommands, installName } from "./install";

describe("installCommands", () => {
  it("names the listing as both marketplaces do", () => {
    expect(installName("ns", "example-skill")).toBe("ns-example-skill");
  });

  it("gives both clients' marketplace and install lines", () => {
    expect(installCommands("ns", "example-skill")).toEqual({
      claudeMarketplace:
        "/plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange " +
        "--sparse .claude-plugin skills plugins",
      claudeInstall: "/plugin install ns-example-skill@civic-skill-exchange",
      codexMarketplace:
        "codex plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange " +
        "--sparse .agents --sparse skills --sparse plugins",
      codexInstall: "codex plugin add ns-example-skill@civic-skill-exchange",
      claudeCheck: "claude plugin list",
      codexCheck: "codex plugin list",
    });
  });

  /* #298: the check lines are what each CLI's own help documents (claude
     2.1.302 and codex 0.163.0): `plugin list`, a shell command. */
  it("gives each client's check as a shell command, not a slash command", () => {
    const { claudeCheck, codexCheck } = installCommands("ns", "x");
    expect(claudeCheck).toBe("claude plugin list");
    expect(codexCheck).toBe("codex plugin list");
  });
});
