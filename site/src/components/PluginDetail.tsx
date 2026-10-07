import { useEffect, useState } from "react";
import { RESERVED_NAMESPACES } from "@civic-skill-exchange/validator";
import { History } from "./History";
import { TierBadge, LabBadge, SensitivityBadge, DeploymentBadge } from "./Badges";
import { rich } from "../i18n/rich";
import { useStrings } from "../i18n/strings";
import { label } from "../lib/labels";
import { bytes } from "../lib/format";
import type { PluginDetail as Detail } from "../lib/types";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
const MARKETPLACE = "civic-skill-exchange";

/** A plugin's page (ADR 0005). SkillDetail's shape, with the two things a
 *  plugin adds made first-class: the skills it installs, and the servers it
 *  connects to — the second being what an adopter's security review asks
 *  about first, so it is its own section rather than a line of facts. */
export function PluginDetail({ namespace, name }: { namespace: string; name: string }) {
  const s = useStrings();
  // Keyed by the plugin being viewed, for the reason SkillDetail gives.
  const key = `${namespace}/${name}`;
  const [loaded, setLoaded] = useState<{
    key: string; detail: Detail | null; missing: boolean;
  }>({ key: "", detail: null, missing: false });

  useEffect(() => {
    let cancelled = false;
    const url =
      `${import.meta.env.BASE_URL}data/plugins/` +
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

  if (fresh && loaded.missing) {
    return (
      <div className="page">
        <p className="notice notice--error">{s.plugins.errors.noSuchPlugin(key)}</p>
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
  const p = s.plugins.detail;
  const language = detail.languages.length === 1 ? detail.languages[0] : undefined;

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
          <SensitivityBadge value={detail.data_sensitivity} />
          <DeploymentBadge provenance={detail.provenance} detail />
        </div>
        <h1 className="detail__title">{detail.name}</h1>
        <p className="detail__desc" lang={language}>{detail.description}</p>
        <p className="detail__maintainer">
          {d.maintainedBy(detail.maintainer ?? s.vocabulary.missing)}
        </p>
      </header>

      <div className="detail__grid">
        <div className="detail__main">
          {(detail.use_when || detail.avoid_when) && (
            /* The plugin's own, declared once in plugin.json (ADR 0005). */
            <section aria-labelledby="plugin-fit-heading" className="detail__section">
              <h2 className="h2" id="plugin-fit-heading">{d.fit.heading}</h2>
              <p>{d.fit.caveat}</p>
              <dl className="fit" lang={language}>
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

          <section aria-labelledby="plugin-skills-heading" className="detail__section">
            <h2 className="h2" id="plugin-skills-heading">{p.skills.heading}</h2>
            <p>{p.skills.caveat}</p>
            <dl className="fit">
              {detail.skills.map((skill) => (
                <div className="fit__item" key={skill.name}>
                  <dt><code>{skill.name}</code></dt>
                  <dd lang={skill.language ?? undefined}>{skill.description}</dd>
                  <dd className="facts__note">
                    {[skill.category, skill.category_secondary]
                      .filter((c): c is string => Boolean(c))
                      .map((c) => label(s.vocabulary.category, c)).join(" · ")}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="plugin-servers-heading" className="detail__section">
            <h2 className="h2" id="plugin-servers-heading">{p.servers.heading}</h2>
            {detail.mcp_servers.length === 0 ? (
              <p>{p.servers.none}</p>
            ) : (
              <>
                <p>{rich(p.servers.caveat)}</p>
                <ul className="tree">
                  {detail.mcp_servers.map((server) => (
                    <li className="tree__item tree__item--exec" key={server.name}>
                      <code className="tree__path">{server.name}</code>
                      <span className="tree__tag">
                        {server.type === "stdio" ? p.servers.local : p.servers.remote}
                      </span>
                      <code className="tree__size">{server.target}</code>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section aria-labelledby="plugin-structure-heading" className="detail__section">
            <h2 className="h2" id="plugin-structure-heading">{d.structure.heading}</h2>
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
          <PluginDownload detail={detail} />

          <section className="facts" aria-labelledby="plugin-facts-heading">
            <h2 className="h3" id="plugin-facts-heading">{d.facts.heading}</h2>
            <dl>
              <div>
                <dt>{p.facts.categories}</dt>
                <dd>{detail.categories.map((c) => label(s.vocabulary.category, c)).join(" · ")
                  || s.vocabulary.missing}</dd>
              </div>
              <div>
                <dt>{p.facts.languages}</dt>
                <dd>{detail.languages.map((l) => label(s.vocabulary.language, l)).join(" · ")
                  || s.vocabulary.missing}</dd>
              </div>
              <div>
                <dt>{p.facts.sensitivity}</dt>
                <dd>{label(s.vocabulary.sensitivity, detail.data_sensitivity)}</dd>
              </div>
              <div>
                <dt>{d.facts.license}</dt>
                <dd>{detail.license ?? s.vocabulary.missing}</dd>
              </div>
              {detail.sha && (
                <div>
                  <dt>{d.facts.commit}</dt>
                  <dd className="mono">{detail.sha.slice(0, 12)}</dd>
                </div>
              )}
            </dl>
          </section>

          <History history={detail.history} version={detail.version} />

          <section className="facts" aria-labelledby="plugin-prov-heading">
            <h2 className="h3" id="plugin-prov-heading">{d.provenance.heading}</h2>
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

/** DownloadBox's counterpart. The warning sits beside the commands for the
 *  same reason — this is the moment somebody is about to act — and there are
 *  commands for both clients, because a plugin installs from either
 *  marketplace. */
function PluginDownload({ detail }: { detail: Detail }) {
  const s = useStrings();
  const p = s.plugins.download;
  const [copied, setCopied] = useState<string | null>(null);

  const commands = [
    { id: "claude-marketplace", label: p.commands.claudeMarketplace,
      value: `/plugin marketplace add ${REPO}` },
    { id: "claude-install", label: p.commands.claudeInstall,
      value: `/plugin install ${detail.namespace}-${detail.name}@${MARKETPLACE}` },
    { id: "codex-marketplace", label: p.commands.codexMarketplace,
      value: `codex plugin marketplace add ${REPO}` },
  ];

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Blocked clipboard: the command is on screen and selectable.
    }
  };

  return (
    <section className="download" aria-labelledby="plugin-download-heading">
      <h2 className="h3" id="plugin-download-heading">{p.heading}</h2>

      {detail.tier === "community" ? (
        <p className="download__warn">{rich(p.community)}</p>
      ) : (
        <p className="download__ok">
          {rich(s.download.reviewed(
            s.badges.tier.reviewers(detail.reviewed?.reviewers ?? []),
            detail.reviewed?.date ?? "",
            // A Lab-authored plugin discloses itself, as a skill does (ADR 0001).
            RESERVED_NAMESPACES.has(detail.namespace),
          ))}
        </p>
      )}

      {detail.archive && (
        <p className="download__archive">
          <a
            className="btn btn--strong download__get"
            href={`${import.meta.env.BASE_URL}${detail.archive.path}`}
            download={`${detail.name}.zip`}
          >
            {p.archive(bytes(detail.archive.size))}
          </a>
          <span>{p.archiveNote}</span>
        </p>
      )}

      {commands.map((c) => (
        <div className="download__cmd" key={c.id}>
          <span className="download__cmd-label">{c.label}</span>
          <code>{c.value}</code>
          <button className="btn btn--subtle" onClick={() => copy(c.id, c.value)}>
            {copied === c.id ? s.download.copied : s.download.copy}
          </button>
        </div>
      ))}

      <p className="download__note">
        {rich(p.formatNote, { spec: "https://agent-plugins.org" })}
      </p>
      <p className="download__note">
        <a className="arrow-link" href={detail.download}>
          {s.download.github} <span aria-hidden="true">→</span>
        </a>
      </p>
    </section>
  );
}
