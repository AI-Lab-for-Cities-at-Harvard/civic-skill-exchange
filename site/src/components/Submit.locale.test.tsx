/**
 * The wizard's words translate. What it writes does not.
 *
 * A submission is a file the validator parses: `civic.category`, `municipal`,
 * `decision-support` are identifiers the schema defines, they are the same in
 * every language, and a Spanish submitter whose form emitted `municipal` in
 * Spanish would have their pull request rejected by a check they cannot read.
 * So the form is filled in in one locale and in the other, and the frontmatter
 * is compared byte for byte.
 *
 * The mail to a maintainer is the other side of the same line. It is composed
 * in English regardless of the reader's locale, because the reader of *that*
 * is a maintainer opening a pull request from it — `submit.ts` says so where it
 * reads the table.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Submit } from "./Submit";
import { en } from "../i18n/en";
import { DEFAULT_LOCALE, setLocale, strings } from "../i18n/strings";
import {
  EMPTY_DRAFT, mailtoUrl, toFrontmatter, toYaml, type Draft,
} from "../lib/submit";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

afterEach(async () => { await setLocale(DEFAULT_LOCALE); });

/** A draft with something in every field the form can set, so the comparison
 *  covers the enums as well as the free text. */
const DRAFT: Draft = {
  ...EMPTY_DRAFT,
  author: "cityofx",
  name: "Permit Status Explainer",
  description: "Explains where a permit application has got to, in plain language.",
  category: "permitting-licensing",
  categorySecondary: "constituent-services",
  scope: "municipal",
  scopeSecondary: "regional",
  jurisdiction: "US-MA / Boston",
  localization: "localized",
  language: "es",
  languagesTested: "en, es",
  dataSensitivity: "pii",
  humanReview: "advisory-only",
  maintainer: "City of X",
  affiliation: "government",
  deployment: "organization",
  deployedAt: "City of X",
  deployedIn: "US-MA / Boston",
  deployedSince: "2026-03",
  useWhen: "A resident asks where their application is.",
  avoidWhen: "Deciding an appeal.",
  version: "1.0",
  license: "MIT",
  tools: "Read, Grep",
};

describe("what the wizard emits does not translate", () => {
  it("writes the same frontmatter whichever locale composed it", async () => {
    const english = toYaml(toFrontmatter(DRAFT));
    await setLocale("es");
    expect(strings()).not.toBe(en); // the page really is in the other language
    expect(toYaml(toFrontmatter(DRAFT))).toBe(english);
  });

  it("writes the same frontmatter from the form itself", async () => {
    const emitted = async () => {
      const user = userEvent.setup();
      const view = render(<Submit repo={REPO} skills={[]} mode="new" />);
      await user.type(screen.getByLabelText(strings().submit.form.namespaceLabel), "cityofx");
      // By id rather than by label: the labels are what the locale changes, and
      // the ids are the schema's field names, which it does not.
      const select = (id: string, value: string) =>
        user.selectOptions(document.getElementById(id)!, value);
      await select("civic.category", "permitting-licensing");
      await select("civic.scope", "municipal");
      await select("civic.data-sensitivity", "pii");
      await select("civic.human-review", "advisory-only");
      await select("civic.language", "es");
      const yaml = screen.getByTestId("yaml").textContent;
      view.unmount();
      return yaml;
    };

    const english = await emitted();
    expect(english).toContain('civic.category: "permitting-licensing"');
    expect(english).toContain('civic.human-review: "advisory-only"');

    await setLocale("es");
    expect(await emitted()).toBe(english);
    // Drives the whole form twice, which is past the default budget when the
    // suite is running everything else at the same time.
  }, 30_000);

  it("offers the same option values in both locales", async () => {
    // The labels beside them are prose and differ; a translated *value* would
    // write a frontmatter file the validator rejects.
    const values = () => {
      const view = render(<Submit repo={REPO} skills={[]} mode="new" />);
      const out = [...document.querySelectorAll("select")].map((s) =>
        [s.id, [...s.options].map((o) => o.value)]);
      view.unmount();
      return out;
    };
    const english = values();
    await setLocale("es");
    expect(values()).toEqual(english);
  });
});

describe("the mail to a maintainer stays in English", () => {
  const yaml = toYaml(toFrontmatter(DRAFT));

  it("composes the same subject and body in either locale", async () => {
    const english = mailtoUrl("submissions@example.test", DRAFT, yaml);
    await setLocale("es");
    expect(mailtoUrl("submissions@example.test", DRAFT, yaml)).toBe(english);
  });

  it("uses the English table's wording, not the reader's", async () => {
    await setLocale("es");
    const url = mailtoUrl("submissions@example.test", DRAFT, yaml);
    expect(decodeURIComponent(url)).toContain(en.email.subject(DRAFT.name));
    expect(decodeURIComponent(url)).toContain("A skill for the Civic Skill Exchange.");
  });
});
