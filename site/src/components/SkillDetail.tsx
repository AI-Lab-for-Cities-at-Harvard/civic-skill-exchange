import { useEffect, useMemo, useState } from "react";
import { DownloadBox } from "./DownloadBox";
import { TierBadge, LocalizationBadge, DeploymentBadge } from "./Badges";
import { renderMarkdown } from "../lib/markdown";
import {
  label, CATEGORY_LABELS, JURISDICTION_LABELS, SENSITIVITY_LABELS,
  DEPLOYMENT_LABELS, LOCALIZATION_LABELS,
} from "../lib/labels";
import type { SkillDetail as Detail } from "../lib/types";

const HUMAN_REVIEW_NOTE: Record<string, string> = {
  none: "Output does not affect any individual's rights, benefits or standing.",
  "advisory-only": "Informs a person. Does not determine anything on its own.",
  "decision-support": "Feeds a determination someone acts on. Review its output.",
};

function bytes(n: number): string {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}

export function SkillDetail({ namespace, name }: { namespace: string; name: string }) {
  // Keyed by the skill being viewed rather than reset on navigation: clearing
  // state synchronously inside the effect would cascade an extra render, and
  // deriving staleness gives the same loading behaviour for free.
  const key = `${namespace}/${name}`;
  const [loaded, setLoaded] = useState<{
    key: string; detail: Detail | null; error: string | null;
  }>({ key: "", detail: null, error: null });

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
      .then((d) => { if (!cancelled) setLoaded({ key, detail: d, error: null }); })
      .catch(() => {
        if (!cancelled) {
          setLoaded({ key, detail: null, error: `No skill called ${key} is listed here.` });
        }
      });
    return () => { cancelled = true; };
  }, [key, namespace, name]);

  const fresh = loaded.key === key;
  const detail = fresh ? loaded.detail : null;
  const error = fresh ? loaded.error : null;

  // Rendered once per body rather than on every render: the source is untrusted,
  // and the sanitising pass is the expensive part.
  const bodyHtml = useMemo(
    () => (detail ? renderMarkdown(detail.body) : ""),
    [detail],
  );

  if (error) {
    return (
      <div className="page">
        <p className="notice notice--error">{error}</p>
        <p><a className="arrow-link" href="#/">Back to the catalog <span aria-hidden="true">→</span></a></p>
      </div>
    );
  }
  if (!detail) return <div className="page"><p className="notice">Loading…</p></div>;

  const executed = detail.files.filter((f) => f.executed);
  const referenced = detail.files.filter((f) => !f.executed);

  return (
    <div className="page detail">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#/">Catalog</a>
        <span aria-hidden="true">/</span>
        <span>{detail.namespace}</span>
      </nav>

      <header className="detail__head">
        <div className="card__badges">
          <TierBadge tier={detail.tier} />
          <LocalizationBadge value={detail.localization} />
          <DeploymentBadge provenance={detail.provenance} />
        </div>
        <h1 className="detail__title">{detail.name}</h1>
        <p className="detail__desc">{detail.description}</p>
        <p className="detail__maintainer">
          Maintained by {detail.maintainer ?? "—"}
        </p>
      </header>

      <div className="detail__grid">
        <div className="detail__main">
          {/* Untrusted markdown. renderMarkdown drops raw HTML outright and
              protocol-allowlists every link — see src/lib/markdown.ts. */}
          <article
            className="prose markdown"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          <section aria-labelledby="tools-heading" className="detail__section">
            <h2 className="h2" id="tools-heading">What it can do</h2>
            <p>
              These tools are granted <strong>without prompting you</strong> when
              the skill is invoked, and the grant is not gated by workspace trust.
              Check that each one is necessary for what the skill claims to do.
            </p>
            <ul className="tools">
              {detail.allowed_tools.length === 0 ? (
                <li className="tools__none">No tools declared.</li>
              ) : (
                detail.allowed_tools.map((t) => <li key={t}><code>{t}</code></li>)
              )}
            </ul>
          </section>

          {executed.length > 0 && (
            <section aria-labelledby="scripts-heading" className="detail__section">
              <h2 className="h2" id="scripts-heading">Code that runs</h2>
              <p>
                Files under <code>scripts/</code> are <strong>executed by the
                agent</strong>, not read by the model. Reviewing the prose above
                is not reviewing the skill — this is the part to read.
              </p>
              {executed.map((f) => <FileBlock key={f.path} file={f} />)}
            </section>
          )}

          {referenced.length > 0 && (
            <section aria-labelledby="refs-heading" className="detail__section">
              <h2 className="h2" id="refs-heading">Reference files</h2>
              <p>Read by the agent as data. Not executed.</p>
              {referenced.map((f) => <FileBlock key={f.path} file={f} />)}
            </section>
          )}
        </div>

        <aside className="detail__side">
          <DownloadBox skill={detail} />

          <section className="facts" aria-labelledby="facts-heading">
            <h2 className="h3" id="facts-heading">At a glance</h2>
            <dl>
              <div><dt>Category</dt><dd>{label(CATEGORY_LABELS, detail.category)}</dd></div>
              <div><dt>Jurisdiction</dt><dd>{label(JURISDICTION_LABELS, detail.jurisdiction)}</dd></div>
              {detail.localization && (
                <div><dt>Portability</dt><dd>{label(LOCALIZATION_LABELS, detail.localization)}</dd></div>
              )}
              <div><dt>Data</dt><dd>{label(SENSITIVITY_LABELS, detail.data_sensitivity)}</dd></div>
              <div>
                <dt>Affects people</dt>
                <dd>{HUMAN_REVIEW_NOTE[detail.human_review ?? ""] ?? "—"}</dd>
              </div>
              <div><dt>License</dt><dd>{detail.license ?? "—"}</dd></div>
              {detail.compatibility && (
                <div><dt>Requires</dt><dd>{detail.compatibility}</dd></div>
              )}
              {detail.sha && (
                <div><dt>Commit</dt><dd className="mono">{detail.sha.slice(0, 12)}</dd></div>
              )}
            </dl>
          </section>

          <section className="facts" aria-labelledby="prov-heading">
            <h2 className="h3" id="prov-heading">Where it has been used</h2>
            <p className="facts__note">Self-reported by the submitter.</p>
            <dl>
              <div>
                <dt>Use</dt>
                <dd>{label(DEPLOYMENT_LABELS, detail.provenance.deployment)}</dd>
              </div>
              {detail.provenance.deployed_at && (
                <div><dt>At</dt><dd>{detail.provenance.deployed_at}</dd></div>
              )}
              {detail.provenance.deployed_in && (
                <div><dt>In</dt><dd>{detail.provenance.deployed_in}</dd></div>
              )}
              {detail.provenance.deployed_since && (
                <div><dt>Since</dt><dd>{detail.provenance.deployed_since}</dd></div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function FileBlock({ file }: { file: { path: string; size: number; truncated: boolean; content: string | null } }) {
  return (
    <details className="file" open={!file.truncated && (file.content?.length ?? 0) < 4000}>
      <summary>
        <code>{file.path}</code>
        <span className="file__size">{bytes(file.size)}</span>
      </summary>
      {file.content === null ? (
        <p className="file__omitted">
          Too large to show here. Read it on GitHub before running this skill.
        </p>
      ) : (
        <pre><code>{file.content}</code></pre>
      )}
    </details>
  );
}
