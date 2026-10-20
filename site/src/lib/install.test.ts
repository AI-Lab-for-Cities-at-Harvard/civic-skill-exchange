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
    });
  });
});
