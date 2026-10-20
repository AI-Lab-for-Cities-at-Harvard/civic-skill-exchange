/** Numbered pages (#208, ADR 0008 decision 3). Previous, the numbers and Next
 *  are links to the page's own URL, so a page can be linked to and opened in
 *  a new tab; a plain click is handled in place by the browse page. */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, cleanup, fireEvent } from "@testing-library/react";
import { Pager } from "./Pager";
import { strings } from "../i18n/strings";

afterEach(cleanup);

const href = (n: number) => `#/?page=${n}`;
const t = () => strings().browse.pager;

describe("the pager", () => {
  it("is not there when everything fits on one page", () => {
    const { container } = render(<Pager page={1} pages={1} href={href} go={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is a named navigation of links, one per page", () => {
    render(<Pager page={2} pages={3} href={href} go={() => {}} />);
    const nav = screen.getByRole("navigation", { name: t().label });
    for (const n of [1, 2, 3]) {
      expect(within(nav).getByRole("link", { name: `${t().page} ${n}` }))
        .toHaveAttribute("href", href(n));
    }
  });

  it("marks the page shown as the current one", () => {
    render(<Pager page={2} pages={3} href={href} go={() => {}} />);
    expect(screen.getByRole("link", { name: `${t().page} 2` }))
      .toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: `${t().page} 1` }))
      .not.toHaveAttribute("aria-current");
  });

  it("offers Previous and Next only where there is one", () => {
    const { rerender } = render(<Pager page={1} pages={3} href={href} go={() => {}} />);
    expect(screen.queryByRole("link", { name: t().previous })).toBeNull();
    expect(screen.getByRole("link", { name: t().next })).toHaveAttribute("href", href(2));

    rerender(<Pager page={3} pages={3} href={href} go={() => {}} />);
    expect(screen.getByRole("link", { name: t().previous })).toHaveAttribute("href", href(2));
    expect(screen.queryByRole("link", { name: t().next })).toBeNull();
  });

  it("hands a plain click to the page, and leaves a modified one to the browser", () => {
    const go = vi.fn();
    render(<Pager page={1} pages={3} href={href} go={go} />);
    const two = screen.getByRole("link", { name: `${t().page} 2` });

    const plain = fireEvent.click(two);
    expect(plain).toBe(false); // default prevented
    expect(go).toHaveBeenCalledWith(2);

    go.mockClear();
    for (const mod of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
      expect(fireEvent.click(two, mod)).toBe(true);
    }
    expect(go).not.toHaveBeenCalled();
  });

  it("lays its links out in a Cluster list", () => {
    render(<Pager page={1} pages={2} href={href} go={() => {}} />);
    const list = screen.getByRole("list");
    expect(list).toHaveClass("l-cluster");
  });
});
