import { useState, type ReactNode } from "react";
import { categoryCounts, facetCounts, scopeCounts } from "../lib/filter";
import { Stack } from "./Layout";
import { useStrings } from "../i18n/strings";
import { label } from "../lib/labels";
import type { Filters, Skill } from "../lib/types";

interface FacetProps {
  legend: string;
  field: keyof Skill;
  filterKey: keyof Filters;
  labels: Record<string, string>;
  skills: Skill[];
  filters: Filters;
  onChange: (key: keyof Filters, value: string | null) => void;
  note?: string;
}

/** The facets and the button that opens them (#328, ADR 0008 decision 6).
 *
 *  Below 1024px the facets start closed behind a Filters button that says how
 *  many are set (the search is not a facet and does not count); at 1024px and
 *  wider the button is hidden and the facets always show (app.css, layout.css).
 *  The panel is `hidden` when closed, which the Stack honours. Focus stays on
 *  the button as it opens, and choosing a facet does not close it: the result
 *  count's live region says what changed.
 */
export function FacetPanel({ filters, children }: { filters: Filters; children: ReactNode }) {
  const s = useStrings();
  const [open, setOpen] = useState(false);
  const set = Object.entries(filters).filter(([k, v]) => k !== "q" && v !== null).length;
  return (
    <>
      <button type="button" className="btn filters__toggle"
        aria-expanded={open} aria-controls="facets" onClick={() => setOpen(!open)}>
        {s.facets.toggle(set)}
      </button>
      <Stack id="facets" gap="5" className="filters__facets" hidden={!open}>
        {children}
      </Stack>
    </>
  );
}

/** Counts come from the whole catalog, not the filtered set, so a facet never
 *  shows zero for something that would return results once you switch to it. */
export function Facet({
  legend, field, filterKey, labels, skills, filters, onChange, note,
}: FacetProps) {
  const s = useStrings();
  // Two facets span two columns rather than one: a skill can name a second
  // category on the other axis (#102) and a second scope when it serves two
  // levels (#67), and filtering finds it under either. Handled here rather
  // than by the caller so a facet cannot be built with counts that disagree
  // with what selecting it returns.
  const counts = field === "category" ? categoryCounts(skills)
    : field === "scope" ? scopeCounts(skills)
    : facetCounts(skills, field);
  const values = Object.keys(counts).sort((a, b) =>
    label(labels, a).localeCompare(label(labels, b)),
  );
  if (values.length === 0) return null;

  const selected = filters[filterKey];

  return (
    <fieldset className="facet">
      <legend className="facet__legend">{legend}</legend>
      {/* The legend is not a flex item in any browser, so it keeps its own
          space below; the note and the options are a Stack (#319). */}
      <Stack gap="2">
      {note && <p className="facet__note">{note}</p>}
      <Stack gap="0" className="facet__options">
        <label className="facet__option">
          <input
            type="radio"
            name={String(filterKey)}
            checked={selected === null}
            onChange={() => onChange(filterKey, null)}
          />
          <span>{s.facets.any}</span>
        </label>
        {values.map((value) => (
          <label className="facet__option" key={value}>
            <input
              type="radio"
              name={String(filterKey)}
              checked={selected === value}
              onChange={() => onChange(filterKey, value)}
            />
            <span>{label(labels, value)}</span>
            <span className="facet__count">{counts[value]}</span>
          </label>
        ))}
      </Stack>
      </Stack>
    </fieldset>
  );
}
