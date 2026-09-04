import {
  TierBadge, LabBadge, LocalizationBadge, DeploymentBadge, SensitivityBadge,
} from "./Badges";
import { categoriesOf } from "../lib/filter";
import { label, CATEGORY_LABELS, JURISDICTION_LABELS } from "../lib/labels";
import { skillHref } from "../lib/route";
import type { Skill } from "../lib/types";

/** A tease, not a summary.
 *
 * It used to carry a four-row table — category, jurisdiction, data, tools — on
 * every card, which at ten skills is forty rows of small grey text competing
 * with the titles for a reader who is still deciding what to open. What stays
 * is what helps someone choose: who vouched for it, what it is called, what it
 * does, and roughly where it belongs.
 *
 * `allowed-tools` deliberately moved to the detail page. It is the most
 * security-relevant field, which is exactly why it belongs beside the warning
 * that the grant applies without prompting — not stranded on a card as four
 * words of monospace.
 */
export function SkillCard({ skill }: { skill: Skill }) {
  const href = skillHref(skill.namespace, skill.name);

  return (
    <article className="card">
      <div className="card__badges">
        <TierBadge tier={skill.tier} reviewed={skill.reviewed} />
        <LabBadge namespace={skill.namespace} />
        <SensitivityBadge value={skill.data_sensitivity} />
        <LocalizationBadge value={skill.localization} />
        <DeploymentBadge provenance={skill.provenance} />
      </div>

      <h2 className="card__title">
        <a href={href}>{skill.name}</a>
      </h2>
      <p className="card__ns">{skill.namespace}</p>
      <p className="card__desc">{skill.description}</p>

      <p className="card__meta" data-testid="card-meta">
        <span>{categoriesOf(skill).map((c) => label(CATEGORY_LABELS, c)).join(" · ")}</span>
        <span className="card__dot" aria-hidden="true">·</span>
        <span>{label(JURISDICTION_LABELS, skill.jurisdiction)}</span>
      </p>

      <p className="card__cta">
        <a className="arrow-link" href={href} data-testid="card-cta">
          View this skill <span aria-hidden="true">&rarr;</span>
        </a>
      </p>
    </article>
  );
}
