/** Byte sizes, shown to a person deciding whether to click something.
 *  Shared so the file tree and the download button never disagree.
 *
 *  The units come from the string table: they are read by a reader, so a locale
 *  gets to name them (#149). */

import { strings } from "../i18n/strings";

export function bytes(n: number): string {
  const { units } = strings();
  if (n < 1024) return `${n} ${units.bytes}`;
  const kb = n / 1024;
  return kb < 1024
    ? `${kb.toFixed(1)} ${units.kilobytes}`
    : `${(kb / 1024).toFixed(1)} ${units.megabytes}`;
}
