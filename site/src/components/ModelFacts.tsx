import { Stack } from "./Layout";
import { useStrings } from "../i18n/strings";
import type { Tier } from "../lib/types";

/** Which AI models a listing was tested with (#267), for the "At a glance" box
 *  on a skill or plugin page. Two lines, never merged: the author's own claim,
 *  and the reviewer's verified list, which is shown only on a Reviewed listing
 *  — the same split, and the same belt-and-braces tier check, as the language
 *  lines (ADR 0004). */
export function ModelFacts({ modelsTested, verifiedModels, tier, reviewers }: {
  modelsTested: string[] | null | undefined;
  verifiedModels: string[] | null | undefined;
  tier: Tier;
  /** Already formatted, as the language line formats them. */
  reviewers: string;
}) {
  const f = useStrings().detail.facts;
  return (
    <>
      {modelsTested && modelsTested.length > 0 && (
        <Stack gap="1" data-testid="models-tested">
          <dt>{f.modelsTested}</dt>
          <dd>
            {modelsTested.join(", ")}
            <span className="facts__note">{" "}{f.modelsTestedNote}</span>
          </dd>
        </Stack>
      )}
      {tier === "reviewed" && verifiedModels && verifiedModels.length > 0 && (
        <Stack gap="1" data-testid="verified-models">
          <dt>{f.verifiedModels}</dt>
          <dd>
            {verifiedModels.join(", ")}
            <span className="facts__note">{" "}{f.verifiedModelsNote(reviewers)}</span>
          </dd>
        </Stack>
      )}
    </>
  );
}
