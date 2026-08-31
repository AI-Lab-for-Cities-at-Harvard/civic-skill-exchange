const REPO = "https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

export function About() {
  return (
    <article className="prose">
      <section className="prose__block">
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

      <section className="prose__block">
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

      <section className="prose__block">
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
        <p>
          <a className="arrow-link" href={`${REPO}/blob/main/docs/LOCALIZATION.md`}>
            Read more on generalizing skills <span aria-hidden="true">→</span>
          </a>
        </p>
      </section>

      <section className="prose__block">
        <h2 className="h2">How to submit a skill</h2>
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
              Automated checks run and report back in a comment. Or use the issue
              form if you would rather not work in git.
            </p>
          </li>
        </ol>
        <p className="cta-row">
          <a className="btn btn--strong" href={`${REPO}/blob/main/CONTRIBUTING.md`}>
            Read the contributor guide
          </a>
          <a className="btn" href={`${REPO}/issues/new?template=submit-skill.yml`}>
            Submit via the form
          </a>
        </p>
      </section>

      <section className="prose__block">
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
