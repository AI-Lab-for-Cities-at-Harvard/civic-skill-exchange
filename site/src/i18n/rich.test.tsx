/** The four markers a table string may carry, and the one thing they must never
 *  do: render markup that came from anywhere but the table. */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { rich } from "./rich";

const html = (node: React.ReactNode) => render(<p>{node}</p>).container.innerHTML;

describe("rich", () => {
  it("leaves a plain string alone", () => {
    expect(html(rich("Nothing to mark up here."))).toBe("<p>Nothing to mark up here.</p>");
  });

  it("marks strong emphasis mid-sentence", () => {
    expect(html(rich("A pass is **not** a statement that a skill is safe.")))
      .toBe("<p>A pass is <strong>not</strong> a statement that a skill is safe.</p>");
  });

  it("marks tone separately from meaning", () => {
    expect(html(rich("checks can only ever say *no*")))
      .toBe("<p>checks can only ever say <em>no</em></p>");
  });

  it("renders an identifier as a code span", () => {
    expect(html(rich("anything under `scripts/`")))
      .toBe("<p>anything under <code>scripts/</code></p>");
  });

  it("takes the anchor's href from the component, not the string", () => {
    expect(html(rich("the [contributor guide](guide)", { guide: "/CONTRIBUTING.md" })))
      .toBe('<p>the <a href="/CONTRIBUTING.md">contributor guide</a></p>');
  });

  it("takes a whole set of anchor props where a link needs more than an href", () => {
    expect(html(rich("[Create one](signup)", {
      signup: { href: "https://github.com/signup", target: "_blank", rel: "noreferrer" },
    }))).toBe(
      '<p><a href="https://github.com/signup" target="_blank" rel="noreferrer">Create one</a></p>',
    );
  });

  it("nests, because a warning can contain an identifier", () => {
    expect(html(rich("**Read `scripts/` first.**")))
      .toBe("<p><strong>Read <code>scripts/</code> first.</strong></p>");
  });

  it("does not read markers inside a code span, where an asterisk is an asterisk", () => {
    expect(html(rich("`civic.*` metadata")))
      .toBe("<p><code>civic.*</code> metadata</p>");
  });

  it("handles several markers in one sentence", () => {
    expect(html(rich("**One reader**, and it is *us* — see [the checklist](c).", { c: "/r" })))
      .toBe("<p><strong>One reader</strong>, and it is <em>us</em> — see " +
            '<a href="/r">the checklist</a>.</p>');
  });

  it("renders no markup from anywhere but a marker", () => {
    expect(html(rich("<script>alert(1)</script> & <b>bold</b>")))
      .toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &lt;b&gt;bold&lt;/b&gt;</p>");
  });

  it("fails loudly in development when a string names a link the caller forgot", () => {
    expect(() => rich("[somewhere](nowhere)")).toThrow(/no link named "nowhere"/);
  });
});

describe("rich, where the thing in the middle of a sentence is not a link", () => {
  it("wraps the label in whatever element the component supplies", () => {
    expect(html(rich("filters. [Clear them](clear) to see the catalog.", {
      clear: (kids) => <button className="linkish">{kids}</button>,
    }))).toBe('<p>filters. <button class="linkish">Clear them</button> to see the catalog.</p>');
  });
});
