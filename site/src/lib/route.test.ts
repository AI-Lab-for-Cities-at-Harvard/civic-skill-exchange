import { describe, it, expect } from "vitest";
import { parseRoute } from "./route";

describe("parseRoute", () => {
  it("defaults to browse", () => {
    expect(parseRoute("")).toBe("browse");
    expect(parseRoute("#")).toBe("browse");
    expect(parseRoute("#/")).toBe("browse");
  });

  it("recognises about with or without a slash", () => {
    expect(parseRoute("#about")).toBe("about");
    expect(parseRoute("#/about")).toBe("about");
  });

  it("ignores a query string", () => {
    expect(parseRoute("#/about?from=readme")).toBe("about");
  });

  it("falls back to browse for anything unknown, rather than rendering nothing", () => {
    expect(parseRoute("#/nope")).toBe("browse");
  });
});
