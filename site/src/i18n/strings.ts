/** Which locale's strings the site is rendering, and the seam a second one
 *  arrives through.
 *
 *  ADR 0004 decision 4 puts the site in Spanish as well as English; decision 5
 *  says a locale costs the English visitor nothing. Those two together decide
 *  the shape here:
 *
 *  - `en.ts` is imported statically, because it is what the page renders before
 *    anybody chooses anything.
 *  - every other locale arrives through `LOCALES`, whose entries are `import()`
 *    thunks. Vite gives a dynamic import its own chunk, so the Spanish strings
 *    are bytes an English visitor never fetches, and `scripts/size.mjs` fails if
 *    that stops being true.
 *
 *  `Strings` is the English table's own type, so a locale that is missing a key
 *  or gets an interpolation's arity wrong is a type error rather than a blank
 *  space on somebody's screen.
 *
 *  #150 adds `es.ts` and a switcher: one line in `LOCALES`, and no component
 *  changes, because components read through `useStrings`.
 */

import { useSyncExternalStore } from "react";
import { en } from "./en";

export type Strings = typeof en;

/** A locale module exports `strings`. Declared as the loader's return type so
 *  the module cannot satisfy `LOCALES` while getting the shape wrong. */
type Locale = { strings: Strings };

export const DEFAULT_LOCALE = "en";

/** The seam. English resolves without a fetch because it is already here; a
 *  second entry is `es: () => import("./es")` and nothing else. */
const LOCALES: Record<string, () => Promise<Locale>> = {
  [DEFAULT_LOCALE]: () => Promise.resolve({ strings: en }),
};

export function locales(): string[] {
  return Object.keys(LOCALES);
}

let current: Strings = en;
let tag: string = DEFAULT_LOCALE;

const listeners = new Set<() => void>();

/** The current table. For module code — `notice.ts`, `format.ts` — which has no
 *  render to hang a hook off. Components use `useStrings`. */
export function strings(): Strings {
  return current;
}

export function locale(): string {
  return tag;
}

/** Loads a locale and swaps it in, or does nothing if the site does not have
 *  one for that tag. Awaited rather than fire-and-forget so a caller can leave
 *  the old strings up until the new ones are actually in hand — a half-applied
 *  switch is a page in two languages. */
export async function setLocale(next: string): Promise<boolean> {
  if (next === tag) return true;
  const load = LOCALES[next];
  if (!load) return false;
  current = (await load()).strings;
  tag = next;
  for (const notify of [...listeners]) notify();
  return true;
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** The table, as a subscription: a component reading through this re-renders
 *  when the locale changes, without the switcher knowing what is on screen. */
export function useStrings(): Strings {
  return useSyncExternalStore(subscribe, strings, strings);
}
