import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { About } from "./components/About";
import { BetaBadge } from "./components/Beta";
import { SkillDetail } from "./components/SkillDetail";
import { PluginCard } from "./components/PluginCard";
import { Facet } from "./components/Facets";
import { SkillCard } from "./components/SkillCard";
import { TierBand, ContributeBand } from "./components/Bands";
import { rich } from "./i18n/rich";
import {
  DEFAULT_LOCALE, LOCALE_NAMES, locales, setLocale, useStrings,
} from "./i18n/strings";
import { applyFilters, applyPluginFilters } from "./lib/filter";
import { parseRoute, type Route } from "./lib/route";
import { repoSlug } from "./lib/repo";
import { EMPTY_FILTERS, type Filters, type Index } from "./lib/types";

type Theme = "light" | "dark";

/** Its own chunk, fetched only by somebody who opens a plugin — the way a
 *  locale is (ADR 0004 decision 5): the page a few readers visit should not
 *  cost every English visitor its bytes. */
const PluginDetail = lazy(() =>
  import("./components/PluginDetail").then((m) => ({ default: m.PluginDetail })));

/** Its own chunk too (#258): the guide is long, and a reader browsing the
 *  catalogue should not pay for its markup. Its words are in the strings table
 *  with every other page's. */
const Guide = lazy(() =>
  import("./components/Guide").then((m) => ({ default: m.Guide })));

/** And the submit page (#314): most readers browse and never submit, and the
 *  form, its validator rules and its hand-off are the heaviest page here. */
const Submit = lazy(() =>
  import("./components/Submit").then((m) => ({ default: m.Submit })));

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

/** The language to open in: what was chosen last, else what the browser asks
 *  for, else English.
 *
 *  The browser's preference is honoured only as far as the language — a reader
 *  on `es-MX` or `es-419` gets the Spanish site — and it is matched against
 *  `locales()` rather than against a list written here, so a third language is
 *  still one line in `strings.ts`. A tag the site has no table for falls
 *  through to English rather than to a blank page.
 *
 *  The saved choice wins over the browser, because it is the one the reader
 *  made on this site. */
function initialLocale(): string {
  try {
    const saved = localStorage.getItem("locale");
    if (saved && locales().includes(saved)) return saved;
  } catch {
    /* private mode, blocked storage — fall through to the browser's language */
  }
  const preferred = navigator.language?.toLowerCase() ?? "";
  return locales().find((tag) => preferred.startsWith(tag)) ?? DEFAULT_LOCALE;
}

export default function App() {
  const s = useStrings();
  const [index, setIndex] = useState<Index | null>(null);
  const [failed, setFailed] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [chosenLocale, setChosenLocale] = useState<string>(initialLocale);
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

  // `<html lang>` is set once the strings are actually in hand, not when the
  // choice is made: a document that claims Spanish while the page is still
  // English is a document lying to a screen reader for as long as the fetch
  // takes. A listing's own description carries its own `lang` and is not
  // touched by any of this (#145).
  useEffect(() => {
    let live = true;
    void setLocale(chosenLocale).then((ok) => {
      if (live && ok) document.documentElement.lang = chosenLocale;
    });
    try {
      localStorage.setItem("locale", chosenLocale);
    } catch {
      /* not worth surfacing — the page still renders in the chosen language */
    }
    return () => { live = false; };
  }, [chosenLocale]);

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
  // Absent from an index built before plugins existed (ADR 0005).
  const plugins = useMemo(() => index?.plugins ?? [], [index]);

  // #/about/<section> and #/guide/<section> rather than a fragment, because
  // hash routing has only one `#`. The scroll happens here rather than in the
  // page so it re-runs when the route changes without remounting the page.
  const section = route.page === "about" || route.page === "guide" ? route.section : undefined;
  useEffect(() => {
    if (!section) return;
    // The section may not exist yet on the first render after a route change.
    const target = document.getElementById(section);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section, index]);
  const results = useMemo(() => applyFilters(skills, filters), [skills, filters]);
  const pluginResults = useMemo(
    () => applyPluginFilters(plugins, filters), [plugins, filters]);
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
              {/* Browse · Guide · Submit · About: the guide second, because
                  it is where somebody who has found a listing goes next
                  (#224, ruling 1 on its design note). */}
              <a href="#/guide" aria-current={route.page === "guide" ? "page" : undefined}>
                {s.chrome.nav.guide}
              </a>
              <a href="#/submit" aria-current={route.page === "submit" ? "page" : undefined}>
                {s.chrome.nav.submit}
              </a>
              <a href="#/about" aria-current={route.page === "about" ? "page" : undefined}>
                {s.chrome.nav.about}
              </a>
              <a href={GITHUB}>{s.chrome.nav.github}</a>
              {/* Beside the theme toggle: both are settings for how the page
                  is presented rather than places to go, and a reader looking
                  for one looks in the same corner for the other. A select
                  rather than a pair of links — the list grows with each
                  locale, and the chosen language is visible in it without
                  needing a legend. */}
              <select
                className="lang-switch"
                aria-label={s.chrome.language.label}
                value={chosenLocale}
                onChange={(e) => setChosenLocale(e.target.value)}
              >
                {locales().map((tag) => (
                  <option key={tag} value={tag}>{LOCALE_NAMES[tag] ?? tag}</option>
                ))}
              </select>
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
                {/* The catalogue's two totals, and nothing else (owner, #306):
                    a tier count would have to say how many of each are
                    skills and how many plugins. */}
                {rich(s.chrome.stats.skills(index.counts.total))}
                <span className="topper__dot" aria-hidden="true">·</span>
                {rich(s.chrome.stats.plugins(plugins.length))}
              </p>
            )}
            {route.page === "browse" && (
              <p className="topper__cta">
                <a className="arrow-link" href="#/submit" data-testid="home-submit">
                  {s.chrome.submitCta} <span aria-hidden="true">→</span>
                </a>
              </p>
            )}
          </div>
        </div>
      </header>

      {route.page === "guide" ? (
        <main id="results" className="page">
          <Suspense fallback={<p className="notice">{s.errors.loading}</p>}>
            <Guide section={route.section} />
          </Suspense>
        </main>
      ) : route.page === "about" ? (
        <main id="results" className="page">
          <About skills={skills} section={route.section} />
        </main>
      ) : route.page === "submit" ? (
        <main id="results" className="page">
          <Suspense fallback={<p className="notice">{s.errors.loading}</p>}>
            <Submit repo={repoSlug(index?.repo ?? "")} skills={skills}
              mode={route.mode} add={route.add} />
          </Suspense>
        </main>
      ) : route.page === "skill" ? (
        <main id="results">
          <SkillDetail namespace={route.namespace} name={route.name} />
        </main>
      ) : route.page === "plugin" ? (
        <main id="results">
          <Suspense fallback={<div className="page"><p className="notice">{s.errors.loading}</p></div>}>
            <PluginDetail namespace={route.namespace} name={route.name} />
          </Suspense>
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

              {/* Below the skills and apart from them, by the ruling on #206:
                  a plugin spans several categories and languages, so the
                  facets above stay about skills, and its skills are described
                  on its own page rather than listed here. */}
              {plugins.length > 0 && (
                <section className="plugins" aria-labelledby="plugins-heading">
                  <h2 className="h2" id="plugins-heading">{s.plugins.heading}</h2>
                  <p>{s.plugins.intro}</p>
                  <p className="results__count">
                    {pluginResults.length === plugins.length
                      ? s.plugins.count.all(plugins.length)
                      : s.plugins.count.some(pluginResults.length, plugins.length)}
                  </p>
                  {pluginResults.length === 0 ? (
                    <p className="notice">
                      {rich(s.plugins.empty, {
                        clear: (kids) => (
                          <button className="linkish" onClick={() => setFilters(EMPTY_FILTERS)}>
                            {kids}
                          </button>
                        ),
                      })}
                    </p>
                  ) : (
                    <div className="grid">
                      {pluginResults.map((pl) => <PluginCard key={pl.id} plugin={pl} />)}
                    </div>
                  )}
                </section>
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
          <p className="footer__meta" data-testid="footer-meta">
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
