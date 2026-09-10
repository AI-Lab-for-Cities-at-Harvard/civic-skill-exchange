/**
 * The site is translated; `docs/` is not, and a link says so.
 *
 * ADR 0004 decision 4 keeps CONTRIBUTING, SUBMITTING, REVIEW, SECURITY and the
 * rest of `docs/` in English — the drift surface doubles per language and the
 * line was drawn at the site. Which leaves a Spanish reader clicking a Spanish
 * link into an English document, and finding that out after the page loads.
 *
 * So a link into a document carries a short note in the language of the page
 * around it. The note is a string in the table, so the owner words it, and the
 * English table's answer is nothing at all: an English reader does not need to
 * be told that an English document is in English.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { About } from "../components/About";
import { ContributeBand } from "../components/Bands";
import { DEFAULT_LOCALE, setLocale, strings } from "./strings";
import { makeSkill } from "../test/fixtures";

afterEach(async () => { await setLocale(DEFAULT_LOCALE); });

const REPO = "https://example.test/repo";

/** Every link on a surface that goes to a document in the repository. */
function docLinks(root: HTMLElement): HTMLAnchorElement[] {
  return [...root.querySelectorAll<HTMLAnchorElement>("a[href]")]
    .filter((a) => /\/blob\/main\/[\w/-]+\.md$/.test(a.getAttribute("href") ?? ""));
}

function surfaces() {
  const { container } = render(
    <>
      <About skills={[makeSkill({ name: "generalize-skill" })]} />
      <ContributeBand repo={REPO} />
    </>,
  );
  return container;
}

describe("a link into an English document", () => {
  it("finds links to check, so a renamed doc cannot empty this test out", () => {
    // About links LOCALIZATION, SECURITY, REVIEW and CONTRIBUTING; the
    // contribute band links CONTRIBUTING and SECURITY.
    expect(docLinks(surfaces()).length).toBeGreaterThanOrEqual(5);
  });

  it("says the document is in English, in Spanish, on the Spanish site", async () => {
    await setLocale("es");
    const note = strings().chrome.docsInEnglish;
    expect(note).not.toBe("");
    for (const link of docLinks(surfaces())) {
      expect(link.textContent, link.getAttribute("href") ?? "").toContain(note);
    }
  });

  it("says nothing on the English site, where there is nothing to say", () => {
    expect(strings().chrome.docsInEnglish).toBe("");
    const container = surfaces();
    for (const link of docLinks(container)) {
      // No stray parentheses left behind by an empty note.
      expect(link.textContent).not.toMatch(/\(\s*\)/);
    }
  });

  it("keeps the note inside the link, where somebody deciding to click reads it", async () => {
    await setLocale("es");
    const note = strings().chrome.docsInEnglish;
    render(<ContributeBand repo={REPO} />);
    const security = screen.getAllByRole("link").find(
      (a) => a.getAttribute("href")?.endsWith("docs/SECURITY.md"));
    expect(security?.textContent).toContain(note);
  });
});
