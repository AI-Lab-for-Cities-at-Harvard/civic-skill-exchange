/** A required question is asked where it is visible, an error reads in the
 *  page's own words, and the page says one thing about how it is doing (#295;
 *  S-3 and S-9 of the end-to-end spike).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zipSync, strToU8 } from "fflate";
import { Submit } from "./Submit";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
type User = ReturnType<typeof userEvent.setup>;

const box = (id: string) => document.getElementById(id) as HTMLElement;

/** Every answer but the organization, which only a team or an organization owes. */
async function answerAllButOrganization(user: User, deployment = "team") {
  await user.type(box("namespace"), "cityofx");
  await user.type(box("name"), "permit-status-explainer");
  await user.type(box("description"),
    "Explains why a building permit is stuck, in plain language.");
  await user.selectOptions(box("license"), "MIT");
  await user.selectOptions(box("civic.category"), "policy");
  await user.selectOptions(box("civic.scope"), "municipal");
  await user.selectOptions(box("civic.language"), "en");
  await user.selectOptions(box("civic.data-sensitivity"), "none");
  await user.selectOptions(box("civic.human-review"), "advisory-only");
  await user.type(box("civic.maintainer"), "Test Suite");
  await user.selectOptions(box("civic.affiliation"), "individual");
  await user.selectOptions(box("civic.deployment"), deployment);
}

const hidden = (el: HTMLElement) => el.closest("details:not([open])") !== null;

describe("Submit — a missing required question is never hidden", () => {
  it("shows the one remaining question, with its error, outside any closed section", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await answerAllButOrganization(user, "team");

    const organization = box("civic.deployed-at");
    expect(organization).toBeInTheDocument();
    expect(hidden(organization)).toBe(false);
    // Its own error sits beside it, and is the only one left.
    expect(organization.closest(".field")!.querySelector(".field__finding"))
      .not.toBeNull();
    expect(document.querySelectorAll(".field__finding")).toHaveLength(1);
  });

  it("does the same for a whole organization", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await answerAllButOrganization(user, "organization");
    expect(hidden(box("civic.deployed-at"))).toBe(false);
  });

  it("keeps the organization optional, and tucked away, for someone who owes none", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await answerAllButOrganization(user, "personal");
    expect(document.querySelectorAll(".field__finding")).toHaveLength(0);
    expect(hidden(box("civic.deployed-at"))).toBe(true);
  });
});

describe("Submit — errors in the page's own words", () => {
  it("mentions no civic.* key or YAML value in any error it shows", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await answerAllButOrganization(user, "team");
    // Then make several more answers contradict one another.
    await user.type(box("civic.jurisdiction"), "nowhere in particular");
    await user.selectOptions(box("civic.localization"), "generalized");
    await user.selectOptions(box("civic.deployment"), "none");
    await user.type(box("civic.deployed-at"), "City of X");

    const shown = [...document.querySelectorAll(".field__finding, .submit__findings li")]
      .map((n) => n.textContent ?? "");
    expect(shown.length).toBeGreaterThan(1);
    for (const text of shown) {
      expect(text).not.toMatch(/civic\./);
      expect(text).not.toMatch(/: '?(none|personal|team|organization|generalized|localized|any)\b/);
    }
  });
});

describe("Submit — one status, which agrees with the findings", () => {
  const ZIP = () => new File([zipSync({
    "s/SKILL.md": strToU8("---\nname: s\ndescription: x\n---\nBody.\n"),
  })], "skill.zip", { type: "application/zip" });

  it("never says nothing is left beside a count of what is", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(screen.getByLabelText(/Upload the skill folder/i), ZIP());
    await screen.findByTestId("archive-result");

    const status = screen.getAllByTestId("status");
    expect(status).toHaveLength(1);
    expect(status[0]!.textContent).toMatch(/\d+ things? still to fill in/i);
    expect(status[0]!.textContent).not.toMatch(/nothing/i);
    // Where "Nothing else to fix" used to sit, beside the count.
    expect(screen.getByTestId("archive-result").textContent).not.toMatch(/nothing/i);
  });

  it("says it is all clear only once every finding is gone", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await answerAllButOrganization(user, "team");
    expect(screen.getByTestId("status").textContent).toMatch(/1 thing still to fill in/i);

    await user.type(box("civic.deployed-at"), "City of X");
    expect(screen.getAllByTestId("status")).toHaveLength(1);
    expect(screen.getByTestId("status").textContent).not.toMatch(/still to fill in/i);
    expect(screen.getByTestId("status").textContent).toMatch(/nothing left/i);
  });
});
