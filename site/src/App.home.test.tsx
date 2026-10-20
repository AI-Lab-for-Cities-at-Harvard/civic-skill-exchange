/** #302, S-12: the home page offers a way to submit, instead of leaving the
 *  header's "Submit" as the only door. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { DEFAULT_LOCALE, setLocale } from "./i18n/strings";
import { makeIndex, makeSkill } from "./test/fixtures";
import { waitForLazyPage } from "./test/lazy";

beforeEach(() => {
  Element.prototype.scrollIntoView ??= () => {};
  vi.stubGlobal("scrollTo", () => {});
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    /index\.json/.test(String(url))
      ? { ok: true, status: 200, json: async () => makeIndex([makeSkill()]) }
      : { ok: false, status: 404, json: async () => ({}) }));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  localStorage.clear();
  window.location.hash = "";
  await setLocale(DEFAULT_LOCALE);
});

describe("the home page's call to action", () => {
  it("links to the submit page", async () => {
    render(<App />);
    await screen.findByTestId("footer-meta");
    const cta = screen.getByTestId("home-submit");
    expect(cta).toHaveAttribute("href", "#/submit");
    expect(cta.textContent).toMatch(/submit|share/i);
  });

  it("is on the home page only, not repeated on the guide", async () => {
    window.location.hash = "#/guide";
    render(<App />);
    await screen.findByTestId("footer-meta");
    await waitForLazyPage();
    expect(screen.queryByTestId("home-submit")).not.toBeInTheDocument();
  });

  it("reads in Spanish", async () => {
    localStorage.setItem("locale", "es");
    render(<App />);
    await screen.findByTestId("footer-meta");
    await waitFor(() => expect(screen.getByTestId("home-submit").textContent)
      .toMatch(/habilidad|plugin/i));
  });
});
