import { expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { strings } from "../i18n/strings";

/** Waits for a lazy page to replace its fallback. */
export async function waitForLazyPage(ready?: () => Element | null): Promise<void> {
  await waitFor(() => expect(screen.queryByText(strings().errors.loading)).toBeNull());
  if (ready) await waitFor(() => expect(ready()).not.toBeNull());
}
