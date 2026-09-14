/**
 * Dates and numbers follow the locale, not the developer's machine.
 *
 * A translated page that still says `8/30/2026` and `5.6 KB` is a page in two
 * languages, and the two places it happens are the ones nobody looks at in a
 * diff: an `Intl` call with the language written into it, and a `toFixed` that
 * quietly assumes a decimal point. Spanish writes the date the other way round
 * and the decimal as a comma.
 *
 * The English values are pinned as well as the Spanish, because they are what
 * `rendered-text.test.tsx` snapshots hold: passing the tag explicitly must not
 * move the English page. TZ is UTC for the whole suite (`test/setup.ts`), and
 * the month-and-year formatter pins UTC itself, so a reader west of Greenwich
 * is not told a skill was listed the month before it was.
 */

import { describe, it, expect, afterEach } from "vitest";
import { DEFAULT_LOCALE, setLocale, strings } from "./strings";
import { bytes } from "../lib/format";

afterEach(async () => { await setLocale(DEFAULT_LOCALE); });

/** The catalogue's own timestamp, and a skill's first-seen date. */
const GENERATED = "2026-08-30T00:00:00Z";
const FIRST_SEEN = "2026-01-15T00:00:00Z";

describe("the footer's catalogue date", () => {
  it("reads as English on the English site", () => {
    expect(strings().chrome.footer.date(GENERATED)).toBe("8/30/2026");
  });

  it("reads as Spanish on the Spanish site", async () => {
    await setLocale("es");
    expect(strings().chrome.footer.date(GENERATED)).toBe("30/8/2026");
  });
});

describe("a skill's month and year", () => {
  it("reads as English on the English site", () => {
    expect(strings().history.when(FIRST_SEEN)).toBe("January 2026");
  });

  it("reads as Spanish on the Spanish site", async () => {
    await setLocale("es");
    expect(strings().history.when(FIRST_SEEN)).toBe("enero de 2026");
  });

  it("stays in UTC, so a date does not slip a month for a reader in the west", async () => {
    await setLocale("es");
    // Midnight UTC on the 1st is the previous month anywhere west of Greenwich.
    expect(strings().history.when("2026-03-01T00:00:00Z")).toBe("marzo de 2026");
  });
});

describe("a file size", () => {
  it("uses the decimal point on the English site", () => {
    expect(bytes(5697)).toBe("5.6 KB");
    expect(bytes(512)).toBe("512 B");
    expect(bytes(5_000_000)).toBe("4.8 MB");
  });

  it("uses the decimal comma on the Spanish site", async () => {
    await setLocale("es");
    // The unit itself is a string in the table, so it is the translator's; only
    // the number is formatted here.
    expect(bytes(5697)).toMatch(/^5,6 /);
    expect(bytes(5_000_000)).toMatch(/^4,8 /);
  });
});
