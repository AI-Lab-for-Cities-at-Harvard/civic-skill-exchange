// One timezone for every test run. The rendered-text snapshots include a date
// the page formats in the visitor's zone, and a snapshot recorded in Boston
// disagreed with CI in UTC by a day (#149). Node re-reads TZ when it changes,
// so setting it here, before any Date is formatted, is enough.
process.env.TZ = "UTC";

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
