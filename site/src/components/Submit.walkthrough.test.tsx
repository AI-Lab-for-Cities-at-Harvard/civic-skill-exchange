/** Smaller fixes from the end-to-end walkthrough (#302): S-10, S-13 and S-15
 *  on the submit page. S-14 is in lib/patch.test.ts, S-12 in App.home.test.tsx
 *  and I-6 in DownloadBox.test.tsx. */

import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
