import { act } from "@testing-library/react";
import { expect, vi } from "vitest";

/** Waits for the username lookup (useUserCheck) to have been asked, answered,
 *  and its answer drawn. Needs `fetch` stubbed with a mock.
 *
 *  The lookup is debounced, so its answer lands half a second after the
 *  username stops changing, and sets state on the whole form. user-event
 *  chooses a `<select>` option in two events, `input` and then `change`. An
 *  answer drawn between them puts the controlled select back to its old value,
 *  and `change` reports the old choice: the answer is lost, the question stays
 *  open, and the page counts one more than the test expected (#350). On a
 *  loaded machine the half second is reached in the middle of the other
 *  answers. Settling the lookup before choosing anything leaves nothing
 *  pending to land in that gap. */
export async function settleUserLookup(): Promise<void> {
  const ask = vi.mocked(fetch);
  await act(async () => {
    await vi.waitFor(() => expect(ask).toHaveBeenCalled(), { timeout: 5000 });
    await ask.mock.results[0]!.value;
    // The answer's state update is a few microtasks behind the response.
    await new Promise((r) => setTimeout(r, 0));
  });
}
