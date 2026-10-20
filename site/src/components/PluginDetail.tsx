import { useEffect, useState } from "react";
import { Cluster, Stack } from "./Layout";
import { RESERVED_NAMESPACES } from "@civic-skill-exchange/validator/rules";
import { CommandRow } from "./DownloadBox";
import { History } from "./History";
import { TierBadge, LabBadge, SensitivityBadge, DeploymentBadge } from "./Badges";
import { rich } from "../i18n/rich";
import { guideHref } from "../lib/route";
import { useStrings } from "../i18n/strings";
import { ModelFacts } from "./ModelFacts";
import { label } from "../lib/labels";
import { bytes } from "../lib/format";
import { installCommands } from "../lib/install";
import type { PluginDetail as Detail } from "../lib/types";

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
    <Stack className="page detail" gap="md">
      <Stack gap="4">
        <Cluster as="nav" className="crumbs" gap="2" align="baseline" aria-label={d.breadcrumb}>
          <a href="#/">{d.catalog}</a>
          <span aria-hidden="true">/</span>
          <span>{detail.namespace}</span>
        </Cluster>

        <Stack as="header" className="detail__head" gap="3">
          <Cluster gap="2" align="stretch">
            <TierBadge tier={detail.tier} reviewed={detail.reviewed} />
            <LabBadge namespace={detail.namespace} />
            <SensitivityBadge value={detail.data_sensitivity} />
            <DeploymentBadge provenance={detail.provenance} detail />
          </Cluster>
          <h1 className="detail__title">{detail.name}</h1>
          <p className="detail__desc" lang={language}>{detail.description}</p>
          <p className="detail__maintainer">
            {d.maintainedBy(detail.maintainer ?? s.vocabulary.missing)}
          </p>
        </Stack>
      </Stack>

      <div className="detail__grid">
        <div className="detail__main">
          {(detail.use_when || detail.avoid_when) && (
            /* The plugin's own, declared once in plugin.json (ADR 0005). */
            <Stack as="section" aria-labelledby="plugin-fit-heading" className="detail__section" gap="4">
              <h2 className="h2" id="plugin-fit-heading">{d.fit.heading}</h2>
              <p>{p.fit.caveat}</p>
              <Stack as="dl" className="fit" gap="4" lang={language}>
                {detail.use_when && (
                  <Stack gap="2" className="fit__item">
                    <dt>{d.fit.use}</dt>
                    <dd>{detail.use_when}</dd>
                  </Stack>
                )}
                {detail.avoid_when && (
                  <Stack gap="2" className="fit__item fit__item--avoid">
                    <dt>{d.fit.avoid}</dt>
                    <dd>{detail.avoid_when}</dd>
                  </Stack>
                )}
              </Stack>
            </Stack>
          )}

          <Stack as="section" aria-labelledby="plugin-skills-heading" className="detail__section" gap="4">
            <h2 className="h2" id="plugin-skills-heading">{p.skills.heading}</h2>
            <p>{p.skills.caveat}</p>
            <Stack as="dl" className="fit" gap="4">
              {detail.skills.map((skill) => (
                <Stack gap="2" className="fit__item" key={skill.name}>
                  <dt><code>{skill.name}</code></dt>
                  <dd lang={skill.language ?? undefined}>{skill.description}</dd>
                  <dd className="facts__note">
                    {[skill.category, skill.category_secondary]
                      .filter((c): c is string => Boolean(c))
                      .map((c) => label(s.vocabulary.category, c)).join(" · ")}
                  </dd>
                </Stack>
              ))}
            </Stack>
          </Stack>

          <Stack as="section" aria-labelledby="plugin-servers-heading" className="detail__section" gap="4">
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
          </Stack>

          <Stack as="section" aria-labelledby="plugin-structure-heading" className="detail__section" gap="4">
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
          </Stack>
        </div>

        <Stack as="aside" className="detail__side" gap="5">
          <PluginDownload detail={detail} />

          <Stack as="section" className="facts" aria-labelledby="plugin-facts-heading" gap="3">
            <h2 className="h3" id="plugin-facts-heading">{d.facts.heading}</h2>
            <Stack as="dl" gap="3">
              <Stack gap="1">
                <dt>{p.facts.categories}</dt>
                <dd>{detail.categories.map((c) => label(s.vocabulary.category, c)).join(" · ")
                  || s.vocabulary.missing}</dd>
              </Stack>
              <Stack gap="1">
                <dt>{p.facts.languages}</dt>
                <dd>{detail.languages.map((l) => label(s.vocabulary.language, l)).join(" · ")
                  || s.vocabulary.missing}</dd>
              </Stack>
              <ModelFacts modelsTested={detail.models_tested}
                verifiedModels={detail.verified_models} tier={detail.tier}
                reviewers={detail.reviewed?.reviewers.length
                  ? s.badges.tier.reviewers(detail.reviewed.reviewers)
                  : d.facts.someReviewer} />
              <Stack gap="1">
                <dt>{p.facts.sensitivity}</dt>
                <dd>{label(s.vocabulary.sensitivity, detail.data_sensitivity)}</dd>
              </Stack>
              <Stack gap="1">
                <dt>{d.facts.license}</dt>
                <dd>{detail.license ?? s.vocabulary.missing}</dd>
              </Stack>
              {detail.sha && (
                <Stack gap="1">
                  <dt>{d.facts.commit}</dt>
                  <dd className="mono">{detail.sha.slice(0, 12)}</dd>
                </Stack>
              )}
            </Stack>
          </Stack>

          <History history={detail.history} version={detail.version} />

          <Stack as="section" className="facts" aria-labelledby="plugin-prov-heading" gap="3">
            <h2 className="h3" id="plugin-prov-heading">{d.provenance.heading}</h2>
            <p className="facts__note">{d.provenance.note}</p>
            <Stack as="dl" gap="3">
              <Stack gap="1">
                <dt>{d.provenance.deployment}</dt>
                <dd>{label(s.vocabulary.deployment, detail.provenance.deployment)}</dd>
              </Stack>
              {detail.provenance.deployed_at && (
                <Stack gap="1"><dt>{d.provenance.at}</dt><dd>{detail.provenance.deployed_at}</dd></Stack>
              )}
              {detail.provenance.deployed_in && (
                <Stack gap="1"><dt>{d.provenance.in}</dt><dd>{detail.provenance.deployed_in}</dd></Stack>
              )}
              {detail.provenance.deployed_since && (
                <Stack gap="1"><dt>{d.provenance.since}</dt><dd>{detail.provenance.deployed_since}</dd></Stack>
              )}
            </Stack>
          </Stack>
        </Stack>
      </div>
    </Stack>
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

  const lines = installCommands(detail.namespace, detail.name);
  const commands = [
    { id: "claude-marketplace", label: p.commands.claudeMarketplace, value: lines.claudeMarketplace },
    { id: "claude-install", label: p.commands.claudeInstall, value: lines.claudeInstall },
    { id: "claude-check", label: p.commands.claudeCheck, value: lines.claudeCheck },
    { id: "codex-marketplace", label: p.commands.codexMarketplace, value: lines.codexMarketplace },
    { id: "codex-install", label: p.commands.codexInstall, value: lines.codexInstall },
    { id: "codex-check", label: p.commands.codexCheck, value: lines.codexCheck },
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
    <Stack as="section" className="download" aria-labelledby="plugin-download-heading" gap="4">
      {/* The same groups as DownloadBox's (#318). */}
      <Stack gap="5">
        <Stack gap="4">
          <Stack gap="3">
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
          </Stack>

          {detail.archive && (
            <Stack gap="2" className="download__archive">
              <Cluster>
                <a
                  className="btn btn--strong download__get"
                  href={`${import.meta.env.BASE_URL}${detail.archive.path}`}
                  download={`${detail.name}.zip`}
                >
                  {p.archive(bytes(detail.archive.size))}
                </a>
              </Cluster>
              <span>{p.archiveNote}</span>
            </Stack>
          )}
        </Stack>

        <Stack gap="4">
          {commands.map((c) => (
            <CommandRow key={c.id} label={c.label} value={c.value} copied={copied === c.id}
              onCopy={() => copy(c.id, c.value)} />
          ))}
        </Stack>
      </Stack>

      <Stack gap="2">
        <p className="download__note">
          {rich(p.stepByStep, { guide: guideHref("marketplace") })}
        </p>
        <p className="download__note">
          {rich(p.formatNote, { spec: "https://agent-plugins.org" })}
        </p>
        <p className="download__note">
          <a className="arrow-link" href={detail.download}>
            {s.download.github} <span aria-hidden="true">→</span>
          </a>
        </p>
      </Stack>
    </Stack>
  );
}
