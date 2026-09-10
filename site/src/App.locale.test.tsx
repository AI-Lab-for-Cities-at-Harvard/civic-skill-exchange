/** Choosing a language, and what follows from it.
 *
 *  The switcher is the only control on the site whose effect is the whole page,
 *  so what it has to get right is worth pinning: the locales it offers come
 *  from `locales()` rather than from a list somebody has to remember to
 *  update; the choice survives a reload; blocked storage costs the choice and
 *  never the page; and `<html lang>` follows the chosen language while a
 *  listing's own description keeps the language it was written in (#145).
 *
 *  That last one is the reason the two are separate attributes. An English
 *  skill listed on the Spanish site is still English prose, and a screen
 *  reader that switches voice for it is reading it correctly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import {
  DEFAULT_LOCALE, LOCALE_NAMES, locale, locales, setLocale, strings,
} from "./i18n/strings";
import { en } from "./i18n/en";
import { makeIndex, makeSkill } from "./test/fixtures";

const INDEX = makeIndex([makeSkill({ language: "en" })]);

/** The saved key, spelled the way `App` spells it. */
const SAVED = "locale";

beforeEach(() => {
  Element.prototype.scrollIntoView ??= () => {};
  vi.stubGlobal("scrollTo", () => {});
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    /index\.json/.test(String(url))
      ? { ok: true, status: 200, json: async () => INDEX }
      : { ok: false, status: 404, json: async () => ({}) }));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  window.location.hash = "";
  document.documentElement.removeAttribute("lang");
  await setLocale(DEFAULT_LOCALE);
});

/** Rendered and past the index fetch. Keyed on a test id rather than on the
 *  footer's words, because the words are what these tests change. */
async function loaded() {
  const view = render(<App />);
  await screen.findByTestId("footer-meta");
  return view;
}

/** By role, not by label: the label is itself a translated string, so looking
 *  the control up by its English name would only find it while the page is in
 *  English — which is half of what these tests are about. It is the only
 *  combobox in the chrome; the facets are radio groups. */
function switcher(): HTMLSelectElement {
  return screen.getByRole("combobox") as HTMLSelectElement;
}

describe("the language switcher", () => {
  it("offers exactly the locales the site has, each in its own language", async () => {
    await loaded();
    const offered = [...switcher().options].map((o) => [o.value, o.textContent]);
    expect(offered).toEqual(locales().map((tag) => [tag, LOCALE_NAMES[tag]]));
  });

  it("opens on English, which is what a page with no preference should be", async () => {
    await loaded();
    expect(switcher().value).toBe(DEFAULT_LOCALE);
    expect(locale()).toBe(DEFAULT_LOCALE);
  });

  it("takes its accessible name from the table, in whichever locale is on", async () => {
    const user = userEvent.setup();
    await loaded();
    expect(switcher()).toHaveAccessibleName(en.chrome.language.label);
    await user.selectOptions(switcher(), "es");
    await waitFor(() => expect(locale()).toBe("es"));
    expect(switcher()).toHaveAccessibleName(strings().chrome.language.label);
    expect(switcher()).not.toHaveAccessibleName(en.chrome.language.label);
  });

  it("puts the page in Spanish when Spanish is chosen", async () => {
    const user = userEvent.setup();
    await loaded();
    await user.selectOptions(switcher(), "es");
    await waitFor(() => expect(locale()).toBe("es"));
    // The chrome follows without the switcher knowing what is on screen: the
    // nav label is read through useStrings, so it is a different string now.
    await waitFor(() =>
      expect(screen.queryByText(en.chrome.nav.browse)).not.toBeInTheDocument());
  });

  it("tells the document what language it is in", async () => {
    const user = userEvent.setup();
    await loaded();
    await user.selectOptions(switcher(), "es");
    await waitFor(() => expect(document.documentElement.lang).toBe("es"));
  });

  it("leaves a listing's own description in the language it was written in", async () => {
    const user = userEvent.setup();
    const { container } = await loaded();
    await user.selectOptions(switcher(), "es");
    await waitFor(() => expect(document.documentElement.lang).toBe("es"));
    // An English listing on the Spanish site. The page is Spanish; the
    // paragraph is not, and says so.
    expect(container.querySelector(".card__desc")).toHaveAttribute("lang", "en");
  });

  it("remembers the choice, so a reload does not undo it", async () => {
    const user = userEvent.setup();
    const { unmount } = await loaded();
    await user.selectOptions(switcher(), "es");
    await waitFor(() => expect(localStorage.getItem(SAVED)).toBe("es"));

    unmount();
    await setLocale(DEFAULT_LOCALE);
    await loaded();
    await waitFor(() => expect(locale()).toBe("es"));
    expect(switcher().value).toBe("es");
  });

  it("ignores a saved tag it has no locale for", async () => {
    localStorage.setItem(SAVED, "pt-BR");
    await loaded();
    expect(switcher().value).toBe(DEFAULT_LOCALE);
    expect(locale()).toBe(DEFAULT_LOCALE);
  });

  it("renders the page when storage is blocked entirely", async () => {
    // Private mode and a browser set to block site data both throw here. The
    // theme toggle has always survived it and so must this.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await loaded();
    expect(switcher().value).toBe(DEFAULT_LOCALE);
  });

  it("takes the browser's own language when nothing has been chosen", async () => {
    // Only as far as the language: a reader on es-MX or es-419 gets the
    // Spanish site, and a tag the site has no locale for gets English.
    Object.defineProperty(window.navigator, "language", {
      value: "es-MX", configurable: true,
    });
    await loaded();
    await waitFor(() => expect(locale()).toBe("es"));
    expect(switcher().value).toBe("es");
  });

  it("falls back to English for a browser language it does not have", async () => {
    Object.defineProperty(window.navigator, "language", {
      value: "pt-BR", configurable: true,
    });
    await loaded();
    expect(locale()).toBe(DEFAULT_LOCALE);
  });

  it("lets a saved choice beat the browser's language", async () => {
    Object.defineProperty(window.navigator, "language", {
      value: "es-MX", configurable: true,
    });
    localStorage.setItem(SAVED, "en");
    await loaded();
    expect(locale()).toBe(DEFAULT_LOCALE);
  });
});
