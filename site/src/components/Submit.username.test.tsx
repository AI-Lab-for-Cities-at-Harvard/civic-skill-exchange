/** #293: the username is checked before the page hands off, on both routes.
 *
 *  From the end-to-end run (docs/spikes/end-to-end-submission-and-install.md):
 *  - S-1: the box said `sgarcese`, the fork was `sgarcese-hbs`'s, the files went
 *    to `skills/sgarcese/…`, and nothing warned. The ownership check failed only
 *    after the pull request.
 *  - S-2: with the box empty, the page rendered `skills//…` and `plugins//…`.
 *  - S-8: the registry itself was accepted as "the address of your copy".
 *
 *  Every GitHub call is stubbed. The lookup is unauthenticated and public
 *  (ADR 0003), and a test that reached the network would spend the rate limit
 *  it is about. */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zipSync, strToU8 } from "fflate";
import { Submit } from "./Submit";
import { DEFAULT_LOCALE, setLocale } from "../i18n/strings";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

const SKILL_MD = `---
name: permit-status-explainer
description: Explains why a building permit is stuck, in plain language.
---
Body.
`;

const PLUGIN_SKILL = `---
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

function zip(name: string, entries: Record<string, string>): File {
  const bytes = zipSync(Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k, strToU8(v)]),
  ));
  return new File([bytes], name, { type: "application/zip" });
}

const MULTI = () => zip("skill.zip", {
  "permit-status-explainer/SKILL.md": SKILL_MD,
  "permit-status-explainer/scripts/reading_level.py": "print(1)\n",
});

const PLUGIN = () => zip("housing-dashboards.zip", {
  "housing-dashboards/plugin.json": JSON.stringify({
    name: "housing-dashboards", version: "0.3.4", license: "MIT",
    description: "Housing dashboards, refreshes and briefs for any U.S. city or county.",
  }),
  "housing-dashboards/skills/housing-brief/SKILL.md": PLUGIN_SKILL,
});

const username = () => screen.getByLabelText(/GitHub username/i);
const forkBox = () => screen.getByLabelText(/address of your copy/i);

/** The lookup answers with `status`; nothing else is fetched in these flows. */
function answer(status: number) {
  const fetchMock = vi.fn().mockResolvedValue({ status, ok: status < 300 });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function skillFlow(user: ReturnType<typeof userEvent.setup>) {
  render(<Submit repo={REPO} skills={[]} mode="new" />);
  await user.upload(
    screen.getByLabelText(/upload the skill folder|suba la carpeta/i), MULTI());
  await screen.findByTestId("archive-result");
}

async function pluginFlow(user: ReturnType<typeof userEvent.setup>) {
  render(<Submit repo={REPO} skills={[]} mode="new" />);
  await user.upload(screen.getByLabelText(/upload the skill folder/i), PLUGIN());
  await screen.findByTestId("plugin-mode");
}

/** Every text node and every attribute, so a path cannot hide in an href. */
const everything = () => document.body.innerHTML;

const settle = () => new Promise((r) => setTimeout(r, 700));

afterEach(async () => {
  vi.unstubAllGlobals();
  await setLocale(DEFAULT_LOCALE);
});

describe("an empty username box withholds every path (S-2)", () => {
  it("renders no skills// before anything is typed", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(everything()).not.toMatch(/skills\/\/|skills%2F%2F/);
  });

  it("withholds the one-file hand-off and the recipe, and says why", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/^Skill name/i), "permit-status-explainer");
    expect(screen.getByTestId("handoff")).not.toHaveAttribute("href");
    expect(screen.queryByTestId("command-line")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("username-needed").length).toBeGreaterThan(0);
    expect(everything()).not.toMatch(/skills\/\/|skills%2F%2F/);
  });

  it("withholds the download, the upload link and the recipe for a folder", async () => {
    answer(200);
    const user = userEvent.setup();
    await skillFlow(user);
    await user.type(forkBox(), "github.com/sgarcese/civic-skill-exchange");
    expect(screen.getByTestId("download-folder")).toBeDisabled();
    expect(screen.queryByTestId("step-upload")).not.toBeInTheDocument();
    expect(screen.queryByTestId("step-pr")).not.toBeInTheDocument();
    expect(screen.queryByTestId("command-line")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("username-needed").length).toBeGreaterThan(0);
    expect(everything()).not.toMatch(/skills\/\/|skills%2F%2F/);
  });

  it("gives them all back once a username is typed", async () => {
    answer(200);
    const user = userEvent.setup();
    await skillFlow(user);
    await user.type(username(), "sgarcese");
    await user.type(forkBox(), "github.com/sgarcese/civic-skill-exchange");
    expect(screen.getByTestId("download-folder")).toBeEnabled();
    expect(screen.getByTestId("step-upload")).toHaveAttribute("href",
      expect.stringContaining("/skills/sgarcese/permit-status-explainer/skills"));
    expect(screen.getByTestId("command-line")).toHaveTextContent("skills/sgarcese/");
    expect(screen.queryByTestId("username-needed")).not.toBeInTheDocument();
  });

  it("renders no plugins// on the plugin route", async () => {
    answer(200);
    const user = userEvent.setup();
    await pluginFlow(user);
    await user.type(forkBox(), "github.com/sgarcese/civic-skill-exchange");
    expect(screen.getByTestId("download-folder")).toBeDisabled();
    expect(screen.queryByTestId("step-upload")).not.toBeInTheDocument();
    expect(screen.queryByTestId("command-line")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("username-needed").length).toBeGreaterThan(0);
    expect(everything()).not.toMatch(/plugins\/\/|skills\/\//);
  });
});

describe("the fork's owner is compared with the username (S-1)", () => {
  it("says so when the fork is under a different account, before the upload link", async () => {
    answer(200);
    const user = userEvent.setup();
    await skillFlow(user);
    await user.type(username(), "sgarcese");
    await user.type(forkBox(), "https://github.com/sgarcese-hbs/civic-skill-exchange");
    const warning = screen.getByTestId("fork-mismatch");
    expect(warning).toHaveTextContent("sgarcese-hbs");
    expect(warning).toHaveTextContent(/sgarcese\b/);
    const upload = screen.getByTestId("step-upload");
    // Earlier in the page than the link it is about.
    expect(warning.compareDocumentPosition(upload) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it("does not fill the username in from the fork", async () => {
    answer(200);
    const user = userEvent.setup();
    await skillFlow(user);
    await user.type(forkBox(), "https://github.com/sgarcese-hbs/civic-skill-exchange");
    expect(username()).toHaveValue("");
  });

  it("says nothing when they are the same account, whatever the case", async () => {
    answer(200);
    const user = userEvent.setup();
    await skillFlow(user);
    await user.type(username(), "SGarcese");
    await user.type(forkBox(), "github.com/sgarcese/my-copy");
    expect(screen.queryByTestId("fork-mismatch")).not.toBeInTheDocument();
  });

  it("does the same on the plugin route", async () => {
    answer(200);
    const user = userEvent.setup();
    await pluginFlow(user);
    await user.type(username(), "sgarcese");
    await user.type(forkBox(), "sgarcese-hbs/civic-skill-exchange");
    expect(screen.getByTestId("fork-mismatch")).toHaveTextContent("sgarcese-hbs");
  });

  it("says it in Spanish", async () => {
    answer(200);
    await setLocale("es");
    const user = userEvent.setup();
    await skillFlow(user);
    await user.type(screen.getByLabelText(/usuario de GitHub/i), "sgarcese");
    await user.type(screen.getByLabelText(/dirección de su copia/i), "sgarcese-hbs/my-copy");
    expect(screen.getByTestId("fork-mismatch")).toHaveTextContent(/Su copia está en/);
  });
});

describe("the registry's own address is refused as your copy (S-8)", () => {
  it.each([
    REPO,
    "https://github.com/ai-lab-for-cities-at-harvard/Civic-Skill-Exchange",
  ])("refuses %s and says to fork first", async (address) => {
    answer(200);
    const user = userEvent.setup();
    await skillFlow(user);
    await user.type(username(), "sgarcese");
    await user.type(forkBox(), address);
    expect(screen.getByTestId("fork-is-registry")).toHaveTextContent(/fork/i);
    expect(screen.queryByTestId("fork-mismatch")).not.toBeInTheDocument();
    expect(screen.queryByTestId("step-upload")).not.toBeInTheDocument();
    expect(screen.queryByTestId("step-pr")).not.toBeInTheDocument();
    expect(screen.getByTestId("command-line").textContent)
      .not.toMatch(/github\.com\/ai-lab-for-cities-at-harvard/i);
  });

  it("refuses it on the plugin route too", async () => {
    answer(200);
    const user = userEvent.setup();
    await pluginFlow(user);
    await user.type(username(), "sgarcese");
    await user.type(forkBox(), REPO);
    expect(screen.getByTestId("fork-is-registry")).toBeInTheDocument();
    expect(screen.queryByTestId("step-upload")).not.toBeInTheDocument();
  });
});

describe("the public lookup (api.github.com/users/{name})", () => {
  it.each([403, 429])("says it could not check on a %i, and does not block", async (status) => {
    answer(status);
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "sgarcese");
    await user.type(screen.getByLabelText(/^Skill name/i), "a-skill");
    expect(await screen.findByTestId("user-unchecked")).toHaveTextContent("sgarcese");
    expect(screen.queryByTestId("no-such-user")).not.toBeInTheDocument();
    expect(screen.getByTestId("handoff")).toHaveAttribute("href");
  });

  it("says it could not check when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "sgarcese");
    expect(await screen.findByTestId("user-unchecked")).toBeInTheDocument();
  });

  it("asks the public endpoint, unauthenticated", async () => {
    const fetchMock = answer(200);
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "sgarcese");
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.github.com/users/sgarcese");
    expect(JSON.stringify(init?.headers ?? {})).not.toMatch(/authorization/i);
    expect(screen.queryByTestId("user-unchecked")).not.toBeInTheDocument();
  });

  it("spends no request on a name that is not a GitHub username", async () => {
    const fetchMock = answer(200);
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "Maria Lopez");
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("user-unchecked")).not.toBeInTheDocument();
  });

  it("does not leave the last name's verdict on a new one", async () => {
    answer(404);
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(username(), "sgarcees");
    await screen.findByTestId("no-such-user");
    await user.type(username(), "x");
    expect(screen.queryByTestId("no-such-user")).not.toBeInTheDocument();
  });

  it("checks on the plugin route too, without a request for a bad name", async () => {
    const fetchMock = answer(429);
    const user = userEvent.setup();
    await pluginFlow(user);
    await user.type(username(), "Maria Lopez");
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    await user.clear(username());
    await user.type(username(), "sgarcese");
    expect(await screen.findByTestId("user-unchecked")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says it could not check in Spanish", async () => {
    answer(403);
    await setLocale("es");
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/usuario de GitHub/i), "sgarcese");
    expect(await screen.findByTestId("user-unchecked")).toHaveTextContent(/No se pudo comprobar/);
  });
});
