import { describe, it, expect, vi, afterEach } from "vitest";
import { globSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Submit } from "../components/Submit";
import { settleUserLookup } from "./lookup";

afterEach(() => vi.unstubAllGlobals());

const box = (id: string) => document.getElementById(id) as HTMLSelectElement;

/* The failure behind #350: a lookup answered between the `input` and `change`
   events of choosing an option put the select back. The helper must hold the
   test until nothing of the lookup is left to land. */
describe("settleUserLookup", () => {
  it("returns only once the lookup is answered, so a choice made after it is kept", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let answered = false;
    vi.stubGlobal("fetch", vi.fn(() => gate.then(() => {
      answered = true;
      return { ok: true, status: 200, json: () => Promise.resolve({ login: "cityofx" }) };
    })));
    const user = userEvent.setup();
    render(<Submit repo="a/b" skills={[]} mode="new" />);
    await user.type(box("namespace"), "cityofx");

    // The answer is held back past the half-second pause, then let go.
    setTimeout(release, 800);
    await settleUserLookup();
    expect(answered).toBe(true);

    await user.selectOptions(box("civic.scope"), "municipal");
    expect(box("civic.scope").value).toBe("municipal");
  });
});

/* #354: the helper only helps if it is used. A test that types a username and
   then chooses an option passes until the lookup's answer happens to land
   between the two events, which is how #350 surfaced long after the test was
   written. Read per test, so a settle in one test does not cover another. */
describe("every test that chooses an option after typing a username settles the lookup first", () => {
  const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  /** Typing into the username box, however a test finds it. */
  const TYPES_USERNAME = /\.type\([^\n]*(GitHub username|namespaceLabel|username\(\)|["']namespace["'])/;
  const CHOOSES = /selectOptions\(/;
  const tests = (globSync("**/*.test.tsx", { cwd: SRC }) as string[])
    .flatMap((f) => readFileSync(join(SRC, f), "utf8")
      .split(/\n\s*it(?:\.each\(.*?\))?\(/)
      .slice(1)
      .map((body) => [`${f}: ${/^(["'`])(.*?)\1/.exec(body)?.[2] ?? "?"}`, body] as const));
  const atRisk = tests.filter(([, body]) => {
    const typed = body.search(TYPES_USERNAME);
    return typed >= 0 && CHOOSES.test(body.slice(typed));
  });

  it("finds the tests to check", () => {
    expect(atRisk.length).toBeGreaterThan(1);
  });

  it.each(atRisk)("%s", (_name, body) => {
    const typed = body.search(TYPES_USERNAME);
    const chosen = typed + body.slice(typed).search(CHOOSES);
    expect(body.slice(typed, chosen)).toMatch(/\bsettleUserLookup\(/);
  });
});
