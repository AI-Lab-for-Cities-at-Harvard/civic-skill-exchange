import { expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { strings } from "../i18n/strings";

/** How long a lazy page's chunk may take to arrive (#332). waitFor's default is
 *  one second, and a loaded CI runner can take longer than that to deliver the
 *  Submit, PluginDetail or Guide chunk (#314). Generous on purpose: a page that
 *  arrives sooner is not waited for any longer than it takes. */
export const LAZY_PAGE_TIMEOUT = 15_000;

/** Waits for a lazy page to replace its Suspense fallback, then, if given, for
 *  an element of the page itself. Keyed on the fallback's words in the current
 *  locale, so a Spanish run waits for "Cargando…" as an English one waits for
 *  "Loading…". */
export async function waitForLazyPage(ready?: () => Element | null): Promise<void> {
  const options = { timeout: LAZY_PAGE_TIMEOUT };
  await waitFor(() => expect(screen.queryByText(strings().errors.loading)).toBeNull(), options);
  if (ready) await waitFor(() => expect(ready()).not.toBeNull(), options);
}
