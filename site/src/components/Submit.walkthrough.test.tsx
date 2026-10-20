/** Smaller fixes from the end-to-end walkthrough (#302): S-10, S-13 and S-15
 *  on the submit page. S-14 is in lib/patch.test.ts, S-12 in App.home.test.tsx
 *  and I-6 in DownloadBox.test.tsx. */

import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { zipSync, strToU8 } from "fflate";
import userEvent from "@testing-library/user-event";
import { Submit } from "./Submit";
import { setLocale } from "../i18n/strings";
import { en } from "../i18n/en";
import { strings as es } from "../i18n/es";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

const SKILL_MD = `---
name: permit-status-explainer
description: Explains why a building permit is stuck, in plain language.
---
Body.
`;

function zip(name: string, entries: Record<string, string>): File {
  const bytes = zipSync(Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k, strToU8(v)]),
  ));
  return new File([bytes], name, { type: "application/zip" });
}

afterEach(async () => {
  vi.unstubAllGlobals();
  localStorage.clear();
  await setLocale("en");
});

describe("S-10: a real drop zone", () => {
  it("reads a zip dropped on the zone", async () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    const zone = screen.getByTestId("dropzone");
    fireEvent.drop(zone, {
      dataTransfer: { files: [zip("s.zip", { "s/SKILL.md": SKILL_MD })], types: ["Files"] },
    });
    expect(await screen.findByTestId("archive-result")).toHaveTextContent("s.zip");
  });

  it("says where to drop, in the zone itself", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByTestId("dropzone")).toHaveTextContent(/drop .*zip/i);
  });

  it("keeps the file button inside the zone", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByTestId("dropzone")).toContainElement(
      screen.getByLabelText(/upload the skill folder/i));
  });

  it("marks the zone while a file is dragged over it, and clears it on leave", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    const zone = screen.getByTestId("dropzone");
    fireEvent.dragOver(zone, { dataTransfer: { types: ["Files"] } });
    expect(zone).toHaveAttribute("data-over", "true");
    fireEvent.dragLeave(zone);
    expect(zone).not.toHaveAttribute("data-over", "true");
  });

  it("ignores a drop with no file in it", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [], types: [] } });
    expect(screen.queryByTestId("archive-result")).not.toBeInTheDocument();
  });

  it("promises a zip, not a folder, since a folder cannot be read from a drop", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByRole("heading", { name: /submit a new skill/i }).parentElement)
      .toHaveTextContent(/drop (its|the|a) \.zip/i);
  });
});

// --------------------------------------------------------------------------- //
// S-13: placeholders are examples, and errors wait for a touch.

/** The example values, which must read as examples. The repository, fork and
 *  address boxes show the shape of a link, which is not a value anyone could
 *  mistake for an answer. */
const EXAMPLES = (t: typeof en) => [
  t.submit.form.namePlaceholder, t.submit.form.versionPlaceholder,
  t.submit.form.jurisdictionPlaceholder, t.submit.form.licenseOtherPlaceholder,
  t.submit.form.languageOtherPlaceholder, t.submit.optional.languagesTestedPlaceholder,
  t.submit.optional.modelsTestedPlaceholder, t.submit.optional.toolsPlaceholder,
  t.submit.optional.deployedInPlaceholder, t.submit.optional.deployedSincePlaceholder,
];

describe("S-13: placeholders read as examples", () => {
  it("starts every example with e.g. in English", () => {
    for (const p of EXAMPLES(en)) expect(p).toMatch(/^e\.g\. /);
  });

  it("starts every example with p. ej. in Spanish", () => {
    for (const p of EXAMPLES(es as unknown as typeof en)) expect(p).toMatch(/^p\. ej\. /);
  });

  it("shows them that way on the page", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByLabelText(/^Skill name/i)).toHaveAttribute("placeholder", expect.stringMatching(/^e\.g\. /));
    expect(screen.getByLabelText(/Roughly since when/i)).toHaveAttribute("placeholder", expect.stringMatching(/^e\.g\. /));
  });
});

describe("S-13: errors wait for a touch or a hand-off", () => {
  const errors = () => document.querySelectorAll(".field__finding");
  const requiredNotes = () => screen.queryAllByText(/is required/i, { selector: ".field__finding" });

  it("shows no required-field error on a form nobody has touched", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(requiredNotes()).toHaveLength(0);
    expect(document.querySelectorAll(".field--flagged")).toHaveLength(0);
  });

  it("shows a field's own error once it has been touched and left", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.click(screen.getByLabelText(/^Skill name/i));
    await user.tab();
    const field = screen.getByLabelText(/^Skill name/i).closest(".field")!;
    expect(field).toHaveTextContent(/skill name is required/i);
    // and only that one: the rest have not been touched
    expect(requiredNotes()).toHaveLength(1);
  });

  it("keeps a touched field quiet while it has nothing to say", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/^Skill name/i), "permit-status-explainer");
    await user.tab();
    const field = screen.getByLabelText(/^Skill name/i).closest(".field")!;
    expect(field.querySelector(".field__finding")).toBeNull();
  });

  it("shows every error once the hand-off is tried", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.click(screen.getByTestId("handoff"));
    expect(requiredNotes().length).toBeGreaterThan(3);
    expect(errors().length).toBeGreaterThan(3);
  });
});

// --------------------------------------------------------------------------- //
// S-15: the plugin route, beside the skill route.

const MANIFEST = JSON.stringify({
  name: "housing-dashboards", version: "0.3.4", license: "MIT",
  description: "Housing dashboards, refreshes and briefs for any U.S. city or county.",
}, null, 2);

const PLUGIN = () => zip("housing-dashboards.zip", {
  "housing-dashboards/plugin.json": MANIFEST,
  "housing-dashboards/skills/housing-brief/SKILL.md":
    "---\nname: housing-brief\ndescription: Writes a short housing conditions brief.\nlicense: MIT\n---\n\n# Housing brief\n",
});

const MULTI = () => zip("s.zip", {
  "s/SKILL.md": SKILL_MD,
  "s/references/notes.md": "# Notes\n",
});

const archiveInput = () => screen.getByLabelText(/upload the skill folder/i);

async function dropPlugin(user: ReturnType<typeof userEvent.setup>) {
  render(<Submit repo={REPO} skills={[]} mode="new" />);
  await user.upload(archiveInput(), PLUGIN());
  return screen.findByTestId("plugin-mode");
}

async function dropMultiFileSkill(user: ReturnType<typeof userEvent.setup>) {
  render(<Submit repo={REPO} skills={[]} mode="new" />);
  await user.upload(archiveInput(), MULTI());
  await screen.findByTestId("multi-file-note");
}

describe("S-15: the plugin route previews whole files", () => {
  it("offers the whole of plugin.json as it will be uploaded", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    await user.type(screen.getByLabelText(/Who maintains it/i), "City of X");
    const preview = screen.getByTestId("file-plugin.json");
    expect(preview.tagName).toBe("DETAILS");
    expect(within(preview).getByText(/"name": "housing-dashboards"/)).toBeInTheDocument();
    expect(preview).toHaveTextContent("City of X");
  });

  it("offers the whole of each skill's SKILL.md, body and all", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    const preview = screen.getByTestId("file-skills/housing-brief/SKILL.md");
    expect(preview).toHaveTextContent("# Housing brief");
    expect(preview).toHaveTextContent("name: housing-brief");
  });
});

describe("S-15: one download gate on both routes", () => {
  it("holds the plugin's folder until there is a username, and says why", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    expect(screen.getByTestId("download-folder")).toBeDisabled();
    expect(screen.getByTestId("download-why")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/GitHub username/i), "maria-lopez");
    expect(screen.getByTestId("download-folder")).toBeEnabled();
    expect(screen.queryByTestId("download-why")).not.toBeInTheDocument();
  });

  it("holds the skill's folder the same way, with the same words", async () => {
    const user = userEvent.setup();
    await dropMultiFileSkill(user);
    await user.type(screen.getByLabelText(/^Skill name/i), "permit-status-explainer");
    expect(screen.getByTestId("download-folder")).toBeDisabled();
    expect(screen.getByTestId("download-why")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/GitHub username/i), "maria-lopez");
    expect(screen.getByTestId("download-folder")).toBeEnabled();
    expect(screen.queryByTestId("download-why")).not.toBeInTheDocument();
  });

  it("gives both routes the same note", async () => {
    const user = userEvent.setup();
    await dropMultiFileSkill(user);
    const skillNote = screen.getByTestId("download-why").textContent;
    cleanup();
    await dropPlugin(user);
    expect(screen.getByTestId("download-why").textContent).toBe(skillNote);
  });
});

describe("S-15: the plugin's username help is about a plugin", () => {
  it("does not call it a skill", async () => {
    const user = userEvent.setup();
    await dropPlugin(user);
    const field = screen.getByLabelText(/GitHub username/i).closest(".field")!;
    const hint = field.querySelector(".field__hint")!.textContent ?? "";
    expect(hint).not.toMatch(/skill/i);
    expect(hint).toMatch(/plugin|listing/i);
  });

  it("keeps the skill route's help about a skill", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    const field = screen.getByLabelText(/GitHub username/i).closest(".field")!;
    expect(field.querySelector(".field__hint")!.textContent).toMatch(/skill/i);
  });
});

// --------------------------------------------------------------------------- //
// The narrowed rule, and a status line that agrees with the screen.

describe("S-13: only an empty required box waits", () => {
  const front = (extra: string) => `---\nname: permit-status-explainer\n${extra}---\nBody.\n`;

  it("shows a problem with a value read from a dropped file at once", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), zip("s.zip", {
      "s/SKILL.md": front("description: too short\nlicense: MIT\n"),
    }));
    await screen.findByTestId("archive-result");
    const field = screen.getByLabelText(/^Description/i).closest(".field")!;
    await waitFor(() => expect(field).toHaveTextContent(/at least 40 characters/i));
  });

  it("keeps the empty required boxes of that same file waiting", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), zip("s.zip", {
      "s/SKILL.md": front("description: too short\nlicense: MIT\n"),
    }));
    await screen.findByTestId("archive-result");
    expect(screen.queryAllByText(/is required/i, { selector: ".field__finding" })).toHaveLength(0);
  });
});

describe("the status line agrees with what is on screen", () => {
  it("counts questions still to answer, not 'marked above', before a hand-off is tried", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    const status = screen.getByTestId("status");
    expect(status.textContent).toMatch(/\d+ questions? still to answer/i);
    expect(status.textContent).not.toMatch(/marked above/i);
  });

  it("has a button that shows what is missing, and then says 'marked above'", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.click(screen.getByRole("button", { name: /show what.s missing/i }));
    expect(screen.queryAllByText(/is required/i, { selector: ".field__finding" }).length)
      .toBeGreaterThan(3);
    expect(screen.getByTestId("status").textContent).toMatch(/marked above/i);
    expect(screen.queryByRole("button", { name: /show what.s missing/i })).toBeNull();
  });

  it("does the same for a multi-file skill, whose steps have no hand-off link", async () => {
    const user = userEvent.setup();
    await dropMultiFileSkill(user);
    await user.click(screen.getByRole("button", { name: /show what.s missing/i }));
    expect(screen.queryAllByText(/is required/i, { selector: ".field__finding" }).length)
      .toBeGreaterThan(0);
  });

  it("is in Spanish too", async () => {
    localStorage.setItem("locale", "es");
    await setLocale("es");
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByRole("button", { name: /mostrar lo que falta/i })).toBeInTheDocument();
  });
});

describe("the plugin form's waiting errors", () => {
  const bareSkillPlugin = () => zip("p.zip", {
    "p/plugin.json": MANIFEST,
    "p/skills/bare/SKILL.md": "---\nname: bare\ndescription: Refreshes a dashboard with the latest releases.\nlicense: MIT\n---\n",
  });

  it("offers the same button, and it shows the skill's waiting errors", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), bareSkillPlugin());
    const plugin = await screen.findByTestId("plugin-mode");
    expect(within(plugin).queryAllByText(/is required|needs an answer|to answer/i,
      { selector: ".field__finding" })).toHaveLength(0);
    await user.click(within(plugin).getByRole("button", { name: /show what.s missing/i }));
    expect(plugin.querySelectorAll(".field__finding").length).toBeGreaterThan(0);
    expect(within(plugin).queryByRole("button", { name: /show what.s missing/i })).toBeNull();
  });

  it("opens a skill that was collapsed over a waiting error, and shows the error", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), bareSkillPlugin());
    const plugin = await screen.findByTestId("plugin-mode");
    const skill = within(plugin).getByTestId("skill-bare") as HTMLDetailsElement;
    // The submitter closes it, and the error behind it is still waiting.
    await user.click(skill.querySelector("summary")!);
    expect(skill.open).toBe(false);
    await user.click(within(plugin).getByRole("button", { name: /show what.s missing/i }));
    expect(skill.open).toBe(true);
    const errors = [...skill.querySelectorAll(".field__finding")];
    expect(errors.length).toBeGreaterThan(0);
    for (const e of errors) expect(e.closest("details:not([open])")).toBeNull();
  });
});
