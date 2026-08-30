import { label, TIER_LABELS, LOCALIZATION_LABELS, DEPLOYMENT_LABELS } from "../lib/labels";
import type { Skill } from "../lib/types";

/** Tier is the most consequential thing on a card, so it reads as a status
 *  chip rather than brand chrome — and Community says what it means, because
 *  "Community" alone invites people to assume it was checked. */
export function TierBadge({ tier }: { tier: Skill["tier"] }) {
  const reviewed = tier === "reviewed";
  return (
    <span className={`badge ${reviewed ? "badge--ok" : "badge--warn"}`}>
      {label(TIER_LABELS, tier)}
      <span className="badge__note">
        {reviewed ? "two reviewers signed off" : "automated checks only"}
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

export function DeploymentBadge({ provenance }: { provenance: Skill["provenance"] }) {
  const { deployment, deployed_at } = provenance;
  if (!deployment || deployment === "none") return null;
  return (
    <span className="badge badge--plain" title="Self-reported by the submitter">
      {label(DEPLOYMENT_LABELS, deployment)}
      {deployed_at ? ` · ${deployed_at}` : ""}
    </span>
  );
}
