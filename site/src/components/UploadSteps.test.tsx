/** #243: step 3 and step 4 describe the same branch.
 *
 *  The pull request link compares the fork's `main`, so a submitter who
 *  followed step 3 to the letter must have committed there. And a fork is a
 *  word a non-developer has not met, so step 1 says what it is. */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { UploadSteps } from "./UploadSteps";
import { DEFAULT_LOCALE, setLocale } from "../i18n/strings";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

afterEach(async () => { cleanup(); await setLocale(DEFAULT_LOCALE); });

function steps(reserved = false) {
  render(
    <UploadSteps
      repo={REPO} reserved={reserved} tree="skills"
      draft={{ author: reserved ? "civic-skills" : "cityofx", name: "permit-helper" }}
      folderName="permit-helper" folderBody="Unzip it."
      forkInput="cityofx/my-copy" onForkInput={() => {}}
      onDownload={() => {}} canDownload
    />,
  );
}

describe("UploadSteps — the fork's main is the branch", () => {
  it("tells an English submitter to commit directly to main, and links to main", () => {
    steps();
    const body = screen.getByTestId("upload-step-body");
    expect(body).toHaveTextContent(/commit directly to the `?main`? branch/i);
    expect(body).not.toHaveTextContent(/new branch/i);
    expect(screen.getByTestId("step-pr")).toHaveAttribute(
      "href", expect.stringContaining("main...cityofx:my-copy:main"));
  });

  it("says the same in Spanish", async () => {
    await setLocale("es");
    steps();
    const body = screen.getByTestId("upload-step-body");
    expect(body).toHaveTextContent(/directamente en la rama `?main`?/i);
    expect(body).not.toHaveTextContent(/new branch/i);
  });

  it("explains what a fork is in step 1", () => {
    steps();
    const body = screen.getByTestId("fork-step-body");
    expect(body).toHaveTextContent(/A fork is your own copy of the exchange on GitHub/);
    expect(body).toHaveTextContent(/pull request in the next step/);
  });

  it("explains what a fork is in step 1, in Spanish", async () => {
    await setLocale("es");
    steps();
    expect(screen.getByTestId("fork-step-body"))
      .toHaveTextContent(/Un fork es su propia copia del intercambio en GitHub/);
  });

  it("keeps the registry's own submitter on a branch, since main there is gated", () => {
    steps(true);
    expect(screen.getByTestId("upload-step-body")).toHaveTextContent(/new branch/i);
    expect(screen.queryByTestId("step-pr")).not.toBeInTheDocument();
  });
});
