export type SubmitMode = "new" | "update";

export type Route =
  | { page: "browse"; query?: string }
  | { page: "about"; section?: string }
  | { page: "guide"; section?: string }
  | { page: "submit"; mode: SubmitMode; add?: string }
  | { page: "skill"; namespace: string; name: string }
  | { page: "plugin"; namespace: string; name: string }
  /** No slug when the URL's was not one: the page then says there is no
   *  collection there, as it does for a slug nobody has used. */
  | { page: "collection"; slug?: string };

/** A namespaced skill id, and nothing else. `add` becomes a path into GitHub's
 *  editor, so anything that is not exactly `{namespace}/{name}` is dropped
 *  rather than carried. */
const SKILL_ID = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

/** A section of the About page or the guide. Reaches `getElementById`, so it is
 *  a plain slug or it is dropped — the same posture as SKILL_ID above. */
const SECTION = /^[a-z0-9-]+$/;

/** A collection's slug, as scripts/build_index.py's COLLECTION_SLUG has it. */
const COLLECTION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Hash routing rather than a router library or path routing.
 *  GitHub Pages has no SPA fallback, so /about would 404 on a hard refresh.
 *  A handful of pages does not justify a dependency. */
export function parseRoute(hash: string): Route {
  const [rawPath, rawQuery = ""] = hash.replace(/^#\/?/, "").split("?");
  const parts = (rawPath ?? "").split("/").filter(Boolean).map(decodeURIComponent);

  if (parts[0] === "about") {
    // A section is a path segment rather than a fragment: hash routing has only
    // one `#`, so `#/about#metadata` cannot work — and a segment is a real URL
    // somebody can send.
    const section = parts[1];
    return section && SECTION.test(section)
      ? { page: "about", section }
      : { page: "about" };
  }
  if (parts[0] === "guide") {
    // The same scheme as the About page's sections, for the same reason (#258).
    const section = parts[1];
    return section && SECTION.test(section)
      ? { page: "guide", section }
      : { page: "guide" };
  }
  if (parts[0] === "submit") {
    const query = new URLSearchParams(rawQuery);
    const add = query.get("add");
    // Naming a listing is asking to update it, so the mode does not have to be
    // spelled out as well in the link a skill page hands over.
    if (add && SKILL_ID.test(add)) return { page: "submit", mode: "update", add };
    const mode = query.get("mode") === "update" ? "update" : "new";
    return { page: "submit", mode };
  }
  if (parts[0] === "skill" && parts[1] && parts[2]) {
    return { page: "skill", namespace: parts[1], name: parts[2] };
  }
  if (parts[0] === "plugin" && parts[1] && parts[2]) {
    return { page: "plugin", namespace: parts[1], name: parts[2] };
  }
  if (parts[0] === "collection") {
    // The slug's shape is the one build_index.py enforces (#209). Anything
    // else is still this page, which then says no collection is there.
    const slug = parts[1];
    return slug && COLLECTION_SLUG.test(slug) ? { page: "collection", slug } : { page: "collection" };
  }
  // The browse page's own state is its query (#208), read by lib/browse.ts.
  // Only the bare `#/?…` carries it: an unknown route falls back to the whole
  // catalogue, not to a filtered page somebody did not ask for.
  return parts.length === 0 && rawQuery ? { page: "browse", query: rawQuery } : { page: "browse" };
}

export function skillHref(namespace: string, name: string): string {
  return `#/skill/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
}

/** A plugin's page (ADR 0005). Its own route rather than a flavour of the
 *  skill route, because the two pages read different payloads. */
export function pluginHref(namespace: string, name: string): string {
  return `#/plugin/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
}

/** Flow 2 on #24: a maintainer arriving to add newer fields to a listed skill. */
export function addFieldsHref(namespace: string, name: string): string {
  return `#/submit?add=${encodeURIComponent(`${namespace}/${name}`)}`;
}

export function aboutHref(section?: string): string {
  return section ? `#/about/${section}` : "#/about";
}

/** The "Using the Exchange" page (#224), or one of its sections. */
export function guideHref(section?: string): string {
  return section ? `#/guide/${section}` : "#/guide";
}

export function submitHref(mode: SubmitMode): string {
  return mode === "update" ? "#/submit?mode=update" : "#/submit";
}

/** A collection's page (#209). The slug is already URL-safe: the build
 *  refuses any other. */
export function collectionHref(slug: string): string {
  return `#/collection/${slug}`;
}
