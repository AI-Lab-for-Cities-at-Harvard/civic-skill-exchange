/** The standing Community notice replaced a paragraph repeated on every card.
 *  Saying it once means saying it accurately, so the wording is derived from the
 *  catalogue's actual composition rather than hardcoded. */

import { describe, it, expect } from "vitest";
import { communityNotice } from "./notice";

describe("communityNotice", () => {
  it("says nothing when no listing is Community", () => {
    expect(communityNotice({ total: 4, reviewed: 4, community: 0 })).toBeNull();
  });

  it("says nothing for an empty catalogue", () => {
    expect(communityNotice({ total: 0, reviewed: 0, community: 0 })).toBeNull();
  });

  it("does not hedge when every listing is Community", () => {
    const notice = communityNotice({ total: 9, reviewed: 0, community: 9 });
    expect(notice?.lead).toMatch(/^Every skill here is a Community listing\./);
  });

  it("counts plainly when the catalogue is mixed", () => {
    const notice = communityNotice({ total: 10, reviewed: 2, community: 8 });
    expect(notice?.lead).toBe("8 of the 10 skills here are Community listings.");
  });

  it("gets the singular right", () => {
    const notice = communityNotice({ total: 2, reviewed: 1, community: 1 });
    expect(notice?.lead).toBe("1 of the 2 skills here is a Community listing.");
  });

  it("always carries the same consequence, whatever the counts", () => {
    for (const counts of [
      { total: 9, reviewed: 0, community: 9 },
      { total: 10, reviewed: 2, community: 8 },
    ]) {
      const notice = communityNotice(counts);
      expect(notice?.body).toMatch(/automated checks/i);
      expect(notice?.body).toMatch(/nobody|no one/i);
      expect(notice?.body).toMatch(/before you run/i);
    }
  });
});
