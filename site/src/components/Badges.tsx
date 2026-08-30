import {
  label, TIER_LABELS, LOCALIZATION_LABELS, DEPLOYMENT_LABELS, SENSITIVITY_LABELS,
} from "../lib/labels";
import type { Skill } from "../lib/types";

/** Tier is the most consequential thing on a card, so it reads as a status
 *  chip rather than brand chrome — and Community says what it means, because
 *  "Community" alone invites people to assume it was checked.
 *
 *  The Reviewed note is rendered from the attestation, never written here. It
 *  used to hardcode a reviewer count, which is the exact way a claim outlives
 *  the rule it came from: true only until the rule changed, and then false on
 *  every card at once (ADR 0001, ruling 4). A note derived from the ledger
 *  cannot drift from it. */
export function TierBadge(
  { tier, reviewed }: { tier: Skill["tier"]; reviewed?: Skill["reviewed"] },
) {
  const isReviewed = tier === "reviewed";
  const reviewers = reviewed?.reviewers ?? [];
  return (
    <span className={`badge ${isReviewed ? "badge--ok" : "badge--warn"}`}>
      {label(TIER_LABELS, tier)}
      <span className="badge__note">
        {!isReviewed ? "automated checks only"
          // No names in the ledger is a malformed attestation, not a stronger
          // claim. Say the least that is still true rather than nothing.
          : reviewers.length === 0 ? "read against the published checklist"
          : `${reviewers.join(" and ")} read this commit`}
      </span>
    </span>
  );
}

export function LocalizationBadge({ value }: { value: Skill["localization"] }) {
  if (!value) return null;
  return (
    <span className="badge badge--info" title={
      value === "generalized"
        ? "Jurisdiction specifics lifted out into a context you fill in"
        : "Carries one jurisdiction's citations, forms and deadlines"
    }>
      {label(LOCALIZATION_LABELS, value)}
    </span>
  );
}

/** `detail` names the organization; the card gives the scope alone.
 *
 *  "Used organization-wide · City of Boston, Department of Innovation and
 *  Technology" is most of a card's badge row for one self-reported claim. On a
 *  tease the scope is the part that helps someone choose; the organization is a
 *  click away, where the provenance panel gives it properly. */
export function DeploymentBadge(
  { provenance, detail = false }: { provenance: Skill["provenance"]; detail?: boolean },
) {
  const { deployment, deployed_at } = provenance;
  if (!deployment || deployment === "none") return null;
  return (
    <span
      className="badge badge--plain"
      title={deployed_at ? `${deployed_at} — self-reported by the submitter`
                         : "Self-reported by the submitter"}
    >
      {label(DEPLOYMENT_LABELS, deployment)}
      {detail && deployed_at ? ` · ${deployed_at}` : ""}
    </span>
  );
}

/** Badges the exception, not the default.
 *
 * Most skills touch no personal data, and a chip on every card saying so is
 * chrome that trains people to stop reading chips. Silence means 'none' here;
 * a badge means there is something to think about before you run it. */
export function SensitivityBadge({ value }: { value: Skill["data_sensitivity"] }) {
  if (!value || value === "none") return null;
  return (
    <span
      className={`badge ${value === "protected" ? "badge--warn" : "badge--info"}`}
      title={
        value === "protected"
          ? "Health, benefits, immigration, criminal justice, or another statutory regime"
          : "Expected to handle personally identifiable information"
      }
    >
      {label(SENSITIVITY_LABELS, value)}
    </span>
  );
}
