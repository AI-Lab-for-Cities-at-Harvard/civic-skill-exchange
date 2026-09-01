import {
  CATEGORY_LABELS, JURISDICTION_LABELS, SENSITIVITY_LABELS,
  LOCALIZATION_LABELS, HUMAN_REVIEW_LABELS, AFFILIATION_LABELS,
  DEPLOYMENT_LABELS,
} from "../lib/labels";
import { aboutHref, skillHref } from "../lib/route";
import type { Skill } from "../lib/types";

const REPO = "https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

const SECTIONS: [string, string][] = [
  ["what-this-is", "What this is"],
  ["tiers", "Two tiers"],
  ["localization", "Generalized and localized"],
  ["metadata", "The civic metadata"],
  ["submitting", "How to submit"],
  ["checks", "What we check"],
];

/** The vocabulary tables, built from the same maps the facets and the form use.
 *  Written out by hand once and they would drift the first time a category is
 *  added. */
function Vocabulary({ title, map }: { title: string; map: Record<string, string> }) {
  return (
    <div className="vocab">
      <h4 className="vocab__title">{title}</h4>
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

export function About({ skills = [] }: { skills?: Skill[] }) {
  const generalize = skillLink(skills, "generalize-skill");
  const localize = skillLink(skills, "localize-skill");

  return (
    <article className="prose">
      <nav className="toc" aria-label="On this page" data-testid="about-toc">
        <ul className="toc__list">
          {SECTIONS.map(([id, label]) => (
            <li key={id}><a href={aboutHref(id)}>{label}</a></li>
          ))}
        </ul>
      </nav>

      <section className="prose__block" id="what-this-is">
        <h2 className="h2">What this is</h2>
        <p className="lede">
          An open catalog of agent skills for civic use — government,
          public-sector and nonprofit work.
        </p>
        <p>
          A <strong>skill</strong> is a small, portable bundle of instructions —
          and sometimes scripts — that teaches an AI coding agent how to do one
          job well: explain a permit status in plain language, check a benefits
          application against eligibility rules, turn a budget spreadsheet into a
          published open-data file.
        </p>
        <p>
          Skills follow the{" "}
          <a href="https://agentskills.io/specification">Agent Skills open standard</a>,
          so they work across tools rather than locking you into one vendor.
        </p>
      </section>

      <section className="prose__block" id="tiers">
        <h2 className="h2">Two tiers, and what they mean</h2>
        <div className="tiers">
          <div className="tier-card">
            <h3 className="h3">Community</h3>
            <p>
              The skill is well-formed and nothing mechanical is wrong with it.
              Merged once it passes structural, ownership and signature checks.
            </p>
            <p className="tier-card__warn">
              <strong>This is not an endorsement.</strong> Automated checks can
              only ever say <em>no</em> — a pass is the absence of known-bad
              signals, not the presence of safety. Read anything from this tier
              before you run it.
            </p>
          </div>
          <div className="tier-card tier-card--reviewed">
            <h3 className="h3">Reviewed</h3>
            <p>
              The AI Lab for Cities at Harvard read every line of one specific
              commit against a published checklist and put its name on it.
            </p>
            <p className="tier-card__warn">
              <strong>One reader, and it is us.</strong> Nobody outside the Lab
              has read it, and where the Lab wrote the skill as well, the
              listing says so. It is a smaller claim than two readers from
              separate organizations would be, and it is one we can actually
              make.
            </p>
            <p>
              The attestation is pinned to a <strong>content hash</strong>. If
              the skill changes, it drops back to Community automatically — so
              a compromised account cannot quietly alter something already
              carrying our review.
            </p>
          </div>
        </div>
      </section>

      <section className="prose__block" id="localization">
        <h2 className="h2">Generalized and localized</h2>
        <p>
          Most civic skills start out bound to one place. A policy skill written
          for the State of Vermont knows Vermont's statute citations, appeal
          windows and form numbers — which is what makes it useful there, and
          useless anywhere else.
        </p>
        <p className="flow">
          <span className="flow__step">Vermont policy skill</span>
          <span className="flow__arrow" aria-hidden="true">→</span>
          <span className="flow__step flow__step--mid">generalized</span>
          <span className="flow__arrow" aria-hidden="true">→</span>
          <span className="flow__step">Boston policy skill</span>
        </p>
        <p>
          A <strong>localized</strong> skill carries one jurisdiction's
          specifics. A <strong>generalized</strong> one has had them lifted out
          into a context an adopter fills in. Neither is better — but
          generalizing is what lets a solution make the trip to the second city.
        </p>
        {(generalize || localize) && (
          <p>
            The trip is not manual. Two skills in this registry do it:{" "}
            {generalize && (
              <a href={generalize} data-testid="link-generalize">generalize</a>
            )}
            {generalize && localize && ", which lifts a jurisdiction's specifics out into a context file, and "}
            {localize && (
              <a href={localize} data-testid="link-localize">localize</a>
            )}
            {localize && ", which applies a new place's context to a generalized skill"}
            {!generalize && ", listed here"}.
          </p>
        )}
        <p>
          <a className="arrow-link" href={`${REPO}/blob/main/docs/LOCALIZATION.md`}>
            Read more on generalizing skills <span aria-hidden="true">→</span>
          </a>
        </p>
      </section>

      <section className="prose__block" id="metadata">
        <h2 className="h2">The civic metadata</h2>
        <p>
          A skill here is an ordinary{" "}
          <a href="https://agentskills.io">Agent Skill</a> — the same{" "}
          <code>SKILL.md</code> that works in Claude Code, ChatGPT, Codex and
          the rest. What this registry adds is a <code>civic.*</code> block
          under <code>metadata</code>, which the specification reserves for
          exactly this.
        </p>
        <p>
          Every field below is <strong>self-reported</strong> by the author. The
          registry derives only two things itself: the tier, from the attestation
          ledger, and authorship, from the namespace. Nothing an author writes
          can move either.
        </p>

        <h3 className="h3">What it is for</h3>
        <dl className="fields">
          <dt><code>civic.category</code></dt>
          <dd>
            One of a closed list, so the catalogue can be filtered rather than
            searched. Closed on purpose: a free-text field becomes twelve
            spellings of &ldquo;permits&rdquo;.
          </dd>
          <dt><code>civic.jurisdiction</code></dt>
          <dd>What kind of place it was written for, not which one.</dd>
          <dt><code>civic.localization</code></dt>
          <dd>
            Whether the local specifics are still in it. This one changes how
            the checks read the skill: an external URL in a{" "}
            <code>localized</code> skill is the skill working, and in a{" "}
            <code>generalized</code> one it is a leftover.
          </dd>
        </dl>
        <div className="vocab-grid">
          <Vocabulary title="civic.category" map={CATEGORY_LABELS} />
          <Vocabulary title="civic.jurisdiction" map={JURISDICTION_LABELS} />
          <Vocabulary title="civic.localization" map={LOCALIZATION_LABELS} />
        </div>

        <h3 className="h3">What it might do to somebody</h3>
        <p>
          The two fields nobody can answer by reading the code, and the reason
          this registry exists rather than a folder of gists.
        </p>
        <dl className="fields">
          <dt><code>civic.data-sensitivity</code></dt>
          <dd>What the skill touches when it runs on real work.</dd>
          <dt><code>civic.human-review</code></dt>
          <dd>
            Whether its output reaches a decision about a person&rsquo;s rights or
            benefits. A skill that drafts a letter and a skill that feeds an
            eligibility determination are different propositions.
          </dd>
        </dl>
        <div className="vocab-grid">
          <Vocabulary title="civic.data-sensitivity" map={SENSITIVITY_LABELS} />
          <Vocabulary title="civic.human-review" map={HUMAN_REVIEW_LABELS} />
        </div>

        <h3 className="h3">When it fits, and when it does not</h3>
        <dl className="fields">
          <dt><code>civic.use-when</code></dt>
          <dd>The situation this is the right tool for. Plain text, never rendered as markdown.</dd>
          <dt><code>civic.avoid-when</code></dt>
          <dd>
            The higher-value half. Nobody but the author can supply it, and a
            skill honest about its limits gets adopted faster than one claiming
            none.
          </dd>
        </dl>

        <h3 className="h3">Who stands behind it</h3>
        <dl className="fields">
          <dt><code>civic.maintainer</code>, <code>civic.affiliation</code></dt>
          <dd>A person or team, and what kind of organization they are.</dd>
          <dt><code>civic.contact</code></dt>
          <dd>
            How to reach them about a problem. Deliberately{" "}
            <strong>not published</strong> in the index — it exists so a security
            report can land, not to be harvested.
          </dd>
          <dt>
            <code>civic.deployment</code>, <code>civic.deployed-at</code>,{" "}
            <code>civic.deployed-in</code>, <code>civic.deployed-since</code>
          </dt>
          <dd>Whether anyone has actually used it, and where. Self-reported, and shown as such.</dd>
          <dt><code>civic.source-repo</code>, <code>civic.source-commit</code></dt>
          <dd>
            Where an imported copy came from, stamped automatically when a skill
            is read out of a repository. The registry holds the content; these
            record its provenance.
          </dd>
        </dl>
        <div className="vocab-grid">
          <Vocabulary title="civic.affiliation" map={AFFILIATION_LABELS} />
          <Vocabulary title="civic.deployment" map={DEPLOYMENT_LABELS} />
        </div>

        <p>
          <a className="arrow-link" href={`${REPO}/blob/main/schema/skill.schema.json`}>
            The schema, which is the contract <span aria-hidden="true">&rarr;</span>
          </a>
        </p>
      </section>

      <section className="prose__block" id="submitting">
        <h2 className="h2">How to submit a skill</h2>
        <p>
          The <a href="#/submit">submission page</a> does most of this for you:
          drop in a folder or point it at a repository, and it reads what is
          already there and asks only for what it could not find. You will need
          a <strong>GitHub account</strong> &mdash; it is free, and it is what
          records the skill as yours.
        </p>
        <p>What it produces, and what you would build by hand:</p>
        <ol className="steps">
          <li>
            <h3 className="h3">Put it in your own namespace</h3>
            <p>
              <code>skills/&#123;your-github-username&#125;/&#123;skill-name&#125;/</code>{" "}
              with a <code>SKILL.md</code>, plus optional <code>scripts/</code>{" "}
              and <code>references/</code> directories.
            </p>
          </li>
          <li>
            <h3 className="h3">Fill in the frontmatter</h3>
            <p>
              The six fields of the Agent Skills spec, plus{" "}
              <code>civic.*</code> metadata: category, jurisdiction, what data it
              touches, and whether its output affects anyone's rights or
              benefits. Those last two are the questions nobody can answer from
              reading your code.
            </p>
          </li>
          <li>
            <h3 className="h3">Open a pull request</h3>
            <p>
              Automated checks run and report back in a comment. They can only
              reject &mdash; a pass is not a statement that a skill is safe.
            </p>
          </li>
        </ol>
        <p className="cta-row">
          <a className="btn btn--strong" href="#/submit" data-testid="about-submit-cta">
            Share a skill
          </a>
          <a className="btn" href={`${REPO}/blob/main/CONTRIBUTING.md`}
            data-testid="about-contributing">
            The contributor guide
          </a>
        </p>
      </section>

      <section className="prose__block" id="checks">
        <h2 className="h2">What we check, and what we don&rsquo;t</h2>
        <p>
          Every submission goes through automated checks. They confirm the skill
          is well formed, that it was submitted into its author&rsquo;s own
          folder, and they scan for a set of known problems: commands that run
          before the model has read the file, unrestricted tool access, and code
          that reaches for credentials.
        </p>
        <p>
          <strong>These checks find known problems. They cannot tell you a skill
          is safe.</strong> Scanners of this kind are well documented as
          possible to evade, so a clean result means only that nothing on the
          list matched.
        </p>
        <p>
          A review is a different thing. Someone reads the whole skill and
          checks that what it does matches what it says it does. That is the
          question no scanner can answer, and it is why the Reviewed tier
          exists.
        </p>
        <p>Three things to know before you run any skill, from anywhere:</p>
        <ul className="plain-list">
          <li>
            Skills can include scripts your agent <em>runs</em>, not only text
            it reads.
          </li>
          <li>
            The <code>allowed-tools</code> field gives a skill access to tools
            without asking you first.
          </li>
          <li>
            Removing a skill from this catalog does not remove it from anyone
            who already downloaded it.
          </li>
        </ul>
        <p>
          <a className="arrow-link" href={`${REPO}/blob/main/docs/SECURITY.md`}>
            Security model and how to report a problem{" "}
            <span aria-hidden="true">→</span>
          </a>
        </p>
      </section>

      <section className="prose__block" data-theme="plain-dark">
        <div className="terms">
          <h2 className="h2">Terms</h2>
          <p>
            Inclusion in this registry does not constitute endorsement,
            verification, or any guarantee regarding a skill's quality,
            functionality, security, or fitness for any purpose. Skills in the
            Reviewed tier have been read by the AI Lab for Cities at Harvard
            against a published checklist; that is a statement about a specific
            commit, not a warranty, and not an independent assessment.{" "}
            <strong>You are responsible for what you run.</strong>
          </p>
          <p>
            Registry infrastructure is MIT licensed. Each skill carries its own
            license in its frontmatter and remains the property of its authors —
            check that field before you use one.
          </p>
          <p className="terms__affil">
            A project affiliated with the AI Lab for Cities at Harvard. Not an
            official publication, and not endorsed by any institution.
          </p>
        </div>
      </section>
    </article>
  );
}
