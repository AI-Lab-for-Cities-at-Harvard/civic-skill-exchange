export type Route =
  | { page: "browse" }
  | { page: "about" }
  | { page: "skill"; namespace: string; name: string };

/** Hash routing rather than a router library or path routing.
 *  GitHub Pages has no SPA fallback, so /about would 404 on a hard refresh.
 *  Three pages does not justify a dependency. */
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);

  if (parts[0] === "about") return { page: "about" };
  if (parts[0] === "skill" && parts[1] && parts[2]) {
    return { page: "skill", namespace: parts[1], name: parts[2] };
  }
  return { page: "browse" };
}

export function skillHref(namespace: string, name: string): string {
  return `#/skill/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
}
