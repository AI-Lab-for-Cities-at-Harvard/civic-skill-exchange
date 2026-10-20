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

  /* #276: every single skill is in the Agent Plugins layout (ADR 0006), so
     Codex's marketplace installs one by name again, as Claude Code's does. */
  it("installs any listing by name from Codex's marketplace", () => {
    const { container } = render(<Guide />);
    const codex = container.querySelector("#marketplace-codex")?.textContent ?? "";
    expect(codex).toContain("codex plugin add {namespace}-{name}@civic-skill-exchange");
    expect(codex).not.toMatch(/does not load|not load yet/);
    expect(container.querySelector("#codex")?.textContent).toContain(".agents/skills/");
    expect(container.querySelector("#codex")?.textContent).not.toMatch(/not single skills yet/);
  });

  /* #289: a skill's page gives Codex's exact line too, not only a plugin's. */
  it("says every listing's page shows its exact Codex line", async () => {
    const { container, unmount } = render(<Guide />);
    const codex = container.querySelector("#marketplace-codex")?.textContent ?? "";
    expect(codex).toContain("Each listing's page shows its exact line");
    expect(codex).not.toContain("Each plugin's page");
    unmount();
    await setLocale("es");
    const es = render(<Guide />).container.querySelector("#marketplace-codex")?.textContent ?? "";
    expect(es).toContain("La página de cada publicación muestra su línea exacta");
  });

  it("sends a Codex reader of the install section to the marketplace", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector('#codex a[href$="/marketplace-codex"]')).not.toBeNull();
  });

  /* ADR 0006, "Existing installs": a skill installed before the move updates
     in place under the same id. */
  it("tells a Claude Code user with an older install to run claude plugin update", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector("#marketplace-claude-code")?.textContent)
      .toContain("claude plugin update");
  });

  it("tells a Codex user that the marketplace upgrade picks it up", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector("#marketplace-codex")?.textContent)
      .toContain("codex plugin marketplace upgrade");
  });

  it("says the same in Spanish", async () => {
    await setLocale("es");
    const { container } = render(<Guide />);
    expect(container.querySelector("#marketplace-claude-code")?.textContent)
      .toContain("claude plugin update");
    expect(container.querySelector("#marketplace-codex")?.textContent)
      .toContain("codex plugin marketplace upgrade");
    expect(container.querySelector('#codex a[href$="/marketplace-codex"]')).not.toBeNull();
  });

  /* #301: the refresh is the general way to pick up new and updated listings,
     not only the fix for an install from before the layout move. */
  it("presents the Codex upgrade as the refresh at any time", () => {
    const { container } = render(<Guide />);
    const codex = container.querySelector("#marketplace-codex")?.textContent ?? "";
    expect(codex).toContain(
      "To refresh the exchange's catalogue at any time and pick up new and " +
      "updated listings, run codex plugin marketplace upgrade");
    expect(codex).toContain("codex plugin marketplace upgrade civic-skill-exchange");
    expect(codex).toContain("Installed a skill from here before it moved");
  });

  it("presents the Claude Code marketplace update as the refresh at any time", () => {
    const { container } = render(<Guide />);
    const cc = container.querySelector("#marketplace-claude-code")?.textContent ?? "";
    expect(cc).toContain(
      "To refresh the exchange's catalogue at any time and pick up new and " +
      "updated listings, run claude plugin marketplace update");
    expect(cc).toContain("claude plugin marketplace update civic-skill-exchange");
  });

  it("says the refresh in Spanish", async () => {
    await setLocale("es");
    const { container } = render(<Guide />);
    const codex = container.querySelector("#marketplace-codex")?.textContent ?? "";
    expect(codex).toContain(
      "Para actualizar el catálogo del intercambio en cualquier momento y " +
      "recibir las publicaciones nuevas y actualizadas, ejecute codex plugin " +
      "marketplace upgrade");
    expect(codex).toContain("codex plugin marketplace upgrade civic-skill-exchange");
    const cc = container.querySelector("#marketplace-claude-code")?.textContent ?? "";
    expect(cc).toContain(
      "Para actualizar el catálogo del intercambio en cualquier momento y " +
      "recibir las publicaciones nuevas y actualizadas, ejecute claude plugin " +
      "marketplace update");
    expect(cc).toContain("claude plugin marketplace update civic-skill-exchange");
  });

  it("gives the Claude Code marketplace command with --sparse", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector("#claude-code")?.textContent).toContain(
      "/plugin marketplace add AI-Lab-for-Cities-at-Harvard/civic-skill-exchange " +
      "--sparse .claude-plugin skills plugins");
  });

  /* #298 (I-2 to I-5). From the CLIs (claude 2.1.302, codex 0.163.0):
     `claude plugin install --scope` is "user, project, or local (default:
     user)"; `plugin list` lists plugins. */
  describe("says where to type, what scope is, and how to check", () => {
    const text = (id: string) => document.getElementById(id)?.textContent ?? "";

    it("says Claude Code's install lines are typed inside Claude Code", () => {
      render(<Guide />);
      expect(text("claude-code")).toMatch(/inside Claude Code/);
    });

    it("says /plugin and claude plugin are the same command", () => {
      render(<Guide />);
      expect(text("claude-code")).toMatch(/\/plugin and claude plugin are the same command/);
    });

    it("states the scope default and the choices as the CLI's help does", () => {
      render(<Guide />);
      const t = text("claude-code");
      expect(t).toContain("--scope");
      expect(t).toMatch(/user.*default/);
      expect(t).toMatch(/project/);
      expect(t).toMatch(/local/);
    });

    it("gives the check line in each client's section", () => {
      render(<Guide />);
      expect(text("claude-code")).toContain("claude plugin list");
      expect(text("marketplace-claude-code")).toContain("claude plugin list");
      expect(text("marketplace-codex")).toContain("codex plugin list");
    });

    it("claims no restart after a first install, which no help text states", () => {
      render(<Guide />);
      expect(text("claude-code")).not.toMatch(/restart/i);
      // The update note's restart is the CLI's own: "restart required to apply".
      expect(text("marketplace-claude-code")).toMatch(/restart Claude Code to load it/);
    });

    it("says the same in Spanish", async () => {
      await setLocale("es");
      render(<Guide />);
      const t = text("claude-code");
      expect(t).toMatch(/dentro de Claude Code/);
      expect(t).toMatch(/\/plugin y claude plugin son el mismo comando/);
      expect(t).toContain("--scope");
      expect(t).toMatch(/user.*predeterminado/);
      expect(text("marketplace-claude-code")).toContain("claude plugin list");
      expect(text("marketplace-codex")).toContain("codex plugin list");
    });
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
      // Formatted for the reader's locale, as every date on the site is.
      const date = new Date("2026-10-18").toLocaleDateString("en", { dateStyle: "long", timeZone: "UTC" });
      expect(container.querySelector(`#${id}`)?.textContent).toContain(`Captured on ${date}`);
    }
  });

  it("gives Claude's menu path as it is: + Add, then Upload skill", () => {
    const { container } = render(<Guide />);
    expect(container.querySelector("#claude")?.textContent).toMatch(/\+ Add.*Upload skill/);
    expect(container.querySelector("#gemini")?.textContent).toMatch(/More.*Customize/);
    expect(container.querySelector("#gemini")?.textContent).toMatch(/Create.*Upload/);
  });
});
