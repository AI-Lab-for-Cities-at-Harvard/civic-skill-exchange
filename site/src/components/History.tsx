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

import { useStrings } from "../i18n/strings";
import type { Skill } from "../lib/types";

const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

export function History(
  { history, version }: { history: Skill["history"]; version: Skill["version"] },
) {
  const s = useStrings().history;
  const known = history.first_seen || history.last_changed || history.commits;
  if (!known && !version) return null;

  return (
    <section className="facts" aria-labelledby="history-heading">
      <h2 className="h3" id="history-heading">{s.heading}</h2>
      <dl>
        {version && (
          <div>
            <dt>{s.version}</dt>
            <dd>
              <span className="mono">{version}</span>{" "}
              <span className="facts__aside">{s.versionAside}</span>
            </dd>
          </div>
        )}
        {history.first_seen && (
          <div>
            <dt>{s.firstSeen}</dt>
            <dd>
              {s.when(history.first_seen)}
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
            <dt>{s.lastChanged}</dt>
            <dd>{s.when(history.last_changed)}</dd>
          </div>
        )}
        {history.commits !== null && (
          <div>
            <dt>{s.commits}</dt>
            <dd>
              {history.commits}{" "}
              <span className="facts__aside">{s.commitsAside}</span>
            </dd>
          </div>
        )}
      </dl>
      <p className="facts__note">{s.note}</p>
    </section>
  );
}
