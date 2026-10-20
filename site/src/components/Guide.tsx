import { useEffect } from "react";
import { rich } from "../i18n/rich";
import { Cluster, Stack } from "./Layout";
import { useStrings } from "../i18n/strings";
import {
  CAPTURED_ON, CHECKED_ON, COMMANDS, GLOSSARY, GUIDE_SECTIONS, SCREENSHOTS, SECURITY,
  SHOT_SIZE, SHOTS_URL, TASKS, glossaryAnchor,
} from "../lib/guide";
import { guideHref } from "../lib/route";

/** Links a product's text may make to another section of this page. */
const LINKS = { codex: guideHref("codex"), marketplaceCodex: guideHref("marketplace-codex") };

interface ProductText {
  heading: string;
  steps?: readonly string[];
  notes?: readonly string[];
}

function ProductSection(
  { anchor, text, commands }: { anchor: string; text: ProductText; commands?: string[] },
) {
  const g = useStrings().guide;
  const shots = SCREENSHOTS[anchor];
  // The heading sits 12px over its parts, which are 16px apart.
  return (
    <Stack as="section" gap="3" id={anchor} className="guide__product">
      <h3 className="h3">{text.heading}</h3>
      <Stack gap="4">
        {text.steps && (
          <Stack as="ol" gap="2" className="guide__steps">
            {text.steps.map((step) => <li key={step}>{rich(step, LINKS)}</li>)}
          </Stack>
        )}
        {commands?.map((c) => (
          <Stack gap="2" className="download__cmd" key={c}><code>{c}</code></Stack>
        ))}
        {text.notes?.map((note) => <p key={note}>{rich(note, LINKS)}</p>)}
        {shots && (
          <Stack gap="4" className="guide__shots">
            {shots.map(({ id, file }) => (
              <Stack as="figure" gap="2" className="guide__shot" key={id}>
                <img src={`${SHOTS_URL}${file}`} alt={g.figures[id].alt} loading="lazy"
                  width={SHOT_SIZE.width} height={SHOT_SIZE.height} />
                <figcaption>{g.figures[id].caption}</figcaption>
              </Stack>
            ))}
            <p className="guide__captured">{g.captured(CAPTURED_ON)}</p>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

/** "Using the Exchange" (#224): how to get a listing into the tool you use,
 *  and the words you meet sharing one of your own. Text only; the screenshots
 *  are #260. */
export function Guide({ section }: { section?: string }) {
  const s = useStrings();
  const g = s.guide;
  const current = section && GUIDE_SECTIONS.includes(section) ? section : null;

  // App scrolls to a section too, but this page is its own chunk and arrives
  // after App has looked and missed — so a link from a listing's install box
  // would land at the top. The page scrolls once it is there.
  useEffect(() => {
    if (current) document.getElementById(current)?.scrollIntoView({ block: "start" });
  }, [current]);

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
        <Stack as="section" gap="6" className="prose__block" id={task.id} key={task.id}>
          <Stack as="header" gap="4">
            <h2 className="h2">{g[task.id].heading}</h2>
            <p>{rich(g[task.id].lede)}</p>
          </Stack>
          {task.products.map(({ id, anchor }) => {
            const text = (g[task.id].products as Record<string, ProductText>)[id];
            return text ? (
              <ProductSection key={anchor} anchor={anchor} text={text}
                commands={COMMANDS[`${task.id}.${id}`]} />
            ) : null;
          })}
        </Stack>
      ))}

      <section className="prose__block" id="safety">
        <h2 className="h2">{g.safety.heading}</h2>
        {g.safety.body.map((p) => <p key={p}>{rich(p, { security: SECURITY })}</p>)}
      </section>

      <section className="prose__block" id="share">
        <h2 className="h2">{g.share.heading}</h2>
        <p>{rich(g.share.body)}</p>
        <Cluster as="p" gap="3" align="stretch" className="cta-row">
          <a className="btn btn--strong" href="#/submit">{g.share.cta}</a>
        </Cluster>
      </section>

      <section className="prose__block" id="glossary">
        <h2 className="h2">{g.glossary.heading}</h2>
        <p>{rich(g.glossary.lede)}</p>
        <Stack as="dl" gap="4" className="guide__glossary">
          {GLOSSARY.map((word) => (
            <Stack gap="1" id={glossaryAnchor(word)} key={word}>
              <dt>{g.glossary.words[word].term}</dt>
              <dd>{rich(g.glossary.words[word].meaning)}</dd>
            </Stack>
          ))}
        </Stack>
      </section>
    </article>
  );
}
