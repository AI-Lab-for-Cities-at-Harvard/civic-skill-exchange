/** The submission page's pure half: turning a form into frontmatter, and
 *  turning frontmatter into a GitHub handoff URL.
 *
 *  Kept out of the component because the URL budget is the part that has to be
 *  exactly right. Rulings on #24 measured GitHub's behaviour: a URL over ~6.1 KB
 *  fails, and between roughly 6 KB and 9 KB it fails *dirty* — a 500 or a
 *  dropped connection rather than a clean 414. So the fallback is chosen from
 *  the measured length before navigating, never from catching an error.
 */

import { describe, it, expect } from "vitest";
import {
  toFrontmatter, toYaml, newFileUrl, editUrl, mailtoUrl, repoSlug, slugify,
  URL_BUDGET,
  fitsInUrl,
  forkUploadUrl, pullRequestUrl, registryUploadUrl, parseForkRef,
  EMPTY_DRAFT,
  type Draft,
} from "./submit";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

/** The draft the fork tests share: namespace cityofx, skill permit-status. */
const D: Draft = { ...EMPTY_DRAFT, author: "cityofx", name: "permit-status" };

function draft(over: Partial<Draft> = {}): Draft {
  return {
    ...EMPTY_DRAFT,
    author: "cityofx",
    name: "permit-status-explainer",
    description:
      "Explains why a building permit is stuck, in language a resident can act on.",
    license: "MIT",
    category: "constituent-services",
    jurisdiction: "us-local",
    dataSensitivity: "none",
    humanReview: "advisory-only",
    maintainer: "City of X",
    contact: "digital@cityofx.gov",
    affiliation: "government",
    deployment: "none",
    ...over,
  };
}

describe("toFrontmatter", () => {
  it("nests civic.* under metadata, where the schema wants it", () => {
    const f = toFrontmatter(draft());
    expect(f.name).toBe("permit-status-explainer");
    expect(f.metadata?.["civic.category"]).toBe("constituent-services");
    expect(f.metadata?.["civic.maintainer"]).toBe("City of X");
  });

  it("omits optional fields left blank rather than emitting empty strings", () => {
    const f = toFrontmatter(draft());
    expect(f).not.toHaveProperty("compatibility");
    expect(f.metadata).not.toHaveProperty("civic.use-when");
    expect(f.metadata).not.toHaveProperty("civic.deployed-at");
  });

  it("splits allowed-tools on commas and drops the empties", () => {
    const f = toFrontmatter(draft({ tools: "Read, Grep ,, Bash " }));
    expect(f["allowed-tools"]).toBe("Read, Grep, Bash");
  });

  it("leaves allowed-tools out entirely when no tools are declared", () => {
    expect(toFrontmatter(draft({ tools: "  " }))).not.toHaveProperty("allowed-tools");
  });

  it("carries the fit fields when they are given", () => {
    const f = toFrontmatter(draft({ useWhen: "A resident asks.", avoidWhen: "Legal review." }));
    expect(f.metadata?.["civic.use-when"]).toBe("A resident asks.");
    expect(f.metadata?.["civic.avoid-when"]).toBe("Legal review.");
  });
});

describe("toYaml", () => {
  it("wraps the block in frontmatter fences", () => {
    const y = toYaml(toFrontmatter(draft()));
    expect(y.startsWith("---\n")).toBe(true);
    expect(y.trimEnd().endsWith("---")).toBe(true);
  });

  it("quotes every scalar, so a colon in a description cannot break the parse", () => {
    const y = toYaml(toFrontmatter(draft({
      description: "Explains: why a permit is stuck, in plain language for residents.",
    })));
    expect(y).toContain('description: "Explains: why a permit is stuck');
  });

  it("escapes quotes and backslashes rather than emitting broken YAML", () => {
    const y = toYaml(toFrontmatter(draft({ maintainer: 'City of "X" \\ Dept' })));
    expect(y).toContain('civic.maintainer: "City of \\"X\\" \\\\ Dept"');
  });

  it("keeps a newline in a fit field from ending the scalar", () => {
    const y = toYaml(toFrontmatter(draft({ useWhen: "First line.\nSecond line." })));
    expect(y).toContain('civic.use-when: "First line.\\nSecond line."');
    expect(y.split("\n").filter((l) => l.includes("Second line")).length).toBe(1);
  });

  it("indents metadata one level under its key", () => {
    const y = toYaml(toFrontmatter(draft()));
    expect(y).toContain("metadata:\n  civic.category:");
  });
});

describe("newFileUrl", () => {
  it("targets the submitter's own namespace, which is what L1 checks", () => {
    const url = newFileUrl(REPO, draft(), toYaml(toFrontmatter(draft())));
    expect(url).toContain(`/${REPO}/new/main`);
    expect(url).toContain("filename=skills%2Fcityofx%2Fpermit-status-explainer%2FSKILL.md");
  });

  it("carries the frontmatter in value=", () => {
    const yaml = toYaml(toFrontmatter(draft()));
    const url = newFileUrl(REPO, draft(), yaml);
    const value = new URL(url).searchParams.get("value");
    expect(value).toBe(yaml);
  });
});

describe("fitsInUrl — the measurement the rulings on #24 required", () => {
  it("accepts an ordinary submission", () => {
    expect(fitsInUrl(newFileUrl(REPO, draft(), toYaml(toFrontmatter(draft()))))).toBe(true);
  });

  it("rejects before navigating when the encoded length would exceed the budget", () => {
    // Newlines cost three bytes each once encoded, so a long fit field grows
    // much faster than its character count suggests.
    const big = draft({ useWhen: "x\n".repeat(2000) });
    expect(fitsInUrl(newFileUrl(REPO, big, toYaml(toFrontmatter(big))))).toBe(false);
  });

  it("measures encoded bytes, not characters", () => {
    // A URL whose characters are under budget but whose encoding is not.
    const url = "https://x.test/?value=" + "\n".repeat(URL_BUDGET / 2);
    expect(url.length).toBeLessThan(URL_BUDGET);
    expect(fitsInUrl(url)).toBe(false);
  });

  it("leaves room below GitHub's dirty-failure band", () => {
    // 6.1 KB worked, 7.1 KB returned a 500. The budget sits below the band, not
    // inside it.
    expect(URL_BUDGET).toBeLessThanOrEqual(6000);
  });
});

describe("editUrl — flow 2", () => {
  it("points at the existing file, because value= prefills new files only", () => {
    const url = editUrl(REPO, "skills/cityofx/permit-status-explainer");
    expect(url).toBe(
      `https://github.com/${REPO}/edit/main/skills/cityofx/permit-status-explainer/SKILL.md`,
    );
  });

  it("carries no value=, which GitHub would ignore on an edit", () => {
    expect(editUrl(REPO, "skills/a/b")).not.toContain("value=");
  });
});

describe("repoSlug", () => {
  it("turns the index's repo URL into owner/name", () => {
    expect(repoSlug("https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange"))
      .toBe("AI-Lab-for-Cities-at-Harvard/civic-skill-exchange");
  });

  it("tolerates a trailing slash", () => {
    expect(repoSlug("https://github.com/a/b/")).toBe("a/b");
  });

  it("leaves an already-slug value alone, so a fork can supply one", () => {
    expect(repoSlug("a/b")).toBe("a/b");
  });
});

describe("mailtoUrl — the path for somebody without a GitHub account", () => {
  const yaml = toYaml(toFrontmatter(draft()));

  it("addresses the submissions inbox and names the skill in the subject", () => {
    const url = mailtoUrl("who@example.test", draft(), yaml);
    expect(url.startsWith("mailto:who@example.test?")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Skill submission: permit-status-explainer");
  });

  it("carries the frontmatter, so nobody retypes it out of an email", () => {
    expect(decodeURIComponent(mailtoUrl("w@e.test", draft(), yaml)))
      .toContain("civic.maintainer");
  });

  it("names the sender, since the commit will not", () => {
    // A maintainer opens the pull request, so git records them as the author.
    // The mail is the only place the real submitter is recorded.
    expect(decodeURIComponent(mailtoUrl("w@e.test", draft(), yaml)))
      .toContain("City of X");
  });

  it("is held to the same length budget, because mail clients truncate quietly", () => {
    const big = draft({ useWhen: "x".repeat(8000) });
    expect(fitsInUrl(mailtoUrl("w@e.test", big, toYaml(toFrontmatter(big))))).toBe(false);
  });
});

describe("slugify — meeting submitters where their skills are named", () => {
  it("lowercases a real repository name", () => {
    expect(slugify("Civic-Analytics-Agent-Workflow-Claude-Skill"))
      .toBe("civic-analytics-agent-workflow-claude-skill");
  });

  it("turns spaces into hyphens", () => {
    expect(slugify("Permit Status Explainer")).toBe("permit-status-explainer");
  });

  it("handles underscores and other separators", () => {
    expect(slugify("permit_status.explainer")).toBe("permit-status-explainer");
  });

  it("collapses runs and trims the ends", () => {
    expect(slugify("  --Permit  //  Status--  ")).toBe("permit-status");
  });

  it("strips accents rather than dropping the letter", () => {
    expect(slugify("Café Résumé")).toBe("cafe-resume");
  });

  it("holds the 64-character cap, and does not end mid-hyphen", () => {
    const out = slugify("a".repeat(60) + " bbbbbbbbbb");
    expect(out.length).toBeLessThanOrEqual(64);
    expect(out.endsWith("-")).toBe(false);
  });

  it("gives back nothing when there was nothing usable", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("leaves an already-valid name untouched", () => {
    expect(slugify("permit-status-explainer")).toBe("permit-status-explainer");
  });
});

/** #81: the page used to guess the fork's address and got it wrong two ways —
 *  the owner is not the namespace when the namespace is reserved, and the
 *  repository name is whatever the submitter renamed their fork to. A guessed
 *  URL that 404s at step three is what sent a skill to the wrong directory. */
describe("the fork is asked for, not guessed", () => {
  it("builds the upload link from the fork the submitter pasted", () => {
    expect(forkUploadUrl("https://github.com/sgarcese-hbs/my-registry-copy", D))
      .toBe("https://github.com/sgarcese-hbs/my-registry-copy/upload/main/skills/cityofx");
  });

  it("accepts what people actually paste — a bare slug", () => {
    expect(forkUploadUrl("sgarcese-hbs/my-copy", D))
      .toBe("https://github.com/sgarcese-hbs/my-copy/upload/main/skills/cityofx");
  });

  it("survives a trailing slash and a .git suffix", () => {
    expect(forkUploadUrl("https://github.com/a/b.git/", D))
      .toBe("https://github.com/a/b/upload/main/skills/cityofx");
  });

  it("returns null rather than a link when the fork is not known yet", () => {
    expect(forkUploadUrl("", D)).toBeNull();
    expect(forkUploadUrl("   ", D)).toBeNull();
    expect(forkUploadUrl("not a repository", D)).toBeNull();
  });

  it("compares against the fork that was pasted, not one derived from the namespace", () => {
    expect(pullRequestUrl(REPO, "sgarcese-hbs/my-copy"))
      .toBe(`https://github.com/${REPO}/compare/main...sgarcese-hbs:my-copy:main?expand=1`);
  });

  it("has no compare link without a fork either", () => {
    expect(pullRequestUrl(REPO, "")).toBeNull();
  });
});

/** A reserved-namespace submitter has write access — CODEOWNERS gates the
 *  folder — so forking is the wrong instruction for them, and the fork they
 *  would need does not exist. */
describe("the write-access path", () => {
  it("uploads into the registry itself for a reserved namespace", () => {
    expect(registryUploadUrl(REPO, { ...D, author: "civic-skills" }))
      .toBe(`https://github.com/${REPO}/upload/main/skills/civic-skills`);
  });
});

describe("parseForkRef", () => {
  it("takes a browser URL, a clone URL or a bare slug", () => {
    for (const input of [
      "https://github.com/a/b", "github.com/a/b", "a/b",
      "https://github.com/a/b.git", "git@github.com:a/b.git", " a/b/ ",
    ]) {
      expect(parseForkRef(input)).toBe("a/b");
    }
  });

  it("refuses anything that is not owner/name", () => {
    for (const input of ["", "   ", "a", "not a repo", "https://gitlab.com/a/b"]) {
      expect(parseForkRef(input)).toBeNull();
    }
  });
});

/** The upload page must open the *parent* of the skill directory.
 *
 *  GitHub keeps the name of a dragged folder, and the folder this page hands
 *  back is named for the skill — so opening the upload page at the skill
 *  directory produced skills/{ns}/{name}/{name}/SKILL.md. A real submission
 *  landed that way before this was pinned.
 */
describe("the upload lands the folder, not a folder inside it", () => {
  it("opens the namespace directory, so the dragged folder becomes the skill", () => {
    expect(forkUploadUrl("sgarcese-hbs/my-copy", D))
      .toBe("https://github.com/sgarcese-hbs/my-copy/upload/main/skills/cityofx");
  });

  it("does the same for a submitter uploading into the registry itself", () => {
    expect(registryUploadUrl(REPO, { ...D, author: "civic-skills" }))
      .toBe(`https://github.com/${REPO}/upload/main/skills/civic-skills`);
  });

  it("never names the skill twice", () => {
    const url = forkUploadUrl("a/b", D) ?? "";
    expect(url.match(/permit-status/g)).toBeNull();
  });
});
