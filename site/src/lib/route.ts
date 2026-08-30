export type Route = "browse" | "about";

/** Hash routing rather than a router library or path routing.
 *  GitHub Pages has no SPA fallback, so /about would 404 on a hard refresh.
 *  Two pages does not justify a dependency. */
export function parseRoute(hash: string): Route {
  return hash.replace(/^#\/?/, "").split("?")[0] === "about" ? "about" : "browse";
}
