/** #309: every hand-off step's main action is a primary button.
 *
 *  Only step 1 (download) was `.btn--strong`; fork, upload and open-the-pull-
 *  request were plain `.btn`, so three of four steps had nothing to say "this
 *  is the thing to press". Each step's action Cluster now holds exactly one.
 *  UploadSteps is shared by the skill and plugin routes, so one test of it
 *  covers both; the reserved namespace (no fork, no pull request) has two steps.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { UploadSteps } from "./UploadSteps";
import { DEFAULT_LOCALE, setLocale } from "../i18n/strings";

afterEach(async () => { cleanup(); await setLocale(DEFAULT_LOCALE); });

function steps(reserved: boolean, folderBody: string) {
  return render(
    <UploadSteps
      repo="o/r" reserved={reserved} tree={folderBody === "skill" ? "skills" : "plugins"}
      draft={{ author: reserved ? "civic-skills" : "cityofx", name: "permit-helper" }}
      folderName="permit-helper" folderBody={folderBody}
      forkInput="cityofx/my-copy" onForkInput={() => {}}
      onDownload={() => {}} canDownload
    />,
  ).container;
}

const ROUTES = [
  ["the skill route", "skill"],
  ["the plugin route", "plugin"],
] as const;

describe.each(ROUTES)("a primary button on every step — %s", (_name, body) => {
  it("gives each of the four steps exactly one .btn--strong, in its action Cluster", () => {
    const list = steps(false, body);
    const items = [...list.querySelectorAll("li.steps__item")];
    expect(items).toHaveLength(4);
    for (const li of items) {
      expect(li.querySelectorAll(".btn--strong"), li.textContent ?? "").toHaveLength(1);
      expect(li.querySelectorAll(".l-cluster .btn--strong")).toHaveLength(1);
    }
  });

  it("makes the four actions the download, fork, upload and pull-request controls", () => {
    steps(false, body);
    for (const id of ["download-folder", "step-fork", "step-upload", "step-pr"]) {
      expect(screen.getByTestId(id)).toHaveClass("btn--strong");
    }
  });

  it("gives the two steps of a reserved namespace one each", () => {
    const list = steps(true, body);
    const items = [...list.querySelectorAll("li.steps__item")];
    expect(items).toHaveLength(2);
    for (const li of items) {
      expect(li.querySelectorAll(".l-cluster .btn--strong")).toHaveLength(1);
      expect(li.querySelectorAll(".btn:not(.btn--strong)")).toHaveLength(0);
    }
  });
});
