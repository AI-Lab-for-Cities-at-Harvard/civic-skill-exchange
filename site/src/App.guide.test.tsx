/** #258: the guide's place in the header — "Guide" / "Guía", after Browse
 *  (ruling 1 on the design note for #224) — and its route. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import App from "./App";
import { DEFAULT_LOCALE, setLocale } from "./i18n/strings";
import { makeIndex, makeSkill } from "./test/fixtures";

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
  window.location.hash = "";
  await setLocale(DEFAULT_LOCALE);
});

const links = () =>
  within(screen.getByRole("navigation", { name: /main|principal/i }))
    .getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")]);

describe("the Guide header item", () => {
  it("sits after Browse: Browse · Guide · Submit · About · GitHub", async () => {
    render(<App />);
    await screen.findByTestId("footer-meta");
    expect(links().map(([text]) => text))
      .toEqual(["Browse", "Guide", "Submit", "About", "GitHub"]);
    expect(links()[1]?.[1]).toBe("#/guide");
  });

  it("reads Guía in Spanish", async () => {
    await setLocale("es");
    render(<App />);
    await screen.findByTestId("footer-meta");
    expect(links()[1]?.[0]).toBe("Guía");
  });

  it("opens the guide and marks itself current", async () => {
    window.location.hash = "#/guide";
    render(<App />);
    await screen.findByTestId("footer-meta");
    expect(screen.getByRole("heading", { level: 2, name: "Using the Exchange" }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute("aria-current", "page");
  });
});
