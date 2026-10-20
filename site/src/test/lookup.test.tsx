import { describe, it, expect, vi, afterEach } from "vitest";
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
