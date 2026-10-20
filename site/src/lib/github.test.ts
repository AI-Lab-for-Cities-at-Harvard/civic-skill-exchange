import { describe, it, expect, vi, afterEach } from "vitest";
import { checkGitHubUser } from "./github";

function respond(status: number) {
  return vi.fn().mockResolvedValue({ status, ok: status >= 200 && status < 300 });
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("checkGitHubUser", () => {
  it("confirms a login that exists", async () => {
    vi.stubGlobal("fetch", respond(200));
    expect(await checkGitHubUser("sgarcese")).toBe("ok");
  });

  it("reports one that does not", async () => {
    vi.stubGlobal("fetch", respond(404));
    expect(await checkGitHubUser("sgarcees")).toBe("missing");
  });

  it.each([403, 429])("could not check when rate limited (%i), rather than warning wrongly", async (status) => {
    // 60 requests an hour per address. A limit is not evidence of a bad name,
    // but it is not a confirmation either, so it is told apart from one (#293).
    vi.stubGlobal("fetch", respond(status));
    expect(await checkGitHubUser("sgarcese")).toBe("unavailable");
  });

  it("could not check when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await checkGitHubUser("sgarcese")).toBe("unavailable");
  });

  it("spends no request on something that is not a login", async () => {
    const fetchMock = respond(200);
    vi.stubGlobal("fetch", fetchMock);
    for (const bad of ["", "  ", "has space", "-leading", "trailing-", "a--b", "x".repeat(40)]) {
      expect(await checkGitHubUser(bad)).toBe("unknown");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts the shapes GitHub actually allows", async () => {
    const fetchMock = respond(200);
    vi.stubGlobal("fetch", fetchMock);
    for (const ok of ["a", "sgarcese", "AI-Lab-for-Cities-at-Harvard", "user123"]) {
      expect(await checkGitHubUser(ok)).toBe("ok");
    }
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
