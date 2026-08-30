import { useEffect, useMemo, useState } from "react";
import { Facet } from "./components/Facets";
import { SkillCard } from "./components/SkillCard";
import { applyFilters } from "./lib/filter";
import {
  CATEGORY_LABELS, JURISDICTION_LABELS, LOCALIZATION_LABELS,
  SENSITIVITY_LABELS, TIER_LABELS,
} from "./lib/labels";
import { EMPTY_FILTERS, type Filters, type Index } from "./lib/types";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* private mode, blocked storage — fall through to the OS preference */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [index, setIndex] = useState<Index | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* not worth surfacing — the page still renders correctly */
    }
  }, [theme]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<Index>;
      })
      .then(setIndex)
      .catch(() => setError("The catalog could not be loaded. Try reloading the page."));
  }, []);

  // Memoised so the array identity is stable — a fresh [] on every render would
  // defeat the useMemo below it and re-filter the whole catalog on each keystroke.
  const skills = useMemo(() => index?.skills ?? [], [index]);
  const results = useMemo(() => applyFilters(skills, filters), [skills, filters]);
  const active = Object.entries(filters).some(([k, v]) => (k === "q" ? v !== "" : v !== null));

  const setFilter = (key: keyof Filters, value: string | null) =>
    setFilters((f) => ({ ...f, [key]: value }));

  return (
    <>
      <a className="skip-link" href="#results">Skip to results</a>

      <header className="masthead">
        <div className="masthead__inner">
          <div>
            <p className="masthead__eyebrow">Civic Skill Exchange</p>
            <h1 className="masthead__title">
              Agent skills for government, public-sector and nonprofit work
            </h1>
            <p className="masthead__lede">
              A city that solves a problem once should be able to hand the
              solution to the next hundred cities.
            </p>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      <main className="layout">
        <aside className="filters" aria-label="Filter skills">
          <div className="search">
            <label className="search__label" htmlFor="q">Search</label>
            <input
              id="q" type="search" className="search__input"
              placeholder="permit, benefits, Boston…"
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
            />
          </div>

          <Facet legend="Tier" field="tier" filterKey="tier" labels={TIER_LABELS}
            skills={skills} filters={filters} onChange={setFilter}
            note="Community listings passed automated checks only." />
          <Facet legend="Category" field="category" filterKey="category" labels={CATEGORY_LABELS}
            skills={skills} filters={filters} onChange={setFilter} />
          <Facet legend="Portability" field="localization" filterKey="localization"
            labels={LOCALIZATION_LABELS} skills={skills} filters={filters} onChange={setFilter}
            note="Generalized skills have jurisdiction specifics lifted out." />
          <Facet legend="Jurisdiction" field="jurisdiction" filterKey="jurisdiction"
            labels={JURISDICTION_LABELS} skills={skills} filters={filters} onChange={setFilter} />
          <Facet legend="Data touched" field="data_sensitivity" filterKey="dataSensitivity"
            labels={SENSITIVITY_LABELS} skills={skills} filters={filters} onChange={setFilter} />

          {active && (
            <button className="btn btn--subtle" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </button>
          )}
        </aside>

        <section id="results" className="results" aria-live="polite">
          {error && <p className="notice notice--error">{error}</p>}

          {!error && !index && <p className="notice">Loading the catalog…</p>}

          {index && (
            <>
              <p className="results__count">
                {results.length === skills.length
                  ? `${skills.length} skill${skills.length === 1 ? "" : "s"}`
                  : `${results.length} of ${skills.length} skills`}
              </p>

              {results.length === 0 ? (
                <p className="notice">
                  No skills match these filters.{" "}
                  <button className="linkish" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Clear them
                  </button>{" "}
                  to see the whole catalog.
                </p>
              ) : (
                <div className="grid">
                  {results.map((s) => <SkillCard key={s.id} skill={s} />)}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>
          Inclusion in this registry is not an endorsement. Automated checks can
          only reject — a pass is never a statement that a skill is safe.
        </p>
        {index && (
          <p className="footer__meta">
            Catalog generated {new Date(index.generated).toLocaleDateString()} ·{" "}
            <a href={index.repo}>Source and submissions on GitHub</a>
          </p>
        )}
      </footer>
    </>
  );
}
