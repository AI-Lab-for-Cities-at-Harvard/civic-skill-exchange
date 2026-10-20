import { useId, useState, type ReactNode } from "react";
import {
  TierBadge, LabBadge, LocalizationBadge, DeploymentBadge, SensitivityBadge,
} from "./Badges";
import { Cluster, Stack } from "./Layout";
import { categoriesOf, scopesOf } from "../lib/filter";
import { useStrings } from "../i18n/strings";
import { label } from "../lib/labels";
import { pluginHref, skillHref } from "../lib/route";
import type { Plugin, Skill } from "../lib/types";

/** The level of a row's heading, which is its parent's business: under the
 *  browse page's section heading it is an h3, and a row placed elsewhere
 *  must not skip a level. */
type Level = 2 | 3 | 4;

interface Listing {
  name: string;
  namespace: string;
  tier: Skill["tier"];
  reviewed?: Skill["reviewed"];
}

/** A collapsible row (#208, ADR 0008 decisions 1 and 2): the browse page's
 *  only layout, for skills and plugins alike.
 *
 *  Closed, it is what helps somebody choose what to open: the name, who
 *  published it, the tier word, the Lab label when the Lab wrote it, and the
 *  category. The tier's note is in the closed row but out of sight, so a
 *  screen reader still hears it; it shows when the row opens, with the rest
 *  of what the card used to carry. The Lab is a label here and never a
 *  section of its own. The Details button is a real button, so it opens on
 *  Enter and Space and says whether it is open. */
function Row({ item, href, level, category, children }: {
  item: Listing; href: string; level: Level; category: string; children: ReactNode;
}) {
  const s = useStrings();
  const [open, setOpen] = useState(false);
  const body = useId();
  const H = `h${level}` as const;
  return (
    <li className="row">
      <div className="row__head">
        <Stack gap="1" className="row__name">
          <H className="row__title"><a href={href}>{item.name}</a></H>
          <span className="row__ns">{item.namespace}</span>
        </Stack>
        <Cluster gap="2" className="row__tier">
          <TierBadge tier={item.tier} reviewed={item.reviewed} quiet />
          <LabBadge namespace={item.namespace} />
        </Cluster>
        <span className="row__cat">{category}</span>
        <button type="button" className="row__toggle" aria-expanded={open}
          aria-controls={body} onClick={() => setOpen(!open)}>
          {open ? s.browse.hide : s.browse.details}{" "}
          <span className="vh">{item.name}</span>
          <span aria-hidden="true" className="row__chev">{open ? "▴" : "▾"}</span>
        </button>
      </div>
      <Stack gap="3" id={body} hidden={!open} className="row__body">
        {children}
      </Stack>
    </li>
  );
}

const joined = (values: string[], labels: Record<string, string>) =>
  values.map((v) => label(labels, v)).join(" · ");

export function SkillRow({ skill, level }: { skill: Skill; level: Level }) {
  const s = useStrings();
  const href = skillHref(skill.namespace, skill.name);
  return (
    <Row item={skill} href={href} level={level}
      category={joined(categoriesOf(skill), s.vocabulary.category)}>
      <Cluster gap="2">
        <TierBadge tier={skill.tier} reviewed={skill.reviewed} />
        <SensitivityBadge value={skill.data_sensitivity} />
        <LocalizationBadge value={skill.localization} />
        <DeploymentBadge provenance={skill.provenance} />
      </Cluster>
      {/* Submitter-authored prose in the listing's own language: without lang,
          a Spanish description on an English page is read in an English
          voice (#145). */}
      <p className="row__desc" lang={skill.language ?? undefined}>{skill.description}</p>
      <p className="row__meta">{joined(scopesOf(skill), s.vocabulary.scope)}</p>
      <p><a className="arrow-link" href={href}>
        {s.browse.skillCta} <span aria-hidden="true">&rarr;</span>
      </a></p>
    </Row>
  );
}

export function PluginRow({ plugin, level }: { plugin: Plugin; level: Level }) {
  const s = useStrings();
  const p = s.plugins.row;
  const href = pluginHref(plugin.namespace, plugin.name);
  const servers = plugin.mcp_servers.length;
  return (
    <Row item={plugin} href={href} level={level}
      category={joined(plugin.categories, s.vocabulary.category)}>
      <Cluster gap="2">
        <TierBadge tier={plugin.tier} reviewed={plugin.reviewed} />
        <SensitivityBadge value={plugin.data_sensitivity} />
      </Cluster>
      {/* A plugin whose skills are in two languages has no one language to
          mark, and is left unmarked rather than marked wrongly. */}
      <p className="row__desc"
        lang={plugin.languages.length === 1 ? plugin.languages[0] : undefined}>
        {plugin.description}
      </p>
      <p className="row__meta">
        {p.skills(plugin.skills.length)} · {servers ? p.servers(servers) : p.noServers}
      </p>
      <p><a className="arrow-link" href={href}>
        {p.cta} <span aria-hidden="true">&rarr;</span>
      </a></p>
    </Row>
  );
}
