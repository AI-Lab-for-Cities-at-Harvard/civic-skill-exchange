/** Which language tag the page is being read in.
 *
 *  One module, holding one string, for one reason: the tables need it and
 *  `strings.ts` imports the tables. `en.ts` formats two dates and `format.ts`
 *  formats a file size, and all three have to hand `Intl` the reader's tag —
 *  but a table that imported `strings.ts` to ask would be an import cycle, so
 *  the tag lives below both of them instead.
 *
 *  `strings.ts` is the only writer. Everything else reads.
 */

export const DEFAULT_LOCALE = "en";

let tag: string = DEFAULT_LOCALE;

/** The tag to give `Intl` and `toLocale*`. A BCP 47 tag, so it is also what
 *  `<html lang>` is set to. */
export function locale(): string {
  return tag;
}

/** Called by `setLocale` once the new table is actually in hand. Not exported
 *  from `strings.ts`: switching the tag without switching the strings is a page
 *  formatting Spanish dates around English sentences. */
export function setLocaleTag(next: string): void {
  tag = next;
}
