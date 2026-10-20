import { Cluster, Stack } from "./Layout";
import { PluginRow, SkillRow } from "./Rows";
import { collectionText } from "../lib/collections";
import { useStrings } from "../i18n/strings";
import type { Index } from "../lib/types";

/** A collection's own page, #/collection/{slug} (#209, ADR 0008 decisions 9
 *  and 10). Its own chunk, loaded on demand, as the plugin page is: most
 *  readers never open one, and the size gate measures what they all download.
 *
 *  The title, the note on why these belong together, and a notice that being
 *  in a collection is not a review (#101 ruling 6), then the listings as the
 *  browse page's rows: skills and plugins mixed, in the collection's order,
 *  each with its own tier, a plugin's marked as one. The rows' headings sit
 *  one level below the page's h1. */
export function CollectionPage({ slug, index, failed }: {
  slug?: string; index: Index | null; failed: boolean;
}) {
  const s = useStrings();
  if (failed) {
    return <div className="page"><p className="notice notice--error">{s.errors.catalogUnavailable}</p></div>;
  }
  if (!index) return <div className="page"><p className="notice">{s.errors.loading}</p></div>;

  const collection = slug ? index.collections?.find((c) => c.slug === slug) : undefined;
  if (!collection) {
    return (
      <Stack className="page" gap="4">
        <p className="notice">{s.collections.missing}</p>
        <p>
          <a className="arrow-link" href="#/">
            {s.errors.backToCatalog} <span aria-hidden="true">→</span>
          </a>
        </p>
      </Stack>
    );
  }

  const { title, note } = collectionText(collection);
  const skills = new Map(index.skills.map((k) => [k.id, k]));
  const plugins = new Map((index.plugins ?? []).map((p) => [p.id, p]));

  return (
    <Stack className="page detail" gap="md">
      <Stack gap="4">
        <Cluster as="nav" className="crumbs" gap="2" align="baseline" aria-label={s.detail.breadcrumb}>
          <a href="#/">{s.detail.catalog}</a>
          <span aria-hidden="true">/</span>
          <span>{s.collections.heading}</span>
        </Cluster>
        <Stack as="header" className="detail__head" gap="3">
          <h1 className="detail__title">{title}</h1>
          <p className="detail__desc">{note}</p>
          <p className="detail__maintainer">{s.collections.count(collection.listings.length)}</p>
        </Stack>
      </Stack>

      <p className="notice">{s.collections.caveat}</p>

      <ul className="rows">
        {/* A member the index does not have cannot happen: the build fails on
            one. If an old index and a new file ever meet, the row is left out
            rather than drawn empty. */}
        {collection.listings.map(({ kind, id }) => {
          if (kind === "plugin") {
            const plugin = plugins.get(id);
            return plugin && <PluginRow key={`plugin:${id}`} plugin={plugin} level={2} marked />;
          }
          const skill = skills.get(id);
          return skill && <SkillRow key={`skill:${id}`} skill={skill} level={2} />;
        })}
      </ul>
    </Stack>
  );
}
