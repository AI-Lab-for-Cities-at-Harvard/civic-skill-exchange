/** The locale seam.
 *
 *  English resolves without a fetch because it is already in the entry chunk,
 *  Spanish arrives through a dynamic import, a tag the site has no locale for
 *  changes nothing rather than blanking the page, and the accessor is the same
 *  value the components read.
 */

import { describe, it, expect, afterEach } from "vitest";
import { en } from "./en";
import {
  DEFAULT_LOCALE, LOCALE_NAMES, locale, locales, setLocale, strings,
} from "./strings";

// Module state, so a test that switches puts it back — otherwise the next one
// asserts against whatever the last one left behind.
afterEach(async () => { await setLocale(DEFAULT_LOCALE); });

describe("the locale seam", () => {
  it("starts on English, which is what renders before anybody chooses", () => {
    expect(locale()).toBe(DEFAULT_LOCALE);
    expect(strings()).toBe(en);
  });

  it("offers exactly the locales the site has", () => {
    expect(locales()).toEqual([DEFAULT_LOCALE, "es"]);
  });

  it("resolves English without going anywhere for it", async () => {
    expect(await setLocale("en")).toBe(true);
    expect(strings()).toBe(en);
  });

  it("loads Spanish and swaps it in", async () => {
    expect(await setLocale("es")).toBe(true);
    expect(locale()).toBe("es");
    expect(strings()).not.toBe(en);
    // The same shape, which is what `Strings` promises and es.test.ts checks.
    expect(Object.keys(strings())).toEqual(Object.keys(en));
  });

  it("refuses a tag it has no locale for, and leaves the page alone", async () => {
    expect(await setLocale("pt-BR")).toBe(false);
    expect(locale()).toBe(DEFAULT_LOCALE);
    expect(strings()).toBe(en);
  });

  it("names every locale it offers, in that locale's own language", () => {
    // The switcher renders one row per locale; a tag with no name would read as
    // the tag, which is a worse answer than the language's name.
    for (const tag of locales()) expect(LOCALE_NAMES[tag]).toBeTruthy();
  });
});
