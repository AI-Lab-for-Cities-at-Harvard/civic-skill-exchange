import { rich } from "../i18n/rich";
import { useStrings, type Strings } from "../i18n/strings";
import { aboutHref, skillHref } from "../lib/route";
import type { Skill } from "../lib/types";

const REPO = "https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
const SPEC = "https://agentskills.io";
const STANDARD = "https://agentskills.io/specification";

type SectionId = keyof Strings["about"]["toc"]["sections"];
type GroupId = keyof Strings["about"]["toc"]["groups"];

/** The sections, in two groups (#136).
 *
 *  Eight in one flat horizontal row read as an undifferentiated set of links,
 *  and nothing said which of them were the substance and which were the
 *  caveats a reader wants *findable* rather than first. Grouped rather than
 *  railed: the design system's nearest in-page navigation is a vertical rail,
 *  but a rail would cost this page its single column and need its own collapse
 *  on a phone — more risk than the problem warrants. Grouping fixes the
 *  hierarchy and the unpredictable wrapping, which is what was wrong.
 *
 *  Ids only. They are route slugs and element ids, so they do not translate;
 *  the labels come off the table keyed by them. */
const GROUPS: { id: GroupId; sections: SectionId[] }[] = [
  {
    id: "whatThisIs",
    sections: ["what-this-is", "tiers", "localization", "metadata"],
  },
  {
    id: "whatToExpect",
    sections: ["submitting", "checks", "review", "beta"],
  },
];

/** Every section id, for anything that needs the flat list. */
const SECTION_IDS: string[] = GROUPS.flatMap((g) => g.sections);

/** The vocabulary tables, built from the same maps the facets and the form use.
 *  Written out by hand once and they would drift the first time a category is
 *  added.
 *
 *  `field` is the frontmatter key, which is an identifier and does not
 *  translate — the labels beside it do. */
function Vocabulary({ field, map }: { field: string; map: Record<string, string> }) {
  return (
    <div className="vocab">
      <h4 className="vocab__title">{field}</h4>
      <ul className="vocab__list">
        {Object.entries(map).map(([key, label]) => (
          <li key={key}><code>{key}</code> <span>{label}</span></li>
        ))}
      </ul>
    </div>
  );
}

/** Linked only when actually listed. A hardcoded link to a skill that has not
 *  been merged yet is a 404 on the page that is supposed to explain the idea. */
function skillLink(skills: Skill[], name: string) {
  const match = skills.find((s) => s.name === name);
  return match ? skillHref(match.namespace, match.name) : null;
}

export function About(
  { skills = [], section }: { skills?: Skill[]; section?: string },
) {
  const s = useStrings();
  const a = s.about;
  const generalize = skillLink(skills, "generalize-skill");
  const localize = skillLink(skills, "localize-skill");
  // parseRoute lets any slug through — it reaches getElementById and misses —
  // so an unknown one marks nothing rather than marking the first.
  const current = section && SECTION_IDS.includes(section) ? section : null;

  return (
    <article className="prose">
      <nav className="toc" aria-label={a.toc.label} data-testid="about-toc">
        <p className="toc__title">{a.toc.title}</p>
        <div className="toc__groups">
          {GROUPS.map((group) => (
            <div className="toc__group" key={group.id}>
              <p className="toc__group-label">{a.toc.groups[group.id]}</p>
              <ul className="toc__list">
                {group.sections.map((id) => (
                  <li key={id}>
                    <a href={aboutHref(id)}
                      className={id === current ? "toc__link toc__link--current" : "toc__link"}
                      aria-current={id === current ? "true" : undefined}>
                      {a.toc.sections[id]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <section className="prose__block" id="what-this-is">
        <h2 className="h2">{a.whatThisIs.heading}</h2>
        <p className="lede">{a.whatThisIs.lede}</p>
        <p>{rich(a.whatThisIs.skill)}</p>
        <p>{rich(a.whatThisIs.standard, { spec: STANDARD })}</p>
      </section>

      <section className="prose__block" id="tiers">
        <h2 className="h2">{a.tiers.heading}</h2>
        <div className="tiers">
          <div className="tier-card">
            <h3 className="h3">{a.tiers.communityTerm}</h3>
            <p>{a.tiers.community}</p>
            <p className="tier-card__warn">{rich(a.tiers.communityWarn)}</p>
          </div>
          <div className="tier-card tier-card--reviewed">
            <h3 className="h3">{a.tiers.reviewedTerm}</h3>
            <p>{a.tiers.reviewed}</p>
            <p className="tier-card__warn">{rich(a.tiers.reviewedWarn)}</p>
            <p>{rich(a.tiers.pinned)}</p>
            <p>
              <a className="arrow-link" href={aboutHref("review")}
                data-testid="tier-card-review-link">
                {a.tiers.reviewLink} <span aria-hidden="true">→</span>
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="prose__block" id="localization">
        <h2 className="h2">{a.localization.heading}</h2>
        <p>{a.localization.bound}</p>
        <p className="flow">
          <span className="flow__step">{a.localization.flow.from}</span>
          <span className="flow__arrow" aria-hidden="true">→</span>
          <span className="flow__step flow__step--mid">{a.localization.flow.via}</span>
          <span className="flow__arrow" aria-hidden="true">→</span>
          <span className="flow__step">{a.localization.flow.to}</span>
        </p>
        <p>{rich(a.localization.both)}</p>
        {(generalize || localize) && (
          <p>
            {rich(a.localization.pair(generalize !== null, localize !== null), {
              ...(generalize
                ? { generalize: { href: generalize, "data-testid": "link-generalize" } }
                : {}),
              ...(localize
                ? { localize: { href: localize, "data-testid": "link-localize" } }
                : {}),
            })}
          </p>
        )}
        <p>
          <a className="arrow-link" href={`${REPO}/blob/main/docs/LOCALIZATION.md`}>
            {a.localization.more} <span aria-hidden="true">→</span>
          </a>
        </p>
      </section>

      <section className="prose__block" id="metadata">
        <h2 className="h2">{a.metadata.heading}</h2>
        <p>{rich(a.metadata.ordinary, { spec: SPEC })}</p>
        <p>{rich(a.metadata.selfReported)}</p>

        <h3 className="h3">{a.metadata.purposeHeading}</h3>
        <dl className="fields">
          <dt><code>civic.category</code></dt>
          <dd>{rich(a.metadata.category)}</dd>
          <dt><code>civic.scope</code>, <code>civic.scope-secondary</code></dt>
          <dd>{rich(a.metadata.scope)}</dd>
          <dt><code>civic.jurisdiction</code></dt>
          <dd>{rich(a.metadata.jurisdiction)}</dd>
          <dt><code>civic.localization</code></dt>
          <dd>{rich(a.metadata.localization)}</dd>
          <dt><code>civic.language</code></dt>
          <dd>{rich(a.metadata.language)}</dd>
          <dt><code>civic.languages-tested</code></dt>
          <dd>{rich(a.metadata.languagesTested)}</dd>
        </dl>
        <div className="vocab-grid">
          <Vocabulary field="civic.category" map={s.vocabulary.category} />
          <Vocabulary field="civic.scope" map={s.vocabulary.scope} />
          <Vocabulary field="civic.localization" map={s.vocabulary.localization} />
        </div>

        <h3 className="h3">{a.metadata.effectHeading}</h3>
        <p>{a.metadata.effectLede}</p>
        <dl className="fields">
          <dt><code>civic.data-sensitivity</code></dt>
          <dd>{a.metadata.dataSensitivity}</dd>
          <dt><code>civic.human-review</code></dt>
          <dd>{rich(a.metadata.humanReview)}</dd>
        </dl>
        <div className="vocab-grid">
          <Vocabulary field="civic.data-sensitivity" map={s.vocabulary.sensitivity} />
          <Vocabulary field="civic.human-review" map={s.vocabulary.humanReview} />
        </div>

        <h3 className="h3">{a.metadata.fitHeading}</h3>
        <dl className="fields">
          <dt><code>civic.use-when</code></dt>
          <dd>{a.metadata.useWhen}</dd>
          <dt><code>civic.avoid-when</code></dt>
          <dd>{a.metadata.avoidWhen}</dd>
        </dl>

        <h3 className="h3">{a.metadata.standingHeading}</h3>
        <dl className="fields">
          <dt><code>civic.maintainer</code>, <code>civic.affiliation</code></dt>
          <dd>{a.metadata.maintainer}</dd>
          <dt>
            <code>civic.deployment</code>, <code>civic.deployed-at</code>,{" "}
            <code>civic.deployed-in</code>, <code>civic.deployed-since</code>
          </dt>
          <dd>{a.metadata.deployment}</dd>
          <dt><code>civic.source-repo</code>, <code>civic.source-commit</code></dt>
          <dd>{a.metadata.source}</dd>
        </dl>
        <div className="vocab-grid">
          <Vocabulary field="civic.affiliation" map={s.vocabulary.affiliation} />
          <Vocabulary field="civic.deployment" map={s.vocabulary.deployment} />
        </div>

        <p>
          <a className="arrow-link" href={`${REPO}/blob/main/schema/skill.schema.json`}>
            {a.metadata.schema} <span aria-hidden="true">&rarr;</span>
          </a>
        </p>
      </section>

      <section className="prose__block" id="submitting">
        <h2 className="h2">{a.submitting.heading}</h2>
        <p>{rich(a.submitting.lede, { submit: "#/submit" })}</p>
        <p>{a.submitting.byHand}</p>
        <ol className="steps">
          <li>
            <h3 className="h3">{a.submitting.steps.namespaceTitle}</h3>
            <p>{rich(a.submitting.steps.namespace)}</p>
          </li>
          <li>
            <h3 className="h3">{a.submitting.steps.frontmatterTitle}</h3>
            <p>{rich(a.submitting.steps.frontmatter)}</p>
          </li>
          <li>
            <h3 className="h3">{a.submitting.steps.pullRequestTitle}</h3>
            <p>{a.submitting.steps.pullRequest}</p>
          </li>
        </ol>
        <p className="cta-row">
          <a className="btn btn--strong" href="#/submit" data-testid="about-submit-cta">
            {a.submitting.cta}
          </a>
          <a className="btn" href={`${REPO}/blob/main/CONTRIBUTING.md`}
            data-testid="about-contributing">
            {a.submitting.guide}
          </a>
        </p>
      </section>

      <section className="prose__block" id="checks">
        <h2 className="h2">{a.checks.heading}</h2>
        <p>{a.checks.what}</p>
        <p>{rich(a.checks.limits)}</p>
        <p>{a.checks.reviewIsDifferent}</p>
        <p>{a.checks.threeThings}</p>
        <ul className="plain-list">
          <li>{rich(a.checks.scripts)}</li>
          <li>{rich(a.checks.tools)}</li>
          <li>{a.checks.removal}</li>
        </ul>
        <p>
          <a className="arrow-link" href={`${REPO}/blob/main/docs/SECURITY.md`}>
            {a.checks.security}{" "}
            <span aria-hidden="true">→</span>
          </a>
        </p>
      </section>

      <section className="prose__block" id="review">
        <h2 className="h2">{a.review.heading}</h2>
        <p>{a.review.lede}</p>
        <ol className="numbered-list">
          {a.review.questions.map((question) => (
            <li key={question}>{rich(question)}</li>
          ))}
        </ol>
        <p className="tier-card__warn">{rich(a.review.warn)}</p>
        <p>
          <a className="arrow-link" href={`${REPO}/blob/main/docs/REVIEW.md`}
            data-testid="about-review-checklist">
            {a.review.checklist}{" "}
            <span aria-hidden="true">→</span>
          </a>
        </p>
      </section>

      <section className="prose__block" id="beta">
        <h2 className="h2">{a.beta.heading}</h2>
        <p>{s.badges.beta.summary}</p>
        <p>{a.beta.scope}</p>
        <p>{a.beta.movingLede}</p>
        <ul className="plain-list">
          {a.beta.moving.map((item) => <li key={item}>{rich(item)}</li>)}
        </ul>
        <p>{a.beta.migration}</p>
      </section>

      <section className="prose__block" data-theme="plain-dark">
        <div className="terms">
          <h2 className="h2">{a.terms.heading}</h2>
          <p>{rich(a.terms.inclusion)}</p>
          <p>{a.terms.licensing}</p>
          <p className="terms__affil">{a.terms.affiliation}</p>
        </div>
      </section>
    </article>
  );
}
