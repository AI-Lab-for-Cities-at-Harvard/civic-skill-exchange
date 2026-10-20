/** The plugin form has the skill form's problems with required questions
 *  (#295): the organization a team or an organization owes sat inside the
 *  closed "optional" section, and a finding listed outside any box showed its
 *  raw `civic.*` key.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zipSync, strToU8 } from "fflate";
import { Submit } from "./Submit";
import { pluginFieldId } from "../lib/plugin";

/* The username box is looked up on GitHub after a pause (useUserCheck). A
   test never reaches the network: on a slow runner the real lookup came back
   "no such user" before the test ended and added a second error. */
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, status: 200, json: () => Promise.resolve({ login: "cityofx" }),
  }));
});
afterEach(() => vi.unstubAllGlobals());

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

const SKILL = `---
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

const MANIFEST = JSON.stringify({
  name: "housing-dashboards", version: "0.3.4", license: "MIT",
  description: "Housing dashboards, refreshes and briefs for any U.S. city or county.",
}, null, 2);

const PLUGIN = () => new File([zipSync({
  "housing-dashboards/plugin.json": strToU8(MANIFEST),
  "housing-dashboards/skills/housing-brief/SKILL.md": strToU8(SKILL),
})], "housing-dashboards.zip", { type: "application/zip" });

const box = (id: string) => document.getElementById(id) as HTMLElement;
const hidden = (el: HTMLElement) => el.closest("details:not([open])") !== null;

async function drop(user: ReturnType<typeof userEvent.setup>) {
  render(<Submit repo={REPO} skills={[]} mode="new" />);
  await user.upload(screen.getByLabelText(/upload the skill folder/i), PLUGIN());
  await screen.findByTestId("plugin-mode");
}

describe("PluginSubmit — a missing required question is never hidden", () => {
  it("asks for the organization beside the deployment answer that needs it", async () => {
    const user = userEvent.setup();
    await drop(user);
    await user.selectOptions(box(pluginFieldId("deployment")), "team");

    const organization = box(pluginFieldId("deployedAt"));
    expect(organization).toBeInTheDocument();
    expect(hidden(organization)).toBe(false);
    expect(organization.closest(".field")!.querySelector(".field__finding")).not.toBeNull();
  });

  it("keeps it optional, and tucked away, for someone who owes none", async () => {
    const user = userEvent.setup();
    await drop(user);
    await user.selectOptions(box(pluginFieldId("deployment")), "personal");
    expect(hidden(box(pluginFieldId("deployedAt")))).toBe(true);
  });
});

describe("PluginSubmit — errors in the page's own words", () => {
  it("shows no civic.* key in any finding, boxed or listed", async () => {
    const user = userEvent.setup();
    await drop(user);
    await user.selectOptions(box(pluginFieldId("deployment")), "none");
    await user.type(box(pluginFieldId("deployedAt")), "City of X");

    const shown = [...document.querySelectorAll(
      ".field__finding, .submit__findings li")];
    expect(shown.length).toBeGreaterThan(0);
    for (const n of shown) expect(n.textContent).not.toMatch(/civic\./);
  });
});
