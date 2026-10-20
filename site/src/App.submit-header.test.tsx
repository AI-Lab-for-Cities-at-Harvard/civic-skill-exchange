/** #309: the submit page opens with a compact header, not the full hero.
 *
 *  The hero (title, lede and the catalogue's totals) is the front page's
 *  opening. On the submit page it pushed the first field to 1113px on a desktop
 *  and 1431px on a phone, and said nothing the reader needed there. The site
 *  title, nav, language and theme controls stay; the statement goes.
 *
 *  Heading levels: the hero's `h1` is the site title, and the brand mark in
 *  the bar already names the site. So where the statement is dropped there is
 *  no second heading to demote: the page's own heading is the `h1`, and the
 *  document has exactly one.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import { DEFAULT_LOCALE, setLocale } from "./i18n/strings";
import { en } from "./i18n/en";
import { findViolations, describeViolations } from "./test/axe";
import { makeIndex, makeSkill } from "./test/fixtures";
import { waitForLazyPage } from "./test/lazy";

const INDEX = makeIndex([makeSkill()]);

beforeEach(() => {
  // No test reaches the network: the catalogue, and the username check that
  // debounces into api.github.com, are both stubbed.
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

const ROUTES = [
  ["the skill route", "#/submit"],
  ["update mode", "#/submit?mode=update"],
] as const;

async function open(hash: string) {
  window.location.hash = hash;
  const host = document.body.appendChild(document.createElement("div"));
  const view = render(<App />, { container: host });
  await waitFor(() => expect(screen.getByTestId("footer-meta")).toBeInTheDocument());
  // Submit is its own chunk (#314): wait for it however slow the machine (#342).
  await waitForLazyPage(() => screen.queryByRole("heading", { level: 1, name: en.submit.heading }));
  return view;
}

describe.each(ROUTES)("the submit page's compact header — %s", (_name, hash) => {
  it("leaves out the hero's lede and stats", async () => {
    await open(hash);
    expect(document.querySelector(".topper__lede")).toBeNull();
    expect(document.querySelector(".topper__stats")).toBeNull();
    expect(screen.queryByText(en.chrome.lede)).not.toBeInTheDocument();
  });

  it("keeps the site title, nav, language and theme controls", async () => {
    await open(hash);
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: en.chrome.brand })).toBeInTheDocument();
    const nav = within(banner).getByRole("navigation", { name: en.chrome.nav.label });
    expect(within(nav).getByRole("link", { name: en.chrome.nav.submit }))
      .toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("combobox", { name: en.chrome.language.label }))
      .toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /dark|light/i })).toBeInTheDocument();
  });

  it("has exactly one h1, and it is the page's heading", async () => {
    await open(hash);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(en.submit.heading);
    expect(screen.queryByRole("heading", { level: 1, name: en.chrome.title }))
      .not.toBeInTheDocument();
  });

  it("keeps the skip link and the landmarks", async () => {
    await open(hash);
    expect(screen.getByRole("link", { name: en.chrome.skipToContent }))
      .toHaveAttribute("href", "#results");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "results");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = await open(hash);
    const violations = await findViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it("is a Cluster, the same one the full header's bar is", async () => {
    await open(hash);
    const bar = screen.getByRole("banner").querySelector(".topper__bar");
    expect(bar).toHaveClass("l-cluster");
  });
});

describe("every other page keeps the full hero", () => {
  it("the browse page still has the site title as its one h1, with lede and stats", async () => {
    window.location.hash = "#/";
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: en.chrome.title });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(document.querySelector(".topper__lede")).not.toBeNull();
    await waitFor(() => expect(document.querySelector(".topper__stats")).not.toBeNull());
  });
});
