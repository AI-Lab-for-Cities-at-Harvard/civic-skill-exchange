/** #258: the "Using the Exchange" page.
 *
 *  Organised by task, with the products inside each task (ruling 2 on #224),
 *  and every section reachable by its own link (ruling 3), so the install boxes
 *  and the submission page can send a reader to exactly the step they need.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Guide } from "./Guide";
import { GUIDE_SECTIONS } from "../lib/guide";
import { DEFAULT_LOCALE, setLocale } from "../i18n/strings";

afterEach(async () => { await setLocale(DEFAULT_LOCALE); });

describe("the guide page", () => {
  it("is headed Using the Exchange", () => {
    render(<Guide />);
    expect(screen.getByRole("heading", { level: 2, name: "Using the Exchange" }))
      .toBeInTheDocument();
  });

  it("is headed Cómo usar el intercambio in Spanish", async () => {
    await setLocale("es");
    render(<Guide />);
    expect(screen.getByRole("heading", { level: 2, name: "Cómo usar el intercambio" }))
      .toBeInTheDocument();
  });

  it("has an element for every section a link can name", () => {
    const { container } = render(<Guide />);
    for (const id of GUIDE_SECTIONS) {
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
  });

  it("is organised by task, with the products inside each", () => {
    const { container } = render(<Guide />);
    const ids = [...container.querySelectorAll("section[id]")].map((e) => e.id);
    // The tasks, in the ruled order.
    expect(ids.filter((id) => ["install", "marketplace", "safety", "share", "glossary"]
      .includes(id))).toEqual(["install", "marketplace", "safety", "share", "glossary"]);
    // The products sit inside their task.
    for (const id of ["claude", "claude-code", "chatgpt", "codex"]) {
      expect(container.querySelector(`#install #${id}`), id).not.toBeNull();
    }
    for (const id of ["marketplace-claude-code", "marketplace-codex"]) {
      expect(container.querySelector(`#marketplace #${id}`), id).not.toBeNull();
    }
  });

  it("puts each task under an h2 and each product under an h3", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector("#install > h2")).not.toBeNull();
    expect(container.querySelector("#claude > h3")).not.toBeNull();
    expect(container.querySelector("#marketplace-codex > h3")).not.toBeNull();
  });

  it("lists the five GitHub words, each with its own anchor", () => {
    const { container } = render(<Guide />);
    for (const word of ["fork", "branch", "commit", "pull-request", "review"]) {
      expect(container.querySelector(`#glossary #glossary-${word}`), word).not.toBeNull();
    }
  });

  it("explains a fork in the words the submission page uses (#243)", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector("#glossary-fork")?.textContent)
      .toContain("A fork is your own copy of the exchange on GitHub");
  });

  it("says Codex's marketplace is for plugins, and sends a single skill to the download", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector("#marketplace-codex")?.textContent).toMatch(/plugin/i);
    expect(container.querySelector("#codex")?.textContent).toContain(".agents/skills/");
  });

  it("gives the Claude Code marketplace command with --sparse", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector("#claude-code")?.textContent).toContain(
      "/plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange " +
      "--sparse .claude-plugin skills plugins");
  });

  it("links the share section to the submission page", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector('#share a[href="#/submit"]')).not.toBeNull();
  });
});

/** The page is its own chunk, so it arrives after App's scroll has already
 *  looked for the section and missed. It scrolls to the section itself. */
describe("a link to a section", () => {
  it("scrolls to that section once the page is there", () => {
    const scrolled: Element[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn(function (this: Element) { scrolled.push(this); });
    try {
      render(<Guide section="gemini" />);
      expect(scrolled.map((e) => e.id)).toContain("gemini");
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("does not scroll for a section the page does not have", () => {
    const spy = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = spy;
    try {
      render(<Guide section="nowhere" />);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });
});

/** #260: the screenshots, on the guide-assets branch and loaded by URL (ruling
 *  4a), each with alt text in the reader's language and a capture date. */
describe("the screenshots", () => {
  const figures = (container: HTMLElement, section: string) =>
    [...container.querySelectorAll(`#${section} figure img`)] as HTMLImageElement[];

  it("puts Claude's, ChatGPT's and Gemini's in their sections", () => {
    const { container } = render(<Guide />);
    expect(figures(container, "claude")).toHaveLength(3);
    expect(figures(container, "chatgpt")).toHaveLength(2);
    expect(figures(container, "gemini")).toHaveLength(2);
  });

  it("loads each from guide-assets, lazily, with its size so the page does not jump", () => {
    const { container } = render(<Guide />);
    for (const img of container.querySelectorAll("figure img")) {
      expect(img.getAttribute("src")).toMatch(
        /^https:\/\/raw\.githubusercontent\.com\/AI-Lab-for-Cities-at-Harvard\/civic-skill-exchange\/guide-assets\/guide\/using\/[a-z0-9-]+\.jpg$/);
      expect(img).toHaveAttribute("loading", "lazy");
      expect(Number(img.getAttribute("width"))).toBeGreaterThan(0);
      expect(Number(img.getAttribute("height"))).toBeGreaterThan(0);
    }
  });

  it("gives every screenshot alt text and a caption, in English and in Spanish", async () => {
    for (const tag of ["en", "es"]) {
      await setLocale(tag);
      const { container, unmount } = render(<Guide />);
      const figs = [...container.querySelectorAll("figure")];
      expect(figs.length).toBeGreaterThan(0);
      for (const f of figs) {
        expect(f.querySelector("img")?.getAttribute("alt")?.trim(), tag).toBeTruthy();
        expect(f.querySelector("figcaption")?.textContent?.trim(), tag).toBeTruthy();
      }
      unmount();
    }
  });

  it("dates each section that has screenshots", () => {
    const { container } = render(<Guide />);
    for (const id of ["claude", "chatgpt", "gemini"]) {
      expect(container.querySelector(`#${id}`)?.textContent).toContain("Captured on 18 October 2026");
    }
  });

  it("gives Claude's menu path as it is: + Add, then Upload skill", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector("#claude")?.textContent).toMatch(/\+ Add.*Upload skill/);
    expect(container.querySelector("#gemini")?.textContent).toMatch(/More.*Customize/);
    expect(container.querySelector("#gemini")?.textContent).toMatch(/Create.*Upload/);
  });
});
