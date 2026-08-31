export type Route =
  | { page: "browse" }
  | { page: "about" }
  | { page: "submit"; add?: string }
  | { page: "skill"; namespace: string; name: string };

/** A namespaced skill id, and nothing else. `add` becomes a path into GitHub's
 *  editor, so anything that is not exactly `{namespace}/{name}` is dropped
 *  rather than carried. */
const SKILL_ID = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

/** Hash routing rather than a router library or path routing.
 *  GitHub Pages has no SPA fallback, so /about would 404 on a hard refresh.
 *  Four pages does not justify a dependency. */
export function parseRoute(hash: string): Route {
  const [rawPath, rawQuery = ""] = hash.replace(/^#\/?/, "").split("?");
  const parts = (rawPath ?? "").split("/").filter(Boolean).map(decodeURIComponent);

  if (parts[0] === "about") return { page: "about" };
  if (parts[0] === "submit") {
    const add = new URLSearchParams(rawQuery).get("add");
    return add && SKILL_ID.test(add) ? { page: "submit", add } : { page: "submit" };
  }
  if (parts[0] === "skill" && parts[1] && parts[2]) {
    return { page: "skill", namespace: parts[1], name: parts[2] };
  }
  return { page: "browse" };
}

export function skillHref(namespace: string, name: string): string {
  return `#/skill/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
}

/** Flow 2 on #24: a maintainer arriving to add newer fields to a listed skill. */
export function addFieldsHref(namespace: string, name: string): string {
  return `#/submit?add=${encodeURIComponent(`${namespace}/${name}`)}`;
}
