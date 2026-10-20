/** The draft store (#294): answers kept in this browser through the fork round
 *  trip. Everything here is about storage being a thing that can be absent,
 *  full, blocked or stale, and the page working regardless. */

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  SCHEMA_VERSION, draftKey, readDraft, writeDraft, clearDraft, onlyStrings,
} from "./draftStore";

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("draftKey — each route keeps its own", () => {
  it("separates the skill route, the plugin route and update mode", () => {
    const keys = [
      draftKey({ route: "skill" }),
      draftKey({ route: "plugin" }),
      draftKey({ route: "update", listing: "ns/one" }),
    ];
    expect(new Set(keys).size).toBe(3);
  });

  it("puts the listing being updated into update mode's key", () => {
    const one = draftKey({ route: "update", listing: "ns/one" });
    const two = draftKey({ route: "update", listing: "ns/two" });
    expect(one).toContain("ns/one");
    expect(one).not.toBe(two);
  });
});

describe("write and read", () => {
  it("round-trips an object, and stamps the schema version", () => {
    const key = draftKey({ route: "skill" });
    expect(writeDraft(key, { draft: { author: "cityofx" } })).toBe(true);
    expect(readDraft(key)?.data).toEqual({ draft: { author: "cityofx" } });
    expect(JSON.parse(localStorage.getItem(key)!).v).toBe(SCHEMA_VERSION);
  });

  it("reads nothing where nothing was saved", () => {
    expect(readDraft(draftKey({ route: "skill" }))).toBeNull();
  });

  it("discards a draft written under another schema version, and removes it", () => {
    const key = draftKey({ route: "skill" });
    localStorage.setItem(key, JSON.stringify({ v: SCHEMA_VERSION + 1, data: { draft: {} } }));
    expect(readDraft(key)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it.each([
    ["not JSON", "{oops"],
    ["a bare string", JSON.stringify("hello")],
    ["an array", JSON.stringify([1])],
    ["no data", JSON.stringify({ v: SCHEMA_VERSION })],
    ["data that is not an object", JSON.stringify({ v: SCHEMA_VERSION, data: 4 })],
  ])("treats %s as no draft", (_name, raw) => {
    const key = draftKey({ route: "skill" });
    localStorage.setItem(key, raw);
    expect(readDraft(key)).toBeNull();
  });

  it("clears one route without touching another", () => {
    const skill = draftKey({ route: "skill" });
    const plugin = draftKey({ route: "plugin" });
    writeDraft(skill, { a: "1" });
    writeDraft(plugin, { b: "2" });
    clearDraft(skill);
    expect(readDraft(skill)).toBeNull();
    expect(readDraft(plugin)).not.toBeNull();
  });
});

describe("storage that throws", () => {
  it("does not throw on read, write or clear when every call throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
    const key = draftKey({ route: "skill" });
    expect(readDraft(key)).toBeNull();
    expect(writeDraft(key, { a: "1" })).toBe(false);
    expect(() => clearDraft(key)).not.toThrow();
  });

  it("does not throw when merely reaching window.localStorage throws", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    const key = draftKey({ route: "skill" });
    expect(readDraft(key)).toBeNull();
    expect(writeDraft(key, { a: "1" })).toBe(false);
    expect(() => clearDraft(key)).not.toThrow();
  });
});

describe("onlyStrings — what a restored draft is allowed to bring back", () => {
  const TEMPLATE = { author: "", name: "", license: "MIT" };

  it("takes strings for the keys the draft has now", () => {
    expect(onlyStrings(TEMPLATE, { author: "cityofx", name: "x" }))
      .toEqual({ author: "cityofx", name: "x", license: "MIT" });
  });

  it("keeps the default for a key that was not saved (a field added since)", () => {
    expect(onlyStrings(TEMPLATE, { author: "a" }).license).toBe("MIT");
  });

  it("drops keys the draft no longer has, and values that are not strings", () => {
    const out = onlyStrings(TEMPLATE, { author: 4, name: { x: 1 }, gone: "boo" });
    expect(out).toEqual(TEMPLATE);
    expect("gone" in out).toBe(false);
  });

  it("gives the defaults for something that is not an object", () => {
    expect(onlyStrings(TEMPLATE, null)).toEqual(TEMPLATE);
    expect(onlyStrings(TEMPLATE, "x")).toEqual(TEMPLATE);
  });
});
