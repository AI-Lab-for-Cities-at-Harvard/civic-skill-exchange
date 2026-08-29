import { TierBadge, LocalizationBadge, DeploymentBadge } from "./Badges";
import { label, CATEGORY_LABELS, JURISDICTION_LABELS, SENSITIVITY_LABELS } from "../lib/labels";
import type { Skill } from "../lib/types";

export function SkillCard({ skill }: { skill: Skill }) {
  return (
    <article className="card">
      <div className="card__badges">
        <TierBadge tier={skill.tier} />
        <LocalizationBadge value={skill.localization} />
        <DeploymentBadge provenance={skill.provenance} />
      </div>

      <h2 className="card__title">
        <a href={skill.download}>{skill.name}</a>
      </h2>
      <p className="card__ns">{skill.namespace}</p>
      <p className="card__desc">{skill.description}</p>

      <dl className="card__meta">
        <div><dt>Category</dt><dd>{label(CATEGORY_LABELS, skill.category)}</dd></div>
        <div><dt>Jurisdiction</dt><dd>{label(JURISDICTION_LABELS, skill.jurisdiction)}</dd></div>
        <div><dt>Data</dt><dd>{label(SENSITIVITY_LABELS, skill.data_sensitivity)}</dd></div>
        <div>
          <dt>Tools</dt>
          <dd className="mono">{skill.allowed_tools.join(", ") || "none declared"}</dd>
        </div>
      </dl>

      {skill.tier === "community" && (
        <p className="card__disclaimer">
          Passed automated checks. Nobody reviewed it — read the skill and its
          scripts before you run it.
        </p>
      )}
    </article>
  );
}
