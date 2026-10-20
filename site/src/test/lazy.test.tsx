/** #332: a lazy page is waited for however slow the machine is. The default
 *  waitFor gives up after a second, and a loaded CI runner can take longer than
 *  that to deliver a page's chunk. */

import { describe, it, expect } from "vitest";
import { Suspense, lazy, type ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import { strings } from "../i18n/strings";
import { waitForLazyPage } from "./lazy";

/** A page whose chunk takes longer to arrive than waitFor's default timeout. */
const Slow = lazy(() => new Promise<{ default: ComponentType }>((resolve) =>
  setTimeout(() => resolve({ default: () => <p id="arrived">arrived</p> }), 1500)));

const Page = () => (
  <Suspense fallback={<p className="notice">{strings().errors.loading}</p>}>
    <Slow />
  </Suspense>
);

describe("waitForLazyPage", () => {
  it("waits out a chunk slower than waitFor's default", async () => {
    render(<Page />);
    expect(screen.getByText(strings().errors.loading)).toBeInTheDocument();
    await waitForLazyPage();
    expect(screen.queryByText(strings().errors.loading)).toBeNull();
    expect(document.getElementById("arrived")).not.toBeNull();
  });

  it("then waits for the element the caller names", async () => {
    render(<Page />);
    await waitForLazyPage(() => document.getElementById("arrived"));
    expect(document.getElementById("arrived")).toHaveTextContent("arrived");
  });
});
