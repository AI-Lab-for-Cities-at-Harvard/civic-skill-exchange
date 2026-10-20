/** The license, asked on both routes (#296, finding S-4). */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zipSync, strToU8, strFromU8 } from "fflate";
import { Submit } from "./Submit";
import { setLocale } from "../i18n/strings";
import { readSkillZip } from "../lib/zip";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

const front = (name: string, license?: string) => `---
name: ${name}
description: Explains why a building permit is stuck, in plain language.
${license ? `license: ${license}\n` : ""}---
Body.
`;

const zip = (name: string, entries: Record<string, string>) => new File(
  [zipSync(Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, strToU8(v)])))],
  name, { type: "application/zip" });

const manifest = (license?: string) => JSON.stringify({
  name: "housing-dashboards", version: "0.3.4",
  description: "Housing dashboards, refreshes and briefs for any U.S. city or county.",
  ...(license ? { license } : {}),
});

const plugin = (o: { manifest?: string; a?: string; b?: string } = {}) =>
  zip("housing-dashboards.zip", {
    "housing-dashboards/plugin.json": o.manifest ?? manifest(),
    "housing-dashboards/skills/one/SKILL.md": front("one", o.a),
    "housing-dashboards/skills/two/SKILL.md": front("two", o.b),
  });

const licenseBox = () => screen.getByLabelText(/^License$/) as HTMLSelectElement;
const archiveInput = () => screen.getByLabelText(/upload the skill folder/i);
const values = () => within(licenseBox()).getAllByRole("option")
  .map((o) => (o as HTMLOptionElement).value);

afterEach(async () => { await setLocale("en"); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("the skill route", () => {
  it("pre-fills nothing, and puts no license in the frontmatter", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(licenseBox().value).toBe("");
    expect(screen.getByTestId("yaml").textContent).not.toMatch(/^license:/m);
  });

  it("offers MIT, Apache-2.0, CC-BY-4.0 and another by SPDX identifier", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(values()).toEqual(["", "MIT", "Apache-2.0", "CC-BY-4.0", "other"]);
  });

  it("says what a license means for people who reuse the work", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    const field = licenseBox().closest(".field")!;
    expect(field.querySelector(".field__hint")?.textContent).toMatch(/reuse/i);
  });

  it("writes the chosen license into the frontmatter", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.selectOptions(licenseBox(), "Apache-2.0");
    expect(screen.getByTestId("yaml").textContent).toMatch(/^license: "?Apache-2\.0"?$/m);
  });

  it("takes any SPDX identifier through 'another'", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.selectOptions(licenseBox(), "other");
    await user.type(screen.getByLabelText(/SPDX identifier/i), "BSD-3-Clause");
    expect(screen.getByTestId("yaml").textContent).toMatch(/^license: "?BSD-3-Clause"?$/m);
  });

  it("asks, with the validator's finding, when a dropped skill declares none", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), zip("s.zip", { "s/SKILL.md": front("permit-status-explainer") }));
    await screen.findByTestId("archive-result");
    expect(licenseBox().value).toBe("");
    expect(licenseBox().closest(".field")).toHaveTextContent(/license is required/i);
  });

  it("keeps the license a dropped skill declares", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(),
      zip("s.zip", { "s/SKILL.md": front("permit-status-explainer", "CC-BY-4.0") }));
    await screen.findByTestId("archive-result");
    expect(licenseBox().value).toBe("CC-BY-4.0");
  });

  it("shows a declared license outside the list under 'another'", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(),
      zip("s.zip", { "s/SKILL.md": front("permit-status-explainer", "MPL-2.0") }));
    await screen.findByTestId("archive-result");
    expect(licenseBox().value).toBe("other");
    expect(screen.getByLabelText(/SPDX identifier/i)).toHaveValue("MPL-2.0");
  });

  it("asks in Spanish too, with its own words", async () => {
    await setLocale("es");
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByLabelText(/^Licencia$/)).toBeInTheDocument();
  });
});

describe("the plugin route", () => {
  const drop = async (user: ReturnType<typeof userEvent.setup>, file: File) => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), file);
    await screen.findByTestId("plugin-mode");
  };

  it("pre-fills nothing when neither plugin.json nor the skills declare one", async () => {
    const user = userEvent.setup();
    await drop(user, plugin());
    expect(licenseBox().value).toBe("");
  });

  it("reads it from plugin.json", async () => {
    const user = userEvent.setup();
    await drop(user, plugin({ manifest: manifest("Apache-2.0") }));
    expect(licenseBox().value).toBe("Apache-2.0");
  });

  it("reads it from the skills when they agree and plugin.json is silent", async () => {
    const user = userEvent.setup();
    await drop(user, plugin({ a: "MIT", b: "MIT" }));
    expect(licenseBox().value).toBe("MIT");
  });

  it("does not flag a skill for the license, though plugin.json is still flagged", async () => {
    const user = userEvent.setup();
    await drop(user, plugin());
    expect(screen.getByTestId("skill-one")).not.toHaveTextContent(/license/i);
    expect(licenseBox().closest(".field")).toHaveTextContent(/license is required/i);
  });

  it("hands back plugin.json and every skill carrying the chosen license", async () => {
    const user = userEvent.setup();
    let blob: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((b) => { blob = b as Blob; return "blob:x"; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await drop(user, plugin({ b: "Apache-2.0" }));
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await user.selectOptions(licenseBox(), "CC-BY-4.0");
    await user.click(screen.getByTestId("download-folder"));

    const read = readSkillZip(new Uint8Array(await blob!.arrayBuffer()));
    const text = (p: string) => {
      const e = read.entries.find((x) => x.path === p);
      return e?.kind === "file" ? strFromU8(e.bytes) : "";
    };
    expect(JSON.parse(text("plugin.json")).license).toBe("CC-BY-4.0");
    expect(text("skills/one/SKILL.md")).toContain("license: CC-BY-4.0");
    // A license a skill already declares is its author's, and is left alone.
    expect(text("skills/two/SKILL.md")).toContain("license: Apache-2.0");
  });

  it("offers the same choices as the skill route", async () => {
    const user = userEvent.setup();
    await drop(user, plugin());
    expect(values()).toEqual(["", "MIT", "Apache-2.0", "CC-BY-4.0", "other"]);
  });
});
