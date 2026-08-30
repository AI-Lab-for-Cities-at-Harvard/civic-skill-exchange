import { RESERVED_NAMESPACES } from "@civic-skill-exchange/validator";
import {
  label, TIER_LABELS, LOCALIZATION_LABELS, DEPLOYMENT_LABELS, SENSITIVITY_LABELS,
} from "../lib/labels";
import type { Skill } from "../lib/types";

/** Who wrote it, when we did (#51, ADR 0001 ruling 2).
 *
 *  Derived from the reserved namespace the validator already enforces, so a Lab
 *  skill discloses itself without an author setting a field and without the site
 *  keeping its own list of what counts as ours.
 *
 *  It says authorship and stops. The tier badge next to it renders the review
 *  claim from the ledger, and on a Lab skill in the Reviewed tier both chips
 *  name the Lab while meaning different things — who wrote it, who read it. That
 *  pairing is the whole reason the disclosure exists, and it only works while
 *  each chip owns exactly one of the two facts. A word about review in here
 *  would be a second, unpinned copy of a claim the ledger already owns.
 *
 *  Crimson rather than a status colour, and deliberately so. The status palette
 *  is kept off the brand accent because a tier chip must not read as brand
 *  chrome; this one is brand chrome — it is the Lab's name on the listing. It
 *  follows the crimson band's rule and looks the same in either theme. */
export function LabBadge({ namespace }: { namespace: Skill["namespace"] }) {
  if (!RESERVED_NAMESPACES.has(namespace.toLowerCase())) return null;
  return <span className="badge badge--lab">Written by the AI Lab</span>;
}

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
  { tier, reviewed, namespace }: {
    tier: Skill["tier"];
    reviewed?: Skill["reviewed"];
    namespace?: Skill["namespace"];
  },
) {
  const isReviewed = tier === "reviewed";
  const reviewers = reviewed?.reviewers ?? [];

  // Owner's ruling on #51: a Lab-authored listing does not carry the Community
  // chip, which read as redundant on a registry the Lab runs.
  //
  // It narrows a warning rather than removing a duplicate, so it is worth being
  // exact about what is left. "Community" says nobody reviewed the skill, and
  // that stays true of a Lab skill — writing something is not reviewing it, and
  // a Lab skill clears the same automated checks as anyone else's, no more.
  // What remains is DownloadBox, which says it in full at the point of
  // download. The card says nothing.
  //
  // Reviewed is untouched. There the two chips make different claims — who
  // wrote it, who read it — and dropping either would lose a fact.
  const labAuthored = !!namespace && RESERVED_NAMESPACES.has(namespace.toLowerCase());
  if (!isReviewed && labAuthored) return null;
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
