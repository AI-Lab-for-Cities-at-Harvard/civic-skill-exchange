/** What the submission page says about the draft it is keeping (#294): that it
 *  saves, that it restored, what it could not keep, and the way to start over.
 *
 *  Shown only once there is a draft, so a visitor who has typed nothing sees
 *  the page exactly as before.
 */

import { useStrings } from "../i18n/strings";

export function DraftBar(
  { restored, notKept, unsaved, onStartOver }: {
    restored: boolean;
    /** Files the draft could not hold, named so none vanishes quietly. */
    notKept: string[];
    /** Storage refused the last save. */
    unsaved: boolean;
    onStartOver: () => void;
  },
) {
  const d = useStrings().submit.draft;
  return (
    <div className="submit__draft" data-testid="draft-bar">
      {restored && (
        <p className="submit__ok" role="status" data-testid="draft-restored">{d.restored}</p>
      )}
      {restored && notKept.length > 0 && (
        <div data-testid="draft-not-kept">
          <p className="submit__note">{d.notKept}</p>
          <ul className="submit__findings">
            {notKept.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}
      {unsaved ? (
        <p className="submit__warn" role="status" data-testid="draft-unsaved">{d.unsaved}</p>
      ) : (
        <p className="submit__note">{d.saved}</p>
      )}
      <p className="cta-row">
        <button type="button" className="btn" onClick={onStartOver} data-testid="start-over">
          {d.startOver}
        </button>
      </p>
    </div>
  );
}

/** A plugin draft is waiting, and the folder it was about is not here. Said on
 *  the skill page, where the person lands, because the plugin form itself only
 *  exists once the folder is dropped in again. */
export function PluginPending(
  { name, onStartOver }: { name: string; onStartOver: () => void },
) {
  const d = useStrings().submit.draft;
  return (
    <div className="submit__draft" data-testid="draft-plugin-pending">
      <p className="submit__note">{d.pluginPending(name)}</p>
      <p className="cta-row">
        <button type="button" className="btn" onClick={onStartOver}
          data-testid="start-over-plugin">
          {d.startOver}
        </button>
      </p>
    </div>
  );
}
