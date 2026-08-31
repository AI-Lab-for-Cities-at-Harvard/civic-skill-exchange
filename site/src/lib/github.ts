/** The one thing the browser can check that the form cannot work out alone.
 *
 *  `checkFrontmatter` compares the namespace against the pull request author,
 *  and `validate.yml` supplies that from `github.event.pull_request.user.login`.
 *  So a namespace that is not the submitter's exact login produces a pull
 *  request that fails L1 — the check that stops anyone writing into somebody
 *  else's namespace. Catching a typo here saves that round trip.
 *
 *  Unauthenticated and public: api.github.com sends
 *  `access-control-allow-origin: *`, so this needs no token and no backend.
 *  The rate limit is 60 an hour per address, which is why a rate-limited or
 *  failed answer is "unknown" and says nothing rather than warning wrongly.
 */

export type UserCheck = "ok" | "missing" | "unknown";

export async function checkGitHubUser(
  login: string,
  signal?: AbortSignal,
): Promise<UserCheck> {
  const name = login.trim();
  // GitHub logins are alphanumeric with single hyphens. Anything else is not a
  // login, and asking about it would spend a request to learn nothing.
  if (!/^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/.test(name)) return "unknown";

  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(name)}`, {
      signal, headers: { Accept: "application/vnd.github+json" },
    });
    if (res.status === 404) return "missing";
    if (res.ok) return "ok";
    return "unknown";  // rate limited, offline, GitHub having a bad day
  } catch {
    return "unknown";
  }
}
