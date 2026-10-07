import { TierBadge, LabBadge, SensitivityBadge } from "./Badges";
import { useStrings } from "../i18n/strings";
import { label } from "../lib/labels";
import { pluginHref } from "../lib/route";
import type { Plugin } from "../lib/types";

/** SkillCard's counterpart for a plugin (ADR 0005): the same tease — who
 *  vouched for it, what it is called, what it does — plus the two facts a
 *  skill does not have, how many skills it installs and how many servers it
 *  talks to. The skills themselves are described on its page. */
export function PluginCard({ plugin }: { plugin: Plugin }) {
  const s = useStrings();
  const p = s.plugins.card;
  const href = pluginHref(plugin.namespace, plugin.name);
  const servers = plugin.mcp_servers.length;

  return (
    <article className="card">
      <div className="card__badges">
        <TierBadge tier={plugin.tier} reviewed={plugin.reviewed} />
        <LabBadge namespace={plugin.namespace} />
        <SensitivityBadge value={plugin.data_sensitivity} />
      </div>

      <h3 className="card__title">
        <a href={href}>{plugin.name}</a>
      </h3>
      <p className="card__ns">{plugin.namespace}</p>
      {/* The author's prose, in the plugin's language when it has one. A
          plugin whose skills are in two languages has no one language to
          mark, and is left unmarked rather than marked wrongly. */}
      <p className="card__desc"
        lang={plugin.languages.length === 1 ? plugin.languages[0] : undefined}>
        {plugin.description}
      </p>

      <p className="card__meta" data-testid="plugin-card-meta">
        <span>{p.skills(plugin.skills.length)}</span>
        <span className="card__dot" aria-hidden="true">·</span>
        <span>{servers ? p.servers(servers) : p.noServers}</span>
        <span className="card__dot" aria-hidden="true">·</span>
        <span>{plugin.categories.map((c) => label(s.vocabulary.category, c)).join(" · ")}</span>
      </p>

      <p className="card__cta">
        <a className="arrow-link" href={href}>
          {p.cta} <span aria-hidden="true">&rarr;</span>
        </a>
      </p>
    </article>
  );
}
