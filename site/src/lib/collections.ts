import { locale } from "../i18n/strings";
import type { Collection } from "./types";

/** A collection's title and note in the reader's language (#209). Both
 *  languages are in registry/collections.yml beside each other, as the
 *  category vocabulary's are (#150), and the build refuses a collection missing
 *  either; a locale with no column of its own reads the English. */
export function collectionText(c: Collection): { title: string; note: string } {
  return locale() === "es" ? { title: c.title_es, note: c.note_es } : { title: c.title, note: c.note };
}
