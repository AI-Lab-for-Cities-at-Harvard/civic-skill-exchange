import { facetCounts } from "../lib/filter";
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

/** Counts come from the whole catalog, not the filtered set, so a facet never
 *  shows zero for something that would return results once you switch to it. */
export function Facet({
  legend, field, filterKey, labels, skills, filters, onChange, note,
}: FacetProps) {
  const counts = facetCounts(skills, field);
  const values = Object.keys(counts).sort((a, b) =>
    label(labels, a).localeCompare(label(labels, b)),
  );
  if (values.length === 0) return null;

  const selected = filters[filterKey];

  return (
    <fieldset className="facet">
      <legend className="facet__legend">{legend}</legend>
      {note && <p className="facet__note">{note}</p>}
      <div className="facet__options">
        <label className="facet__option">
          <input
            type="radio"
            name={String(filterKey)}
            checked={selected === null}
            onChange={() => onChange(filterKey, null)}
          />
          <span>Any</span>
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
      </div>
    </fieldset>
  );
}
