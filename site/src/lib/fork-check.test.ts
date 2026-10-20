/** #293: the username and the fork's address are checked against each other
 *  before the page hands off.
 *
 *  Found end to end (docs/spikes/end-to-end-submission-and-install.md): the
 *  browser was signed in as `sgarcese-hbs`, the box said `sgarcese`, the files
 *  went to `skills/sgarcese/…`, and nothing warned (S-1). The registry's own
 *  address was accepted as "your copy" (S-8), and an empty box rendered
 *  `skills//…` (S-2). */

import { describe, it, expect } from "vitest";
import {
  checkFork, forkOwner, hasNamespace, isRegistryFork, recipe, recipeInput, usableFork,
} from "./submit";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
const draft = (author: string) => ({ author, name: "permit-helper" });

describe("forkOwner", () => {
  it("is the account the fork lives under, from any address people paste", () => {
    expect(forkOwner("https://github.com/sgarcese-hbs/civic-skill-exchange")).toBe("sgarcese-hbs");
    expect(forkOwner("github.com/sgarcese-hbs/my-copy/")).toBe("sgarcese-hbs");
    expect(forkOwner("sgarcese-hbs/my-copy")).toBe("sgarcese-hbs");
    expect(forkOwner("git@github.com:sgarcese-hbs/my-copy.git")).toBe("sgarcese-hbs");
  });

  it("is null for something that is not a repository", () => {
    expect(forkOwner("")).toBeNull();
    expect(forkOwner("nonsense")).toBeNull();
  });
});

describe("the registry's own address is not your copy (S-8)", () => {
  it.each([
    "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange",
    "ai-lab-for-cities-at-harvard/CIVIC-SKILL-EXCHANGE",
    "https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange",
    "https://github.com/ai-lab-for-cities-at-harvard/civic-skill-exchange/",
    "github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange.git",
  ])("refuses %s", (address) => {
    expect(isRegistryFork(address, REPO)).toBe(true);
    expect(checkFork(address, REPO, draft("sgarcese"))).toBe("registry");
    expect(usableFork(address, REPO)).toBe("");
  });

  it("accepts a fork that keeps the registry's name", () => {
    const fork = "sgarcese/civic-skill-exchange";
    expect(isRegistryFork(fork, REPO)).toBe(false);
    expect(usableFork(fork, REPO)).toBe(fork);
  });

  it("never puts the registry in the recipe's clone line", () => {
    const text = recipe(recipeInput(
      REPO, usableFork(REPO, REPO), draft("sgarcese"), "skills", "x"));
    expect(text).not.toContain(`github.com/${REPO}`);
  });
});

describe("checkFork — the fork's owner against the typed username (S-1)", () => {
  it("is ok when they are the same account, in any case", () => {
    expect(checkFork("github.com/sgarcese/my-copy", REPO, draft("sgarcese"))).toBe("ok");
    expect(checkFork("github.com/SGarcese/my-copy", REPO, draft("sgarcese"))).toBe("ok");
    expect(checkFork("sgarcese/my-copy", REPO, draft(" SGARCESE "))).toBe("ok");
  });

  it("flags a fork under a different account", () => {
    expect(checkFork("https://github.com/sgarcese-hbs/civic-skill-exchange", REPO,
      draft("sgarcese"))).toBe("mismatch");
  });

  it("says nothing about a mismatch while the username is empty", () => {
    expect(checkFork("sgarcese-hbs/my-copy", REPO, draft(""))).toBe("ok");
  });

  it("is empty with nothing pasted, and unparsed for something that is not a repository", () => {
    expect(checkFork("", REPO, draft("sgarcese"))).toBe("empty");
    expect(checkFork("   ", REPO, draft("sgarcese"))).toBe("empty");
    expect(checkFork("nonsense", REPO, draft("sgarcese"))).toBe("unparsed");
  });
});

describe("hasNamespace — nothing is handed off without a username (S-2)", () => {
  it("is false for an empty or blank box", () => {
    expect(hasNamespace({ author: "" })).toBe(false);
    expect(hasNamespace({ author: "   " })).toBe(false);
  });

  it("is true once something is typed", () => {
    expect(hasNamespace({ author: "sgarcese" })).toBe(true);
  });
});
