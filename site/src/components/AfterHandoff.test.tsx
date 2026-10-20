/** #300 (S-11): after the hand-off nothing said what to put in the pull
 *  request, whether a review is asked for, or who asks. The answer is in the
 *  repository's own files, so the page states it and the tests pin it to them:
 *
 *   - `/skills/` has no CODEOWNER, so a skill in the submitter's own folder is
 *     requested from nobody. The ruleset still wants one approving review.
 *   - `/plugins/` and the reserved namespace are owned by the maintainers team,
 *     so GitHub asks for their review itself.
 *   - The Reviewed tier is a separate, later request: an issue from the
 *     `review-request` template. */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AfterHandoff } from "./AfterHandoff";
import { UploadSteps } from "./UploadSteps";
import { DEFAULT_LOCALE, setLocale } from "../i18n/strings";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

afterEach(async () => { cleanup(); await setLocale(DEFAULT_LOCALE); });

describe("what happens next", () => {
  it("says the checks run, then a person reads it, for a skill in your own folder", () => {
    render(<AfterHandoff repo={REPO} kind="skill" reserved={false} />);
    const box = screen.getByTestId("what-next");
    expect(box).toHaveTextContent(/checks run on the pull request/i);
    expect(box).toHaveTextContent(/maintainer/i);
    expect(screen.getByTestId("review-who")).toHaveTextContent(/nobody is asked for you/i);
  });

  it("says a maintainer is asked automatically for a plugin", () => {
    render(<AfterHandoff repo={REPO} kind="plugin" reserved={false} />);
    expect(screen.getByTestId("review-who")).toHaveTextContent(/asked automatically/i);
  });

  it("says the same for the reserved namespace", () => {
    render(<AfterHandoff repo={REPO} kind="skill" reserved />);
    expect(screen.getByTestId("review-who")).toHaveTextContent(/asked automatically/i);
  });

  it("links the Reviewed-tier request, which is a separate issue", () => {
    render(<AfterHandoff repo={REPO} kind="skill" reserved={false} />);
    expect(screen.getByTestId("review-request-link")).toHaveAttribute(
      "href", `https://github.com/${REPO}/issues/new?template=review-request.yml`);
    expect(screen.getByTestId("what-next")).toHaveTextContent(/separate/i);
  });

  it("says the title and description are in English", () => {
    render(<AfterHandoff repo={REPO} kind="skill" reserved={false} />);
    expect(screen.getByTestId("what-next")).toHaveTextContent(/in English/);
  });

  it("says it in Spanish", async () => {
    await setLocale("es");
    render(<AfterHandoff repo={REPO} kind="skill" reserved={false} />);
    expect(screen.getByTestId("what-next")).toHaveTextContent(/Las verificaciones se ejecutan/);
    expect(screen.getByTestId("what-next")).toHaveTextContent(/en inglés/);
    expect(screen.getByTestId("review-who")).toHaveTextContent(/no se le pide a nadie/i);
  });

  it("agrees with CODEOWNERS about who is asked", () => {
    const owners = readFileSync(
      resolve(__dirname, "../../../.github/CODEOWNERS"), "utf8")
      .split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    const ownerOf = (path: string) =>
      owners.filter((l) => l.split(/\s+/)[0] === path).pop()!;
    // A bare `/skills/` line has no owner after the path; the others do.
    expect(ownerOf("/skills/").trim().split(/\s+/)).toHaveLength(1);
    expect(ownerOf("/plugins/")).toMatch(/@AI-Lab-for-Cities-at-Harvard\/maintainers/);
    expect(ownerOf("/skills/civic-skills/")).toMatch(/maintainers/);
  });

  it("agrees with the issue template it links", () => {
    const tpl = readFileSync(
      resolve(__dirname, "../../../.github/ISSUE_TEMPLATE/review-request.yml"), "utf8");
    expect(tpl).toMatch(/labels: \["review-request"\]/);
  });
});

describe("the pull request link is pre-filled", () => {
  function steps() {
    render(
      <UploadSteps
        repo={REPO} reserved={false} tree="skills"
        draft={{ author: "cityofx", name: "permit-helper" }}
        folderName="permit-helper" folderBody="Unzip it."
        forkInput="cityofx/my-copy" onForkInput={() => {}}
        onDownload={() => {}} canDownload
        review={{
          kind: "skill", namespace: "cityofx", name: "permit-helper",
          findings: [{ where: "civic.scope", message: "scope is required" }],
        }}
      />,
    );
    return new URL(screen.getByTestId("step-pr").getAttribute("href")!).searchParams;
  }

  it("carries the title and a description naming what was checked", () => {
    const q = steps();
    expect(q.get("quick_pull")).toBe("1");
    expect(q.get("title")).toBe("Add skill cityofx/permit-helper");
    expect(q.get("body")).toContain("civic.scope");
  });

  it("stays in English when the page is in Spanish", async () => {
    await setLocale("es");
    const q = steps();
    expect(q.get("title")).toBe("Add skill cityofx/permit-helper");
    expect(q.get("body")).toMatch(/^Adds the skill/);
  });
});
