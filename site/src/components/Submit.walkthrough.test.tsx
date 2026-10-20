/** Smaller fixes from the end-to-end walkthrough (#302): S-10, S-13 and S-15
 *  on the submit page. S-14 is in lib/patch.test.ts, S-12 in App.home.test.tsx
 *  and I-6 in DownloadBox.test.tsx. */

import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { zipSync, strToU8 } from "fflate";
import { Submit } from "./Submit";
import { setLocale } from "../i18n/strings";

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
