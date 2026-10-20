/** The index publishes `repo` as a full URL; every GitHub handoff needs
 *  `owner/name`. Derived rather than hardcoded so a fork of this registry
 *  points its own submissions at itself.
 *
 *  Its own module so App.tsx can use it without importing lib/submit.ts,
 *  which would put the whole submit module in the entry chunk (#329). */
export function repoSlug(repoUrl: string): string {
  return repoUrl.replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
}
