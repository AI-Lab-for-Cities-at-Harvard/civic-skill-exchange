import { inPlace } from "../lib/browse";
import { useStrings } from "../i18n/strings";
import { Cluster } from "./Layout";

/** Numbered pages (#208, ADR 0008 decision 3). Links, not buttons: each page
 *  is a URL a reader can copy and return to with Back, which "show more" could
 *  not give. The current page is a link to itself, marked as the nav marks
 *  the page it is on. */
export function Pager({ page, pages, href, go }: {
  page: number; pages: number; href: (n: number) => string; go: (n: number) => void;
}) {
  const s = useStrings();
  const t = s.browse.pager;
  if (pages <= 1) return null;
  const numbers = Array.from({ length: pages }, (_, i) => i + 1);
  return (
    <nav className="pager" aria-label={t.label}>
      <Cluster as="ul" gap="2">
        {page > 1 && (
          <li><a href={href(page - 1)} rel="prev" onClick={inPlace(() => go(page - 1))}>
            {t.previous}
          </a></li>
        )}
        {numbers.map((n) => (
          <li key={n}>
            <a href={href(n)} aria-current={n === page ? "page" : undefined}
              onClick={inPlace(() => go(n))}>
              <span className="vh">{t.page}</span>{" "}{n}
            </a>
          </li>
        ))}
        {page < pages && (
          <li><a href={href(page + 1)} rel="next" onClick={inPlace(() => go(page + 1))}>
            {t.next}
          </a></li>
        )}
      </Cluster>
    </nav>
  );
}
