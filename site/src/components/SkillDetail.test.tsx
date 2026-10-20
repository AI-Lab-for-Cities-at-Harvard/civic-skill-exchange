/** What the detail page says about which files run (#151).
 *
 * The page publishes structure rather than content, so "which of these does the
 * agent execute" is one of the few things it can tell a reader — and after the
 * ruling on #151 the answer is no longer only `scripts/`. The skill directory is
 * the Claude plugin root, so a client launches the MCP servers `.mcp.json`
 * declares on install, and `build_index.py` marks it executed.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { makeSkill } from "../test/fixtures";
import { SkillDetail } from "./SkillDetail";
import { findViolations, describeViolations } from "../test/axe";
import type { SkillDetail as Detail } from "../lib/types";

const detail = (over: Partial<Detail> = {}): Detail => ({
  ...makeSkill(),
  files: [{ path: "SKILL.md", size: 4096, executed: false }],
  archive: { path: "data/skills/ns/example-skill.zip", size: 5697 },
  ...over,
});

const served = (payload: Detail) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, json: () => Promise.resolve(payload),
  }));

const structure = () => screen.findByRole("region", { name: /what is in it/i });

/** A row of the file tree. Scoped to the tree, because the paragraph above it
 *  names `scripts/` too. */
const row = (path: string) =>
  screen.getByText(path, { selector: ".tree__path" }).closest("li");

afterEach(() => vi.unstubAllGlobals());

describe("the structure section says what runs", () => {
  /* #289: a single skill has no server config since ADR 0006 (decision 5),
     so the paragraph names only what a skill can run. */
  it("names scripts/ as what runs, and no longer a skill's .mcp.json", async () => {
    served(detail());
    render(<SkillDetail namespace="ns" name="example-skill" />);
    const text = (await structure()).textContent ?? "";
    expect(text).toMatch(/scripts\//);
    expect(text).not.toMatch(/\.mcp\.json/);
  });

  it("tags an executed file wherever it sits in the tree", async () => {
    served(detail({ files: [
      { path: "scripts/check.py", size: 120, executed: true },
      { path: "SKILL.md", size: 4096, executed: false },
      { path: "references/notes.md", size: 20, executed: false },
    ] }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    await structure();

    expect(row("scripts/check.py")?.textContent).toContain("executed");
    expect(row("references/notes.md")?.textContent).not.toContain("executed");
  });
});

/** The declared language, and the author's claim about what they tried it in
 *  (#145). Two different things, and the page never merges them: verification
 *  lives on the attestation, not in frontmatter. */
describe("the detail page says what language the listing is in", () => {
  it("marks the description with the listing's language", async () => {
    served(detail({ language: "es", description: "Una habilidad de ejemplo para las pruebas." }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    const desc = await screen.findByText("Una habilidad de ejemplo para las pruebas.");
    expect(desc).toHaveAttribute("lang", "es");
  });

  it("names the language in the facts list", async () => {
    served(detail({ language: "es" }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    const facts = await screen.findByRole("region", { name: /at a glance/i });
    expect(facts).toHaveTextContent("Written in");
    expect(facts).toHaveTextContent("Spanish");
  });

  it("names Latin American Spanish rather than showing es-419 (#252)", async () => {
    served(detail({ language: "es-419" }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    expect(await screen.findByRole("region", { name: /at a glance/i }))
      .toHaveTextContent("Spanish (Latin America)");
  });

  it("shows an unmapped tag as the tag itself rather than nothing", async () => {
    served(detail({ language: "pt-BR" }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    expect(await screen.findByRole("region", { name: /at a glance/i }))
      .toHaveTextContent("pt-BR");
  });

  it("words the tested languages as the author's claim, not as verification", async () => {
    served(detail({ language: "en", languages_tested: ["en", "es"] }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    const claim = await screen.findByTestId("languages-tested");
    expect(claim).toHaveTextContent("Author reports testing in");
    expect(claim).toHaveTextContent("en, es");
    expect(claim.textContent).not.toMatch(/verified|confirmed|checked by/i);
  });

  it("marks the fit fields too, since they are the author's prose as well", async () => {
    served(detail({
      language: "es",
      use_when: "Cuando un residente pregunta por su permiso.",
      avoid_when: "No para apelaciones.",
    }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    const fit = await screen.findByRole("region", { name: /when to use this/i });
    expect(fit.querySelector(".fit")).toHaveAttribute("lang", "es");
  });

  it("says nothing about tested languages when the author claimed none", async () => {
    served(detail({ language: "en", languages_tested: null }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    await screen.findByRole("region", { name: /at a glance/i });
    expect(screen.queryByTestId("languages-tested")).not.toBeInTheDocument();
  });
});

/** The languages a reviewer verified, separate from the author's claim (#146).
 *  "Verified in Spanish" can only honestly come from the reviewer, and it
 *  lives on the attestation in registry/reviewed.yml — never in frontmatter.
 *  ADR 0004 ruling 2 requires the two never be merged into one badge. */
describe("the detail page says which languages a reviewer verified", () => {
  const reviewed = (over: Partial<Detail> = {}): Detail => detail({
    tier: "reviewed",
    reason: "attestation matches current content",
    reviewed: {
      date: "2026-09-02", expires: "2027-09-02",
      reviewers: ["AI Lab for Cities at Harvard"], notes: "",
    },
    ...over,
  });

  it("shows the verified languages in their own element, separately labeled", async () => {
    served(reviewed({ verified_languages: ["en", "es"], languages_tested: ["en", "es"] }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    const verified = await screen.findByTestId("verified-languages");
    const claim = screen.getByTestId("languages-tested");
    expect(verified).not.toBe(claim);
    expect(verified.textContent).toMatch(/verified/i);
  });

  it("names who verified it, from the attestation's reviewers", async () => {
    served(reviewed({ verified_languages: ["en"] }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    const verified = await screen.findByTestId("verified-languages");
    expect(verified).toHaveTextContent("AI Lab for Cities at Harvard");
  });

  it("renders nothing when verified_languages is null on a reviewed listing", async () => {
    served(reviewed({ verified_languages: null }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    await screen.findByRole("region", { name: /at a glance/i });
    expect(screen.queryByTestId("verified-languages")).not.toBeInTheDocument();
  });

  it("renders nothing on a community listing, even if the field were set", async () => {
    served(detail({ tier: "community", reason: "no review attestation",
      verified_languages: ["en"] }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    await screen.findByRole("region", { name: /at a glance/i });
    expect(screen.queryByTestId("verified-languages")).not.toBeInTheDocument();
  });

  it("keeps the claim's self-reported note even when a verification is shown", async () => {
    served(reviewed({ verified_languages: ["en"], languages_tested: ["en", "es"] }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    const claim = await screen.findByTestId("languages-tested");
    expect(claim).toHaveTextContent(/self-reported/i);
  });

  it("has no axe violations with both the claim and the verification rendered", async () => {
    served(reviewed({ verified_languages: ["en", "es"], languages_tested: ["en", "es"] }));
    const { container } = render(<SkillDetail namespace="ns" name="example-skill" />);
    await screen.findByTestId("verified-languages");
    const violations = await findViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});


/** #267: which AI models the listing was tried with. The author's claim and
 *  the reviewer's verified list, kept apart as the two language fields are. */
describe("the detail page says which models a listing was tested with", () => {
  const reviewed = (over: Partial<Detail> = {}): Detail => detail({
    tier: "reviewed", reason: "attestation matches current content",
    reviewed: { date: "2026-10-18", expires: "2027-10-18",
      reviewers: ["AI Lab for Cities at Harvard"], notes: "" },
    ...over,
  });

  it("words the author's models as their own claim", async () => {
    served(detail({ models_tested: ["Claude Opus 5.5", "Claude Sonnet 5"] }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    const claim = await screen.findByTestId("models-tested");
    expect(claim).toHaveTextContent("Author reports testing with");
    expect(claim).toHaveTextContent("Claude Opus 5.5, Claude Sonnet 5");
    expect(claim).toHaveTextContent(/self-reported/i);
  });

  it("shows the reviewer's models separately, naming who ran them", async () => {
    served(reviewed({ verified_models: ["Claude Opus 5.5"], models_tested: ["Claude Sonnet 5"] }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    const verified = await screen.findByTestId("verified-models");
    expect(verified).not.toBe(screen.getByTestId("models-tested"));
    expect(verified).toHaveTextContent("Claude Opus 5.5");
    expect(verified).toHaveTextContent("AI Lab for Cities at Harvard");
  });

  it("says nothing about models when neither list is there, or the listing is Community", async () => {
    served(detail({ tier: "community", models_tested: null, verified_models: ["Claude Sonnet 5"] }));
    render(<SkillDetail namespace="ns" name="example-skill" />);
    await screen.findByRole("region", { name: /at a glance/i });
    expect(screen.queryByTestId("models-tested")).not.toBeInTheDocument();
    expect(screen.queryByTestId("verified-models")).not.toBeInTheDocument();
  });
});

/* #289: since ADR 0006 (decision 5) a single skill has no server config, so
   the caveat no longer tells a reader to look for its .mcp.json. */
describe("the file list's caveat", () => {
  it("names scripts/ and not a skill's .mcp.json, in both languages", async () => {
    const { strings, setLocale, DEFAULT_LOCALE } = await import("../i18n/strings");
    expect(strings().detail.structure.caveat).not.toMatch(/\.mcp\.json/);
    await setLocale("es");
    expect(strings().detail.structure.caveat).not.toMatch(/\.mcp\.json/);
    await setLocale(DEFAULT_LOCALE);
  });
});
