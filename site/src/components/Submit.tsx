import { Suspense, lazy, useMemo, useRef, useState } from "react";
import type { Finding, Entry } from "@civic-skill-exchange/validator";
import { checkFrontmatter, RESERVED_NAMESPACES } from "@civic-skill-exchange/validator/rules";
import { SKILL_LAYOUT, checkStructureCore } from "@civic-skill-exchange/validator/structure-core";
import {
  EMPTY_DRAFT, toFields, toFrontmatter, toYaml, newFileUrl, editUrl, mailtoUrl,
  fitsInUrl, recipe, recipeInput, slugify, type Draft,
  hasNamespace, usableFork, folderReady,
} from "../lib/submit";
import { patchSkillMd, addedFrontmatterLines } from "../lib/patch";
import { buildSkillZip } from "../lib/folder";
import { readSkillZip } from "../lib/zip";
import { draftFromSkillMd } from "../lib/parse";
import { useUserCheck } from "../lib/useUserCheck";
import { isGitHubLogin } from "../lib/login";
import { importFromRepo, failureMessages, type ImportResult } from "../lib/import";
import {
  draftKey, readDraft, clearDraft, onlyStrings, asString, isRecord,
} from "../lib/draftStore";
import { useDraftSaver } from "../lib/useDraftSaver";
import { DraftBar, PluginPending } from "./DraftBar";
import { rich } from "../i18n/rich";
import { useStrings } from "../i18n/strings";
import { AttemptedProvider, Choice, Field, type FieldNames } from "./Field";
import { waits } from "../lib/plain";
import { LicenseField } from "./LicenseField";
import { UploadSteps } from "./UploadSteps";
import { Stack } from "./Layout";
import { AfterHandoff } from "./AfterHandoff";
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

/** The plugin form, loaded only when a plugin arrives (#213). The entry chunk
 *  is held to a size budget, and most visitors never bring one. */
const PluginSubmit = lazy(() =>
  import("./PluginSubmit").then((m) => ({ default: m.PluginSubmit })));

/** The canonical value list, which does not vary by locale — so it is read off
 *  the English table rather than the current one. */
const CATEGORIES = Object.keys(en.vocabulary.category);

const OFFERED_LANGUAGES = new Set(
  en.submit.form.languageChoices.map(([value]) => value),
);

/** Pasted text longer than this is not kept: a SKILL.md is a few kilobytes, and
 *  a paste past this size is more likely a mistake than a skill. Named on
 *  restore instead, so it is asked for again rather than lost quietly. */
export const MAX_KEPT_PASTE = 50_000;

/** What the skill route saved, read back as the shapes the page holds. Every
 *  value is checked, because a draft is data from a place this page does not
 *  control: an older version of itself, or another tab. */
function restoreSkill() {
  const saved = readDraft(draftKey({ route: "skill" }));
  const data = saved?.data ?? {};
  const kept = data.upload;
  const upload = isRecord(kept) && (kept.kind === "zip" || kept.kind === "repo")
    && typeof kept.name === "string"
    ? { kind: kept.kind as "zip" | "repo", name: kept.name } : null;
  return {
    restored: saved !== null,
    draft: onlyStrings(EMPTY_DRAFT, data.draft),
    typedName: asString(data.typedName),
    pasted: asString(data.pasted),
    forkInput: asString(data.forkInput),
    repoUrl: asString(data.repoUrl),
    otherLanguage: data.otherLanguage === true,
    upload,
    pasteTooLong: data.pasteTooLong === true,
  };
}

const isBlank = (d: Draft) =>
  (Object.keys(EMPTY_DRAFT) as (keyof Draft)[]).every((k) => d[k] === EMPTY_DRAFT[k]);

export function Submit(
  { repo, skills, mode, add }: {
    repo: string; skills: Skill[]; mode: SubmitMode; add?: string;
  },
) {
  const s = useStrings();
  const t = s.submit;
  const f = t.form;
  // Answers kept in this browser through the trip to GitHub and back (#294).
  const [restore] = useState(restoreSkill);
  const [draft, setDraft] = useState<Draft>(restore.draft);
  // What was typed, kept beside the slug it becomes. Rewriting the box under
  // the cursor would eat a hyphen the moment it is typed, so the conversion is
  // shown rather than imposed.
  const [typedName, setTypedName] = useState(restore.typedName);
  const [pasted, setPasted] = useState(restore.pasted);
  const [archive, setArchive] = useState<{
    name: string; files: number; structural: Finding[]; left: string[];
  } | null>(null);
  // What the submitter actually brought. The hand-off amends this file rather
  // than building a replacement out of the form, which is the whole of #70 —
  // a rebuilt file carries no body, and the form knows nothing of scripts/.
  const [source, setSource] = useState<
    { skillMd: string; entries: Entry[]; directoryName: string } | null
  >(() => restore.pasted.trim() === "" ? null : {
    // Pasted text was typed, and small, so it comes back whole. An uploaded
    // folder does not (see `gaps`), and the page asks for it again.
    skillMd: restore.pasted,
    entries: [{
      path: "SKILL.md", kind: "file", bytes: new TextEncoder().encode(restore.pasted),
    }],
    directoryName: "",
  });
  const [notes, setNotes] = useState<string[]>([]);
  // A folder with plugin.json at its root switches the page by itself (#213,
  // ruling 1), and so does a Claude Code export, which the plugin form
  // rearranges first (#246). Keyed by arrival, so a second plugin starts a
  // fresh form.
  const [plugin, setPlugin] = useState<{
    entries: Entry[]; directoryName: string; left: string[]; claudeCode: boolean; key: number;
  } | null>(null);
  const enterPlugin = (
    entries: Entry[], directoryName: string, left: string[], claudeCode = false,
  ) => {
    setPluginSaved(null);
    setArchive(null);
    setSource(null);
    setNotes([]);
    setPlugin((prev) => ({
      entries, directoryName, left, claudeCode, key: (prev?.key ?? 0) + 1,
    }));
  };
  const [repoUrl, setRepoUrl] = useState(restore.repoUrl);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Set by trying the hand-off, which is when every box that is wrong should
  // say so (#302, S-13). Until then a box speaks once it has been visited.
  const [attempted, setAttempted] = useState(false);
  // Asked for, never derived. #81: the page guessed this and was wrong two ways
  // — the owner is not the namespace for a reserved one, and the name is
  // whatever the submitter typed into GitHub's fork dialog.
  const [forkInput, setForkInput] = useState(restore.forkInput);
  // Whether the language question is being answered with a typed tag. Kept as
  // state rather than derived, because "other" chosen with nothing typed yet
  // looks exactly like "nothing chosen" in the draft.
  const [otherLanguage, setOtherLanguage] = useState(restore.otherLanguage);

  // The draft: saved as it is typed, restored when the page comes back, and
  // cleared by Start over (#294).
  const [restoredNow, setRestoredNow] = useState(restore.restored);
  // What the last visit had that browser storage cannot hold. Named on restore
  // until the submitter brings it back.
  const [gaps, setGaps] = useState(
    { upload: restore.upload, pasteTooLong: restore.pasteTooLong });
  // Answers carried over to the next file read, so choosing the zip again does
  // not replace what was restored with what the file says.
  const carried = useRef<Draft | null>(restore.upload ? restore.draft : null);
  const [inputKey, setInputKey] = useState(0);
  const [pluginSaved, setPluginSaved] =
    useState(() => readDraft(draftKey({ route: "plugin" })));
  const SKILL_KEY = draftKey({ route: "skill" });
  const pasteTooLong = pasted.length > MAX_KEPT_PASTE;
  const toKeep = useMemo(() => ({
    draft, typedName, forkInput, repoUrl, otherLanguage,
    pasted: pasteTooLong ? "" : pasted,
    pasteTooLong: pasteTooLong || (gaps.pasteTooLong && pasted === ""),
    upload: archive
      ? { kind: imported ? "repo" as const : "zip" as const, name: archive.name }
      : gaps.upload,
  }), [draft, typedName, forkInput, repoUrl, otherLanguage, pasted, pasteTooLong, gaps,
    archive, imported]);
  const blankForm = isBlank(draft) && typedName === "" && pasted === "" && forkInput === ""
    && repoUrl === "" && !otherLanguage && !archive && !gaps.upload;
  const { failed: cannotSave } = useDraftSaver(SKILL_KEY, toKeep, {
    blank: blankForm, enabled: mode === "new",
  });
  const missing = [
    !archive && gaps.upload && (gaps.upload.kind === "repo"
      ? t.draft.repoNotKept(gaps.upload.name) : t.draft.zipNotKept(gaps.upload.name)),
    gaps.pasteTooLong && pasted === "" && t.draft.pasteNotKept,
  ].filter((m): m is string => typeof m === "string");

  const startOver = () => {
    clearDraft(SKILL_KEY);
    carried.current = null;
    setDraft(EMPTY_DRAFT); setTypedName(""); setPasted(""); setForkInput("");
    setRepoUrl(""); setOtherLanguage(false); setArchive(null); setSource(null);
    setNotes([]); setImported(null);
    setGaps({ upload: null, pasteTooLong: false });
    setRestoredNow(false);
    setInputKey((n) => n + 1);
  };
  const startOverPlugin = () => {
    clearDraft(draftKey({ route: "plugin" }));
    setPluginSaved(null);
  };

  /** A freshly read file's answers, with what was restored laid over them. */
  const carry = (parsed: Draft): Draft => {
    const kept = carried.current;
    carried.current = null;
    if (!kept) return parsed;
    const merged = { ...parsed };
    for (const k of Object.keys(EMPTY_DRAFT) as (keyof Draft)[]) {
      if (kept[k].trim() !== "") merged[k] = kept[k];
    }
    return merged;
  };

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

  const userCheck = useUserCheck(draft.author);
  // No username, no path: the hand-off, the download and the recipe all name
  // `skills/{namespace}/…`, and wait for it rather than render `skills//` (S-2).
  const named = hasNamespace(draft);

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
  const badLogin = draft.author.trim() !== "" && !isGitHubLogin(draft.author.trim());
  const ready = folderReady(draft);

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
      const merged = carry(parsed);
      setDraft({ ...merged, name: slugify(merged.name) });
      if (merged.name === parsed.name) setTypedName(parsed.name);
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
    setPlugin(null);
    const out = await importFromRepo(repoUrl);
    setImporting(false);
    if ("kind" in out) {
      setArchive(null);
      setNotes([failureMessages()[out.kind]]);
      return;
    }
    setImported(out);
    if (out.plugin || out.clientPackage) {
      enterPlugin(out.entries, out.directoryName, out.skipped, out.clientPackage);
      return;
    }
    setArchive({
      name: `${out.ref.owner}/${out.ref.repo}`,
      files: out.entries.length,
      // Left out is not the same as wrong. Repository furniture and oversized
      // files are named so nothing vanishes quietly, but only real structural
      // findings stop the hand-off.
      left: out.skipped,
      // The folder lands in skills/{name}/ of a listing (ADR 0006), so it
      // gets the rules CI applies there: SKILL_LAYOUT.
      structural: checkStructureCore(out.entries, SKILL_LAYOUT),
    });
    setSource({
      skillMd: out.skillMd, entries: out.entries, directoryName: out.directoryName,
    });
    // Fill from the file, then stamp on where this copy came from and the
    // commit it was taken at. The username stays whatever the submitter typed:
    // the repository's owner is who wrote the skill, not who is submitting it,
    // and an organization's name filled in here was flagged by this very page
    // (S-6, #293).
    const { draft: parsed, problems } = draftFromSkillMd(out.skillMd);
    if (problems.length === 0) {
      // Restored answers are laid over the file once (#294); the username is
      // the submitter's, never the repository owner's (#293, S-6).
      const merged = carry(parsed);
      setDraft((d) => ({
        ...merged,
        author: d.author || merged.author,
        name: slugify(merged.name),
        sourceRepo: `${out.ref.owner}/${out.ref.repo}`,
        sourceCommit: out.commit,
      }));
      if (merged.name === parsed.name) setTypedName(parsed.name);
    }
    setNotes(problems);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setImported(null);
    setPlugin(null);
    try {
      const read = readSkillZip(new Uint8Array(await file.arrayBuffer()));
      if (read.plugin || read.clientPackage) {
        enterPlugin(read.entries, read.directoryName ?? "", read.problems, read.clientPackage);
        return;
      }
      setArchive({
        name: file.name, files: read.entries.length,
        left: read.problems,
        structural: checkStructureCore(read.entries, SKILL_LAYOUT),
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

  // Asked where the claim is made. A team or an organization named as the user
  // owes the exchange the organization's name, and a required question inside a
  // closed "optional" section is one nobody can find (#295, S-3). For anyone
  // else it stays optional, in the section that says so.
  const owesOrganization =
    draft.deployment === "team" || draft.deployment === "organization";
  const deployedAt = (
    <Field
      id="civic.deployed-at" label={t.optional.deployedAtLabel}
      findings={findings}
      hint={draft.deployment === "personal" ? t.optional.deployedAtHint : undefined}
    >
      <input id="civic.deployed-at" className="input" value={draft.deployedAt}
        onChange={onInput("deployedAt")} />
    </Field>
  );

  return (
    <AttemptedProvider value={attempted}>
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
        {!plugin && pluginSaved && (
          <PluginPending name={asString(pluginSaved.data.directoryName)}
            onStartOver={startOverPlugin} />
        )}
        {!plugin && (restoredNow || !blankForm) && (
          <DraftBar restored={restoredNow} notKept={missing}
            unsaved={cannotSave} onStartOver={startOver} />
        )}

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
                imported.ref.path,
                imported.ref.branch,
              ))}
            </p>
          )}

          <Field id="archive" label={t.intake.archiveLabel} findings={[]} hint={t.intake.archiveHint}>
            {/* A zip dropped here is read as if it had been chosen. A folder
                cannot be: a drop hands over a directory entry, not bytes, and
                the zip reader is the only one the page has. */}
            <Stack
              gap="2" className="dropzone" data-testid="dropzone"
              data-over={dragging ? "true" : undefined}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                onFile(e.dataTransfer?.files?.[0]);
              }}
            >
              <p>{t.intake.dropHint}</p>
              <input
                key={inputKey}
                id="archive" type="file" accept=".zip,.plugin,application/zip" className="input"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </Stack>
          </Field>

          <Field id="paste" label={t.intake.pasteLabel} findings={[]}>
            <textarea
              id="paste" className="textarea" rows={5} value={pasted}
              placeholder={"---\nname: my-skill\n..."}
              onChange={(e) => {
                setPasted(e.target.value);
                setPlugin(null);
                load(e.target.value);
              }}
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
              {archive.structural.length > 0 && (
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

        {plugin ? (
          <Suspense fallback={null}>
            <PluginSubmit key={plugin.key} repo={repo} entries={plugin.entries}
              directoryName={plugin.directoryName} left={plugin.left}
              claudeCode={plugin.claudeCode} />
          </Suspense>
        ) : (
        <>

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
            ) : badLogin ? (
              <p className="field__finding" data-testid="bad-login">
                {rich(f.badLogin(draft.author.trim()))}
              </p>
            ) : userCheck === "missing" ? (
              <p className="field__finding" data-testid="no-such-user">
                {f.noSuchUser(draft.author.trim())}
              </p>
            ) : userCheck === "unavailable" && (
              <p className="field__hint" data-testid="user-unchecked">
                {f.userUnchecked(draft.author.trim())}
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

          <LicenseField id="license" value={draft.license} findings={findings}
            onChange={set("license")} />

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

          {owesOrganization && deployedAt}

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
            <summary className="h3 disclosure__summary">{t.optional.summary}</summary>

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

            <Field id="civic.models-tested"
              label={t.optional.modelsTestedLabel} findings={findings} hint={t.optional.modelsTestedHint}>
              <input id="civic.models-tested" className="input"
                value={draft.modelsTested}
                onChange={onInput("modelsTested")}
                placeholder={t.optional.modelsTestedPlaceholder} />
            </Field>

            <Field id="allowed-tools" label={t.optional.toolsLabel} findings={findings} hint={t.optional.toolsHint}>
              <input id="allowed-tools" className="input" value={draft.tools}
                onChange={onInput("tools")} placeholder={t.optional.toolsPlaceholder} />
            </Field>

            {!owesOrganization && deployedAt}

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

          {/* One line, whichever of three is true. It was a count here and
              "Nothing else to fix" up in the archive result at once (S-9). */}
          <p className={blocked || findings.length > 0 ? "submit__note" : "submit__ok"}
            data-testid="status">
            {blocked ? t.send.statusBlocked
              : findings.length === 0 ? t.send.allClear
              // Empty required boxes are quiet until visited or the hand-off
              // is tried (#302), so "marked above" would point at nothing.
              : !attempted && findings.some(waits)
                ? t.send.statusWaiting(findings.filter(waits).length)
              : t.send.findingsNote(findings.length)}
            {!blocked && !attempted && findings.some(waits) && (
              <>{" "}
                <button className="btn btn--subtle" onClick={() => setAttempted(true)}>
                  {t.send.showMissing}
                </button>
              </>
            )}
          </p>

          {multiFile ? (
            /* Four steps, because a folder cannot be put in a link. Each one is
               a real URL the submitter can open, and the page never asks them to
               type a path. */
            <>
              <p className="submit__note" data-testid="multi-file-note">
                {t.send.multiFileNote(source?.entries.length ?? 0)}
              </p>
              {!ready && !blocked && (
                <p className="submit__note" data-testid="download-why">{t.send.downloadWhy}</p>
              )}
              <UploadSteps
                repo={repo} reserved={reserved} tree="skills"
                draft={draft} folderName={folderName}
                folderBody={t.send.folderBody}
                forkInput={forkInput} onForkInput={setForkInput}
                onDownload={download} canDownload={ready && !blocked}
                review={{
                  kind: "skill", namespace: draft.author, name: draft.name,
                  update: skills.some((sk) => sk.namespace === draft.author.trim().toLowerCase()
                    && sk.name === draft.name.trim()),
                  findings,
                }}
              />
            </>
          ) : (
            <>
            {!named && (
              <p className="submit__note" data-testid="username-needed">
                {t.send.usernameNeeded}
              </p>
            )}
            <p className="cta-row">
              {urlFits ? (
                <a
                  className={`btn btn--strong${!ready || blocked ? " btn--disabled" : ""}`}
                  href={ready && !blocked ? url : undefined}
                  aria-disabled={!ready || blocked}
                  onClick={() => setAttempted(true)}
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
            </>
          )}

          <AfterHandoff repo={repo} kind="skill" reserved={reserved} singleFile={!multiFile} />

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
            <p className="submit__note">{t.send.recipeIntro}</p>
            {named ? (
              <pre className="submit__yaml" data-testid="command-line"><code>{
                recipe(recipeInput(repo, usableFork(forkInput, repo), draft, "skills", "your-skill"))
              }</code></pre>
            ) : (
              <p className="submit__note" data-testid="username-needed">
                {t.send.usernameNeeded}
              </p>
            )}
            <p className="submit__note">{t.send.recipeAfter}</p>
          </details>
        </section>
        </>
        )}
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
            <a className="btn btn--strong" href={editUrl(repo, listed.skill_path)}>
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
    </AttemptedProvider>
  );
}
