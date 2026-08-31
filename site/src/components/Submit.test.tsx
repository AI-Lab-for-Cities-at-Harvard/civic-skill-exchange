/** The submission page.
 *
 *  Two rules from #24 are load-bearing and are what these pin:
 *  frontmatter findings report and never block, and structural findings from a
 *  dropped archive do block the hand-off. The second narrows the first
 *  deliberately — a path escape or a blocked file type cannot be fixed by
 *  editing a field, and CI would reject the pull request for something the
 *  submitter was already shown.
 *
 *  Blocking a button is not a gate: nothing downstream trusts the browser's
 *  verdict, CI re-runs the same module, and `git` bypasses this page entirely.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zipSync, strToU8 } from "fflate";
import { Submit } from "./Submit";
import { makeSkill } from "../test/fixtures";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

const SKILL_MD = `---
name: permit-status-explainer
description: Explains why a building permit is stuck, in plain language.
---
Body.
`;

function file(name: string, entries: Record<string, string>): File {
  const zip = zipSync(Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k, strToU8(v)]),
  ));
  return new File([zip], name, { type: "application/zip" });
}

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/GitHub username/i), "cityofx");
  await user.type(screen.getByLabelText(/^Skill name/i), "permit-status-explainer");
}

describe("Submit — the frontmatter it builds", () => {
  it("shows YAML before anything is typed, so the shape is visible first", () => {
    render(<Submit repo={REPO} skills={[]} />);
    expect(screen.getByTestId("yaml").textContent).toMatch(/^---/);
  });

  it("puts what you type into the metadata block", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await user.type(screen.getByLabelText(/Who maintains it/i), "City of X");
    expect(screen.getByTestId("yaml").textContent)
      .toContain('civic.maintainer: "City of X"');
  });

  it("targets the submitter's own namespace in the hand-off", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await fill(user);
    expect(screen.getByTestId("handoff"))
      .toHaveAttribute("href", expect.stringContaining("skills%2Fcityofx%2F"));
  });
});

describe("Submit — findings report, and do not block", () => {
  it("attaches a finding to the field that caused it", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await user.type(screen.getByLabelText(/^Skill name/i), "Not A Valid Name");
    expect(screen.getByText(/lowercase alphanumeric words/i)).toBeInTheDocument();
  });

  it("leaves the hand-off usable with findings outstanding", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await fill(user);
    // No description, no category, no contact — plenty is wrong.
    expect(screen.getByTestId("findings-note")).toBeInTheDocument();
    expect(screen.getByTestId("handoff")).toHaveAttribute("href");
    expect(screen.getByTestId("handoff")).toHaveAttribute("aria-disabled", "false");
  });

  it("says the real checks run after you send it", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await fill(user);
    expect(screen.getByTestId("findings-note").textContent)
      .toMatch(/checks that count run after/i);
  });
});

describe("Submit — a dropped archive", () => {
  it("reports a clean archive without complaint", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await user.upload(screen.getByLabelText(/Upload the skill folder/i),
      file("skill.zip", { "s/SKILL.md": SKILL_MD, "s/scripts/x.py": "print(1)\n" }));
    expect(await screen.findByTestId("archive-result")).toHaveTextContent("2 files");
    expect(screen.queryByTestId("blocked")).not.toBeInTheDocument();
  });

  it("blocks the hand-off on a file type off the allowlist", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await fill(user);
    await user.upload(screen.getByLabelText(/Upload the skill folder/i),
      file("skill.zip", { "s/SKILL.md": SKILL_MD, "s/payload.exe": "MZ" }));
    expect(await screen.findByTestId("blocked")).toBeInTheDocument();
    expect(screen.getByTestId("handoff")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("handoff")).not.toHaveAttribute("href");
  });

  it("names the path that escapes the skill directory", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await user.upload(screen.getByLabelText(/Upload the skill folder/i),
      file("skill.zip", { "SKILL.md": SKILL_MD, "../escape.md": "x" }));
    expect(await screen.findByText(/escapes the skill directory/i)).toBeInTheDocument();
  });

  it("says so when the archive is corrupt", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    // Named .zip and not one — a truncated download, or a renamed file. The
    // input's accept filter stops most wrong types before this point, but it is
    // a hint to the file picker and not a guarantee.
    await user.upload(screen.getByLabelText(/Upload the skill folder/i),
      new File(["not a zip"], "skill.zip", { type: "application/zip" }));
    expect(await screen.findByText(/could not be read as a zip/i)).toBeInTheDocument();
  });
});

describe("Submit — flow 2", () => {
  const listed = makeSkill({
    id: "cityofx/permit-status-explainer", namespace: "cityofx",
    name: "permit-status-explainer", path: "skills/cityofx/permit-status-explainer",
  });

  it("offers the listings that are missing the fit fields", () => {
    render(<Submit repo={REPO} skills={[listed]} />);
    expect(screen.getByTestId("flow-two")).toHaveTextContent(listed.id);
  });

  it("links into GitHub's editor for the chosen skill", () => {
    render(<Submit repo={REPO} skills={[listed]} add="cityofx/permit-status-explainer" />);
    expect(screen.getByTestId("edit-handoff").querySelector("a"))
      .toHaveAttribute("href",
        `https://github.com/${REPO}/edit/main/skills/cityofx/permit-status-explainer/SKILL.md`);
  });

  it("gives the lines to paste, because GitHub prefills new files only", () => {
    render(<Submit repo={REPO} skills={[listed]} add="cityofx/permit-status-explainer" />);
    expect(screen.getByTestId("edit-handoff")).toHaveTextContent("civic.avoid-when");
  });
});

describe("Submit — the URL budget", () => {
  it("offers the copy path instead of a link GitHub would fail on", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await fill(user);
    // Pasted rather than typed: 4,000 characters through userEvent.type would
    // dispatch 4,000 keystrokes and re-render on each one.
    const useWhen = screen.getByLabelText(/When is this useful/i);
    await user.click(useWhen);
    await user.paste("x".repeat(6000));
    expect(await screen.findByTestId("url-too-long")).toBeInTheDocument();
    expect(screen.queryByTestId("handoff")).not.toBeInTheDocument();
  });
});

/** Arriving with a skill already written is the common case, so it is the first
 *  thing on the page and it fills the form rather than asking for it twice. */
describe("Submit — pasting a skill you already have", () => {
  it("fills the form from a pasted SKILL.md", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await user.click(screen.getByLabelText(/paste your SKILL\.md/i));
    await user.paste(SKILL_MD);
    expect(screen.getByLabelText(/^Skill name/i)).toHaveValue("permit-status-explainer");
    expect(screen.getByTestId("yaml").textContent).toContain("permit-status-explainer");
  });

  it("says what is wrong rather than silently ignoring it", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await user.click(screen.getByLabelText(/paste your SKILL\.md/i));
    await user.paste("# no frontmatter here");
    expect(screen.getByTestId("parse-notes")).toHaveTextContent("---");
  });

  it("fills the form from an uploaded archive too", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await user.upload(screen.getByLabelText(/Upload the skill folder/i),
      file("skill.zip", { "s/SKILL.md": SKILL_MD }));
    expect(await screen.findByDisplayValue("permit-status-explainer")).toBeInTheDocument();
  });
});

describe("Submit — plain language", () => {
  it("puts no schema field names in front of the submitter", () => {
    render(<Submit repo={REPO} skills={[]} />);
    for (const label of screen.getAllByText(/./, { selector: "label" })) {
      expect(label.textContent ?? "").not.toMatch(/civic\./);
    }
  });

  it("rewrites a finding to name the question, not the key", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await user.type(screen.getByLabelText(/GitHub username/i), "cityofx");
    const notes = screen.getAllByText(/is required/i, { selector: ".field__finding" });
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) expect(note.textContent).not.toMatch(/civic\./);
  });
});

/** Not everyone has a GitHub account. The email path exists for them, and says
 *  plainly what it costs: a maintainer commits it, so the skill lands under the
 *  project's namespace rather than the sender's. */
describe("Submit — the email path", () => {
  it("offers it, carrying the details so nobody retypes them", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await user.type(screen.getByLabelText(/Who maintains it/i), "City of X");
    const link = screen.getByTestId("email-handoff");
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain("City of X");
  });

  it("says the listing will not be under the sender's name", () => {
    render(<Submit repo={REPO} skills={[]} />);
    expect(screen.getByTestId("email-handoff").closest("p")?.textContent)
      .toMatch(/under the project['\u2019]s name rather than yours/i);
  });

  it("falls back to a plain address when the body would be truncated", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} />);
    await user.click(screen.getByLabelText(/When is this useful/i));
    await user.paste("x".repeat(8000));
    expect(await screen.findByTestId("email-too-long")).toBeInTheDocument();
    expect(screen.queryByTestId("email-handoff")).not.toBeInTheDocument();
  });
});
