import { describe, it, expect } from "vitest";
import { isGitHubLogin } from "./login";

describe("isGitHubLogin", () => {
  it.each(["maria-lopez", "a", "A1", "cityofx", "a-b-c", "x".repeat(39)])(
    "accepts %s", (s) => expect(isGitHubLogin(s)).toBe(true),
  );

  it.each([
    "", "Maria Lopez", "maria lopez", "-maria", "maria-", "ma--ria", "ma_ria",
    "maria@example.org", "x".repeat(40), "maría",
  ])("refuses %j", (s) => expect(isGitHubLogin(s)).toBe(false));
});
