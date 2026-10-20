/** Writes a draft to the store as it changes (#294).
 *
 *  Debounced, so a keystroke is not a storage write. A form emptied by hand
 *  clears the key. A form that has been blank since the page opened does not:
 *  there may be a draft in storage this page chose not to restore (another
 *  plugin's), and looking at an empty page is not a reason to destroy it.
 */

import { useEffect, useRef, useState } from "react";
import { clearDraft, writeDraft } from "./draftStore";

export const SAVE_DELAY_MS = 400;

export function useDraftSaver(
  key: string,
  data: Record<string, unknown>,
  { blank, enabled = true }: { blank: boolean; enabled?: boolean },
): { failed: boolean } {
  const [failed, setFailed] = useState(false);
  const latest = useRef({ key, data, blank });
  // Kept current for the pagehide handler, which outlives any one render.
  useEffect(() => { latest.current = { key, data, blank }; });
  // Whether anything has been in the form since this page opened.
  const dirty = useRef(false);

  // Leaving for GitHub is the moment this exists for, and a timer pending at
  // that instant would lose the last few keystrokes.
  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      const { key: k, data: d, blank: b } = latest.current;
      if (b) { if (dirty.current) clearDraft(k); } else writeDraft(k, d);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (blank && !dirty.current) return;
    const timer = window.setTimeout(() => {
      if (blank) {
        dirty.current = false;
        clearDraft(key);
        setFailed(false);
      } else {
        dirty.current = true;
        setFailed(!writeDraft(key, data));
      }
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [key, data, blank, enabled]);

  return { failed };
}
