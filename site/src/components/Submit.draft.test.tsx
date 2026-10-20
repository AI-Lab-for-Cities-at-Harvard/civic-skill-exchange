/** Keep the draft through the fork round trip (#294, spike finding S-5).
 *
 *  Step 2 sends the submitter to GitHub to fork, and coming back used to wipe
 *  every answer and the uploaded zip. These pin the way back: answers saved as
 *  they are typed, restored with a plain statement that they were, uploads
 *  named and asked for again, "Start over" to clear it, and a page that still
 *  works when the browser will not let it save.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zipSync, strToU8 } from "fflate";
import { Submit } from "./Submit";
import { DEFAULT_LOCALE, setLocale } from "../i18n/strings";
import { draftKey, readDraft } from "../lib/draftStore";
import { makeSkill } from "../test/fixtures";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
const SKILL = draftKey({ route: "skill" });
const PLUGIN_KEY = draftKey({ route: "plugin" });

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

const PLUGIN_ZIP = () => zip("housing-dashboards.zip", {
  "housing-dashboards/plugin.json": JSON.stringify({
    name: "housing-dashboards", version: "0.3.4", license: "MIT",
    description: "Housing dashboards, refreshes and briefs for any U.S. city or county.",
  }),
  "housing-dashboards/skills/housing-brief/SKILL.md":
    SKILL_MD.replace("permit-status-explainer", "housing-brief"),
});

const archiveInput = () => screen.getByLabelText(/upload the skill folder/i);
const username = () => screen.getByLabelText(/GitHub username/i);

/** The debounce, waited out. */
const saved = (key = SKILL) => waitFor(() => expect(readDraft(key)).not.toBeNull());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => { localStorage.clear(); });
afterEach(async () => { vi.restoreAllMocks(); await setLocale(DEFAULT_LOCALE); });

describe("saving as you type", () => {
  it("saves the answers under the skill route's key", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "cityofx");
    await saved();
    await waitFor(() => {
      const data = readDraft(SKILL)!.data as { draft: { author: string } };
      expect(data.draft.author).toBe("cityofx");
    });
  });

  it("saves nothing while the form is blank", async () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await wait(700);
    expect(localStorage.length).toBe(0);
    expect(screen.queryByTestId("draft-bar")).not.toBeInTheDocument();
  });

  it("stores only what was typed into the form: no tokens, nothing beside the answers", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "cityofx");
    await saved();
    const raw = localStorage.getItem(SKILL)!;
    expect(raw).not.toMatch(/token|authorization|bearer/i);
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(["data", "savedAt", "v"]);
  });

  it("keeps the fork address the submitter typed", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "cityofx");
    await user.upload(archiveInput(),
      zip("a.zip", { "a/SKILL.md": SKILL_MD, "a/scripts/x.sh": "echo" }));
    await screen.findByTestId("archive-result");
    const fork = await screen.findByLabelText(/address of your copy/i);
    await user.type(fork, "cityofx/my-fork");
    await waitFor(() => expect(localStorage.getItem(SKILL)).toContain("cityofx/my-fork"));
  });
});

describe("restoring", () => {
  it("brings the answers back after a reload, and says it did", async () => {
    const user = userEvent.setup();
    const first = render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "cityofx");
    await user.type(screen.getByLabelText(/^Skill name/i), "My Skill");
    await waitFor(() => expect(localStorage.getItem(SKILL)).toContain("My Skill"));
    first.unmount();

    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(username()).toHaveValue("cityofx");
    expect(screen.getByLabelText(/^Skill name/i)).toHaveValue("My Skill");
    expect(screen.getByTestId("draft-restored")).toHaveTextContent(/restored/i);
  });

  it("does not claim a restore when nothing was saved", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.queryByTestId("draft-restored")).not.toBeInTheDocument();
  });

  it("restores the choice of 'other' language with its typed tag", async () => {
    const user = userEvent.setup();
    const first = render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.selectOptions(screen.getByLabelText(/what language is it written in/i), "other");
    await user.type(screen.getByLabelText(/its language tag/i), "qu");
    await waitFor(() => expect(localStorage.getItem(SKILL)).toContain('"qu"'));
    first.unmount();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByLabelText(/its language tag/i)).toHaveValue("qu");
  });

  it("says so in Spanish, with the Spanish words", async () => {
    await setLocale("es");
    localStorage.setItem(SKILL, JSON.stringify({
      v: 1, data: { draft: { author: "cityofx" } },
    }));
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByTestId("draft-restored")).toHaveTextContent(/restaur/i);
    expect(screen.getByTestId("start-over")).toHaveTextContent(/empezar de nuevo/i);
  });

  it("ignores a draft saved under another schema version", () => {
    localStorage.setItem(SKILL, JSON.stringify({ v: 999, data: { draft: { author: "cityofx" } } }));
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(username()).toHaveValue("");
    expect(screen.queryByTestId("draft-restored")).not.toBeInTheDocument();
  });

  it("ignores garbage rather than crashing", () => {
    localStorage.setItem(SKILL, "{not json");
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(username()).toHaveValue("");
  });

  it("ignores values of the wrong type inside an otherwise good draft", () => {
    localStorage.setItem(SKILL, JSON.stringify({
      v: 1, data: { draft: { author: 7, name: "ok-name" }, typedName: ["x"], forkInput: 3 },
    }));
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(username()).toHaveValue("");
  });
});

describe("files — what cannot be kept is named, and asked for again", () => {
  const folder = () => zip("my-skill.zip", {
    "my-skill/SKILL.md": SKILL_MD, "my-skill/scripts/run.sh": "echo SECRET-BODY-MARKER",
  });

  it("names an uploaded zip, restores the answers, and does not store its contents", async () => {
    const user = userEvent.setup();
    const first = render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), folder());
    await screen.findByTestId("archive-result");
    await saved();
    await waitFor(() => expect(localStorage.getItem(SKILL)).toContain("my-skill.zip"));
    expect(localStorage.getItem(SKILL)).not.toContain("SECRET-BODY-MARKER");
    first.unmount();

    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByLabelText(/^Skill name/i)).toHaveValue("permit-status-explainer");
    expect(screen.getByTestId("draft-not-kept")).toHaveTextContent("my-skill.zip");
    // Asked for again: the upload box is there to be used.
    expect(archiveInput()).toBeInTheDocument();
  });

  it("keeps answers typed after the first upload when the zip is chosen again", async () => {
    const user = userEvent.setup();
    const first = render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), folder());
    await screen.findByTestId("archive-result");
    await user.type(screen.getByLabelText(/Who maintains it/i), "City of X");
    await waitFor(() => expect(localStorage.getItem(SKILL)).toContain("City of X"));
    first.unmount();

    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), folder());
    await screen.findByTestId("archive-result");
    expect(screen.getByLabelText(/Who maintains it/i)).toHaveValue("City of X");
  });

  it("keeps pasted SKILL.md text, which was typed and is small, and names nothing missing", async () => {
    const first = render(<Submit repo={REPO} skills={[]} mode="new" />);
    fireEvent.change(screen.getByLabelText(/paste/i), { target: { value: SKILL_MD } });
    await waitFor(() => expect(localStorage.getItem(SKILL)).toContain("Body."));
    first.unmount();

    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByLabelText(/paste/i)).toHaveValue(SKILL_MD);
    expect(screen.queryByTestId("draft-not-kept")).not.toBeInTheDocument();
    expect(screen.getByTestId("yaml").textContent).toContain("permit-status-explainer");
  });

  it("does not store pasted text over the cap, and names it on restore", async () => {
    const first = render(<Submit repo={REPO} skills={[]} mode="new" />);
    await userEvent.setup().type(username(), "cityofx");
    fireEvent.change(screen.getByLabelText(/paste/i), {
      target: { value: SKILL_MD + "x".repeat(200_000) },
    });
    await waitFor(() => expect(localStorage.getItem(SKILL)).not.toBeNull());
    await wait(700);
    expect(localStorage.getItem(SKILL)!.length).toBeLessThan(100_000);
    first.unmount();

    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByTestId("draft-not-kept")).toHaveTextContent(/paste/i);
  });
});

describe("Start over", () => {
  it("clears the form and the saved draft, and stays cleared", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "cityofx");
    await saved();
    await user.click(screen.getByTestId("start-over"));
    expect(username()).toHaveValue("");
    expect(localStorage.getItem(SKILL)).toBeNull();
    expect(screen.queryByTestId("draft-bar")).not.toBeInTheDocument();
    await wait(700);
    expect(localStorage.getItem(SKILL)).toBeNull();
  });

  it("also forgets an uploaded zip", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), zip("a.zip", { "a/SKILL.md": SKILL_MD }));
    await screen.findByTestId("archive-result");
    await user.click(screen.getByTestId("start-over"));
    expect(screen.queryByTestId("archive-result")).not.toBeInTheDocument();
  });

  it("is offered as soon as there is something to clear", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.queryByTestId("start-over")).not.toBeInTheDocument();
    await user.type(username(), "c");
    expect(screen.getByTestId("start-over")).toBeInTheDocument();
  });
});

describe("storage that will not cooperate", () => {
  it("renders and takes input when every storage call throws, and says it cannot save", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "cityofx");
    expect(username()).toHaveValue("cityofx");
    await waitFor(() => expect(screen.getByTestId("draft-unsaved")).toBeInTheDocument());
    await user.click(screen.getByTestId("start-over"));
    expect(username()).toHaveValue("");
  });

  it("renders when reaching localStorage throws", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "cityofx");
    expect(username()).toHaveValue("cityofx");
  });
});

describe("each route keeps its own", () => {
  it("update mode saves nothing of its own and leaves the skill draft alone", async () => {
    localStorage.setItem(SKILL, JSON.stringify({ v: 1, data: { draft: { author: "cityofx" } } }));
    const listed = makeSkill({ id: "ns/example-skill", namespace: "ns", name: "example-skill" });
    render(<Submit repo={REPO} skills={[listed]} mode="update" add="ns/example-skill" />);
    await wait(700);
    expect(readDraft(SKILL)).not.toBeNull();
    expect(localStorage.length).toBe(1);
    expect(screen.queryByTestId("draft-bar")).not.toBeInTheDocument();
  });

  it("a plugin dropped on the skill page saves under the plugin key, not the skill key", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), PLUGIN_ZIP());
    const mode = await screen.findByTestId("plugin-mode");
    await user.type(within(mode).getByLabelText(/GitHub username/i), "cityofx");
    await saved(PLUGIN_KEY);
    expect(readDraft(SKILL)).toBeNull();
  });
});

describe("the plugin route", () => {
  async function dropAndType(user: ReturnType<typeof userEvent.setup>) {
    const first = render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), PLUGIN_ZIP());
    const mode = await screen.findByTestId("plugin-mode");
    await user.type(within(mode).getByLabelText(/GitHub username/i), "cityofx");
    await user.type(within(mode).getByLabelText(/Who maintains it/i), "City of X");
    await waitFor(() => expect(localStorage.getItem(PLUGIN_KEY)).toContain("City of X"));
    first.unmount();
  }

  it("after a reload names the folder, and asks for it again", async () => {
    const user = userEvent.setup();
    await dropAndType(user);
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByTestId("draft-plugin-pending")).toHaveTextContent("housing-dashboards");
  });

  it("fills the answers back in when the same folder is dropped again", async () => {
    const user = userEvent.setup();
    await dropAndType(user);
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), PLUGIN_ZIP());
    const mode = await screen.findByTestId("plugin-mode");
    expect(within(mode).getByLabelText(/GitHub username/i)).toHaveValue("cityofx");
    expect(within(mode).getByLabelText(/Who maintains it/i)).toHaveValue("City of X");
    expect(within(mode).getByTestId("draft-restored")).toHaveTextContent(/restored/i);
  });

  it("does not put one plugin's answers into another plugin", async () => {
    const user = userEvent.setup();
    await dropAndType(user);
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), zip("other.zip", {
      "other/plugin.json": JSON.stringify({
        name: "other", version: "1.0.0", license: "MIT",
        description: "Another plugin, with a description long enough to be real.",
      }),
      "other/skills/s/SKILL.md": SKILL_MD.replace("permit-status-explainer", "s"),
    }));
    const mode = await screen.findByTestId("plugin-mode");
    expect(within(mode).getByLabelText(/GitHub username/i)).toHaveValue("");
    expect(within(mode).queryByTestId("draft-restored")).not.toBeInTheDocument();
  });

  it("Start over on the plugin page clears the plugin draft only", async () => {
    const user = userEvent.setup();
    await dropAndType(user);
    localStorage.setItem(SKILL, JSON.stringify({ v: 1, data: { draft: { author: "someone" } } }));
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), PLUGIN_ZIP());
    const mode = await screen.findByTestId("plugin-mode");
    await user.click(within(mode).getByTestId("start-over"));
    expect(within(mode).getByLabelText(/GitHub username/i)).toHaveValue("");
    expect(localStorage.getItem(PLUGIN_KEY)).toBeNull();
    expect(readDraft(SKILL)).not.toBeNull();
  });

  it("names the server addresses it did not keep", async () => {
    localStorage.setItem(PLUGIN_KEY, JSON.stringify({ v: 1, data: {
      directoryName: "housing-dashboards", draft: { author: "cityofx" }, addressesTyped: 1,
    } }));
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(archiveInput(), PLUGIN_ZIP());
    const mode = await screen.findByTestId("plugin-mode");
    expect(within(mode).getByTestId("draft-not-kept")).toHaveTextContent(/address/i);
  });
});
