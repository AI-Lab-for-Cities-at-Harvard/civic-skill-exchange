import { useEffect, useMemo, useState } from "react";
import {
  checkFrontmatter, checkStructureCore, RESERVED_NAMESPACES,
  type Finding, type Entry,
} from "@civic-skill-exchange/validator";
import {
  EMPTY_DRAFT, toFields, toFrontmatter, toYaml, newFileUrl, editUrl, mailtoUrl,
  forkUrl, forkUploadUrl, registryUploadUrl, pullRequestUrl, parseForkRef,
  fitsInUrl, skillPath, namespacePath, slugify, type Draft,
} from "../lib/submit";
import { patchSkillMd, addedFrontmatterLines } from "../lib/patch";
import { buildSkillZip } from "../lib/folder";
import { readSkillZip } from "../lib/zip";
import { draftFromSkillMd } from "../lib/parse";
import { checkGitHubUser, type UserCheck } from "../lib/github";
import { importFromRepo, failureMessages, type ImportResult } from "../lib/import";
import { rich } from "../i18n/rich";
import { useStrings, type Strings } from "../i18n/strings";
import { en } from "../i18n/en";
import { submitHref, type SubmitMode } from "../lib/route";
import type { Skill } from "../lib/types";

/** Where a maintainer reads submissions from people without a GitHub account.
 *
 *  Empty on purpose, and the path renders nothing while it is. The project has
 *  no dedicated inbox yet, and a personal address on a public page is a
 *  scraping target that cannot be taken back once published. Set this one
 *  string to switch the path on; mailtoUrl and its tests are already in place.
 */
export const SUBMISSIONS_EMAIL = "";

/** The canonical value list, which does not vary by locale — so it is read off
 *  the English table rather than the current one. */
const CATEGORIES = Object.keys(en.vocabulary.category);

const OFFERED_LANGUAGES = new Set(
  en.submit.form.languageChoices.map(([value]) => value),
);

type FieldNames = Strings["submit"]["form"]["fieldNames"];

/** Findings are written for a reviewer reading a diff, and name the raw key.
 *  Swapped for the question the submitter actually answered. */
function readable(finding: Finding, names: FieldNames): string {
  const name = names[finding.where as keyof FieldNames];
  return name ? finding.message.replaceAll(finding.where, name) : finding.message;
}

function Field(
  { label, hint, id, findings, children }: {
    label: string; hint?: React.ReactNode; id: string; findings: Finding[];
    children: React.ReactNode;
  },
) {
  const names = useStrings().submit.form.fieldNames;
  const mine = findings.filter((f) => f.where === id);
  return (
    <div className={`field${mine.length ? " field--flagged" : ""}`}>
      <label className="field__label" htmlFor={id}>{label}</label>
      {hint && <p className="field__hint">{hint}</p>}
      {children}
      {mine.map((f) => (
        <p className="field__finding" key={f.message}>{readable(f, names)}</p>
      ))}
    </div>
  );
}

function Choice(
  { id, label, hint, value, options, findings, onChange, placeholder }: {
    id: string; label: string; hint?: React.ReactNode; value: string;
    options: [string, string][]; findings: Finding[];
    onChange: (v: string) => void; placeholder?: string;
  },
) {
  return (
    <Field id={id} label={label} hint={hint} findings={findings}>
      <select id={id} className="select" value={value}
        onChange={(e) => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Field>
  );
}

export function Submit(
  { repo, skills, mode, add }: {
    repo: string; skills: Skill[]; mode: SubmitMode; add?: string;
  },
) {
  const s = useStrings();
  const t = s.submit;
  const f = t.form;
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  // What was typed, kept beside the slug it becomes. Rewriting the box under
  // the cursor would eat a hyphen the moment it is typed, so the conversion is
  // shown rather than imposed.
  const [typedName, setTypedName] = useState("");
  const [pasted, setPasted] = useState("");
  const [archive, setArchive] = useState<{
    name: string; files: number; structural: Finding[]; left: string[];
  } | null>(null);
  // What the submitter actually brought. The hand-off amends this file rather
  // than building a replacement out of the form, which is the whole of #70 —
  // a rebuilt file carries no body, and the form knows nothing of scripts/.
  const [source, setSource] = useState<
    { skillMd: string; entries: Entry[]; directoryName: string } | null
  >(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [userCheck, setUserCheck] = useState<UserCheck>("unknown");
  const [repoUrl, setRepoUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [copied, setCopied] = useState(false);
  // Asked for, never derived. #81: the page guessed this and was wrong two ways
  // — the owner is not the namespace for a reserved one, and the name is
  // whatever the submitter typed into GitHub's fork dialog.
  const [forkInput, setForkInput] = useState("");
  // Whether the language question is being answered with a typed tag. Kept as
  // state rather than derived, because "other" chosen with nothing typed yet
  // looks exactly like "nothing chosen" in the draft.
  const [otherLanguage, setOtherLanguage] = useState(false);

  // A pasted or imported SKILL.md may already carry a tag the select does not
  // offer, so the box reveals itself rather than the value disappearing.
  const languageIsOther = otherLanguage ||
    (draft.language !== "" && !OFFERED_LANGUAGES.has(draft.language));

  const set = (key: keyof Draft) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const onInput = (key: keyof Draft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key)(e.target.value);

  const onLanguage = (value: string) => {
    setOtherLanguage(value === "other");
    setDraft((d) => ({ ...d, language: value === "other" ? "" : value }));
  };

  // A reserved namespace is not a person, and checkFrontmatter skips the
  // ownership check for it — CODEOWNERS gates the folder to the maintainers
  // team instead, which is a stronger control than a username match. So the
  // lookup would 404 on a name that is entirely correct.
  const reserved = RESERVED_NAMESPACES.has(draft.author.trim().toLowerCase());

  // Debounced, and aborted when the value moves on. The rate limit is 60 an
  // hour per address, so a request per keystroke would exhaust it inside one
  // username.
  useEffect(() => {
    const login = draft.author.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (!login || RESERVED_NAMESPACES.has(login.toLowerCase())) {
        setUserCheck("unknown");
        return;
      }
      checkGitHubUser(login, controller.signal).then(setUserCheck);
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [draft.author]);

  const front = useMemo(() => toFrontmatter(draft), [draft]);
  const yaml = useMemo(() => toYaml(front), [front]);

  // Reported, never a gate. rules.ts is explicit that CI is the authority; the
  // page runs the same module so a problem surfaces before the pull request.
  const findings = useMemo(
    () => checkFrontmatter(front, {
      categories: CATEGORIES,
      namespace: draft.author.trim() || undefined,
      author: draft.author.trim() || undefined,
    }),
    [front, draft.author],
  );

  // The form's answers written into the submitter's own file. Falls back to the
  // generated block only when there is no file to amend — someone starting from
  // nothing — or when the file could not be read.
  const patched = useMemo(
    () => (source ? patchSkillMd(source.skillMd, toFields(draft)) : null),
    [source, draft],
  );
  const fileText = patched && patched.problems.length === 0 ? patched.skillMd : yaml;

  // A link can carry one new file. It cannot carry a folder, and GitHub offers
  // no equivalent of `value=` for an upload — so a skill of more than one file
  // goes the long way round rather than arriving with its scripts missing.
  const multiFile = (source?.entries.length ?? 0) > 1;
  const folderName = draft.name.trim() || source?.directoryName || "skill";

  // A reserved namespace is not a person. Its submitter has write access —
  // CODEOWNERS gates the folder — so forking is both unnecessary and impossible
  // to follow, because the fork the page would point at does not exist.
  const forkRef = parseForkRef(forkInput);
  const uploadHref = reserved
    ? registryUploadUrl(repo, draft)
    : forkUploadUrl(forkInput, draft);
  const prHref = reserved ? null : pullRequestUrl(repo, forkInput);

  // What the download is for, shown rather than asserted (#82).
  const added = useMemo(
    () => (source && patched && patched.problems.length === 0
      ? addedFrontmatterLines(source.skillMd, patched.skillMd) : []),
    [source, patched],
  );

  const url = useMemo(
    () => newFileUrl(repo, draft, fileText), [repo, draft, fileText],
  );
  const urlFits = useMemo(() => fitsInUrl(url), [url]);
  const ready = draft.author.trim() !== "" && draft.name.trim() !== "";

  // The one thing that blocks. A path escape, a symlink, a blocked file type or
  // a size cap cannot be fixed by editing a field, and handing off would open a
  // pull request that fails CI for something already shown here.
  const blocked = (archive?.structural.length ?? 0) > 0;

  const load = (
    text: string,
    problems: string[] = [],
    archive?: { entries: Entry[]; directoryName: string },
  ) => {
    const { draft: parsed, problems: readProblems } = draftFromSkillMd(text, draft.author);
    if (readProblems.length === 0) {
      setDraft({ ...parsed, name: slugify(parsed.name) });
      setTypedName(parsed.name);
    }
    setNotes([...problems, ...readProblems]);
    setSource(text.trim() === "" ? null : {
      skillMd: text,
      // A pasted file is a skill of one file, which is a real answer and not a
      // degenerate case — it takes the prefilled editor, body and all.
      entries: archive?.entries
        ?? [{ path: "SKILL.md", kind: "file", bytes: new TextEncoder().encode(text) }],
      directoryName: archive?.directoryName ?? "",
    });
  };

  const onImport = async () => {
    setImporting(true);
    setImported(null);
    const out = await importFromRepo(repoUrl);
    setImporting(false);
    if ("kind" in out) {
      setArchive(null);
      setNotes([failureMessages()[out.kind]]);
      return;
    }
    setImported(out);
    setArchive({
      name: `${out.ref.owner}/${out.ref.repo}`,
      files: out.entries.length,
      // Left out is not the same as wrong. Repository furniture and oversized
      // files are named so nothing vanishes quietly, but only real structural
      // findings stop the hand-off.
      left: out.skipped,
      structural: checkStructureCore(out.entries),
    });
    setSource({
      skillMd: out.skillMd, entries: out.entries, directoryName: out.ref.repo,
    });
    // Fill from the file, then stamp on where this copy came from and the
    // commit it was taken at.
    const { draft: parsed, problems } = draftFromSkillMd(out.skillMd, out.ref.owner);
    if (problems.length === 0) {
      setDraft({
        ...parsed,
        name: slugify(parsed.name),
        sourceRepo: `${out.ref.owner}/${out.ref.repo}`,
        sourceCommit: out.commit,
      });
      setTypedName(parsed.name);
    }
    setNotes(problems);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const read = readSkillZip(new Uint8Array(await file.arrayBuffer()));
      setArchive({
        name: file.name, files: read.entries.length,
        left: read.problems,
        structural: checkStructureCore(read.entries),
      });
      if (read.skillMd) {
        load(read.skillMd, [], {
          entries: read.entries,
          directoryName: read.directoryName ?? "",
        });
      }
    } catch {
      setSource(null);
      setArchive({
        name: file.name, files: 0,
        left: [],
        structural: [{ where: file.name, message: t.problems.notAZip }],
      });
    }
  };

  /** Hands the skill back as a folder, corrected. Built from the entries that
   *  were validated, so what the submitter uploads is what the page checked. */
  const download = () => {
    if (!source) return;
    const zip = buildSkillZip(source.entries, folderName, fileText);
    const href = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
    const a = document.createElement("a");
    a.href = href;
    a.download = `${folderName}.zip`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* blocked clipboard — the text is on screen and selectable */
    }
  };

  const listed = skills.find((sk) => `${sk.namespace}/${sk.name}` === add);
  const missingFit = skills.filter((sk) => !sk.use_when && !sk.avoid_when);

  // Offered only when it will survive the trip. A mail client that truncates a
  // long body does it silently, and the submitter would never know what was
  // lost.
  const mailto = useMemo(() => {
    if (!SUBMISSIONS_EMAIL) return null;
    const link = mailtoUrl(SUBMISSIONS_EMAIL, draft, yaml);
    return fitsInUrl(link) ? link : null;
  }, [draft, yaml]);

  return (
    <article className="prose submit">
      <section className="prose__block">
        <h2 className="h2">{t.heading}</h2>
        <p className="lede">{t.lede}</p>

        {/* Before the form, not after it. Every path this page offers ends on
            GitHub, and somebody could otherwise fill in twenty fields before
            finding that out. */}
        <p className="submit__prereq" data-testid="account-needed">
          {rich(t.prereq, {
            signup: {
              href: "https://github.com/signup",
              "data-testid": "account-signup",
              target: "_blank",
              rel: "noreferrer",
            },
          })}
        </p>

        {/* Links rather than scripted tabs. Each mode is a real URL, so it can
            be sent to someone, bookmarked, and reached with the back button —
            and a skill page linking straight to the update mode needs no extra
            machinery. */}
        <nav className="modes" aria-label={t.modes.label}>
          <a
            className="modes__item" href={submitHref("new")}
            aria-current={mode === "new" ? "page" : undefined}
            data-testid="mode-new"
          >
            {t.modes.new}
          </a>
          <a
            className="modes__item" href={submitHref("update")}
            aria-current={mode === "update" ? "page" : undefined}
            data-testid="mode-update"
          >
            {t.modes.update}
          </a>
        </nav>

        {mode === "new" && (
          <p className="submit__warn">{t.communityWarn}</p>
        )}
      </section>

      {mode === "new" && (
        <>
        {/* Upload and paste first, because most people arrive with a skill
            already written and should not retype it. */}
        <section className="prose__block">
          <h2 className="h2">{t.intake.heading}</h2>
          <p>{rich(t.intake.lede)}</p>

          <Field
            id="repo" label={t.intake.repoLabel} findings={[]}
            hint={t.intake.repoHint}
          >
            <span className="submit__row">
              <input
                id="repo" className="input" value={repoUrl}
                placeholder={t.intake.repoPlaceholder}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <button
                className="btn" onClick={onImport}
                disabled={importing || repoUrl.trim() === ""}
                data-testid="import"
              >
                {importing ? t.intake.reading : t.intake.read}
              </button>
            </span>
          </Field>

          {imported && (
            <p className="submit__ok" data-testid="imported">
              {rich(t.intake.imported(
                imported.entries.length,
                `${imported.ref.owner}/${imported.ref.repo}`,
                imported.commit.slice(0, 7),
              ))}
            </p>
          )}

          <Field id="archive" label={t.intake.archiveLabel} findings={[]} hint={t.intake.archiveHint}>
            <input
              id="archive" type="file" accept=".zip,application/zip" className="input"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </Field>

          <Field id="paste" label={t.intake.pasteLabel} findings={[]}>
            <textarea
              id="paste" className="textarea" rows={5} value={pasted}
              placeholder={"---\nname: my-skill\n..."}
              onChange={(e) => { setPasted(e.target.value); load(e.target.value); }}
            />
          </Field>

          {notes.length > 0 && (
            <ul className="submit__findings" data-testid="parse-notes">
              {notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}

          {archive && (
            <div className="submit__archive" data-testid="archive-result">
              <p>{rich(t.intake.archiveResult(archive.name, archive.files))}</p>
              {archive.left.length > 0 && (
                /* Left out is not the same as wrong. Named so nothing vanishes
                   quietly, but these do not stop the hand-off. */
                <ul className="submit__findings" data-testid="left-out">
                  {archive.left.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}
              {archive.structural.length === 0 ? (
                <p className="submit__ok">{t.intake.nothingElse}</p>
              ) : (
                <ul className="submit__findings">
                  {archive.structural.map((finding) => (
                    <li key={`${finding.where}${finding.message}`}>
                      <code>{finding.where}</code> {finding.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {blocked && (
            <p className="submit__blocked" data-testid="blocked">{t.intake.blocked}</p>
          )}
        </section>

        <section className="prose__block">
          <h2 className="h2">{f.heading}</h2>

          {patched && patched.problems.length === 0 && patched.present.length > 0 && (
            /* Answered already, by the file. Shown rather than hidden, because a
               description read out of somebody's repository is exactly the thing
               they may want to improve before it is listed. */
            <p className="submit__ok" data-testid="from-file">
              {f.fromFile(patched.present
                .filter((k) => k !== "metadata")
                .map((k) => f.fieldNames[k as keyof FieldNames] ?? k)
                .join(", "))}
            </p>
          )}

          <Field
            id="namespace" label={f.namespaceLabel} findings={findings} hint={f.namespaceHint}
          >
            <input id="namespace" className="input" value={draft.author}
              onChange={onInput("author")} autoComplete="off" />
            {reserved ? (
              <p className="field__hint" data-testid="reserved-namespace">
                {rich(f.reservedNamespace(draft.author.trim()))}
              </p>
            ) : userCheck === "missing" && draft.author.trim() !== "" && (
              <p className="field__finding" data-testid="no-such-user">
                {f.noSuchUser(draft.author.trim())}
              </p>
            )}
          </Field>

          <Field
            id="name" label={f.nameLabel} findings={findings}
            hint={
              draft.name && draft.name !== typedName.trim()
                ? rich(f.nameSlug(draft.name))
                : f.nameHint
            }
          >
            <input
              id="name" className="input" value={typedName}
              placeholder={f.namePlaceholder}
              onChange={(e) => {
                setTypedName(e.target.value);
                set("name")(slugify(e.target.value));
              }}
            />
          </Field>

          <Field id="description" label={f.descriptionLabel} findings={findings} hint={f.descriptionHint}>
            <textarea id="description" className="textarea" rows={3}
              value={draft.description} onChange={onInput("description")} />
          </Field>

          <Choice id="civic.category" label={f.categoryLabel} value={draft.category}
            findings={findings} placeholder={f.choose}
            onChange={set("category")}
            options={CATEGORIES.map((c) => [c, s.vocabulary.category[
              c as keyof typeof s.vocabulary.category] ?? c])} />

          <Choice id="civic.category-secondary" label={f.categorySecondaryLabel}
            value={draft.categorySecondary} findings={findings}
            placeholder={f.categorySecondaryNone}
            onChange={set("categorySecondary")}
            options={CATEGORIES.filter((c) => c !== draft.category)
              .map((c) => [c, s.vocabulary.category[
                c as keyof typeof s.vocabulary.category]!] as [string, string])}
            hint={rich(f.categorySecondaryHint)} />

          <Field id="version" label={f.versionLabel} findings={findings} hint={rich(f.versionHint)}>
            <input id="version" className="input" value={draft.version}
              onChange={onInput("version")} placeholder={f.versionPlaceholder} />
          </Field>

          <Choice id="civic.scope" label={f.scopeLabel}
            value={draft.scope} findings={findings}
            placeholder={f.choose} onChange={set("scope")} options={f.scopeChoices} />

          <Choice id="civic.scope-secondary" label={f.scopeSecondaryLabel}
            value={draft.scopeSecondary} findings={findings}
            placeholder={f.scopeSecondaryNone}
            onChange={set("scopeSecondary")}
            options={f.scopeChoices.filter(
              ([v]) => v !== draft.scope && v !== "any" && draft.scope !== "any")} />

          <Field id="civic.jurisdiction" label={f.jurisdictionLabel}
            findings={findings} hint={rich(f.jurisdictionHint)}>
            <input id="civic.jurisdiction" className="input" value={draft.jurisdiction}
              onChange={onInput("jurisdiction")}
              placeholder={f.jurisdictionPlaceholder} />
          </Field>

          <Choice
            id="civic.localization"
            label={f.localizationLabel}
            value={draft.localization} findings={findings}
            onChange={set("localization")}
            options={f.localizationChoices}
            placeholder={f.localizationNone}
            hint={rich(f.localizationHint, { about: "#/about" })}
          />

          <Choice
            id="civic.language"
            label={f.languageLabel}
            value={languageIsOther ? "other" : draft.language}
            findings={findings} placeholder={f.choose}
            onChange={onLanguage}
            options={f.languageChoices}
            hint={rich(f.languageHint)}
          />

          {languageIsOther && (
            <Field id="civic.language-other" label={f.languageOtherLabel}
              findings={[]} hint={rich(f.languageOtherHint)}>
              <input id="civic.language-other" className="input"
                value={draft.language} onChange={onInput("language")}
                placeholder={f.languageOtherPlaceholder} />
            </Field>
          )}

          <Choice id="civic.data-sensitivity"
            label={s.questions["civic.data-sensitivity"].question}
            value={draft.dataSensitivity} findings={findings}
            onChange={set("dataSensitivity")}
            options={s.questions["civic.data-sensitivity"].options} />

          <Choice id="civic.human-review"
            label={s.questions["civic.human-review"].question}
            value={draft.humanReview} findings={findings}
            onChange={set("humanReview")}
            options={s.questions["civic.human-review"].options} />

          <Choice id="civic.deployment" label={f.deploymentLabel}
            value={draft.deployment} findings={findings}
            onChange={set("deployment")} options={f.deploymentChoices}
            hint={
              draft.deployment === "team" || draft.deployment === "organization"
                ? f.deploymentHintClaim
                : f.deploymentHintPersonal
            } />

          <Field id="civic.maintainer" label={f.maintainerLabel} findings={findings} hint={f.maintainerHint}>
            <input id="civic.maintainer" className="input" value={draft.maintainer}
              onChange={onInput("maintainer")} />
          </Field>

          <Choice id="civic.affiliation" label={f.affiliationLabel}
            value={draft.affiliation} findings={findings}
            placeholder={f.choose}
            onChange={set("affiliation")} options={f.affiliationChoices} />
        </section>

        <section className="prose__block">
          <details className="disclosure">
            <summary className="h2 disclosure__summary">{t.optional.summary}</summary>

            <Field id="civic.use-when" label={t.optional.useWhenLabel}
              findings={findings}>
              <textarea id="civic.use-when" className="textarea" rows={2}
                value={draft.useWhen} onChange={onInput("useWhen")} />
            </Field>

            <Field id="civic.avoid-when" label={t.optional.avoidWhenLabel}
              findings={findings} hint={t.optional.avoidWhenHint}>
              <textarea id="civic.avoid-when" className="textarea" rows={2}
                value={draft.avoidWhen} onChange={onInput("avoidWhen")} />
            </Field>

            <Field id="civic.languages-tested"
              label={t.optional.languagesTestedLabel} findings={findings} hint={rich(t.optional.languagesTestedHint)}>
              <input id="civic.languages-tested" className="input"
                value={draft.languagesTested}
                onChange={onInput("languagesTested")}
                placeholder={t.optional.languagesTestedPlaceholder} />
            </Field>

            <Field id="allowed-tools" label={t.optional.toolsLabel} findings={findings} hint={t.optional.toolsHint}>
              <input id="allowed-tools" className="input" value={draft.tools}
                onChange={onInput("tools")} placeholder={t.optional.toolsPlaceholder} />
            </Field>

            <Field id="license" label={t.optional.licenseLabel} findings={findings}>
              <input id="license" className="input" value={draft.license}
                onChange={onInput("license")} />
            </Field>

            <Field
              id="civic.deployed-at" label={t.optional.deployedAtLabel}
              findings={findings}
              hint={draft.deployment === "personal"
                ? t.optional.deployedAtHint
                : undefined}
            >
              <input id="civic.deployed-at" className="input" value={draft.deployedAt}
                onChange={onInput("deployedAt")} />
            </Field>

            <Field id="civic.deployed-in" label={t.optional.deployedInLabel}
              findings={findings} hint={t.optional.deployedInHint}>
              <input id="civic.deployed-in" className="input" value={draft.deployedIn}
                onChange={onInput("deployedIn")}
                placeholder={t.optional.deployedInPlaceholder} />
            </Field>

            <Field id="civic.deployed-since" label={t.optional.deployedSinceLabel}
              findings={findings}>
              <input id="civic.deployed-since" className="input" value={draft.deployedSince}
                onChange={onInput("deployedSince")}
                placeholder={t.optional.deployedSincePlaceholder} />
            </Field>
          </details>
        </section>

        <section className="prose__block">
          <h2 className="h2">{t.send.heading}</h2>
          {added.length > 0 && (
            /* What the page wrote into the submitter's own file, on every path.
               #82: asserting that the download matters did not stop somebody
               uploading their original folder instead and losing all of it. */
            <details className="disclosure" data-testid="added">
              <summary className="disclosure__summary">
                {t.send.addedSummary(added.length)}
              </summary>
              <p className="submit__note">{t.send.addedNote}</p>
              <pre className="submit__yaml" data-testid="added-lines"><code>{
                added.map((l) => `+ ${l}`).join("\n")
              }</code></pre>
            </details>
          )}

          {findings.length > 0 && (
            <p className="submit__note" data-testid="findings-note">
              {t.send.findingsNote(findings.length)}
            </p>
          )}

          {multiFile ? (
            /* Four steps, because a folder cannot be put in a link. Each one is
               a real URL the submitter can open, and the page never asks them to
               type a path. */
            <>
              <p className="submit__note" data-testid="multi-file-note">
                {t.send.multiFileNote(source?.entries.length ?? 0)}
              </p>
              <ol className="steps" data-testid="manual-steps">
                <li className="steps__item">
                  <h3 className="steps__title">{t.send.folderTitle}</h3>
                  <p className="steps__body">{rich(t.send.folderBody)}</p>
                  <button
                    className="btn btn--strong" onClick={download}
                    disabled={!ready || blocked} data-testid="download-folder"
                  >
                    {t.send.downloadFolder(folderName)}
                  </button>
                </li>

                {!reserved && (
                  <li className="steps__item">
                    <h3 className="steps__title">{t.send.forkTitle}</h3>
                    <p className="steps__body">{t.send.forkBody}</p>
                    <p className="cta-row">
                      <a className="btn" href={forkUrl(repo)} data-testid="step-fork"
                        target="_blank" rel="noreferrer">{t.send.forkCta}</a>
                    </p>
                    <Field
                      id="fork" label={t.send.forkLabel} findings={[]} hint={t.send.forkHint}
                    >
                      <input
                        id="fork" className="input" value={forkInput}
                        placeholder={t.send.forkPlaceholder}
                        onChange={(e) => setForkInput(e.target.value)}
                      />
                      {forkInput.trim() !== "" && !forkRef && (
                        <p className="field__finding" data-testid="fork-unparsed">
                          {rich(t.send.forkUnparsed)}
                        </p>
                      )}
                    </Field>
                  </li>
                )}

                <li className="steps__item">
                  <h3 className="steps__title">{t.send.uploadTitle}</h3>
                  <p className="steps__body" data-testid="upload-step-body">
                    {rich(t.send.uploadBody(
                      folderName, reserved, namespacePath(draft), skillPath(draft),
                    ))}
                  </p>
                  {uploadHref ? (
                    <a className="btn" href={uploadHref}
                      data-testid="step-upload" target="_blank" rel="noreferrer">
                      {t.send.uploadCta}
                    </a>
                  ) : (
                    <p className="submit__note" data-testid="upload-waiting">
                      {t.send.uploadWaiting}
                    </p>
                  )}
                </li>

                {!reserved && (
                  <li className="steps__item">
                    <h3 className="steps__title">{t.send.pullRequestTitle}</h3>
                    <p className="steps__body">{t.send.pullRequestBody}</p>
                    {prHref && (
                      <a className="btn" href={prHref}
                        data-testid="step-pr" target="_blank" rel="noreferrer">
                        {t.send.pullRequestCta}
                      </a>
                    )}
                  </li>
                )}
              </ol>
            </>
          ) : (
            <p className="cta-row">
              {urlFits ? (
                <a
                  className={`btn btn--strong${!ready || blocked ? " btn--disabled" : ""}`}
                  href={ready && !blocked ? url : undefined}
                  aria-disabled={!ready || blocked}
                  data-testid="handoff"
                >
                  {t.send.handoff}
                </a>
              ) : (
                <span className="submit__note" data-testid="url-too-long">
                  {t.send.urlTooLong}
                </span>
              )}
              <button className="btn" onClick={copy}>
                {copied ? t.send.copied : t.send.copy}
              </button>
            </p>
          )}

          {mailto ? (
            <p className="submit__note">
              {rich(t.send.emailHandoff, {
                email: { href: mailto, "data-testid": "email-handoff" },
              })}
            </p>
          ) : SUBMISSIONS_EMAIL ? (
            <p className="submit__note" data-testid="email-too-long">
              {rich(t.send.emailTooLong(SUBMISSIONS_EMAIL), {
                email: `mailto:${SUBMISSIONS_EMAIL}`,
              })}
            </p>
          ) : (
            /* No inbox yet, so this cannot say "email it to us" — and going
               quiet instead would leave somebody who will not make an account
               with no idea whether that is a dead end. It is, for now, and
               saying so beats letting them find out. */
            <p className="submit__note" data-testid="no-account-path">
              {rich(t.send.noAccountPath, {
                issues: `https://github.com/${repo}/issues`,
              })}
            </p>
          )}

          <details className="disclosure">
            <summary className="disclosure__summary">{t.send.seeYaml}</summary>
            <pre className="submit__yaml" data-testid="yaml"><code>{fileText}</code></pre>
          </details>

          <details className="disclosure">
            <summary className="disclosure__summary">{t.send.commandLine}</summary>
            <pre className="submit__yaml"><code>{
  `git clone https://github.com/${repo}.git
  mkdir -p ${skillPath(draft)}
  git checkout -b add-${draft.name || "your-skill"}
  git commit -am "Add ${skillPath(draft)}"
  git push origin add-${draft.name || "your-skill"}`}</code></pre>
          </details>
        </section>
        </>
      )}

      {mode === "update" && (
      <section className="prose__block" data-testid="flow-two">
        <h2 className="h2">{t.update.heading}</h2>
        <p>{t.update.lede}</p>
        {skills.length === 0 && (
          <p className="submit__note" data-testid="nothing-listed">
            {t.update.nothingListed}
          </p>
        )}
        <label className="field__label" htmlFor="add">{t.update.pick}</label>
        <select
          id="add" className="select" value={add ?? ""}
          onChange={(e) => { window.location.hash = e.target.value
            ? `#/submit?add=${encodeURIComponent(e.target.value)}` : "#/submit"; }}
        >
          <option value="">{t.update.choose}</option>
          {(missingFit.length ? missingFit : skills).map((sk) => (
            <option key={sk.id} value={sk.id}>{sk.id}</option>
          ))}
        </select>
        {listed && (
          <div className="submit__handoff" data-testid="edit-handoff">
            <p className="field__hint">{rich(t.update.pasteHint)}</p>
            <pre className="submit__yaml"><code>{
`  civic.use-when: "When this skill earns its place."
  civic.avoid-when: "When it does not."`}</code></pre>
            <a className="btn btn--strong" href={editUrl(repo, listed.path)}>
              {t.update.editCta(listed.id)}
            </a>
          </div>
        )}

        <p className="submit__note">
          {rich(t.update.notFinding, { new: submitHref("new") })}
        </p>
      </section>
      )}
    </article>
  );
}
