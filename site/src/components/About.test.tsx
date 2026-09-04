/** The About page is where somebody decides whether this registry is for them.
 *
 *  Three things it has to do that it did not: name the skills that do the
 *  generalizing rather than only describing the idea, explain the civic.*
 *  metadata a submitter is about to be asked for, and point at the submission
 *  page that now exists instead of only the git path and an issue form.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { About } from "./About";
import { makeSkill } from "../test/fixtures";

const SKILLS = [
  makeSkill({ namespace: "civic-skills", name: "generalize-skill" }),
  makeSkill({ namespace: "civic-skills", name: "localize-skill" }),
];

describe("About — the skills that do the work", () => {
  it("links the generalize and localize skills where it explains them", () => {
    render(<About skills={SKILLS} />);
    expect(screen.getByTestId("link-generalize"))
      .toHaveAttribute("href", "#/skill/civic-skills/generalize-skill");
    expect(screen.getByTestId("link-localize"))
      .toHaveAttribute("href", "#/skill/civic-skills/localize-skill");
  });

  it("says nothing about them when they are not listed, rather than linking a 404", () => {
    render(<About skills={[]} />);
    expect(screen.queryByTestId("link-generalize")).not.toBeInTheDocument();
    expect(screen.queryByTestId("link-localize")).not.toBeInTheDocument();
  });

  it("finds them wherever they are listed, not only under the Lab", () => {
    render(<About skills={[makeSkill({ namespace: "cityofx", name: "generalize-skill" })]} />);
    expect(screen.getByTestId("link-generalize"))
      .toHaveAttribute("href", "#/skill/cityofx/generalize-skill");
  });
});

describe("About — the civic metadata", () => {
  it("has a section explaining the fields this registry adds", () => {
    render(<About skills={[]} />);
    expect(document.getElementById("metadata")).not.toBeNull();
  });

  it("lists the vocabulary a submitter has to choose from", () => {
    render(<About skills={[]} />);
    const section = document.getElementById("metadata")!;
    expect(section.textContent).toContain("Permitting & Licensing");
    expect(section.textContent).toContain("Protected — statutory regime");
  });

  it("says which fields nobody can answer by reading the code", () => {
    render(<About skills={[]} />);
    expect(document.getElementById("metadata")!.textContent)
      .toMatch(/civic\.avoid-when/);
  });

  it("distinguishes what the registry derives from what an author declares", () => {
    render(<About skills={[]} />);
    expect(document.getElementById("metadata")!.textContent)
      .toMatch(/self-reported|derived/i);
  });
});

describe("About — navigation", () => {
  it("gives every section an id, so each can be linked", () => {
    render(<About skills={[]} />);
    for (const id of ["what-this-is", "tiers", "localization", "metadata", "submitting", "checks"]) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
  });

  it("offers a table of contents pointing at them", () => {
    render(<About skills={[]} />);
    const toc = screen.getByTestId("about-toc");
    expect(toc.querySelectorAll("a").length).toBeGreaterThanOrEqual(6);
    expect(toc.querySelector('a[href="#/about/metadata"]')).not.toBeNull();
  });

  it("labels the contents for a screen reader", () => {
    render(<About skills={[]} />);
    expect(screen.getByTestId("about-toc")).toHaveAttribute("aria-label");
  });
});

describe("About — submitting", () => {
  it("leads with the submission page rather than the git path", () => {
    render(<About skills={[]} />);
    expect(screen.getByTestId("about-submit-cta")).toHaveAttribute("href", "#/submit");
  });

  it("still offers the contributor guide for people working in git", () => {
    render(<About skills={[]} />);
    expect(screen.getByTestId("about-contributing"))
      .toHaveAttribute("href", expect.stringContaining("CONTRIBUTING.md"));
  });

  it("says a GitHub account is needed, as the submission page does", () => {
    render(<About skills={[]} />);
    expect(document.getElementById("submitting")!.textContent)
      .toMatch(/GitHub account/i);
  });
});

/** The section navigation (#136).
 *
 *  Eight sections in a horizontal wrapped list read as an undifferentiated row
 *  of links: no hierarchy, no indication of where the reader is, and a
 *  different arrangement at every breakpoint. The design system has no
 *  table-of-contents primitive to copy — the nearest are vertical rails that
 *  navigate *between* pages — so this borrows the shape without pretending
 *  there is one.
 *
 *  Grouped rather than railed. A rail would cost the page its single column and
 *  need a separate collapse on a phone, which is more risk than the problem
 *  warrants; grouping fixes the hierarchy and the wrapping, which is what was
 *  actually wrong.
 */
describe("About — the section navigation", () => {
  it("still reaches every section at its own URL", () => {
    render(<About skills={[]} />);
    const toc = screen.getByTestId("about-toc");
    for (const id of [
      "what-this-is", "tiers", "localization", "metadata",
      "submitting", "checks", "review", "beta",
    ]) {
      expect(toc.querySelector(`a[href="#/about/${id}"]`), id).not.toBeNull();
    }
  });

  it("groups them, so the substance and the caveats are not one flat row", () => {
    render(<About skills={[]} />);
    const groups = screen.getByTestId("about-toc").querySelectorAll("ul");
    expect(groups.length).toBeGreaterThanOrEqual(2);
  });

  it("labels each group visibly, not only to a screen reader", () => {
    const { container } = render(<About skills={[]} />);
    const labels = container.querySelectorAll(".toc__group-label");
    expect(labels.length).toBeGreaterThanOrEqual(2);
    for (const l of labels) expect(l.textContent?.trim()).toBeTruthy();
  });

  it("marks the section the reader is in", () => {
    render(<About skills={[]} section="metadata" />);
    const current = screen.getByTestId("about-toc")
      .querySelector('[aria-current="true"]');
    expect(current).toHaveAttribute("href", "#/about/metadata");
  });

  it("marks exactly one, so nothing else reads as current", () => {
    render(<About skills={[]} section="beta" />);
    expect(screen.getByTestId("about-toc")
      .querySelectorAll('[aria-current="true"]')).toHaveLength(1);
  });

  it("marks nothing when the reader arrived at the page itself", () => {
    render(<About skills={[]} />);
    expect(screen.getByTestId("about-toc")
      .querySelector('[aria-current="true"]')).toBeNull();
  });

  it("marks nothing for a section that does not exist", () => {
    // parseRoute lets any slug through; it reaches getElementById and misses.
    render(<About skills={[]} section="not-a-section" />);
    expect(screen.getByTestId("about-toc")
      .querySelector('[aria-current="true"]')).toBeNull();
  });

  it("says what it is, visibly", () => {
    const { container } = render(<About skills={[]} />);
    expect(container.querySelector(".toc__title")?.textContent)
      .toMatch(/on this page/i);
  });
});
