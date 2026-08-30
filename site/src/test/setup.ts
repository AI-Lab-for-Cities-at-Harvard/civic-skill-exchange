/** Component-test harness.
 *
 * The lib/ tests are pure and were fine in the node environment; jsdom is a
 * superset for our purposes — it still runs under Node, so the ones that read
 * registry files off disk keep working unchanged.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest does not unmount between tests on its own, and a left-over tree makes
// the next getByRole ambiguous in ways that are miserable to debug.
afterEach(cleanup);
