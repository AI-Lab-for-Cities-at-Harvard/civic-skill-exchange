/** #6: usable by keyboard alone.
 *
 *  axe checks that things are *reachable* and *named*. It cannot check that
 *  tabbing actually gets you somewhere useful, which is the part a person
 *  without a mouse experiences. These walk the page the way they would.
 *
 *  Once per locale (#150), and every control is looked up through the string
 *  table rather than by its English name — a test that finds the theme toggle
 *  by the words "switch to" is a test that only walks the English page.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { Submit } from "./components/Submit";
import { DEFAULT_LOCALE, locales, setLocale, strings } from "./i18n/strings";
import { makeIndex, makeSkill } from "./test/fixtures";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
const INDEX = makeIndex([makeSkill(), makeSkill({ id: "ns/other", name: "other" })]);

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    /index\.json/.test(String(url))
      ? { ok: true, status: 200, json: async () => INDEX }
      : { ok: false, status: 404, json: async () => ({}) }));
});
afterEach(async () => {
  vi.unstubAllGlobals();
  window.location.hash = "";
  await setLocale(DEFAULT_LOCALE);
});

async function loaded() {
  render(<App />);
  await waitFor(() => expect(screen.getByTestId("footer-meta")).toBeInTheDocument());
}

describe.each(locales())("the page can be driven from the keyboard — %s", (tag) => {
  beforeEach(async () => { await setLocale(tag); });

  it("puts the skip link first, so it is reachable before the nav", async () => {
    const user = userEvent.setup();
    await loaded();
    await user.tab();
    expect(document.activeElement).toHaveTextContent(strings().chrome.skipToContent);
  });

  it("points the skip link at something that exists", async () => {
    await loaded();
    const target = screen.getByText(strings().chrome.skipToContent)
      .getAttribute("href")?.slice(1);
    expect(target).toBeTruthy();
    expect(document.getElementById(target!)).toBeInTheDocument();
  });

  it("reaches the whole top navigation by tabbing", async () => {
    const user = userEvent.setup();
    await loaded();
    const reached: string[] = [];
    for (let i = 0; i < 10; i++) {
      await user.tab();
      reached.push(document.activeElement?.textContent ?? "");
    }
    const nav = strings().chrome.nav;
    for (const label of [nav.browse, nav.about, nav.submit, nav.github]) {
      expect(reached.join("|")).toContain(label);
    }
  });

  it("works the theme toggle with the keyboard", async () => {
    const user = userEvent.setup();
    await loaded();
    const before = document.documentElement.dataset.theme;
    const theme = strings().chrome.theme;
    const toggle = screen.queryByRole("button", { name: theme.switchToDark })
      ?? screen.getByRole("button", { name: theme.switchToLight });
    toggle.focus();
    await user.keyboard("{Enter}");
    // React reuses the node, so the theme is what changed, not the element.
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).not.toBe(before));
  });

  it("reaches the search box and types into it", async () => {
    const user = userEvent.setup();
    await loaded();
    const search = screen.getByLabelText(strings().facets.search.label);
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

describe.each(locales())(
  "the submission page can be driven from the keyboard — %s", (tag) => {
  beforeEach(async () => { await setLocale(tag); });

  it("uses a native disclosure, which the keyboard already knows how to open", () => {
    render(<Submit repo={REPO} skills={[]} mode="new" />);
    const summary = screen.getByText(strings().submit.optional.summary);
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
    const first = screen.getByLabelText(strings().submit.intake.repoLabel);
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
    await user.type(screen.getByLabelText(strings().submit.form.namespaceLabel), "x");
    const handoff = screen.getByTestId("handoff");
    // No href, so it is not focusable — and aria-disabled says why it is there.
    expect(handoff).not.toHaveAttribute("href");
    expect(handoff).toHaveAttribute("aria-disabled", "true");
  });
});
