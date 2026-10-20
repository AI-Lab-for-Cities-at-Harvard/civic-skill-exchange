/** Keeping a submission draft in this browser (#294).
 *
 *  The submit page sends people to GitHub to fork, and coming back used to wipe
 *  every answer (spike finding S-5). So the answers are written to
 *  `localStorage` as they are typed and read back when the page returns.
 *
 *  Three rules shape this module:
 *
 *  - Storage is a thing that can be missing. Private windows, blocked site data
 *    and a full quota all throw, and some browsers throw merely on touching
 *    `window.localStorage`. Every access is inside a try, and the page works
 *    the same without it — it only stops remembering.
 *  - What is stored is whatever the caller hands over, whole. A field added to
 *    the form later is saved without anyone remembering to list it here. The
 *    caller turns it back into its own shape with `onlyStrings`, which keeps
 *    only what the current shape has.
 *  - Nothing sensitive: the form's own strings, and nothing else. There is no
 *    token anywhere on this page to store, and nothing here adds one.
 *
 *  A schema version rides in the envelope. When the shape of a draft changes,
 *  bump it, and every older draft is discarded cleanly rather than half
 *  understood.
 */

export const SCHEMA_VERSION = 1;

const PREFIX = "civic-skill-exchange:draft:";

/** Which draft: the skill route, the plugin route, or update mode for one
 *  listing. Each is saved on its own, so a half-finished plugin does not
 *  replace a half-finished skill. */
export type DraftRoute =
  | { route: "skill" }
  | { route: "plugin" }
  | { route: "update"; listing: string };

export function draftKey(r: DraftRoute): string {
  return r.route === "update" ? `${PREFIX}update:${r.listing}` : `${PREFIX}${r.route}`;
}

export interface SavedDraft {
  /** Whatever was handed to `writeDraft`, as JSON gave it back. */
  data: Record<string, unknown>;
  savedAt: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Storage, or null when the browser will not give it. */
function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    store()?.removeItem(key);
  } catch {
    /* nothing to clear if storage will not say */
  }
}

/** The draft saved under `key`, or null for none, an unreadable one, or one
 *  from another schema version (which is removed, so it is not read again). */
export function readDraft(key: string): SavedDraft | null {
  let raw: string | null;
  try {
    raw = store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearDraft(key);
    return null;
  }
  if (!isRecord(parsed) || parsed.v !== SCHEMA_VERSION || !isRecord(parsed.data)) {
    // A newer or older shape, or something that was never ours.
    if (isRecord(parsed) && "v" in parsed) clearDraft(key);
    return null;
  }
  return {
    data: parsed.data,
    savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
  };
}

/** True when it was kept. False says storage refused, which the page reports
 *  rather than pretending. */
export function writeDraft(key: string, data: Record<string, unknown>): boolean {
  try {
    const s = store();
    if (!s) return false;
    s.setItem(key, JSON.stringify({ v: SCHEMA_VERSION, savedAt: Date.now(), data }));
    return true;
  } catch {
    return false;
  }
}

/** `template` with every string-valued key that `stored` also has. The
 *  template decides the shape: a key it lacks (a field since removed) is
 *  dropped, one stored lacks (a field since added) keeps its default, and a
 *  value of the wrong type is ignored. A draft is data from a place the page
 *  does not control. */
export function onlyStrings<T extends object>(template: T, stored: unknown): T {
  const out = { ...template } as Record<string, unknown>;
  if (isRecord(stored)) {
    for (const key of Object.keys(template)) {
      const value = stored[key];
      if (typeof value === "string" && typeof out[key] === "string") out[key] = value;
    }
  }
  return out as T;
}

/** A string, or the fallback. */
export const asString = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

export { isRecord };
