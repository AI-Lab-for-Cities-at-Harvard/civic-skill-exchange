/** The collection tiles at the top of the browse page (#209, ADR 0008
 *  decision 10): one per featured collection, in the file's order, an even
 *  grid of equal tiles whose counts line up along the bottom, each a link to
 *  the collection's own page. */

import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { CollectionTiles } from "./Collections";
import { makeCollection } from "../test/fixtures";
import { DEFAULT_LOCALE, setLocale, strings } from "../i18n/strings";

afterEach(async () => {
  cleanup();
  await setLocale(DEFAULT_LOCALE);
});

const SECOND = makeCollection({
  slug: "writing-for-residents", title: "Writing for residents",
  title_es: "Escribir para los residentes", note: "Plain language, start to end.",
  note_es: "Lenguaje claro, de principio a fin.",
  listings: [{ kind: "skill", id: "ns/a" }, { kind: "skill", id: "ns/b" }, { kind: "skill", id: "ns/c" }],
});
const HIDDEN = makeCollection({ slug: "one-department", title: "One department", featured: false });

const tiles = () => [...document.querySelectorAll<HTMLElement>(".tile")];

describe("the collection tiles", () => {
  it("render nothing at all when no collection is featured", () => {
    const { container } = render(<CollectionTiles collections={[HIDDEN]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("render nothing when there are no collections", () => {
    const { container } = render(<CollectionTiles collections={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("are a section headed Collections", () => {
    render(<CollectionTiles collections={[makeCollection()]} />);
    const section = screen.getByRole("region", { name: strings().collections.heading });
    expect(within(section).getByRole("heading", { level: 2 }))
      .toHaveTextContent(strings().collections.heading);
  });

  it("show the featured collections only, in the file's order", () => {
    render(<CollectionTiles collections={[SECOND, HIDDEN, makeCollection()]} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent))
      .toEqual(["Writing for residents", "A permit, start to finish"]);
  });

  it("link each title to the collection's own page", () => {
    render(<CollectionTiles collections={[makeCollection()]} />);
    expect(screen.getByRole("link", { name: "A permit, start to finish" }))
      .toHaveAttribute("href", "#/collection/permits-start-to-finish");
  });

  it("carry the note and how many listings are in it", () => {
    render(<CollectionTiles collections={[SECOND]} />);
    const [tile] = tiles();
    expect(tile).toHaveTextContent("Plain language, start to end.");
    expect(tile).toHaveTextContent(strings().collections.count(3));
  });

  it("are written in Spanish on the Spanish site", async () => {
    await setLocale("es");
    render(<CollectionTiles collections={[SECOND]} />);
    expect(screen.getByRole("link", { name: "Escribir para los residentes" })).toBeInTheDocument();
    expect(tiles()[0]).toHaveTextContent("Lenguaje claro, de principio a fin.");
    expect(tiles()[0]).toHaveTextContent("3 publicaciones");
  });
});

describe("the tiles' layout", () => {
  it("is a list in a Grid, so every tile is a column's width", () => {
    render(<CollectionTiles collections={[makeCollection(), SECOND]} />);
    const list = screen.getByRole("list");
    expect(list).toHaveClass("l-grid");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("puts the count last in each tile, apart from the title and note, so the counts align along the bottom", () => {
    render(<CollectionTiles collections={[makeCollection(), SECOND]} />);
    for (const tile of tiles()) {
      expect(tile).toHaveClass("l-stack");
      const count = tile.lastElementChild as HTMLElement;
      expect(count).toHaveClass("tile__count");
      expect(within(tile.firstElementChild as HTMLElement).getByRole("heading")).toBeInTheDocument();
    }
  });
});
