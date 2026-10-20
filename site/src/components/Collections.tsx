import { Grid, Stack } from "./Layout";
import { useStrings } from "../i18n/strings";
import { collectionText } from "../lib/collections";
import { collectionHref } from "../lib/route";
import type { Collection } from "../lib/types";

/** The featured collections, as tiles at the top of the browse page (#209,
 *  ADR 0008 decision 10). App.tsx shows them on the unfiltered first page of
 *  the skills only: once a reader has narrowed the list, a maintainer's
 *  grouping above it is in the way.
 *
 *  An even grid: the Grid makes every tile a column's width, the list's rows
 *  are all one height, and each tile is a Stack of two parts, the title with
 *  its note and then the count, pushed apart so the counts line up along the
 *  bottom however long a note is. Nothing at all when none is featured. */
export function CollectionTiles({ collections }: { collections: Collection[] }) {
  const s = useStrings();
  const featured = collections.filter((c) => c.featured);
  if (featured.length === 0) return null;
  return (
    <Stack as="section" gap="3" className="collections" aria-labelledby="collections-heading">
      <h2 className="collections__heading" id="collections-heading">{s.collections.heading}</h2>
      <Grid as="ul" gap="3" min="15rem" className="collections__list">
        {featured.map((c) => {
          const { title, note } = collectionText(c);
          return (
            <Stack as="li" gap="3" className="tile" key={c.slug}>
              <Stack gap="1">
                <h3 className="tile__title"><a href={collectionHref(c.slug)}>{title}</a></h3>
                <p className="tile__note">{note}</p>
              </Stack>
              <p className="tile__count">{s.collections.count(c.listings.length)}</p>
            </Stack>
          );
        })}
      </Grid>
    </Stack>
  );
}
