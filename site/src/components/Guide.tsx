import { rich } from "../i18n/rich";
import { useStrings } from "../i18n/strings";
import {
  CHECKED_ON, COMMANDS, GLOSSARY, GUIDE_SECTIONS, SECURITY, TASKS, glossaryAnchor,
} from "../lib/guide";
import { guideHref } from "../lib/route";

/** Links a product's text may make to another section of this page. */
const LINKS = { codex: guideHref("codex") };

interface ProductText {
  heading: string;
  steps?: readonly string[];
  notes?: readonly string[];
}

function ProductSection(
  { anchor, text, commands }: { anchor: string; text: ProductText; commands?: string[] },
) {
  return (
    <section id={anchor} className="guide__product">
      <h3 className="h3">{text.heading}</h3>
      {text.steps && (
        <ol className="guide__steps">
          {text.steps.map((step) => <li key={step}>{rich(step, LINKS)}</li>)}
        </ol>
      )}
      {commands?.map((c) => (
        <div className="download__cmd" key={c}><code>{c}</code></div>
      ))}
      {text.notes?.map((note) => <p key={note}>{rich(note, LINKS)}</p>)}
    </section>
  );
}

/** "Using the Exchange" (#224): how to get a listing into the tool you use,
 *  and the words you meet sharing one of your own. Text only; the screenshots
 *  are #260. */
export function Guide({ section }: { section?: string }) {
  const s = useStrings();
  const g = s.guide;
  const current = section && GUIDE_SECTIONS.includes(section) ? section : null;

  return (
    <article className="prose">
      <h2 className="h2">{g.heading}</h2>
      <p className="lede">{rich(g.lede)}</p>
      <p className="guide__checked">{g.checked(CHECKED_ON)}</p>

      <nav className="toc" aria-label={g.contents}>
        <p className="toc__title">{g.contents}</p>
        <ul className="toc__list">
          {(["install", "marketplace", "safety", "share", "glossary"] as const).map((id) => (
            <li key={id}>
              <a href={guideHref(id)}
                className={id === current ? "toc__link toc__link--current" : "toc__link"}
                aria-current={id === current ? "true" : undefined}>
                {g[id].heading}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {TASKS.map((task) => (
        <section className="prose__block" id={task.id} key={task.id}>
          <h2 className="h2">{g[task.id].heading}</h2>
          <p>{rich(g[task.id].lede)}</p>
          {task.products.map(({ id, anchor }) => {
            const text = (g[task.id].products as Record<string, ProductText>)[id];
            return text ? (
              <ProductSection key={anchor} anchor={anchor} text={text}
                commands={COMMANDS[`${task.id}.${id}`]} />
            ) : null;
          })}
        </section>
      ))}

      <section className="prose__block" id="safety">
        <h2 className="h2">{g.safety.heading}</h2>
        {g.safety.body.map((p) => <p key={p}>{rich(p, { security: SECURITY })}</p>)}
      </section>

      <section className="prose__block" id="share">
        <h2 className="h2">{g.share.heading}</h2>
        <p>{rich(g.share.body)}</p>
        <p className="cta-row">
          <a className="btn btn--strong" href="#/submit">{g.share.cta}</a>
        </p>
      </section>

      <section className="prose__block" id="glossary">
        <h2 className="h2">{g.glossary.heading}</h2>
        <p>{rich(g.glossary.lede)}</p>
        <dl className="guide__glossary">
          {GLOSSARY.map((word) => (
            <div id={glossaryAnchor(word)} key={word}>
              <dt>{g.glossary.words[word].term}</dt>
              <dd>{rich(g.glossary.words[word].meaning)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
