/**
 * The About page is the same page in both languages.
 *
 * ADR 0004 decision 4 translates this page too, against the spike's own
 * recommendation, and the record says why and what it costs: it is prose, it
 * changes with the project, and every change is now two changes. The thing that
 * will actually go wrong is a section added to one language and not the other —
 * an anchor that works on the English site and 404s on the Spanish one, or a
 * table of contents pointing at a heading that is not there.
 *
 * So the section ids are compared. They are route slugs rather than prose, they
 * do not translate, and a locale that is missing one renders a page missing a
 * section: this fails loudly the moment the two drift.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { About } from "./About";
import { DEFAULT_LOCALE, locales, setLocale, strings } from "../i18n/strings";
import { makeSkill } from "../test/fixtures";

afterEach(async () => { await setLocale(DEFAULT_LOCALE); });

const SKILLS = [
  makeSkill({ namespace: "civic-skills", name: "generalize-skill" }),
  makeSkill({ namespace: "civic-skills", name: "localize-skill" }),
];

/** The ids of the sections actually rendered, in page order. */
function sectionIds(root: HTMLElement): string[] {
  return [...root.querySelectorAll("section[id]")].map((s) => s.id);
}

/** Where the table of contents points. */
function tocTargets(): string[] {
  return [...screen.getByTestId("about-toc").querySelectorAll("a")]
    .map((a) => a.getAttribute("href")?.split("/").at(-1) ?? "");
}

async function about(tag: string) {
  await setLocale(tag);
  const { container, unmount } = render(<About skills={SKILLS} />);
  const shape = { sections: sectionIds(container), toc: tocTargets() };
  unmount();
  return shape;
}

describe("About renders the same page in every locale", () => {
  it("checks more than one locale, or it is checking nothing", () => {
    expect(locales().length).toBeGreaterThan(1);
  });

  it("has the same section ids, in the same order", async () => {
    const english = await about(DEFAULT_LOCALE);
    expect(english.sections.length).toBeGreaterThanOrEqual(8);
    for (const tag of locales()) {
      const other = await about(tag);
      expect(other.sections, tag).toEqual(english.sections);
    }
  });

  it("points its contents list at sections that exist, in every locale", async () => {
    for (const tag of locales()) {
      const { sections, toc } = await about(tag);
      expect(toc.length, tag).toBeGreaterThanOrEqual(8);
      for (const target of toc) expect(sections, `${tag}: ${target}`).toContain(target);
    }
  });

  it("names every section in the language of the page", async () => {
    for (const tag of locales()) {
      await setLocale(tag);
      const { sections } = await about(tag);
      const named = strings().about.toc.sections;
      for (const id of sections) {
        // Not every rendered section is in the contents — Terms deliberately is
        // not — but every one that is has a name in this locale.
        if (id in named) expect(named[id as keyof typeof named], `${tag}: ${id}`).toBeTruthy();
      }
    }
  });
});

describe("About's vocabulary tables follow the reader", () => {
  /** The category table on the About page renders `vocabulary.category` from
   *  the locale's own table, which `labels.test.ts` holds to `label_es` in
   *  registry/categories.yml. So the label a Spanish reader sees is the
   *  vocabulary file's Spanish label, with nothing in between.
   *
   *  Descriptions are a separate matter: `categories.yml` carries
   *  `description_es` and `categories.json` publishes it, but no page renders a
   *  category description in either language today. */
  it("shows the current locale's category labels", async () => {
    for (const tag of locales()) {
      await setLocale(tag);
      const { container, unmount } = render(<About skills={SKILLS} />);
      const table = container.querySelector("#metadata")!.textContent ?? "";
      for (const label of Object.values(strings().vocabulary.category)) {
        expect(table, `${tag}: ${label}`).toContain(label);
      }
      unmount();
    }
  });
});
