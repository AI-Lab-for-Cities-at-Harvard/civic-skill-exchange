/** #332: a lazy page is waited for however slow the machine is. The default
 *  waitFor gives up after a second, and a loaded CI runner can take longer than
 *  that to deliver a page's chunk. */

import { describe, it, expect } from "vitest";
import { globSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

/* #342: the helper only helps if it is used. A test that renders the app on a
   lazy route and waits with findBy/waitFor's one-second default passes on a
   quiet machine and fails on a loaded one, which is how #309's test slipped in
   after #332. */
describe("every test that opens a lazy page waits with waitForLazyPage", () => {
  const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const files = (globSync("**/*.test.tsx", { cwd: SRC }) as string[])
    .map((f) => ({ f, text: readFileSync(join(SRC, f), "utf8") }))
    .filter(({ text }) => text.includes("render(<App"));
  /** A lazy route written as a literal, on a line that is not only checking a
   *  route string: an href, a parse, an expected value. Routes are often kept
   *  in a table and assigned to the hash from a variable, so the assignment
   *  itself is not what to look for. */
  const LAZY = /["'`]#\/(submit|guide|plugin\/)/;
  const CHECKS = /parseRoute|Href\(|toBe\(|toHaveAttribute|toEqual|toMatch/;
  const opensLazy = { test: (text: string) =>
    text.split("\n").some((line) => LAZY.test(line) && !CHECKS.test(line)) };

  it("finds the app tests to check", () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it.each(files.filter(({ text }) => opensLazy.test(text)).map(({ f, text }) => [f, text]))(
    "%s uses it", (_f, text) => {
      expect(text).toMatch(/\bwaitForLazyPage\(/);
    });
});
