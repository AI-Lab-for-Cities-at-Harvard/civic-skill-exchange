import { useEffect, useState } from "react";
import { DownloadBox } from "./DownloadBox";
import { History } from "./History";
import { categoriesOf, scopesOf } from "../lib/filter";
import { TierBadge, LabBadge, LocalizationBadge, DeploymentBadge } from "./Badges";
import { rich } from "../i18n/rich";
import { useStrings } from "../i18n/strings";
import { label } from "../lib/labels";
import { addFieldsHref } from "../lib/route";
import { bytes } from "../lib/format";
import type { SkillDetail as Detail } from "../lib/types";

export function SkillDetail({ namespace, name }: { namespace: string; name: string }) {
  const s = useStrings();
  // Keyed by the skill being viewed rather than reset on navigation: clearing
  // state synchronously inside the effect would cascade an extra render, and
  // deriving staleness gives the same loading behaviour for free.
  const key = `${namespace}/${name}`;
  // `missing` records that the fetch failed, not what to say about it: the
  // wording is read at render time, so it follows the locale the reader is on.
  const [loaded, setLoaded] = useState<{
    key: string; detail: Detail | null; missing: boolean;
  }>({ key: "", detail: null, missing: false });

  useEffect(() => {
    let cancelled = false;
    const url =
      `${import.meta.env.BASE_URL}data/skills/` +
      `${encodeURIComponent(namespace)}/${encodeURIComponent(name)}.json`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Detail>;
      })
      .then((d) => { if (!cancelled) setLoaded({ key, detail: d, missing: false }); })
      .catch(() => {
        if (!cancelled) setLoaded({ key, detail: null, missing: true });
      });
    return () => { cancelled = true; };
  }, [key, namespace, name]);

  const fresh = loaded.key === key;
  const detail = fresh ? loaded.detail : null;
  const missing = fresh && loaded.missing;

  if (missing) {
    return (
      <div className="page">
        <p className="notice notice--error">{s.errors.noSuchSkill(key)}</p>
        <p>
          <a className="arrow-link" href="#/">
            {s.errors.backToCatalog} <span aria-hidden="true">→</span>
          </a>
        </p>
      </div>
    );
  }
  if (!detail) return <div className="page"><p className="notice">{s.errors.loading}</p></div>;

  const d = s.detail;
  const reviewers = detail.reviewed?.reviewers.length
    ? s.badges.tier.reviewers(detail.reviewed.reviewers)
    : d.facts.someReviewer;

  return (
    <div className="page detail">
      <nav className="crumbs" aria-label={d.breadcrumb}>
        <a href="#/">{d.catalog}</a>
        <span aria-hidden="true">/</span>
        <span>{detail.namespace}</span>
      </nav>

      <header className="detail__head">
        <div className="card__badges">
          <TierBadge tier={detail.tier} reviewed={detail.reviewed} />
          <LabBadge namespace={detail.namespace} />
          <LocalizationBadge value={detail.localization} />
          <DeploymentBadge provenance={detail.provenance} detail />
        </div>
        <h1 className="detail__title">{detail.name}</h1>
        {/* Submitter-authored prose, in the listing's own language. Marked so
            a screen reader on this English page reads a Spanish description in
            a Spanish voice (#145). */}
        <p className="detail__desc" lang={detail.language ?? undefined}>
          {detail.description}
        </p>
        <p className="detail__maintainer">
          {d.maintainedBy(detail.maintainer ?? s.vocabulary.missing)}
        </p>
      </header>

      <div className="detail__grid">
        <div className="detail__main">
          {!detail.use_when && !detail.avoid_when && (
            /* Flow 2 on #24. Shown only where the fields are actually absent,
               so it is an offer to the maintainer rather than chrome on every
               listing. */
            <p className="detail__nudge" data-testid="fit-nudge">
              {d.nudge}{" "}
              <a className="arrow-link" href={addFieldsHref(detail.namespace, detail.name)}>
                {d.nudgeCta} <span aria-hidden="true">&rarr;</span>
              </a>
            </p>
          )}

          {(detail.use_when || detail.avoid_when) && (
            <section aria-labelledby="fit-heading" className="detail__section">
              <h2 className="h2" id="fit-heading">{d.fit.heading}</h2>
              <p>{d.fit.caveat}</p>
              {/* The author's own prose, in the listing's language — the same
                  reason the description is marked. On the list, so both items
                  inherit it. */}
              <dl className="fit" lang={detail.language ?? undefined}>
                {detail.use_when && (
                  <div className="fit__item">
                    <dt>{d.fit.use}</dt>
                    <dd>{detail.use_when}</dd>
                  </div>
                )}
                {detail.avoid_when && (
                  <div className="fit__item fit__item--avoid">
                    <dt>{d.fit.avoid}</dt>
                    <dd>{detail.avoid_when}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          <section aria-labelledby="tools-heading" className="detail__section">
            <h2 className="h2" id="tools-heading">{d.tools.heading}</h2>
            <p>{rich(d.tools.caveat)}</p>
            <ul className="tools">
              {detail.allowed_tools.length === 0 ? (
                <li className="tools__none">{d.tools.none}</li>
              ) : (
                detail.allowed_tools.map((t) => <li key={t}><code>{t}</code></li>)
              )}
            </ul>
          </section>

          <section aria-labelledby="structure-heading" className="detail__section">
            <h2 className="h2" id="structure-heading">{d.structure.heading}</h2>
            <p>{rich(d.structure.caveat)}</p>

            <ul className="tree">
              {detail.files.map((f) => (
                <li className={f.executed ? "tree__item tree__item--exec" : "tree__item"} key={f.path}>
                  <code className="tree__path">{f.path}</code>
                  {f.executed && <span className="tree__tag">{d.structure.executed}</span>}
                  <span className="tree__size">{bytes(f.size)}</span>
                </li>
              ))}
            </ul>

            <p>
              <a className="arrow-link" href={detail.download}>
                {d.structure.source} <span aria-hidden="true">&rarr;</span>
              </a>
            </p>
          </section>
        </div>

        <aside className="detail__side">
          <DownloadBox skill={detail} />

          <section className="facts" aria-labelledby="facts-heading">
            <h2 className="h3" id="facts-heading">{d.facts.heading}</h2>
            <dl>
              <div>
                <dt>{detail.category_secondary ? d.facts.categories : d.facts.category}</dt>
                <dd>{categoriesOf(detail).map((c) => label(s.vocabulary.category, c)).join(" · ")
                  || s.vocabulary.missing}</dd>
              </div>
              <div>
                <dt>{detail.scope_secondary ? d.facts.scopes : d.facts.scope}</dt>
                <dd>{scopesOf(detail).map((v) => label(s.vocabulary.scope, v)).join(" · ")
                  || s.vocabulary.missing}</dd>
              </div>
              {detail.jurisdiction && (
                <div>
                  <dt>{d.facts.jurisdiction}</dt>
                  <dd>{detail.jurisdiction}</dd>
                </div>
              )}
              {detail.localization && (
                <div>
                  <dt>{d.facts.localization}</dt>
                  <dd>{label(s.vocabulary.localization, detail.localization)}</dd>
                </div>
              )}
              {/* The declared language, and separately the author's claim about
                  what they tried it in. Never merged: the reviewer's verified
                  list lives on the attestation in registry/reviewed.yml, and a
                  reader who cannot tell the two apart will over-trust the
                  claim. ADR 0004. */}
              <div>
                <dt>{d.facts.language}</dt>
                <dd>{label(s.vocabulary.language, detail.language)}</dd>
              </div>
              {detail.languages_tested && detail.languages_tested.length > 0 && (
                <div data-testid="languages-tested">
                  <dt>{d.facts.languagesTested}</dt>
                  <dd>
                    {detail.languages_tested.join(", ")}
                    <span className="facts__note">
                      {" "}{d.facts.languagesTestedNote}
                    </span>
                  </dd>
                </div>
              )}
              {/* The reviewer's verified list — never merged with the claim
                  above. Only ever present on a Reviewed listing, so the tier
                  check is belt-and-braces alongside build_index's own
                  derivation. ADR 0004 ruling 2. */}
              {detail.tier === "reviewed" &&
                detail.verified_languages && detail.verified_languages.length > 0 && (
                <div data-testid="verified-languages">
                  <dt>{d.facts.verifiedLanguages}</dt>
                  <dd>
                    {detail.verified_languages.join(", ")}
                    <span className="facts__note">
                      {" "}{d.facts.verifiedLanguagesNote(reviewers)}
                    </span>
                  </dd>
                </div>
              )}
              <div>
                <dt>{d.facts.sensitivity}</dt>
                <dd>{label(s.vocabulary.sensitivity, detail.data_sensitivity)}</dd>
              </div>
              <div>
                <dt>{d.facts.humanReview}</dt>
                <dd>{d.humanReview[
                  (detail.human_review ?? "") as keyof typeof d.humanReview
                ] ?? s.vocabulary.missing}</dd>
              </div>
              <div>
                <dt>{d.facts.license}</dt>
                <dd>{detail.license ?? s.vocabulary.missing}</dd>
              </div>
              {detail.compatibility && (
                <div>
                  <dt>{d.facts.compatibility}</dt>
                  <dd>{detail.compatibility}</dd>
                </div>
              )}
              {detail.sha && (
                <div>
                  <dt>{d.facts.commit}</dt>
                  <dd className="mono">{detail.sha.slice(0, 12)}</dd>
                </div>
              )}
              {detail.source && (
                /* Where the copy came from. The registry holds the content —
                   this is provenance, and the listing does not depend on that
                   repository still existing. */
                <div data-testid="source">
                  <dt>{d.facts.source}</dt>
                  <dd>
                    <a href={`https://github.com/${detail.source.repo}${
                      detail.source.commit ? `/tree/${detail.source.commit}` : ""
                    }`}>
                      {detail.source.repo}
                    </a>
                    {detail.source.commit && (
                      <span className="mono"> @ {detail.source.commit.slice(0, 7)}</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <History history={detail.history} version={detail.version} />

          <section className="facts" aria-labelledby="prov-heading">
            <h2 className="h3" id="prov-heading">{d.provenance.heading}</h2>
            <p className="facts__note">{d.provenance.note}</p>
            <dl>
              <div>
                <dt>{d.provenance.deployment}</dt>
                <dd>{label(s.vocabulary.deployment, detail.provenance.deployment)}</dd>
              </div>
              {detail.provenance.deployed_at && (
                <div><dt>{d.provenance.at}</dt><dd>{detail.provenance.deployed_at}</dd></div>
              )}
              {detail.provenance.deployed_in && (
                <div><dt>{d.provenance.in}</dt><dd>{detail.provenance.deployed_in}</dd></div>
              )}
              {detail.provenance.deployed_since && (
                <div><dt>{d.provenance.since}</dt><dd>{detail.provenance.deployed_since}</dd></div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
