/**
 * Skill bodies are markdown written by untrusted submitters and rendered onto
 * our origin. Anything that gets through here is stored XSS on a site aimed at
 * government users.
 *
 * These are the payloads that must not survive.
 */

import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown — untrusted input", () => {
  it("drops a raw script tag", () => {
    const html = renderMarkdown("Hello\n\n<script>alert(1)</script>\n");
    expect(html).not.toContain("<script");
    expect(html).toContain("Hello");
  });

  it("drops inline HTML", () => {
    expect(renderMarkdown("a <b onmouseover=alert(1)>x</b> b")).not.toContain("onmouseover");
  });

  it("drops an img with an onerror handler", () => {
    expect(renderMarkdown('<img src=x onerror="alert(1)">')).not.toContain("onerror");
  });

  it("drops an iframe", () => {
    expect(renderMarkdown('<iframe src="https://evil.example"></iframe>')).not.toContain("<iframe");
  });

  it("neutralises a javascript: link", () => {
    const html = renderMarkdown("[click me](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("click me");
  });

  it("neutralises a data: URI link", () => {
    expect(renderMarkdown("[x](data:text/html;base64,PHNjcmlwdD4=)")).not.toContain("data:text/html");
  });

  it("neutralises a javascript: image source", () => {
    expect(renderMarkdown("![x](javascript:alert(1))")).not.toContain("javascript:");
  });

  it("is not fooled by casing or whitespace in a scheme", () => {
    for (const p of ["JaVaScRiPt:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)"]) {
      expect(renderMarkdown(`[x](${p})`).toLowerCase()).not.toContain("javascript:");
    }
  });

  it("escapes HTML entities in text rather than emitting them", () => {
    expect(renderMarkdown("5 < 6 & 7 > 2")).not.toContain("<6");
  });
});

describe("renderMarkdown — legitimate content still works", () => {
  it("renders headings", () => {
    expect(renderMarkdown("## When to use this skill")).toContain("<h2");
  });

  it("renders lists", () => {
    expect(renderMarkdown("- one\n- two\n")).toContain("<li>");
  });

  it("renders code blocks", () => {
    expect(renderMarkdown("```py\nx = 1\n```")).toContain("<code");
  });

  it("keeps https links and makes them safe to click", () => {
    const html = renderMarkdown("[spec](https://agentskills.io/specification)");
    expect(html).toContain('href="https://agentskills.io/specification"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("keeps relative links, which skills use to point at their own files", () => {
    expect(renderMarkdown("[notes](references/notes.md)")).toContain('href="references/notes.md"');
  });

  it("renders tables, which skills use for field references", () => {
    expect(renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |")).toContain("<table");
  });

  it("renders blockquotes", () => {
    expect(renderMarkdown("> a note")).toContain("<blockquote");
  });
});
