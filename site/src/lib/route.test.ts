import { describe, it, expect } from "vitest";
import { parseRoute, skillHref, addFieldsHref } from "./route";

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
    expect(parseRoute("#/submit")).toEqual({ page: "submit" });
  });

  it("carries the skill a maintainer arrived to update", () => {
    expect(parseRoute("#/submit?add=civic-skills/notice-rewriter"))
      .toEqual({ page: "submit", add: "civic-skills/notice-rewriter" });
  });

  it("ignores an add= that is not a namespaced skill", () => {
    // It becomes a path into GitHub's editor, so a stray value must not travel.
    expect(parseRoute("#/submit?add=../../etc")).toEqual({ page: "submit" });
    expect(parseRoute("#/submit?add=nothing")).toEqual({ page: "submit" });
  });

  it("builds the link flow 2 uses", () => {
    expect(addFieldsHref("civic-skills", "notice-rewriter"))
      .toBe("#/submit?add=civic-skills%2Fnotice-rewriter");
  });
});
