/** When a skill arrived, when it last changed, and the version its author
 *  claims (#77).
 *
 *  Two kinds of statement, shown differently on purpose. The dates and the
 *  count are **derived from git** and stated flatly. The version is the
 *  **author's claim** and is labelled as one — the footing `provenance` already
 *  sits on with "Self-reported by the submitter".
 *
 *  Neither may read as a quality signal. Thirty commits means churn, not care,
 *  and a skill touched once may be finished rather than abandoned, so the count
 *  says outright that it is not a measure. Nothing here orders the catalogue and
 *  nothing here reaches tier.
 */

import type { Skill } from "../lib/types";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

/** Month and year. A precise timestamp invites reading a week's difference as
 *  meaningful, which it is not. */
function when(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US",
    { month: "long", year: "numeric", timeZone: "UTC" });
}

export function History(
  { history, version }: { history: Skill["history"]; version: Skill["version"] },
) {
  const known = history.first_seen || history.last_changed || history.commits;
  if (!known && !version) return null;

  return (
    <section className="facts" aria-labelledby="history-heading">
      <h2 className="h3" id="history-heading">Version and history</h2>
      <dl>
        {version && (
          <div>
            <dt>Version</dt>
            <dd>
              <span className="mono">{version}</span>{" "}
              <span className="facts__aside">
                — the author&rsquo;s own number for it. Self-reported, and not
                checked against anything.
              </span>
            </dd>
          </div>
        )}
        {history.first_seen && (
          <div>
            <dt>Listed since</dt>
            <dd>
              {when(history.first_seen)}
              {history.pull_request && (
                <>
                  {" · "}
                  <a href={`https://github.com/${REPO}/pull/${history.pull_request}`}>
                    #{history.pull_request}
                  </a>
                </>
              )}
            </dd>
          </div>
        )}
        {history.last_changed && (
          <div>
            <dt>Last changed</dt>
            <dd>{when(history.last_changed)}</dd>
          </div>
        )}
        {history.commits !== null && (
          <div>
            <dt>Times changed</dt>
            <dd>
              {history.commits}{" "}
              <span className="facts__aside">
                — a count, not a measure. It says nothing about whether the
                skill is well maintained: one change may mean finished.
              </span>
            </dd>
          </div>
        )}
      </dl>
      <p className="facts__note">
        Dates come from this repository&rsquo;s own history, for this path. A
        skill moved between namespaces starts again here, so an early date is
        reliable and a recent one may just mean it was renamed.
      </p>
    </section>
  );
}
