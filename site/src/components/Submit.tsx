import { useEffect, useMemo, useState } from "react";
import {
  checkFrontmatter, checkStructureCore, RESERVED_NAMESPACES,
  type Finding, type Entry,
} from "@civic-skill-exchange/validator";
import {
  EMPTY_DRAFT, toFields, toFrontmatter, toYaml, newFileUrl, editUrl, mailtoUrl,
  forkUrl, forkUploadUrl, registryUploadUrl, pullRequestUrl, parseForkRef,
  fitsInUrl, skillPath, slugify, type Draft,
} from "../lib/submit";
import { patchSkillMd, addedFrontmatterLines } from "../lib/patch";
import { buildSkillZip } from "../lib/folder";
import { readSkillZip } from "../lib/zip";
import { draftFromSkillMd } from "../lib/parse";
import { checkGitHubUser, type UserCheck } from "../lib/github";
import {
  importFromRepo, FAILURE_MESSAGES, type ImportResult,
} from "../lib/import";
import { CATEGORY_LABELS } from "../lib/labels";
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

const CATEGORIES = Object.keys(CATEGORY_LABELS);

/** Plain questions, not field names. The schema keys stay as element ids
 *  because that is how a finding is matched to its input, but no submitter
 *  should have to learn what `civic.human-review` means to answer it. */
const FIELD_LABELS: Record<string, string> = {
  namespace: "your GitHub username",
  name: "the skill name",
  description: "the description",
  license: "the license",
  "allowed-tools": "the tools it needs",
  metadata: "the details below",
  "civic.category": "the category",
  "civic.jurisdiction": "where it applies",
  "civic.localization": "how portable it is",
  "civic.data-sensitivity": "the data it touches",
  "civic.human-review": "its effect on people",
  "civic.use-when": "when it is useful",
  "civic.avoid-when": "when it is not useful",
  "civic.maintainer": "who maintains it",
  "civic.contact": "the contact address",
  "civic.affiliation": "the kind of organization",
  "civic.deployment": "how much you have used it",
  "civic.deployed-at": "the organization",
  "civic.deployed-in": "where it operates",
  "civic.deployed-since": "since when",
};

/** Findings are written for a reviewer reading a diff, and name the raw key.
 *  Swapped for the question the submitter actually answered. */
function readable(f: Finding): string {
  const label = FIELD_LABELS[f.where];
  return label ? f.message.replaceAll(f.where, label) : f.message;
}

const WHERE_LABELS: [string, string][] = [
  ["generic", "Anywhere — it makes no assumptions about place"],
  ["us-local", "A US city or county"],
  ["us-state", "A US state"],
  ["us-federal", "US federal"],
  ["intl", "Outside the US"],
];

const DATA_LABELS: [string, string][] = [
  ["none", "No personal data"],
  ["pii", "Personal details about identifiable people"],
  ["protected", "Health, benefits, immigration or criminal justice data"],
];

const EFFECT_LABELS: [string, string][] = [
  ["none", "No — it does not affect anyone's rights or benefits"],
  ["advisory-only", "It informs a person, but decides nothing"],
  ["decision-support", "It feeds a decision someone acts on"],
];

const USE_LABELS: [string, string][] = [
  ["none", "Not yet — I have not used it in real work"],
  ["personal", "I use it myself"],
  ["team", "My team uses it"],
  ["organization", "My whole organization uses it"],
];

const ORG_LABELS: [string, string][] = [
  ["government", "Government"], ["nonprofit", "Nonprofit"], ["vendor", "Vendor"],
  ["academic", "Academic"], ["individual", "Just me"],
];

function Field(
  { label, hint, id, findings, children }: {
    label: string; hint?: React.ReactNode; id: string; findings: Finding[];
    children: React.ReactNode;
  },
) {
  const mine = findings.filter((f) => f.where === id);
  return (
    <div className={`field${mine.length ? " field--flagged" : ""}`}>
      <label className="field__label" htmlFor={id}>{label}</label>
      {hint && <p className="field__hint">{hint}</p>}
      {children}
      {mine.map((f) => (
        <p className="field__finding" key={f.message}>{readable(f)}</p>
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

  const set = (key: keyof Draft) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const onInput = (key: keyof Draft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key)(e.target.value);

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
      setNotes([FAILURE_MESSAGES[out.kind]]);
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
        structural: [{ where: file.name, message: "This file could not be read as a zip archive." }],
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

  const listed = skills.find((s) => `${s.namespace}/${s.name}` === add);
  const missingFit = skills.filter((s) => !s.use_when && !s.avoid_when);

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
        <h2 className="h2">Share a skill</h2>
        <p className="lede">
          Fill this in and we will put it in the right shape for you. It takes a
          few minutes.
        </p>

        {/* Before the form, not after it. Every path this page offers ends on
            GitHub, and somebody could otherwise fill in twenty fields before
            finding that out. */}
        <p className="submit__prereq" data-testid="account-needed">
          You will need a <strong>GitHub account</strong> to finish &mdash; it is
          free, and it is what records the skill as yours.{" "}
          <a
            href="https://github.com/signup" data-testid="account-signup"
            target="_blank" rel="noreferrer"
          >
            Create one
          </a>{" "}
          if you do not have one; it takes a couple of minutes and you can come
          back to this page afterwards.
        </p>

        {/* Links rather than scripted tabs. Each mode is a real URL, so it can
            be sent to someone, bookmarked, and reached with the back button —
            and a skill page linking straight to the update mode needs no extra
            machinery. */}
        <nav className="modes" aria-label="What do you want to do?">
          <a
            className="modes__item" href={submitHref("new")}
            aria-current={mode === "new" ? "page" : undefined}
            data-testid="mode-new"
          >
            Add a new skill
          </a>
          <a
            className="modes__item" href={submitHref("update")}
            aria-current={mode === "update" ? "page" : undefined}
            data-testid="mode-update"
          >
            Update one you already listed
          </a>
        </nav>

        {mode === "new" && (
          <p className="submit__warn">
            The skill will be listed as a community skill until it is reviewed.
          </p>
        )}
      </section>

      {mode === "new" && (
        <>
        {/* Upload and paste first, because most people arrive with a skill
            already written and should not retype it. */}
        <section className="prose__block">
          <h2 className="h2">Submit a new skill</h2>
          <p>
            Already have one? Drop it here and the rest of this page fills
            itself in. If your skill lives in its own repository, GitHub&rsquo;s{" "}
            <strong>Code &rarr; Download ZIP</strong> gives you the file to drop.
          </p>

          <Field
            id="repo" label="Your skill's GitHub repository" findings={[]}
            hint="Public repositories only. We read the file list and SKILL.md, and hand the folder back for you to upload — the listing records where the copy came from."
          >
            <span className="submit__row">
              <input
                id="repo" className="input" value={repoUrl}
                placeholder="github.com/you/your-skill"
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <button
                className="btn" onClick={onImport}
                disabled={importing || repoUrl.trim() === ""}
                data-testid="import"
              >
                {importing ? "Reading…" : "Read it"}
              </button>
            </span>
          </Field>

          {imported && (
            <p className="submit__ok" data-testid="imported">
              Read {imported.entries.length} file
              {imported.entries.length === 1 ? "" : "s"} from{" "}
              <code>{imported.ref.owner}/{imported.ref.repo}</code> at{" "}
              <code>{imported.commit.slice(0, 7)}</code>.
            </p>
          )}

          <Field id="archive" label="Or upload the skill folder as a .zip" findings={[]}
            hint="Unpacked in your browser. It is not sent anywhere.">
            <input
              id="archive" type="file" accept=".zip,application/zip" className="input"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </Field>

          <Field id="paste" label="Or paste your SKILL.md" findings={[]}>
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
              <p>
                <strong>{archive.name}</strong> — {archive.files} file
                {archive.files === 1 ? "" : "s"}.
              </p>
              {archive.left.length > 0 && (
                /* Left out is not the same as wrong. Named so nothing vanishes
                   quietly, but these do not stop the hand-off. */
                <ul className="submit__findings" data-testid="left-out">
                  {archive.left.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}
              {archive.structural.length === 0 ? (
                <p className="submit__ok">Nothing else to fix.</p>
              ) : (
                <ul className="submit__findings">
                  {archive.structural.map((f) => (
                    <li key={`${f.where}${f.message}`}><code>{f.where}</code> {f.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {blocked && (
            <p className="submit__blocked" data-testid="blocked">
              Fix these before continuing. They cannot be corrected below.
            </p>
          )}
        </section>

        <section className="prose__block">
          <h2 className="h2">About the skill</h2>

          {patched && patched.problems.length === 0 && patched.present.length > 0 && (
            /* Answered already, by the file. Shown rather than hidden, because a
               description read out of somebody's repository is exactly the thing
               they may want to improve before it is listed. */
            <p className="submit__ok" data-testid="from-file">
              Read from your file:{" "}
              {patched.present
                .filter((k) => k !== "metadata")
                .map((k) => FIELD_LABELS[k] ?? k)
                .join(", ")}
              . Everything below is already filled in where it could be — change
              anything that is wrong.
            </p>
          )}

          <Field
            id="namespace" label="Your GitHub username" findings={findings}
            hint="This has to match your login exactly — your skill goes in a folder of that name, and only you can write there."
          >
            <input id="namespace" className="input" value={draft.author}
              onChange={onInput("author")} autoComplete="off" />
            {reserved ? (
              <p className="field__hint" data-testid="reserved-namespace">
                <code>{draft.author.trim()}</code> is the Lab&rsquo;s own folder,
                so this does not have to match your login. It needs approval from
                a maintainer instead, and the listing carries the Lab&rsquo;s
                badge.
              </p>
            ) : userCheck === "missing" && draft.author.trim() !== "" && (
              <p className="field__finding" data-testid="no-such-user">
                No GitHub user called {draft.author.trim()}. A submission whose
                folder does not match the account that opens the pull request is
                rejected.
              </p>
            )}
          </Field>

          <Field
            id="name" label="Skill name" findings={findings}
            hint={
              draft.name && draft.name !== typedName.trim()
                ? <>Listed as <code>{draft.name}</code> — names are lowercase with
                    hyphens instead of spaces.</>
                : "Type it however you like; we will tidy the spacing and capitals."
            }
          >
            <input
              id="name" className="input" value={typedName}
              placeholder="Permit Status Explainer"
              onChange={(e) => {
                setTypedName(e.target.value);
                set("name")(slugify(e.target.value));
              }}
            />
          </Field>

          <Field id="description" label="Description" findings={findings}
            hint="What the skill does, in a couple of sentences. This is what an agent reads to decide whether to use it.">
            <textarea id="description" className="textarea" rows={3}
              value={draft.description} onChange={onInput("description")} />
          </Field>

          <Choice id="civic.category" label="Category" value={draft.category}
            findings={findings} placeholder="Choose…" onChange={set("category")}
            options={CATEGORIES.map((c) => [c, CATEGORY_LABELS[c] ?? c])} />

          <Choice id="civic.jurisdiction" label="Where does it apply?"
            value={draft.jurisdiction} findings={findings} placeholder="Choose…"
            onChange={set("jurisdiction")} options={WHERE_LABELS} />

          <Choice
            id="civic.localization"
            label="Is it set up for one place, or does it work anywhere?"
            value={draft.localization} findings={findings} onChange={set("localization")}
            options={[
              ["localized", "Set up for one place — it has our forms, deadlines and rules in it"],
              ["generalized", "Works anywhere — the local specifics have been lifted out"],
            ]}
            placeholder="Not sure yet"
            hint={<>
              <a href="#/about">What this means</a> — a localized skill carries one
              jurisdiction&rsquo;s specifics; a generalized one has had them taken out so
              another city can fill in its own.
            </>}
          />

          <Choice id="civic.data-sensitivity" label="What data does it touch?"
            value={draft.dataSensitivity} findings={findings}
            onChange={set("dataSensitivity")} options={DATA_LABELS} />

          <Choice id="civic.human-review"
            label="Does what it produces affect anyone's rights or benefits?"
            value={draft.humanReview} findings={findings}
            onChange={set("humanReview")} options={EFFECT_LABELS} />

          <Choice id="civic.deployment" label="Have you used it?"
            value={draft.deployment} findings={findings}
            onChange={set("deployment")} options={USE_LABELS} />

          <Field id="civic.contact" label="Contact" findings={findings}
            hint="How someone reaches you about a problem with the skill.">
            <input id="civic.contact" className="input" value={draft.contact}
              onChange={onInput("contact")} />
          </Field>

          <Field id="civic.maintainer" label="Who maintains it?" findings={findings}
            hint="A person or a team — City of X, Department of Innovation.">
            <input id="civic.maintainer" className="input" value={draft.maintainer}
              onChange={onInput("maintainer")} />
          </Field>

          <Choice id="civic.affiliation" label="What kind of organization?"
            value={draft.affiliation} findings={findings} placeholder="Choose…"
            onChange={set("affiliation")} options={ORG_LABELS} />
        </section>

        <section className="prose__block">
          <details className="disclosure">
            <summary className="h2 disclosure__summary">A few optional things</summary>

            <Field id="civic.use-when" label="When is this useful?" findings={findings}>
              <textarea id="civic.use-when" className="textarea" rows={2}
                value={draft.useWhen} onChange={onInput("useWhen")} />
            </Field>

            <Field id="civic.avoid-when" label="When is it not?" findings={findings}
              hint="The one only you can answer. A skill honest about its limits gets adopted faster.">
              <textarea id="civic.avoid-when" className="textarea" rows={2}
                value={draft.avoidWhen} onChange={onInput("avoidWhen")} />
            </Field>

            <Field id="allowed-tools" label="Tools it needs" findings={findings}
              hint="Comma separated. These are granted without asking the person who runs it, so list the least it needs.">
              <input id="allowed-tools" className="input" value={draft.tools}
                onChange={onInput("tools")} placeholder="Read, Grep" />
            </Field>

            <Field id="license" label="License" findings={findings}>
              <input id="license" className="input" value={draft.license}
                onChange={onInput("license")} />
            </Field>

            <Field id="civic.deployed-at" label="Which organization uses it?" findings={findings}>
              <input id="civic.deployed-at" className="input" value={draft.deployedAt}
                onChange={onInput("deployedAt")} />
            </Field>

            <Field id="civic.deployed-in" label="Where does that organization operate?"
              findings={findings} hint="Like US-MA / Boston.">
              <input id="civic.deployed-in" className="input" value={draft.deployedIn}
                onChange={onInput("deployedIn")} placeholder="US-MA / Boston" />
            </Field>

            <Field id="civic.deployed-since" label="Roughly since when?" findings={findings}>
              <input id="civic.deployed-since" className="input" value={draft.deployedSince}
                onChange={onInput("deployedSince")} placeholder="2026-03" />
            </Field>
          </details>
        </section>

        <section className="prose__block">
          <h2 className="h2">Send it</h2>
          {added.length > 0 && (
            /* What the page wrote into the submitter's own file, on every path.
               #82: asserting that the download matters did not stop somebody
               uploading their original folder instead and losing all of it. */
            <details className="disclosure" data-testid="added">
              <summary className="disclosure__summary">
                What we added to your SKILL.md &mdash; {added.length} line
                {added.length === 1 ? "" : "s"}
              </summary>
              <p className="submit__note">
                Written into the copy this page hands you. Your original file on
                disk still does not have these.
              </p>
              <pre className="submit__yaml" data-testid="added-lines"><code>{
                added.map((l) => `+ ${l}`).join("\n")
              }</code></pre>
            </details>
          )}

          {findings.length > 0 && (
            <p className="submit__note" data-testid="findings-note">
              {findings.length} thing{findings.length === 1 ? "" : "s"} still to fill
              in, marked above. You can send it anyway — the checks that count run
              after you do, and you can fix things then.
            </p>
          )}

          {multiFile ? (
            /* Four steps, because a folder cannot be put in a link. Each one is
               a real URL the submitter can open, and the page never asks them to
               type a path. */
            <>
              <p className="submit__note" data-testid="multi-file-note">
                Your skill is {source?.entries.length} files. GitHub takes a
                whole folder, but only from its own upload page &mdash; so the
                last steps happen there, with the folder this page hands back.
              </p>
              <ol className="steps" data-testid="manual-steps">
                <li className="steps__item">
                  <h3 className="steps__title">Take the corrected folder</h3>
                  <p className="steps__body">
                    Your files, unchanged, with the answers above written into
                    <code> SKILL.md</code>. This folder &mdash; not your original
                    &mdash; is what you upload: the answers exist only in this
                    copy. Unzip it first.
                  </p>
                  <button
                    className="btn btn--strong" onClick={download}
                    disabled={!ready || blocked} data-testid="download-folder"
                  >
                    Download {folderName}.zip
                  </button>
                </li>

                {!reserved && (
                  <li className="steps__item">
                    <h3 className="steps__title">Make your own copy of the registry</h3>
                    <p className="steps__body">
                      One button on GitHub, then come back and paste the address
                      it gives you. We cannot guess it &mdash; you may rename the
                      copy, or keep it under a different account.
                    </p>
                    <p className="cta-row">
                      <a className="btn" href={forkUrl(repo)} data-testid="step-fork"
                        target="_blank" rel="noreferrer">Fork the registry</a>
                    </p>
                    <Field
                      id="fork" label="The address of your copy" findings={[]}
                      hint="Paste it from your browser's address bar, or type owner/name."
                    >
                      <input
                        id="fork" className="input" value={forkInput}
                        placeholder="github.com/you/civic-skill-exchange"
                        onChange={(e) => setForkInput(e.target.value)}
                      />
                      {forkInput.trim() !== "" && !forkRef && (
                        <p className="field__finding" data-testid="fork-unparsed">
                          That does not look like a GitHub repository. It should
                          be like <code>github.com/you/civic-skill-exchange</code>.
                        </p>
                      )}
                    </Field>
                  </li>
                )}

                <li className="steps__item">
                  <h3 className="steps__title">Drag the folder in</h3>
                  <p className="steps__body" data-testid="upload-step-body">
                    Drop the folder you <strong>downloaded</strong> in step 1
                    &mdash; unzipped, subfolders and all &mdash; then{" "}
                    <strong>Commit changes</strong>, choosing{" "}
                    <em>create a new branch and start a pull request</em> rather
                    than committing to <code>main</code>.
                    {reserved
                      ? " This opens the registry itself, which you can write to."
                      : " This opens your copy at the right folder."}
                  </p>
                  {uploadHref ? (
                    <a className="btn" href={uploadHref}
                      data-testid="step-upload" target="_blank" rel="noreferrer">
                      Upload the folder
                    </a>
                  ) : (
                    <p className="submit__note" data-testid="upload-waiting">
                      Paste the address of your copy above and this becomes a
                      link. A guessed one would send you to the wrong place.
                    </p>
                  )}
                </li>

                {!reserved && (
                  <li className="steps__item">
                    <h3 className="steps__title">Open the pull request</h3>
                    <p className="steps__body">
                      If GitHub already offered you one at the end of step 3,
                      that is this step done. The checks run on it, and a
                      maintainer takes it from there.
                    </p>
                    {prHref && (
                      <a className="btn" href={prHref}
                        data-testid="step-pr" target="_blank" rel="noreferrer">
                        Open the pull request
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
                  Continue on GitHub
                </a>
              ) : (
                <span className="submit__note" data-testid="url-too-long">
                  This is too long to carry in a link. Copy it below and paste it
                  into GitHub instead.
                </span>
              )}
              <button className="btn" onClick={copy}>{copied ? "Copied" : "Copy it"}</button>
            </p>
          )}

          {mailto ? (
            <p className="submit__note">
              No GitHub account?{" "}
              <a href={mailto} data-testid="email-handoff">Email it to us</a> and we
              will add it for you. It goes in under the project&rsquo;s name rather
              than yours, with you credited as the maintainer &mdash; attach the
              skill file and anything it needs.
            </p>
          ) : SUBMISSIONS_EMAIL ? (
            <p className="submit__note" data-testid="email-too-long">
              Too long to send by email link. Copy it above and mail it to{" "}
              <a href={`mailto:${SUBMISSIONS_EMAIL}`}>{SUBMISSIONS_EMAIL}</a> with
              the skill file attached.
            </p>
          ) : (
            /* No inbox yet, so this cannot say "email it to us" — and going
               quiet instead would leave somebody who will not make an account
               with no idea whether that is a dead end. It is, for now, and
               saying so beats letting them find out. */
            <p className="submit__note" data-testid="no-account-path">
              Every route from here goes through GitHub, so an account is
              required &mdash; the checks that admit a skill work by confirming
              the account that submitted it owns the folder it went into. If that
              is a problem, open an{" "}
              <a href={`https://github.com/${repo}/issues`}>issue</a> or ask
              whoever pointed you at this page; a maintainer can submit on your
              behalf, and the listing will credit you as the maintainer.
            </p>
          )}

          <details className="disclosure">
            <summary className="disclosure__summary">See what will be added</summary>
            <pre className="submit__yaml" data-testid="yaml"><code>{fileText}</code></pre>
          </details>

          <details className="disclosure">
            <summary className="disclosure__summary">Or do it from the command line</summary>
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
        <h2 className="h2">Update a skill you already listed</h2>
        <p>
          Choose it and we will show you what to add. You paste two lines into
          the file on GitHub, and nothing else changes.
        </p>
        {skills.length === 0 && (
          <p className="submit__note" data-testid="nothing-listed">
            Nothing is listed here yet.
          </p>
        )}
        <label className="field__label" htmlFor="add">Your skill</label>
        <select
          id="add" className="select" value={add ?? ""}
          onChange={(e) => { window.location.hash = e.target.value
            ? `#/submit?add=${encodeURIComponent(e.target.value)}` : "#/submit"; }}
        >
          <option value="">Choose a listing…</option>
          {(missingFit.length ? missingFit : skills).map((s) => (
            <option key={s.id} value={s.id}>{s.id}</option>
          ))}
        </select>
        {listed && (
          <div className="submit__handoff" data-testid="edit-handoff">
            <p className="field__hint">
              Paste these into the <code>metadata:</code> block, keeping the
              indentation, and change the text.
            </p>
            <pre className="submit__yaml"><code>{
`  civic.use-when: "When this skill earns its place."
  civic.avoid-when: "When it does not."`}</code></pre>
            <a className="btn btn--strong" href={editUrl(repo, listed.path)}>
              Edit {listed.id} on GitHub
            </a>
          </div>
        )}

        <p className="submit__note">
          Not finding it? Only skills already in this catalog appear here. If
          yours is not listed yet,{" "}
          <a href={submitHref("new")}>submit it as a new skill</a> first.
        </p>
      </section>
      )}
    </article>
  );
}
