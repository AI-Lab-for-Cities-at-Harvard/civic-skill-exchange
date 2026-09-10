import { useEffect, useMemo, useState } from "react";
import { About } from "./components/About";
import { BetaBadge } from "./components/Beta";
import { Submit } from "./components/Submit";
import { SkillDetail } from "./components/SkillDetail";
import { Facet } from "./components/Facets";
import { SkillCard } from "./components/SkillCard";
import { TierBand, ContributeBand } from "./components/Bands";
import { rich } from "./i18n/rich";
import { useStrings } from "./i18n/strings";
import { applyFilters } from "./lib/filter";
import { parseRoute, type Route } from "./lib/route";
import { repoSlug } from "./lib/submit";
import { EMPTY_FILTERS, type Filters, type Index } from "./lib/types";

type Theme = "light" | "dark";

const GITHUB = "https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

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
  const s = useStrings();
  const [index, setIndex] = useState<Index | null>(null);
  const [failed, setFailed] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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
      // The state records that it failed, not what to say about it: the
      // wording is read at render time, so it follows the locale the reader is
      // on rather than the one the fetch started under.
      .catch(() => setFailed(true));
  }, []);

  // Memoised so the array identity is stable — a fresh [] on every render would
  // defeat the useMemo below it and re-filter the whole catalog on each keystroke.
  const skills = useMemo(() => index?.skills ?? [], [index]);

  // #/about/<section> rather than a fragment, because hash routing has only one
  // `#`. The scroll happens here rather than in About so it re-runs when the
  // route changes without remounting the page.
  const aboutSection = route.page === "about" ? route.section : undefined;
  useEffect(() => {
    if (!aboutSection) return;
    // The section may not exist yet on the first render after a route change.
    const target = document.getElementById(aboutSection);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [aboutSection, index]);
  const results = useMemo(() => applyFilters(skills, filters), [skills, filters]);
  const active = Object.entries(filters).some(([k, v]) => (k === "q" ? v !== "" : v !== null));

  const setFilter = (key: keyof Filters, value: string | null) =>
    setFilters((f) => ({ ...f, [key]: value }));

  return (
    <>
      <a className="skip-link" href="#results">{s.chrome.skipToContent}</a>

      {/* A full-bleed section carrying its own theme is the system's signature
          move — the palette belongs to the block, not to the page. */}
      <header className="topper" data-theme="crimson">
        <div className="topper__inner">
          <div className="topper__bar">
            <span className="topper__identity">
              <a className="topper__mark" href="#/">{s.chrome.brand}</a>
              <BetaBadge />
            </span>
            <nav className="nav" aria-label={s.chrome.nav.label}>
              <a href="#/" aria-current={route.page === "browse" ? "page" : undefined}>
                {s.chrome.nav.browse}
              </a>
              <a href="#/about" aria-current={route.page === "about" ? "page" : undefined}>
                {s.chrome.nav.about}
              </a>
              <a href="#/submit" aria-current={route.page === "submit" ? "page" : undefined}>
                {s.chrome.nav.submit}
              </a>
              <a href={GITHUB}>{s.chrome.nav.github}</a>
              <button
                className="theme-toggle"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={theme === "dark"
                  ? s.chrome.theme.switchToLight
                  : s.chrome.theme.switchToDark}
              >
                {theme === "dark" ? s.chrome.theme.toLight : s.chrome.theme.toDark}
              </button>
            </nav>
          </div>

          <div className="topper__statement">
            <h1 className="topper__title">{s.chrome.title}</h1>
            <p className="topper__lede">{s.chrome.lede}</p>
            {index && (
              <p className="topper__stats">
                {rich(s.chrome.stats.skills(index.counts.total))}
                <span className="topper__dot" aria-hidden="true">·</span>
                {rich(s.chrome.stats.reviewed(index.counts.reviewed))}
                <span className="topper__dot" aria-hidden="true">·</span>
                {rich(s.chrome.stats.community(index.counts.community))}
              </p>
            )}
          </div>
        </div>
      </header>

      {route.page === "about" ? (
        <main id="results" className="page">
          <About skills={skills} section={route.section} />
        </main>
      ) : route.page === "submit" ? (
        <main id="results" className="page">
          <Submit repo={repoSlug(index?.repo ?? "")} skills={skills}
            mode={route.mode} add={route.add} />
        </main>
      ) : route.page === "skill" ? (
        <main id="results">
          <SkillDetail namespace={route.namespace} name={route.name} />
        </main>
      ) : (
      <>
      {index && <TierBand counts={index.counts} />}

      <main className="layout canvas">
        <aside className="filters" aria-label={s.facets.label}>
          <div className="search">
            <label className="search__label" htmlFor="q">{s.facets.search.label}</label>
            <input
              id="q" type="search" className="search__input"
              placeholder={s.facets.search.placeholder}
              value={filters.q}
              onChange={(e) => setFilter("q", e.target.value)}
            />
          </div>

          <Facet legend={s.facets.tier.legend} field="tier" filterKey="tier"
            labels={s.vocabulary.tier}
            skills={skills} filters={filters} onChange={setFilter}
            note={s.facets.tier.note} />
          <Facet legend={s.facets.category.legend} field="category" filterKey="category"
            labels={s.vocabulary.category}
            skills={skills} filters={filters} onChange={setFilter} />
          <Facet legend={s.facets.localization.legend} field="localization"
            filterKey="localization" labels={s.vocabulary.localization}
            skills={skills} filters={filters} onChange={setFilter}
            note={s.facets.localization.note} />
          <Facet legend={s.facets.scope.legend} field="scope" filterKey="scope"
            labels={s.vocabulary.scope} skills={skills} filters={filters}
            onChange={setFilter} note={s.facets.scope.note} />
          <Facet legend={s.facets.language.legend} field="language" filterKey="language"
            labels={s.vocabulary.language} skills={skills} filters={filters}
            onChange={setFilter} note={s.facets.language.note} />
          <Facet legend={s.facets.sensitivity.legend} field="data_sensitivity"
            filterKey="dataSensitivity" labels={s.vocabulary.sensitivity}
            skills={skills} filters={filters} onChange={setFilter} />

          {active && (
            <button className="btn btn--subtle" onClick={() => setFilters(EMPTY_FILTERS)}>
              {s.facets.clear}
            </button>
          )}
        </aside>

        <section id="results" className="results" aria-live="polite">
          {failed && <p className="notice notice--error">{s.errors.catalogUnavailable}</p>}

          {!failed && !index && <p className="notice">{s.results.loading}</p>}

          {index && (
            <>
              <p className="results__count">
                {results.length === skills.length
                  ? s.results.all(skills.length)
                  : s.results.some(results.length, skills.length)}
              </p>

              {results.length === 0 ? (
                <p className="notice">
                  {rich(s.results.empty, {
                    clear: (kids) => (
                      <button className="linkish" onClick={() => setFilters(EMPTY_FILTERS)}>
                        {kids}
                      </button>
                    ),
                  })}
                </p>
              ) : (
                <div className="grid">
                  {results.map((sk) => <SkillCard key={sk.id} skill={sk} />)}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {index && <ContributeBand repo={index.repo} />}
      </>
      )}

      <footer className="footer">
        <p>{s.chrome.footer.disclaimer}</p>
        {index && (
          <p className="footer__meta">
            {rich(s.chrome.footer.meta(s.chrome.footer.date(index.generated)), {
              repo: index.repo,
              about: "#/about",
            })}
          </p>
        )}
      </footer>
    </>
  );
}
