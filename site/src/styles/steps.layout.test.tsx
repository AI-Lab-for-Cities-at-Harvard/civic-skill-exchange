/** The numbered steps are the first user of the layout primitives (#316).
 *
 *  Their spacing is the primitives' (24px between steps = gap 5, 12px within
 *  a step = gap 3), so the rules that used to produce it are gone from
 *  app.css, and what is left of .steps is the counter, the indent and the
 *  drawing, all in logical properties so they hold in right-to-left.
 *  The measured gaps and the RTL result are checked in a real browser (see
 *  docs/DEVELOPMENT.md); this holds the structure that produces them.
 */

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, cleanup } from "@testing-library/react";
import { UploadSteps } from "../components/UploadSteps";
import { About } from "../components/About";

afterEach(cleanup);

const APP = readFileSync(join(__dirname, "app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of every rule whose selector mentions `.steps` but not a
 *  different `.steps__x` component part (title/body/more are text styles). */
const stepRules = [...APP.matchAll(/([^{}]*\.steps(?:__item)?(?![\w-])[^{}]*)\{([^}]*)\}/g)]
  .map((m) => ({ selector: m[1]!.trim(), body: m[2]! }));

function uploadSteps(reserved: boolean) {
  return render(
    <UploadSteps
      repo="o/r" reserved={reserved} tree="skills"
      draft={{ author: "cityofx", name: "permit-helper" }}
      folderName="permit-helper" folderBody="Unzip it."
      forkInput="cityofx/my-copy" onForkInput={() => {}}
      onDownload={() => {}} canDownload
    />,
  ).container;
}

function expectStacked(list: Element) {
  expect(list.tagName).toBe("OL");
  expect(list).toHaveClass("steps", "l-stack", "l-gap-5");
  const items = [...list.children];
  expect(items.length).toBeGreaterThan(0);
  for (const li of items) {
    expect(li.tagName).toBe("LI");
    expect(li).toHaveClass("steps__item", "l-stack", "l-gap-3");
  }
}

describe("the numbered steps use the primitives", () => {
  it("are a Stack of 24px (gap 5) holding Stacks of 12px (gap 3), on the hand-off", () => {
    for (const reserved of [false, true]) {
      const c = uploadSteps(reserved);
      expectStacked(c.querySelector("ol.steps")!);
      cleanup();
    }
  });

  it("are the same on About's by-hand steps", () => {
    const { container } = render(<About skills={[]} />);
    expectStacked(container.querySelector("#submitting ol.steps")!);
  });

  it("put a button in a Cluster, so it keeps its own width", () => {
    const c = uploadSteps(false);
    for (const btn of c.querySelectorAll(".steps__item .btn")) {
      expect(btn.parentElement, btn.textContent ?? "").toHaveClass("l-cluster");
      expect(btn.closest(".cta-row")).toBeNull();
    }
  });
});

describe("what is left of .steps in app.css", () => {
  it("has the rules that draw a step, and they are found", () => {
    expect(stepRules.some((r) => r.selector.includes("::before"))).toBe(true);
    expect(stepRules.some((r) => r.selector.includes("::after"))).toBe(true);
  });

  it("no longer lays a step out: that is the Stack's", () => {
    // The markers are drawn boxes with their own centring; the list and the
    // step are the elements the Stack lays out.
    for (const r of stepRules.filter((x) => !x.selector.includes("::"))) {
      expect(r.body, r.selector).not.toMatch(/(^|[;\s])(display\s*:\s*(grid|flex)|gap\s*:|align-self\s*:)/);
    }
    expect(APP).not.toMatch(/\.steps\s+\.steps__item\s*>\s*\*/);
    expect(APP).not.toMatch(/\.steps__item\s*>\s*\.btn/);
  });

  it("places the indent and the marker with logical properties, for right-to-left", () => {
    for (const r of stepRules) {
      expect(r.body, r.selector).not.toMatch(/(^|[;\s])(left|right|padding-left|padding-right|margin-left|margin-right)\s*:/);
    }
    const item = stepRules.find((r) => r.selector === ".steps__item")!;
    expect(item.body).toMatch(/padding-inline-start\s*:/);
    const before = stepRules.find((r) => r.selector.endsWith("::before"))!;
    expect(before.body).toMatch(/inset-inline-start\s*:/);
    const after = stepRules.find((r) => r.selector.endsWith("::after"))!;
    expect(after.body).toMatch(/inset-inline-start\s*:/);
  });
});
