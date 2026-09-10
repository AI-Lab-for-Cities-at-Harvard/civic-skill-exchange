/** The catalogue's facets render from the index rather than a fixed list, so a
 *  facet exists exactly when some listing has a value for it. */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Facet } from "./Facets";
import { LANGUAGE_LABELS } from "../lib/labels";
import { EMPTY_FILTERS } from "../lib/types";
import { makeSkill } from "../test/fixtures";

const skills = [
  makeSkill({ id: "a/1", language: "en" }),
  makeSkill({ id: "b/2", language: "es" }),
  makeSkill({ id: "c/3", language: "es" }),
];

function renderLanguageFacet(onChange = vi.fn()) {
  render(
    <Facet legend="Language" field="language" filterKey="language"
      labels={LANGUAGE_LABELS} skills={skills} filters={EMPTY_FILTERS}
      onChange={onChange} />,
  );
  return onChange;
}

describe("the language facet", () => {
  it("renders one option per language, with counts", () => {
    renderLanguageFacet();
    const group = screen.getByRole("group", { name: /language/i });
    expect(group).toHaveTextContent("English");
    expect(group).toHaveTextContent("Spanish");
    expect(group).toHaveTextContent("2");
  });

  it("selects a language when its option is chosen", () => {
    const onChange = renderLanguageFacet();
    screen.getByRole("radio", { name: /Spanish/ }).click();
    expect(onChange).toHaveBeenCalledWith("language", "es");
  });

  it("labels a tag it has no name for with the tag itself", () => {
    render(
      <Facet legend="Language" field="language" filterKey="language"
        labels={LANGUAGE_LABELS} filters={EMPTY_FILTERS} onChange={vi.fn()}
        skills={[makeSkill({ language: "pt-BR" })]} />,
    );
    expect(screen.getByRole("group", { name: /language/i })).toHaveTextContent("pt-BR");
  });
});
