/** The locale seam.
 *
 *  There is one locale today, so what these pin is the shape #150 plugs into:
 *  English resolves without a fetch because it is already in the entry chunk, a
 *  tag the site has no locale for changes nothing rather than blanking the
 *  page, and the accessor is the same value the components read.
 */

import { describe, it, expect } from "vitest";
import { en } from "./en";
import { DEFAULT_LOCALE, locale, locales, setLocale, strings } from "./strings";

describe("the locale seam", () => {
  it("starts on English, which is what renders before anybody chooses", () => {
    expect(locale()).toBe(DEFAULT_LOCALE);
    expect(strings()).toBe(en);
  });

  it("offers exactly the locales the site has, which is one", () => {
    expect(locales()).toEqual([DEFAULT_LOCALE]);
  });

  it("resolves English without going anywhere for it", async () => {
    expect(await setLocale("en")).toBe(true);
    expect(strings()).toBe(en);
  });

  it("refuses a tag it has no locale for, and leaves the page alone", async () => {
    expect(await setLocale("es")).toBe(false);
    expect(locale()).toBe(DEFAULT_LOCALE);
    expect(strings()).toBe(en);
  });
});
