import { describe, it, expect } from "vitest";
import { parseRoute, skillHref, addFieldsHref, submitHref, aboutHref} from "./route";

describe("parseRoute", () => {
  it("defaults to browse", () => {
    for (const h of ["", "#", "#/"]) expect(parseRoute(h)).toEqual({ page: "browse" });
  });

  it("recognises about with or without a slash", () => {
    expect(parseRoute("#about")).toEqual({ page: "about" });
    expect(parseRoute("#/about")).toEqual({ page: "about" });
  });

  it("ignores a query string", () => {
    expect(parseRoute("#/about?from=readme")).toEqual({ page: "about" });
  });

  it("parses a skill route", () => {
    expect(parseRoute("#/skill/civic-skills/permit-explainer")).toEqual({
      page: "skill", namespace: "civic-skills", name: "permit-explainer",
    });
  });

  it("decodes percent-encoded segments", () => {
    expect(parseRoute("#/skill/city%2Dof%2Dx/a%2Db")).toEqual({
      page: "skill", namespace: "city-of-x", name: "a-b",
    });
  });

  it("falls back to browse for an incomplete skill route", () => {
    expect(parseRoute("#/skill/only-a-namespace")).toEqual({ page: "browse" });
  });

  it("falls back to browse for anything unknown, rather than rendering nothing", () => {
    expect(parseRoute("#/nope")).toEqual({ page: "browse" });
  });
});

describe("skillHref", () => {
  it("builds a route the parser round-trips", () => {
    const href = skillHref("civic-skills", "permit-explainer");
    expect(parseRoute(href)).toEqual({
      page: "skill", namespace: "civic-skills", name: "permit-explainer",
    });
  });

  it("encodes segments so a name cannot break out of the route", () => {
    expect(skillHref("ns", "a/b")).toBe("#/skill/ns/a%2Fb");
  });
});

/** #24: the submission page, and flow 2's deep link into it. */
describe("the submit route", () => {
  it("parses #/submit", () => {
    expect(parseRoute("#/submit")).toEqual({ page: "submit", mode: "new" });
  });

  it("carries the skill a maintainer arrived to update", () => {
    expect(parseRoute("#/submit?add=civic-skills/notice-rewriter"))
      .toEqual({ page: "submit", mode: "update", add: "civic-skills/notice-rewriter" });
  });

  it("ignores an add= that is not a namespaced skill", () => {
    // It becomes a path into GitHub's editor, so a stray value must not travel.
    expect(parseRoute("#/submit?add=../../etc")).toEqual({ page: "submit", mode: "new" });
    expect(parseRoute("#/submit?add=nothing")).toEqual({ page: "submit", mode: "new" });
  });

  it("builds the link flow 2 uses", () => {
    expect(addFieldsHref("civic-skills", "notice-rewriter"))
      .toBe("#/submit?add=civic-skills%2Fnotice-rewriter");
  });
});

/** #24: the page has two jobs — a new skill, and updating one already listed.
 *  The mode lives in the URL so each is linkable and the back button works. */
describe("the submit page's two modes", () => {
  it("defaults to adding a new skill", () => {
    expect(parseRoute("#/submit")).toEqual({ page: "submit", mode: "new" });
  });

  it("takes the update mode from the URL", () => {
    expect(parseRoute("#/submit?mode=update")).toEqual({ page: "submit", mode: "update" });
  });

  it("implies update mode when a listing was named", () => {
    // Arriving from a skill page is arriving to update that skill.
    expect(parseRoute("#/submit?add=civic-skills/notice-rewriter"))
      .toEqual({ page: "submit", mode: "update", add: "civic-skills/notice-rewriter" });
  });

  it("falls back to new when the mode is not one we have", () => {
    expect(parseRoute("#/submit?mode=nonsense")).toEqual({ page: "submit", mode: "new" });
  });

  it("builds both links", () => {
    expect(submitHref("new")).toBe("#/submit");
    expect(submitHref("update")).toBe("#/submit?mode=update");
  });
});

/** The About page grew sections worth linking to directly. Hash routing has
 *  only one `#`, so `#/about#metadata` cannot work — the section is a path
 *  segment instead, which also makes it a real URL somebody can send. */
describe("parseRoute — a section of the About page", () => {
  it("carries the section", () => {
    expect(parseRoute("#/about/metadata")).toEqual({ page: "about", section: "metadata" });
  });

  it("has no section when none was named", () => {
    expect(parseRoute("#/about")).toEqual({ page: "about" });
  });

  it("drops a section that is not a plain slug, since it reaches getElementById", () => {
    expect(parseRoute("#/about/../etc")).toEqual({ page: "about" });
    expect(parseRoute("#/about/has spaces")).toEqual({ page: "about" });
    expect(parseRoute("#/about/<script>")).toEqual({ page: "about" });
  });

  it("keeps working with a query string after it", () => {
    expect(parseRoute("#/about/tiers?from=readme"))
      .toEqual({ page: "about", section: "tiers" });
  });
});

describe("aboutHref", () => {
  it("links the page, or a section of it", () => {
    expect(aboutHref()).toBe("#/about");
    expect(aboutHref("metadata")).toBe("#/about/metadata");
  });
});
