import type { ReactNode } from "react";
import { DocLink } from "./DocLink";
import { rich } from "../i18n/rich";
import { useStrings, type Strings } from "../i18n/strings";
import { aboutHref, guideHref, skillHref } from "../lib/route";
import type { Skill } from "../lib/types";
import { Cluster, Grid, Stack } from "./Layout";

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
    <Stack gap="2" className="vocab">
      <h4 className="vocab__title">{field}</h4>
      <ul className="vocab__list">
        {Object.entries(map).map(([key, label]) => (
          <Cluster as="li" gap="2" align="stretch" key={key}>
            <code>{key}</code> <span>{label}</span>
          </Cluster>
        ))}
      </ul>
    </Stack>
  );
}

/** The metadata reference: a description list, because that is what it is, in
 *  which each term and its meaning are a pair 4px apart and the pairs 16px.
 *  A <div> around a dt and its dd is what HTML allows in a dl for exactly this. */
function Fields({ children }: { children: ReactNode }) {
  return <Stack as="dl" gap="4" className="fields">{children}</Stack>;
}

function Field({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <Stack gap="1">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </Stack>
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
      <Stack as="nav" gap="4" className="toc" aria-label={a.toc.label} data-testid="about-toc">
        <p className="toc__title">{a.toc.title}</p>
        <Grid gap="6" rowGap="4" min="14rem">
          {GROUPS.map((group) => (
            <Stack gap="4" className="toc__group" key={group.id}>
              <p className="toc__group-label">{a.toc.groups[group.id]}</p>
              <Stack as="ul" gap="1" className="toc__list">
                {group.sections.map((id) => (
                  <li key={id}>
                    <a href={aboutHref(id)}
                      className={id === current ? "toc__link toc__link--current" : "toc__link"}
                      aria-current={id === current ? "true" : undefined}>
                      {a.toc.sections[id]}
                    </a>
                  </li>
                ))}
              </Stack>
            </Stack>
          ))}
        </Grid>
      </Stack>

      <Stack as="section" gap="4" className="prose__block" id="what-this-is">
        <h2 className="h2">{a.whatThisIs.heading}</h2>
        <p className="lede">{a.whatThisIs.lede}</p>
        <p>{rich(a.whatThisIs.skill)}</p>
        <p>{rich(a.whatThisIs.standard, { spec: STANDARD })}</p>
      </Stack>

      <Stack as="section" gap="4" className="prose__block" id="tiers">
        <h2 className="h2">{a.tiers.heading}</h2>
        <Grid gap="4" min="17rem">
          <Stack gap="4" className="tier-card">
            <Stack gap="3">
              <h3 className="h3">{a.tiers.communityTerm}</h3>
              <p>{a.tiers.community}</p>
            </Stack>
            <p className="tier-card__warn">{rich(a.tiers.communityWarn)}</p>
          </Stack>
          <Stack gap="4" className="tier-card tier-card--reviewed">
            <Stack gap="3">
              <h3 className="h3">{a.tiers.reviewedTerm}</h3>
              <p>{a.tiers.reviewed}</p>
            </Stack>
            <p className="tier-card__warn">{rich(a.tiers.reviewedWarn)}</p>
            <p>{rich(a.tiers.pinned)}</p>
            <p>
              <a className="arrow-link" href={aboutHref("review")}
                data-testid="tier-card-review-link">
                {a.tiers.reviewLink} <span aria-hidden="true">→</span>
              </a>
            </p>
          </Stack>
        </Grid>
      </Stack>

      <Stack as="section" gap="4" className="prose__block" id="localization">
        <h2 className="h2">{a.localization.heading}</h2>
        <p>{a.localization.bound}</p>
        <Cluster as="p" gap="3" className="flow">
          <span className="flow__step">{a.localization.flow.from}</span>
          <span className="flow__arrow" aria-hidden="true">→</span>
          <span className="flow__step flow__step--mid">{a.localization.flow.via}</span>
          <span className="flow__arrow" aria-hidden="true">→</span>
          <span className="flow__step">{a.localization.flow.to}</span>
        </Cluster>
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
          <DocLink href={`${REPO}/blob/main/docs/LOCALIZATION.md`}>
            {a.localization.more}
          </DocLink>
        </p>
      </Stack>

      <Stack as="section" gap="6" className="prose__block" id="metadata">
        {/* The section is 32px between its parts (--space-subsection, gap 6);
            inside a part, 16px, and 24px (gap 5) between a list and its table. */}
        <Stack gap="4">
          <h2 className="h2">{a.metadata.heading}</h2>
          <p>{rich(a.metadata.ordinary, { spec: SPEC })}</p>
          <p>{rich(a.metadata.selfReported)}</p>
        </Stack>

        <Stack gap="4">
          <h3 className="h3">{a.metadata.purposeHeading}</h3>
          <Stack gap="5">
            <Fields>
              <Field term={<code>civic.category</code>}>{rich(a.metadata.category)}</Field>
              <Field term={<><code>civic.scope</code>, <code>civic.scope-secondary</code></>}>
                {rich(a.metadata.scope)}
              </Field>
              <Field term={<code>civic.jurisdiction</code>}>{rich(a.metadata.jurisdiction)}</Field>
              <Field term={<code>civic.localization</code>}>{rich(a.metadata.localization)}</Field>
              <Field term={<code>civic.language</code>}>{rich(a.metadata.language)}</Field>
              <Field term={<code>civic.languages-tested</code>}>
                {rich(a.metadata.languagesTested)}
              </Field>
              <Field term={<code>civic.models-tested</code>}>{rich(a.metadata.modelsTested)}</Field>
            </Fields>
            <Grid gap="4" min="16.25rem">
              <Vocabulary field="civic.category" map={s.vocabulary.category} />
              <Vocabulary field="civic.scope" map={s.vocabulary.scope} />
              <Vocabulary field="civic.localization" map={s.vocabulary.localization} />
            </Grid>
          </Stack>
        </Stack>

        <Stack gap="4">
          <Stack gap="3">
            <h3 className="h3">{a.metadata.effectHeading}</h3>
            <p>{a.metadata.effectLede}</p>
          </Stack>
          <Stack gap="5">
            <Fields>
              <Field term={<code>civic.data-sensitivity</code>}>{a.metadata.dataSensitivity}</Field>
              <Field term={<code>civic.human-review</code>}>{rich(a.metadata.humanReview)}</Field>
            </Fields>
            <Grid gap="4" min="16.25rem">
              <Vocabulary field="civic.data-sensitivity" map={s.vocabulary.sensitivity} />
              <Vocabulary field="civic.human-review" map={s.vocabulary.humanReview} />
            </Grid>
          </Stack>
        </Stack>

        <Stack gap="4">
          <h3 className="h3">{a.metadata.fitHeading}</h3>
          <Fields>
            <Field term={<code>civic.use-when</code>}>{a.metadata.useWhen}</Field>
            <Field term={<code>civic.avoid-when</code>}>{a.metadata.avoidWhen}</Field>
          </Fields>
        </Stack>

        <Stack gap="4">
          <h3 className="h3">{a.metadata.standingHeading}</h3>
          <Stack gap="5">
            <Fields>
              <Field term={<><code>civic.maintainer</code>, <code>civic.affiliation</code></>}>
                {a.metadata.maintainer}
              </Field>
              <Field term={<>
                <code>civic.deployment</code>, <code>civic.deployed-at</code>,{" "}
                <code>civic.deployed-in</code>, <code>civic.deployed-since</code>
              </>}>
                {a.metadata.deployment}
              </Field>
              <Field term={<><code>civic.source-repo</code>, <code>civic.source-commit</code></>}>
                {a.metadata.source}
              </Field>
            </Fields>
            <Grid gap="4" min="16.25rem">
              <Vocabulary field="civic.affiliation" map={s.vocabulary.affiliation} />
              <Vocabulary field="civic.deployment" map={s.vocabulary.deployment} />
            </Grid>
            <p>
              <a className="arrow-link" href={`${REPO}/blob/main/schema/skill.schema.json`}>
                {a.metadata.schema} <span aria-hidden="true">&rarr;</span>
              </a>
            </p>
          </Stack>
        </Stack>
      </Stack>

      <Stack as="section" gap="4" className="prose__block" id="submitting">
        <h2 className="h2">{a.submitting.heading}</h2>
        <p>{rich(a.submitting.lede, { submit: "#/submit" })}</p>
        <p>{rich(a.submitting.installGuide, { guide: guideHref() })}</p>
        {/* The by-hand line, the steps and the buttons are 24px apart (gap 5):
            the steps had 24px above and below them. */}
        <Stack gap="5">
          <p>{a.submitting.byHand}</p>
          <Stack as="ol" gap="5" className="steps">
            <Stack as="li" gap="3" className="steps__item">
              <h3 className="steps__title">{a.submitting.steps.namespaceTitle}</h3>
              <p className="steps__body">{rich(a.submitting.steps.namespace)}</p>
            </Stack>
            <Stack as="li" gap="3" className="steps__item">
              <h3 className="steps__title">{a.submitting.steps.frontmatterTitle}</h3>
              <p className="steps__body">{rich(a.submitting.steps.frontmatter)}</p>
            </Stack>
            <Stack as="li" gap="3" className="steps__item">
              <h3 className="steps__title">{a.submitting.steps.pullRequestTitle}</h3>
              <p className="steps__body">{a.submitting.steps.pullRequest}</p>
            </Stack>
          </Stack>
          <Cluster as="p" gap="3" className="cta-row">
            <a className="btn btn--strong" href="#/submit" data-testid="about-submit-cta">
              {a.submitting.cta}
            </a>
            <DocLink className="btn" arrow={false} testId="about-contributing"
              href={`${REPO}/blob/main/CONTRIBUTING.md`}>
              {a.submitting.guide}
            </DocLink>
          </Cluster>
        </Stack>
      </Stack>

      <Stack as="section" gap="4" className="prose__block" id="checks">
        <h2 className="h2">{a.checks.heading}</h2>
        <p>{a.checks.what}</p>
        <p>{rich(a.checks.limits)}</p>
        <p>{a.checks.reviewIsDifferent}</p>
        <p>{a.checks.threeThings}</p>
        <Stack as="ul" gap="3" className="plain-list">
          <li>{rich(a.checks.scripts)}</li>
          <li>{rich(a.checks.tools)}</li>
          <li>{a.checks.removal}</li>
        </Stack>
        <p>
          <DocLink href={`${REPO}/blob/main/docs/SECURITY.md`}>
            {a.checks.security}
          </DocLink>
        </p>
      </Stack>

      <Stack as="section" gap="4" className="prose__block" id="review">
        <h2 className="h2">{a.review.heading}</h2>
        <p>{a.review.lede}</p>
        <ol className="numbered-list">
          {a.review.questions.map((question) => (
            <li key={question}>{rich(question)}</li>
          ))}
        </ol>
        <p className="tier-card__warn">{rich(a.review.warn)}</p>
        <p>
          <DocLink href={`${REPO}/blob/main/docs/REVIEW.md`}
            testId="about-review-checklist">
            {a.review.checklist}
          </DocLink>
        </p>
      </Stack>

      <Stack as="section" gap="4" className="prose__block" id="beta">
        <h2 className="h2">{a.beta.heading}</h2>
        <p>{s.badges.beta.summary}</p>
        <p>{a.beta.scope}</p>
        <p>{a.beta.movingLede}</p>
        <Stack as="ul" gap="3" className="plain-list">
          {a.beta.moving.map((item) => <li key={item}>{rich(item)}</li>)}
        </Stack>
        <p>{a.beta.migration}</p>
      </Stack>

      <section className="prose__block" data-theme="plain-dark">
        <Stack gap="4" className="terms">
          <h2 className="h2">{a.terms.heading}</h2>
          <p>{rich(a.terms.inclusion)}</p>
          <p>{a.terms.licensing}</p>
          <p className="terms__affil">{a.terms.affiliation}</p>
        </Stack>
      </section>
    </article>
  );
}
