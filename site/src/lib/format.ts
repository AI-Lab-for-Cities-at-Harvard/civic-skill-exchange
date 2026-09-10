/** Byte sizes, shown to a person deciding whether to click something.
 *  Shared so the file tree and the download button never disagree.
 *
 *  The units come from the string table: they are read by a reader, so a locale
 *  gets to name them (#149). The number is formatted for the locale too, which
 *  is not the same thing — Spanish writes the decimal as a comma, and `5.6 KB`
 *  on a Spanish page is a number in the wrong language rather than a
 *  mistranslation (#150).
 */

import { locale, strings } from "../i18n/strings";

/** One decimal place, the reader's way round. Built per call rather than
 *  cached: the locale changes while the page is up, and a formatter built at
 *  module load would go on formatting in whatever language the page opened in. */
function decimal(n: number, places: number): string {
  return new Intl.NumberFormat(locale(), {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  }).format(n);
}

export function bytes(n: number): string {
  const { units } = strings();
  if (n < 1024) return `${decimal(n, 0)} ${units.bytes}`;
  const kb = n / 1024;
  return kb < 1024
    ? `${decimal(kb, 1)} ${units.kilobytes}`
    : `${decimal(kb / 1024, 1)} ${units.megabytes}`;
}
