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

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zipSync, strToU8 } from "fflate";
import { Submit, SUBMISSIONS_EMAIL } from "./Submit";
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
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByTestId("yaml").textContent).toMatch(/^---/);
  });

  it("puts what you type into the metadata block", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/Who maintains it/i), "City of X");
    expect(screen.getByTestId("yaml").textContent)
      .toContain('civic.maintainer: "City of X"');
  });

  it("targets the submitter's own namespace in the hand-off", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await fill(user);
    expect(screen.getByTestId("handoff"))
      .toHaveAttribute("href", expect.stringContaining("skills%2Fcityofx%2F"));
  });
});

describe("Submit — findings report, and do not block", () => {
  it("attaches a finding to the field that caused it", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/Description/i), "too short");
    expect(screen.getByText(/at least 40 characters/i)).toBeInTheDocument();
  });

  it("leaves the hand-off usable with findings outstanding", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await fill(user);
    // No description, no category, no contact — plenty is wrong.
    expect(screen.getByTestId("findings-note")).toBeInTheDocument();
    expect(screen.getByTestId("handoff")).toHaveAttribute("href");
    expect(screen.getByTestId("handoff")).toHaveAttribute("aria-disabled", "false");
  });

  it("says the real checks run after you send it", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await fill(user);
    expect(screen.getByTestId("findings-note").textContent)
      .toMatch(/checks that count run after/i);
  });
});

describe("Submit — a dropped archive", () => {
  it("reports a clean archive without complaint", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(screen.getByLabelText(/Upload the skill folder/i),
      file("skill.zip", { "s/SKILL.md": SKILL_MD, "s/scripts/x.py": "print(1)\n" }));
    expect(await screen.findByTestId("archive-result")).toHaveTextContent("2 files");
    expect(screen.queryByTestId("blocked")).not.toBeInTheDocument();
  });

  it("blocks the hand-off on a file type off the allowlist", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await fill(user);
    await user.upload(screen.getByLabelText(/Upload the skill folder/i),
      file("skill.zip", { "s/SKILL.md": SKILL_MD, "s/payload.exe": "MZ" }));
    expect(await screen.findByTestId("blocked")).toBeInTheDocument();
    // Two files, so the hand-off is the folder path — and the folder is what
    // must not leave the page while a blocked file type is still in it.
    expect(screen.getByTestId("download-folder")).toBeDisabled();
  });

  it("names the path that escapes the skill directory", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(screen.getByLabelText(/Upload the skill folder/i),
      file("skill.zip", { "SKILL.md": SKILL_MD, "../escape.md": "x" }));
    expect(await screen.findByText(/escapes the skill directory/i)).toBeInTheDocument();
  });

  it("says so when the archive is corrupt", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
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
    render(<Submit repo={REPO} skills={[listed]} mode="update" />);
    expect(screen.getByTestId("flow-two")).toHaveTextContent(listed.id);
  });

  it("links into GitHub's editor for the chosen skill", () => {
    render(<Submit repo={REPO} skills={[listed]} mode="update"
        add="cityofx/permit-status-explainer" />);
    expect(screen.getByTestId("edit-handoff").querySelector("a"))
      .toHaveAttribute("href",
        `https://github.com/${REPO}/edit/main/skills/cityofx/permit-status-explainer/SKILL.md`);
  });

  it("gives the lines to paste, because GitHub prefills new files only", () => {
    render(<Submit repo={REPO} skills={[listed]} mode="update"
        add="cityofx/permit-status-explainer" />);
    expect(screen.getByTestId("edit-handoff")).toHaveTextContent("civic.avoid-when");
  });
});

describe("Submit — the URL budget", () => {
  it("offers the copy path instead of a link GitHub would fail on", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
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
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.click(screen.getByLabelText(/paste your SKILL\.md/i));
    await user.paste(SKILL_MD);
    expect(screen.getByLabelText(/^Skill name/i)).toHaveValue("permit-status-explainer");
    expect(screen.getByTestId("yaml").textContent).toContain("permit-status-explainer");
  });

  it("says what is wrong rather than silently ignoring it", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.click(screen.getByLabelText(/paste your SKILL\.md/i));
    await user.paste("# no frontmatter here");
    expect(screen.getByTestId("parse-notes")).toHaveTextContent("---");
  });

  it("fills the form from an uploaded archive too", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(screen.getByLabelText(/Upload the skill folder/i),
      file("skill.zip", { "s/SKILL.md": SKILL_MD }));
    expect(await screen.findByDisplayValue("permit-status-explainer")).toBeInTheDocument();
  });
});

describe("Submit — plain language", () => {
  it("puts no schema field names in front of the submitter", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    for (const label of screen.getAllByText(/./, { selector: "label" })) {
      expect(label.textContent ?? "").not.toMatch(/civic\./);
    }
  });

  it("rewrites a finding to name the question, not the key", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "cityofx");
    const notes = screen.getAllByText(/is required/i, { selector: ".field__finding" });
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) expect(note.textContent).not.toMatch(/civic\./);
  });
});

/** The email path is built and unwired: SUBMISSIONS_EMAIL is empty until the
 *  project has an inbox of its own. mailtoUrl's own behaviour is covered in
 *  submit.test.ts; what matters here is that nothing is published while there
 *  is no address to publish. */
describe("Submit — the email path stays off until there is an address", () => {
  it("publishes no address anywhere on the page", () => {
    const { container } = render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(SUBMISSIONS_EMAIL).toBe("");
    expect(container.querySelector('[href^="mailto:"]')).toBeNull();
    expect(container.textContent).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i);
  });

  it("offers no email handoff", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.queryByTestId("email-handoff")).not.toBeInTheDocument();
    expect(screen.queryByTestId("email-too-long")).not.toBeInTheDocument();
  });
});

/** Two jobs on one page, so the page has to say which one you are doing and let
 *  you cross over. Links rather than scripted tabs: each mode is a real URL, so
 *  it survives a bookmark, a shared link and the back button. */
describe("Submit — moving between the two modes", () => {
  it("shows only the builder when adding a new skill", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByLabelText(/^Skill name/i)).toBeInTheDocument();
    expect(screen.queryByTestId("flow-two")).not.toBeInTheDocument();
  });

  it("shows only the update section in update mode", () => {
    render(<Submit repo={REPO} skills={[]} mode="update" />);
    expect(screen.getByTestId("flow-two")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Skill name/i)).not.toBeInTheDocument();
  });

  it("marks which one you are on, for a screen reader as well as the eye", () => {
    render(<Submit repo={REPO} skills={[]} mode="update" />);
    expect(screen.getByTestId("mode-update")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("mode-new")).not.toHaveAttribute("aria-current");
  });

  it("offers both, from either side", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByTestId("mode-new")).toHaveAttribute("href", "#/submit");
    expect(screen.getByTestId("mode-update")).toHaveAttribute("href", "#/submit?mode=update");
  });

  it("does not warn about the community tier while updating an existing listing", () => {
    // Nothing is being listed, so the notice would be answering a question
    // nobody asked.
    render(<Submit repo={REPO} skills={[]} mode="update" />);
    expect(screen.queryByText(/community skill until it is reviewed/i))
      .not.toBeInTheDocument();
  });
});


/** A skill is rarely named the way the registry stores names. A repository
 *  called Civic-Analytics-Agent-Workflow-Claude-Skill is a perfectly ordinary
 *  name, and rejecting it would be the form making its own rule the
 *  submitter's problem. */
describe("Submit — the skill name", () => {
  it("accepts a real repository name and converts it", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/^Skill name/i),
      "Civic-Analytics-Agent-Workflow-Claude-Skill");
    expect(screen.getByTestId("yaml").textContent)
      .toContain('name: "civic-analytics-agent-workflow-claude-skill"');
  });

  it("shows what the name became, rather than silently changing it", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/^Skill name/i), "Permit Status Explainer");
    // In the hint beside the field, not only buried in the YAML further down.
    // Exact, so the YAML block further down — whose full text is the whole
    // document — is not also a match.
    expect(screen.getByText("permit-status-explainer", { selector: "code" }))
      .toBeInTheDocument();
  });

  it("leaves the box exactly as it was typed", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    const box = screen.getByLabelText(/^Skill name/i);
    await user.type(box, "Permit Status Explainer");
    // Rewriting under the cursor eats a hyphen the moment it is typed.
    expect(box).toHaveValue("Permit Status Explainer");
  });

  it("raises no complaint about a name it converted itself", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/^Skill name/i), "Permit Status Explainer");
    expect(screen.queryByText(/lowercase alphanumeric/i)).not.toBeInTheDocument();
  });

  it("puts the converted name in the GitHub path", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await user.type(screen.getByLabelText(/^Skill name/i),
      "Civic-Analytics-Agent-Workflow-Claude-Skill");
    expect(screen.getByTestId("handoff")).toHaveAttribute("href",
      expect.stringContaining("skills%2Fsgarcese%2Fcivic-analytics-agent-workflow-claude-skill"));
  });
});

/** The namespace has to equal the pull request author's login, because that is
 *  what validate.yml hands the validator. A typo here is a pull request that
 *  fails L1 — so it is worth catching before the round trip, and worth saying
 *  why rather than just marking it wrong. */
describe("Submit — checking the GitHub username", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  const answer = (status: number) =>
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status, ok: status < 300 }));

  it("warns when there is no such user", async () => {
    answer(404);
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcees");
    expect(await screen.findByTestId("no-such-user")).toBeInTheDocument();
  });

  it("says nothing about a real one", async () => {
    answer(200);
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await new Promise((r) => setTimeout(r, 700));
    expect(screen.queryByTestId("no-such-user")).not.toBeInTheDocument();
  });

  it("stays quiet when rate limited rather than warning wrongly", async () => {
    answer(403);
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await new Promise((r) => setTimeout(r, 700));
    expect(screen.queryByTestId("no-such-user")).not.toBeInTheDocument();
  });

  it("does not spend a request per keystroke", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcese");
    await new Promise((r) => setTimeout(r, 700));
    // Eight characters, one request. The limit is 60 an hour per address.
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("never blocks the hand-off on it", async () => {
    answer(404);
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcees");
    await user.type(screen.getByLabelText(/^Skill name/i), "a-skill");
    await screen.findByTestId("no-such-user");
    expect(screen.getByTestId("handoff")).toHaveAttribute("href");
  });
});

/** #63: a skill already on GitHub should not need downloading and re-uploading.
 *  The import copies the content in and records where it came from — the
 *  registry holds the files, which is what the SHA pin and the re-scan work
 *  against, so the listing survives the upstream being deleted. */
describe("Submit — importing from a repository", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  const SKILL = "---\nname: civic-analytics\ndescription: An example skill.\n---\nBody.\n";
  const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

  function github(tree?: unknown, status?: Record<string, number>) {
    return vi.fn(async (url: string) => {
      const which = /\/git\/trees\//.test(url) ? "tree"
        : /\/contents\//.test(url) ? "file"
        : /api\.github\.com\/users\//.test(url) ? "user" : "repo";
      const body = which === "tree"
        ? tree ?? { sha: "c".repeat(40), truncated: false,
                    tree: [{ path: "SKILL.md", type: "blob", size: 120 }] }
        : which === "file" ? { encoding: "base64", content: b64(SKILL) }
        : { default_branch: "main" };
      const code = status?.[which] ?? 200;
      return { status: code, ok: code < 300, json: async () => body };
    });
  }

  async function importInto(user: ReturnType<typeof userEvent.setup>, url: string) {
    await user.type(screen.getByLabelText(/GitHub repository/i), url);
    await user.click(screen.getByTestId("import"));
  }

  it("fills the form from the repository", async () => {
    vi.stubGlobal("fetch", github());
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await importInto(user, "github.com/sgarcese/Civic-Analytics");
    expect(await screen.findByTestId("imported")).toHaveTextContent("sgarcese/Civic-Analytics");
    expect(screen.getByLabelText(/^Skill name/i)).toHaveValue("civic-analytics");
  });

  it("records the repository and the exact commit it read", async () => {
    vi.stubGlobal("fetch", github());
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await importInto(user, "sgarcese/Civic-Analytics");
    await screen.findByTestId("imported");
    const yaml = screen.getByTestId("yaml").textContent ?? "";
    expect(yaml).toContain("civic.source-repo: sgarcese/Civic-Analytics");
    expect(yaml).toContain(`civic.source-commit: ${"c".repeat(40)}`);
  });

  it("takes the username from the repository owner", async () => {
    vi.stubGlobal("fetch", github());
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await importInto(user, "sgarcese/Civic-Analytics");
    await screen.findByTestId("imported");
    expect(screen.getByLabelText(/GitHub username/i)).toHaveValue("sgarcese");
  });

  it("runs the structural checks on the real file list", async () => {
    vi.stubGlobal("fetch", github({
      sha: "c".repeat(40), truncated: false,
      tree: [
        { path: "SKILL.md", type: "blob", size: 120 },
        { path: "payload.exe", type: "blob", size: 10 },
      ],
    }));
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await importInto(user, "sgarcese/Civic-Analytics");
    expect(await screen.findByTestId("blocked")).toBeInTheDocument();
  });

  it("says a rate limit is a rate limit", async () => {
    vi.stubGlobal("fetch", github(undefined, { repo: 403 }));
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await importInto(user, "sgarcese/Civic-Analytics");
    expect(await screen.findByTestId("parse-notes")).toHaveTextContent(/rate-limiting/i);
  });

  it("points at the upload path when the repository cannot be read", async () => {
    vi.stubGlobal("fetch", github(undefined, { repo: 404 }));
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await importInto(user, "sgarcese/Private-Thing");
    expect(await screen.findByTestId("parse-notes")).toHaveTextContent(/zip/i);
  });
});

/** What is left out is not the same as what is wrong.
 *
 *  The block exists for problems with what you are about to submit. A file that
 *  is not being copied is not one of those, so it is named and the hand-off
 *  stays open. */
describe("Submit — left out versus blocked", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("names a repository's own files without stopping anything", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await fill(user);
    await user.upload(screen.getByLabelText(/upload the skill folder/i),
      file("skill.zip", { "s/SKILL.md": SKILL_MD, "s/LICENSE": "MIT", "s/.gitignore": "node_modules" }));
    expect(await screen.findByTestId("left-out")).toHaveTextContent("LICENSE");
    expect(screen.queryByTestId("blocked")).not.toBeInTheDocument();
    expect(screen.getByTestId("handoff")).toHaveAttribute("href");
  });

  it("still blocks on a file type that would be copied in", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await fill(user);
    await user.upload(screen.getByLabelText(/upload the skill folder/i),
      file("skill.zip", { "s/SKILL.md": SKILL_MD, "s/payload.exe": "MZ" }));
    expect(await screen.findByTestId("blocked")).toBeInTheDocument();
  });
});

/** #68: the reserved namespace is the one place the ownership rule does not
 *  apply, and it was the one place the page warned.
 *
 *  checkFrontmatter skips the author check for RESERVED_NAMESPACES, because
 *  CODEOWNERS gates /skills/civic-skills/ to the maintainers team instead — a
 *  stronger control than a username match. There is no GitHub user called
 *  civic-skills, so the lookup 404s and the page said the submission would be
 *  rejected. Both halves were false. */
describe("Submit — the reserved namespace", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  const missing = () =>
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 404, ok: false }));

  it("does not warn that civic-skills is not a GitHub user", async () => {
    missing();
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "civic-skills");
    await new Promise((r) => setTimeout(r, 700));
    expect(screen.queryByTestId("no-such-user")).not.toBeInTheDocument();
  });

  it("says what actually governs that folder", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "civic-skills");
    expect(await screen.findByTestId("reserved-namespace")).toHaveTextContent(/approval/i);
  });

  it("spends no request on a namespace the rule exempts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 404, ok: false });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "civic-skills");
    await new Promise((r) => setTimeout(r, 700));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("raises no ownership finding, matching what the validator does", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "civic-skills");
    expect(screen.queryByText(/does not match the pull request author/i))
      .not.toBeInTheDocument();
  });

  it("still warns about a username that really is missing", async () => {
    missing();
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "sgarcees");
    expect(await screen.findByTestId("no-such-user")).toBeInTheDocument();
    expect(screen.queryByTestId("reserved-namespace")).not.toBeInTheDocument();
  });
});

/** #70: what the submitter brought has to reach the pull request.
 *
 *  The page used to rebuild SKILL.md out of form values and hand that to
 *  GitHub, so the body and every file beside it were dropped. These pin the
 *  correction: the file is amended, and a skill of more than one file goes
 *  through the fork-and-upload path rather than a single-file editor that
 *  cannot carry it.
 */
describe("Submit — the skill survives the hand-off", () => {
  const MULTI = () => file("skill.zip", {
    "permit-status-explainer/SKILL.md": SKILL_MD,
    "permit-status-explainer/scripts/reading_level.py": "print(1)\n",
    "permit-status-explainer/references/swaps.md": "# Swaps\n",
  });

  it("carries the body of a pasted SKILL.md into the hand-off, not just its frontmatter", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "cityofx");
    await user.click(screen.getByLabelText(/paste your SKILL.md/i));
    await user.paste(SKILL_MD);
    expect(screen.getByTestId("handoff"))
      .toHaveAttribute("href", expect.stringContaining("Body."));
  });

  it("keeps the fields the file already had rather than dropping them", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "cityofx");
    await user.click(screen.getByLabelText(/paste your SKILL.md/i));
    await user.paste(SKILL_MD);
    // URLSearchParams writes a space as `+`, which is correct for a query
    // string and is not what decodeURIComponent undoes.
    const href = decodeURIComponent(
      (screen.getByTestId("handoff").getAttribute("href") ?? "").replaceAll("+", " "),
    );
    expect(href).toContain("permit-status-explainer");
    expect(href).toContain("Explains why a building permit is stuck");
  });

  it("sends a multi-file skill through fork and upload, not the single-file editor", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(screen.getByLabelText(/upload the skill folder/i), MULTI());
    await screen.findByTestId("archive-result");
    // The name came out of the file; only the username is still missing.
    await user.type(screen.getByLabelText(/GitHub username/i), "cityofx");
    expect(screen.getByTestId("manual-steps")).toBeInTheDocument();
    expect(screen.queryByTestId("handoff")).not.toBeInTheDocument();
  });

  it("offers the corrected folder back, because GitHub cannot be prefilled with files", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(screen.getByLabelText(/upload the skill folder/i), MULTI());
    await screen.findByTestId("archive-result");
    // The name came out of the file; only the username is still missing.
    await user.type(screen.getByLabelText(/GitHub username/i), "cityofx");
    expect(screen.getByTestId("download-folder")).toBeInTheDocument();
  });

  it("offers no upload link until it knows where the fork actually is", async () => {
    /* Superseded the guessed URL this used to assert. #81: deriving
       {namespace}/{registry-name} is wrong when the namespace is reserved and
       wrong again when the fork is renamed, and a link that 404s mid-hand-off is
       how a skill ended up committed at the repository root. */
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(screen.getByLabelText(/upload the skill folder/i), MULTI());
    await screen.findByTestId("archive-result");
    // The name came out of the file; only the username is still missing.
    await user.type(screen.getByLabelText(/GitHub username/i), "cityofx");
    expect(screen.queryByTestId("step-upload")).not.toBeInTheDocument();
    expect(screen.getByTestId("upload-waiting")).toBeInTheDocument();
  });

  it("shows which fields it read, so they are not asked for twice", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.click(screen.getByLabelText(/paste your SKILL.md/i));
    await user.paste(SKILL_MD);
    expect(screen.getByTestId("from-file")).toHaveTextContent(/description/i);
  });

  it("does not claim it copied files in when it only read them", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.queryByText(/copy them in/i)).not.toBeInTheDocument();
  });
});

/** A GitHub account is a hard prerequisite for every path this page offers,
 *  and the page used to say so only inside a block that renders nothing while
 *  SUBMISSIONS_EMAIL is empty. Somebody without an account could fill the whole
 *  form before discovering that. */
describe("Submit — you need a GitHub account", () => {
  it("says so before the form, not after it", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByTestId("account-needed")).toHaveTextContent(/GitHub account/i);
  });

  it("links somewhere you can make one", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByTestId("account-signup"))
      .toHaveAttribute("href", "https://github.com/signup");
  });

  it("says it is free, because that is the first thing anyone asks", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    expect(screen.getByTestId("account-needed")).toHaveTextContent(/free/i);
  });

  it("says what to do instead when there is no address to send to", () => {
    /* SUBMISSIONS_EMAIL is deliberately empty — a personal address on a public
       page is a scraping target. So the fallback cannot be "email us", and the
       page must not simply go quiet about people who will not make an account. */
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    if (!SUBMISSIONS_EMAIL) {
      expect(screen.getByTestId("no-account-path")).toBeInTheDocument();
    }
  });

  it("tells someone updating a listing too, since that also needs an account", () => {
    render(<Submit repo={REPO} skills={[]} mode="update" />);
    expect(screen.getByTestId("account-needed")).toBeInTheDocument();
  });
});

/** #81 and #82, both found in first real use.
 *
 *  #81: the page guessed the fork's address and got it wrong two ways, so
 *  step 3 dead-ended and the submitter went looking — landing a skill at the
 *  repository root. #82: the corrected SKILL.md exists only inside the download,
 *  so dragging the original folder silently discards everything typed. */
describe("Submit — the fork is asked for", () => {
  const MULTI = () => file("skill.zip", {
    "permit-status-explainer/SKILL.md": SKILL_MD,
    "permit-status-explainer/scripts/reading_level.py": "print(1)\n",
  });

  async function multiFileFlow(user: ReturnType<typeof userEvent.setup>, ns = "cityofx") {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(screen.getByLabelText(/upload the skill folder/i), MULTI());
    await screen.findByTestId("archive-result");
    await user.type(screen.getByLabelText(/GitHub username/i), ns);
  }

  it("gives no upload link until the fork is known", async () => {
    const user = userEvent.setup();
    await multiFileFlow(user);
    expect(screen.queryByTestId("step-upload")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/address of your copy/i)).toBeInTheDocument();
  });

  it("builds the upload link from the fork that was pasted, renamed or not", async () => {
    const user = userEvent.setup();
    await multiFileFlow(user);
    await user.type(screen.getByLabelText(/address of your copy/i),
      "github.com/sgarcese-hbs/my-registry-copy");
    expect(screen.getByTestId("step-upload")).toHaveAttribute(
      "href",
      "https://github.com/sgarcese-hbs/my-registry-copy/upload/main/skills/cityofx",
    );
  });

  it("says so rather than silently offering nothing when the address is not a repository", async () => {
    const user = userEvent.setup();
    await multiFileFlow(user);
    await user.type(screen.getByLabelText(/address of your copy/i), "nonsense");
    expect(screen.getByTestId("fork-unparsed")).toBeInTheDocument();
    expect(screen.queryByTestId("step-upload")).not.toBeInTheDocument();
  });

  it("sends a reserved-namespace submitter into the registry, not a fork that cannot exist", async () => {
    const user = userEvent.setup();
    await multiFileFlow(user, "civic-skills");
    expect(screen.queryByTestId("step-fork")).not.toBeInTheDocument();
    expect(screen.getByTestId("step-upload")).toHaveAttribute(
      "href",
      `https://github.com/${REPO}/upload/main/skills/civic-skills`,
    );
  });
});

describe("Submit — the download cannot be skipped by accident", () => {
  const MULTI = () => file("skill.zip", {
    "permit-status-explainer/SKILL.md": SKILL_MD,
    "permit-status-explainer/scripts/reading_level.py": "print(1)\n",
  });

  it("names step one's output where step three consumes it", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.upload(screen.getByLabelText(/upload the skill folder/i), MULTI());
    await screen.findByTestId("archive-result");
    await user.type(screen.getByLabelText(/GitHub username/i), "cityofx");
    expect(screen.getByTestId("upload-step-body")).toHaveTextContent(/downloaded/i);
  });

  it("shows the frontmatter it wrote, so the download has a visible purpose", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.click(screen.getByLabelText(/paste your SKILL.md/i));
    await user.paste(SKILL_MD);
    await user.type(screen.getByLabelText(/Who maintains it/i), "City of X");
    expect(screen.getByTestId("added-lines")).toHaveTextContent(/civic.maintainer/);
  });
});
