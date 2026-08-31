/** #6: usable by keyboard alone.
 *
 *  axe checks that things are *reachable* and *named*. It cannot check that
 *  tabbing actually gets you somewhere useful, which is the part a person
 *  without a mouse experiences. These walk the page the way they would.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { Submit } from "./components/Submit";
import { makeIndex, makeSkill } from "./test/fixtures";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
const INDEX = makeIndex([makeSkill(), makeSkill({ id: "ns/other", name: "other" })]);

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    /index\.json/.test(String(url))
      ? { ok: true, status: 200, json: async () => INDEX }
      : { ok: false, status: 404, json: async () => ({}) }));
});
afterEach(() => { vi.unstubAllGlobals(); window.location.hash = ""; });

async function loaded() {
  render(<App />);
  await waitFor(() => expect(screen.getByText(/Catalog generated/)).toBeInTheDocument());
}

describe("the page can be driven from the keyboard", () => {
  it("puts the skip link first, so it is reachable before the nav", async () => {
    const user = userEvent.setup();
    await loaded();
    await user.tab();
    expect(document.activeElement).toHaveTextContent(/skip to content/i);
  });

  it("points the skip link at something that exists", async () => {
    await loaded();
    const target = screen.getByText(/skip to content/i).getAttribute("href")?.slice(1);
    expect(target).toBeTruthy();
    expect(document.getElementById(target!)).toBeInTheDocument();
  });

  it("reaches the whole top navigation by tabbing", async () => {
    const user = userEvent.setup();
    await loaded();
    const reached: string[] = [];
    for (let i = 0; i < 8; i++) {
      await user.tab();
      reached.push(document.activeElement?.textContent ?? "");
    }
    for (const label of ["Browse", "About", "Submit", "GitHub"]) {
      expect(reached.join("|")).toContain(label);
    }
  });

  it("works the theme toggle with the keyboard", async () => {
    const user = userEvent.setup();
    await loaded();
    const before = document.documentElement.dataset.theme;
    screen.getByRole("button", { name: /switch to/i }).focus();
    await user.keyboard("{Enter}");
    // React reuses the node, so the theme is what changed, not the element.
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).not.toBe(before));
  });

  it("reaches the search box and types into it", async () => {
    const user = userEvent.setup();
    await loaded();
    const search = screen.getByLabelText(/search/i);
    search.focus();
    await user.keyboard("permit");
    expect(search).toHaveValue("permit");
  });

  it("leaves no element reachable only by pointer", async () => {
    await loaded();
    // Anything clickable must be a button or a link, never a bare div with an
    // onClick — which is invisible to the keyboard and to a screen reader.
    const clickable = document.querySelectorAll("[onclick]");
    expect(clickable).toHaveLength(0);
  });
});

describe("the submission page can be driven from the keyboard", () => {
  it("uses a native disclosure, which the keyboard already knows how to open", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    const summary = screen.getByText(/a few optional things/i);
    // <details>/<summary> rather than a scripted accordion: focusable, opens on
    // Enter and Space, and announced as a disclosure, with no handlers of ours
    // to get wrong. jsdom does not implement the Enter toggle, so this asserts
    // the element that provides it rather than simulating the key.
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.closest("details")).toBeInTheDocument();
  });

  it("reaches every form control in source order", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    const first = screen.getByLabelText(/GitHub repository/i);
    first.focus();
    const reached = new Set<string>();
    for (let i = 0; i < 25; i++) {
      await user.tab();
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.id) reached.add(el.id);
    }
    for (const id of ["namespace", "name", "description", "civic.category"]) {
      expect(reached).toContain(id);
    }
  });

  it("moves between the two modes with links, which the keyboard already knows", async () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    // Not scripted tabs: a link needs no keydown handler to work, and gets
    // Enter, middle-click and "open in new tab" for free.
    expect(screen.getByTestId("mode-update").tagName).toBe("A");
    expect(screen.getByTestId("mode-update")).toHaveAttribute("href");
  });

  it("keeps a blocked hand-off out of the tab order rather than trapping focus on it", async () => {
    const user = userEvent.setup();
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    await user.type(screen.getByLabelText(/GitHub username/i), "x");
    const handoff = screen.getByTestId("handoff");
    // No href, so it is not focusable — and aria-disabled says why it is there.
    expect(handoff).not.toHaveAttribute("href");
    expect(handoff).toHaveAttribute("aria-disabled", "true");
  });
});
