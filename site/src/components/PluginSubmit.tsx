/** The submission page for a plugin (#213).
 *
 *  Reached by dropping or importing a folder with plugin.json at its root —
 *  there is no mode to choose (ruling 1). The page summarises what it found,
 *  asks what describes the plugin once, and asks each skill only what its own
 *  SKILL.md leaves unanswered (ruling 3). Answers go into the submitter's own
 *  files: plugin.json for the plugin, each SKILL.md for its skill. The hand-off
 *  is always the folder upload, because a plugin is always several files.
 *
 *  Loaded only when a plugin arrives, so the skill page does not carry it.
 */

import { useMemo, useState } from "react";
import type { Entry, Finding } from "@civic-skill-exchange/validator";
import { PLUGIN_MANIFEST, PLUGIN_MCP_CONFIG, expectedPluginName, summarizeMcpServers } from "@civic-skill-exchange/validator/plugin-core";
import { RESERVED_NAMESPACES } from "@civic-skill-exchange/validator/rules";
import { en } from "../i18n/en";
import { rich } from "../i18n/rich";
import { useStrings } from "../i18n/strings";
import { useUserCheck } from "../lib/useUserCheck";
import { convertClaudeCode, type Addresses } from "../lib/convert";
import { buildFolderZip } from "../lib/folder";
import { addedFrontmatterLines } from "../lib/patch";
import {
  checkPlugin, gapsOf, newFileLines, patchPluginJson, patchPluginSkill, pluginDraftFromManifest,
  pluginFieldId, readPluginSource, sharedSkillLicense, skillDraftFromFile, skillMdPath,
  type PluginDraft,
} from "../lib/plugin";
import {
  slugify, recipe, recipeInput, type Draft, hasNamespace, usableFork,
} from "../lib/submit";
import { EXTENSION_FIELDS as EXTENSION_KEYS } from "../lib/plugin";
import { isGitHubLogin } from "../lib/login";
import { draftKey, readDraft, clearDraft, onlyStrings, asString, isRecord } from "../lib/draftStore";
import { useDraftSaver } from "../lib/useDraftSaver";
import { DraftBar } from "./DraftBar";
import { Choice, Field, type FieldNames } from "./Field";
import { LicenseField } from "./LicenseField";
import { UploadSteps } from "./UploadSteps";
import { AfterHandoff } from "./AfterHandoff";

const CATEGORIES = Object.keys(en.vocabulary.category);

/** Which draft key answers each per-skill question. */
const SKILL_DRAFT_KEY: Record<string, keyof Draft> = {
  "civic.category": "category",
  "civic.category-secondary": "categorySecondary",
  "civic.scope": "scope",
  "civic.scope-secondary": "scopeSecondary",
  "civic.jurisdiction": "jurisdiction",
  "civic.localization": "localization",
  "civic.language": "language",
  "civic.data-sensitivity": "dataSensitivity",
  "civic.human-review": "humanReview",
};

/** A finding's raw key swapped for the question it is about. The plugin form's
 *  findings carry a path — `plugin.json#extensions.….civic.maintainer` — so the
 *  key is its last part. */
function plain(finding: Finding, names: FieldNames): Finding {
  const key = finding.where in names ? finding.where
    : /(civic\.[a-z-]+|[a-z$]+)$/.exec(finding.where)?.[1] ?? finding.where;
  const name = names[key as keyof FieldNames];
  return name ? { ...finding, message: finding.message.replaceAll(key, name) } : finding;
}

function FindingList({ findings, testid, heading }: {
  findings: Finding[]; testid: string; heading?: string;
}) {
  if (findings.length === 0) return null;
  return (
    <div data-testid={testid}>
      {heading && <p className="submit__note">{heading}</p>}
      <ul className="submit__findings">
        {findings.map((f) => (
          <li key={`${f.where}${f.message}`}><code>{f.where}</code> {f.message}</li>
        ))}
      </ul>
    </div>
  );
}

function Added({ file, lines, summary }: { file: string; lines: string[]; summary: string }) {
  if (lines.length === 0) return null;
  return (
    <details className="disclosure" data-testid={`added-${file}`}>
      <summary className="disclosure__summary">{summary}</summary>
      <pre className="submit__yaml"><code>{lines.map((l) => `+ ${l}`).join("\n")}</code></pre>
    </details>
  );
}

export function PluginSubmit(
  { repo, entries, directoryName, left, claudeCode = false }: {
    repo: string; entries: Entry[]; directoryName: string;
    /** Named as left out by the reader — client manifests, oversized files. */
    left: string[];
    /** A Claude Code export, to be rearranged into plugin.json and mcp.json
     *  before anything else reads it (#246). */
    claudeCode?: boolean;
  },
) {
  const s = useStrings();
  const t = s.submit;
  const f = t.form;
  const p = t.plugin;

  // Addresses pasted for servers the conversion left out, by server name. The
  // conversion runs again with them rather than the page patching mcp.json
  // itself, so a pasted address meets the same rules as one in the file (#250).
  const [addresses, setAddresses] = useState<Addresses>({});
  const conversion = useMemo(
    () => (claudeCode ? convertClaudeCode(entries, addresses) : null),
    [claudeCode, entries, addresses]);
  const source = useMemo(() => readPluginSource(conversion?.entries ?? entries, directoryName),
    [conversion, entries, directoryName]);
  const leftOut = conversion ? [...left, ...conversion.leftOut] : left;
  const [read] = useState(() => pluginDraftFromManifest(source.manifest, directoryName, ""));
  // What the folder says on its own, which is what the form is "blank" at, and
  // what Start over returns to (#294).
  const [fresh] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(source.skills.map((sk) => [sk.name, skillDraftFromFile(sk.skillMd)])));
  // Answers kept from the last visit to this same plugin. Another plugin's are
  // left where they are and not shown.
  const [restore] = useState(() => {
    const saved = readDraft(draftKey({ route: "plugin" }));
    const data = saved?.data ?? {};
    if (!saved || data.directoryName !== directoryName) return null;
    const stored = isRecord(data.skillDrafts) ? data.skillDrafts : {};
    return {
      draft: onlyStrings(read.draft, data.draft),
      typedName: asString(data.typedName, read.draft.name),
      skills: Object.fromEntries(Object.entries(fresh).map(
        ([name, base]) => [name, onlyStrings(base, stored[name])])),
      forkInput: asString(data.forkInput),
      addressesTyped: typeof data.addressesTyped === "number" ? data.addressesTyped : 0,
    };
  });
  const [restoredNow, setRestoredNow] = useState(restore !== null);
  // The form as the folder leaves it: what it starts at, what counts as blank,
  // and what Start over returns to. A license nobody has chosen is offered
  // nothing (#296) — unless plugin.json is silent and every skill already
  // declares the same one.
  const [initial] = useState<PluginDraft>(() => ({
    ...read.draft, license: read.draft.license || sharedSkillLicense(source),
  }));
  const [draft, setDraft] = useState<PluginDraft>(restore?.draft ?? initial);
  const [typedName, setTypedName] = useState(restore?.typedName ?? read.draft.name);
  const [skillDrafts, setSkillDrafts] = useState<Record<string, Draft>>(
    () => restore?.skills ?? fresh);
  const [forkInput, setForkInput] = useState(restore?.forkInput ?? "");

  // What each skill is asked is fixed when the plugin arrives. Recomputed live,
  // a question would vanish the moment it was answered, under the cursor.
  const [asked] = useState<Record<string, string[]>>(() => {
    const initial = checkPlugin(source, {
      manifest: source.manifest, skills: {}, namespace: "", author: "", directoryName,
    });
    return Object.fromEntries(source.skills.map((sk) =>
      [sk.name, gapsOf(initial.skills[sk.name] ?? [])]));
  });

  // Saved as it is typed. Pasted server addresses are left out on purpose: an
  // address can carry a key in its query string, and the page cannot tell.
  const addressesTyped = Object.values(addresses).filter((a) => a.trim() !== "").length;
  const toKeep = useMemo(() => ({
    directoryName, draft, typedName, skillDrafts, forkInput,
    addressesTyped: addressesTyped > 0 ? addressesTyped : restore?.addressesTyped ?? 0,
  }), [directoryName, draft, typedName, skillDrafts, forkInput, addressesTyped, restore]);
  const blankForm = JSON.stringify([draft, typedName, skillDrafts, forkInput, addressesTyped])
    === JSON.stringify([initial, read.draft.name, fresh, "", 0]);
  const { failed: cannotSave } = useDraftSaver(draftKey({ route: "plugin" }), toKeep, {
    blank: blankForm,
  });
  const startOver = () => {
    clearDraft(draftKey({ route: "plugin" }));
    setDraft(initial); setTypedName(read.draft.name); setSkillDrafts(fresh);
    setForkInput(""); setAddresses({});
    setRestoredNow(false);
  };
  const addressesLost = restore && restore.addressesTyped > 0 && addressesTyped === 0
    ? [t.draft.addressesNotKept] : [];

  const set = (key: keyof PluginDraft) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const onInput = (key: keyof PluginDraft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key)(e.target.value);
  const setSkill = (skill: string, key: keyof Draft) => (value: string) =>
    setSkillDrafts((all) => ({ ...all, [skill]: { ...all[skill]!, [key]: value } }));

  const reserved = RESERVED_NAMESPACES.has(draft.author.trim().toLowerCase());

  // The same debounced lookup as the skill form: 60 requests an hour per
  // address, so never one per keystroke, and none for a name GitHub would not
  // allow.
  const userCheck = useUserCheck(draft.author);

  const manifest = useMemo(() => patchPluginJson(source.manifest, draft), [source, draft]);
  const skills = useMemo(() => Object.fromEntries(source.skills.map((sk) =>
    [sk.name, patchPluginSkill(sk.skillMd, skillDrafts[sk.name]!, draft.license)])),
  [source, skillDrafts, draft.license]);
  const check = useMemo(() => checkPlugin(source, {
    manifest: manifest.text,
    skills: Object.fromEntries(Object.entries(skills).map(([k, v]) => [k, v.skillMd])),
    namespace: draft.author, author: draft.author, directoryName: draft.name,
  }), [source, manifest, skills, draft.author, draft.name]);
  const servers = useMemo(() => summarizeMcpServers(source.mcp ?? ""), [source]);
  // A converted file is new, so all of it is added, not only what the form changed.
  const manifestAdded = conversion ? newFileLines(manifest.text) : manifest.added;
  const mcpAdded = conversion?.mcp ? newFileLines(conversion.mcp) : [];

  const names = f.fieldNames;
  const manifestFindings = check.manifest.map((x) => plain(x, names));
  const fieldIds = new Set<string>([
    "description", "license", "version", "maintainer", "affiliation", "deployment",
    "deployedAt", "deployedIn", "deployedSince", "useWhen", "avoidWhen", "modelsTested",
  ].map((k) => pluginFieldId(k as keyof PluginDraft)));
  const otherManifest = manifestFindings.filter((x) => !fieldIds.has(x.where));
  const blocked = check.structural.length > 0;
  const folderName = draft.name.trim() || directoryName || "plugin";
  const ns = draft.author.trim().toLowerCase();
  const badLogin = ns !== "" && !isGitHubLogin(ns);
  const ready = ns !== "" && !badLogin && draft.name.trim() !== "";

  // What plugin.json already answered, named so a submitter who did not write
  // it sees whose name they are about to publish under.
  const fromFile = (["description", "license", "version", "maintainer", "affiliation",
    "deployment"] as const)
    .filter((k) => read.draft[k].trim() !== "")
    .map((k) => names[(k in EXTENSION_KEYS ? EXTENSION_KEYS[k as keyof typeof EXTENSION_KEYS]
      : k) as keyof FieldNames] ?? k);

  const replacements = useMemo(() => ({
    [PLUGIN_MANIFEST]: manifest.text,
    ...Object.fromEntries(Object.entries(skills).map(([k, v]) => [skillMdPath(k), v.skillMd])),
  }), [manifest, skills]);

  const download = () => {
    const zip = buildFolderZip(source.entries, folderName, replacements);
    const href = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
    const a = document.createElement("a");
    a.href = href;
    a.download = `${folderName}.zip`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const id = (key: keyof PluginDraft) => pluginFieldId(key);

  /** One per-skill question, as the skill form asks it. */
  const question = (skill: string, key: string, findings: Finding[]) => {
    const draftKey = SKILL_DRAFT_KEY[key]!;
    const value = skillDrafts[skill]![draftKey];
    const onChange = setSkill(skill, draftKey);
    const boxId = `skills/${skill}:${key}`;
    const mine = findings.filter((x) => x.where === key)
      .map((x) => ({ ...plain(x, names), where: boxId }));
    switch (key) {
      case "civic.category":
      case "civic.category-secondary":
        return (
          <Choice key={key} id={boxId} findings={mine} value={value} onChange={onChange}
            label={key === "civic.category" ? f.categoryLabel : f.categorySecondaryLabel}
            placeholder={key === "civic.category" ? f.choose : f.categorySecondaryNone}
            options={CATEGORIES.map((c) => [c, s.vocabulary.category[
              c as keyof typeof s.vocabulary.category] ?? c])} />
        );
      case "civic.scope":
      case "civic.scope-secondary":
        return (
          <Choice key={key} id={boxId} findings={mine} value={value} onChange={onChange}
            label={key === "civic.scope" ? f.scopeLabel : f.scopeSecondaryLabel}
            placeholder={key === "civic.scope" ? f.choose : f.scopeSecondaryNone}
            options={f.scopeChoices} />
        );
      case "civic.jurisdiction":
        return (
          <Field key={key} id={boxId} label={f.jurisdictionLabel} findings={mine}
            hint={rich(f.jurisdictionHint)}>
            <input id={boxId} className="input" value={value}
              placeholder={f.jurisdictionPlaceholder}
              onChange={(e) => onChange(e.target.value)} />
          </Field>
        );
      case "civic.localization":
        return (
          <Choice key={key} id={boxId} findings={mine} value={value} onChange={onChange}
            label={f.localizationLabel} placeholder={f.localizationNone}
            options={f.localizationChoices} />
        );
      case "civic.language":
        return (
          <Choice key={key} id={boxId} findings={mine} value={value} onChange={onChange}
            label={f.languageLabel} placeholder={f.choose} hint={rich(f.languageHint)}
            options={f.languageChoices.filter(([v]) => v !== "other")} />
        );
      default: {
        const q = s.questions[key as "civic.data-sensitivity" | "civic.human-review"];
        return (
          <Choice key={key} id={boxId} findings={mine} value={value} onChange={onChange}
            label={q.question} placeholder={f.choose} options={q.options} />
        );
      }
    }
  };

  /** What a complete skill's SKILL.md already says, so "Complete" can be
   *  checked rather than taken on trust. */
  const answered = (skill: string) => {
    const d = skillDrafts[skill]!;
    const label = (options: readonly (readonly [string, string])[], v: string) =>
      options.find(([o]) => o === v)?.[1] ?? v;
    const rows: [string, string][] = [
      [f.categoryLabel, s.vocabulary.category[d.category as keyof typeof s.vocabulary.category] ?? d.category],
      [f.scopeLabel, label(f.scopeChoices, d.scope)],
      [f.languageLabel, label(f.languageChoices, d.language)],
      [s.questions["civic.data-sensitivity"].question,
        label(s.questions["civic.data-sensitivity"].options, d.dataSensitivity)],
      [s.questions["civic.human-review"].question,
        label(s.questions["civic.human-review"].options, d.humanReview)],
    ];
    return (
      <dl className="submit__answers" data-testid="skill-answers">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    );
  };

  return (
    <div data-testid="plugin-mode">
      {(restoredNow || !blankForm) && (
        <DraftBar restored={restoredNow} notKept={addressesLost}
          unsaved={cannotSave} onStartOver={startOver} />
      )}
      <section className="prose__block" data-testid="plugin-summary">
        <h2 className="h2">{p.heading}</h2>
        {conversion && (
          <>
            <p className="submit__note" data-testid="converted">
              {rich(p.converted, {
                docs: `https://github.com/${repo}/blob/main/docs/SUBMITTING.md#sharing-a-plugin`,
              })}
            </p>
            {conversion.findings.length > 0 && (
              <div data-testid="conversion-findings">
                <p className="submit__note">{p.convertedFindings}</p>
                <ul className="submit__findings">
                  {conversion.findings.map((x) => (
                    <li key={`${x.where}${x.message}`}><code>{x.where}</code> {rich(x.message)}</li>
                  ))}
                </ul>
              </div>
            )}
            {conversion.addressable.map((name) => {
              const boxId = `server-address-${name}:url`;
              const typed = addresses[name] ?? "";
              const refused = conversion.refused[name];
              return (
                <div key={name} data-testid={`server-address-${name}`}>
                  <Field id={boxId} label={p.addressLabel(name)} hint={rich(p.addressHint)}
                    findings={refused ? [{ where: boxId, message: p.addressRefused(refused) }] : []}>
                    <input id={boxId} className="input" type="url" value={typed}
                      placeholder={p.addressPlaceholder} autoComplete="off" spellCheck={false}
                      onChange={(e) => setAddresses((a) => ({ ...a, [name]: e.target.value }))} />
                    {typed.trim() !== "" && !refused && (
                      <p className="submit__ok">
                        {rich(p.addressAdded(name, new URL(typed.trim()).host))}
                      </p>
                    )}
                  </Field>
                </div>
              );
            })}
          </>
        )}
        <p>{rich(p.summary(folderName, source.skills.length, servers.length))}</p>
        <h3 className="h3">{p.skillsLabel}</h3>
        <ul>
          {source.skills.map((sk) => <li key={sk.name}><code>{sk.name}</code></li>)}
        </ul>
        {servers.length > 0 && (
          <>
            <h3 className="h3">{p.serversLabel}</h3>
            <ul>
              {servers.map((sv) => (
                <li key={sv.name}>{rich(sv.type === "stdio"
                  ? p.localServer(sv.name, sv.target)
                  : p.remoteServer(sv.name, sv.target))}</li>
              ))}
            </ul>
          </>
        )}
        <p className="submit__warn">{p.reviewed}</p>

        {leftOut.length > 0 && (
          <ul className="submit__findings" data-testid="left-out">
            {leftOut.map((m) => <li key={m}>{m}</li>)}
          </ul>
        )}
        <FindingList findings={check.structural} testid="structural" />
        {blocked && (
          <p className="submit__blocked" data-testid="blocked">{t.intake.blocked}</p>
        )}
        {[...read.problems, ...manifest.problems].map((m) => (
          <p className="field__finding" key={m}>{m}</p>
        ))}
      </section>

      <section className="prose__block">
        {fromFile.length > 0 && (
          <p className="submit__ok" data-testid="plugin-from-file">{p.fromFile(fromFile.join(", "))}</p>
        )}
        <Field id="namespace" label={f.namespaceLabel} findings={[]} hint={f.namespaceHint}>
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

        <Field id="plugin-name" label={p.nameLabel} findings={[]}
          hint={rich(p.nameHint(expectedPluginName({
            namespace: ns && !badLogin ? ns : p.youExample, directoryName: draft.name || "plugin",
          })))}>
          <input id="plugin-name" className="input" value={typedName}
            onChange={(e) => { setTypedName(e.target.value); set("name")(slugify(e.target.value)); }} />
        </Field>

        <Field id={id("description")} label={f.descriptionLabel}
          findings={manifestFindings} hint={p.descriptionHint}>
          <textarea id={id("description")} className="textarea" rows={3}
            value={draft.description} onChange={onInput("description")} />
        </Field>

        <LicenseField id={id("license")} value={draft.license} findings={manifestFindings}
          onChange={set("license")} />

        <Field id={id("version")} label={f.versionLabel} findings={manifestFindings}
          hint={rich(p.versionHint)}>
          <input id={id("version")} className="input" value={draft.version}
            onChange={onInput("version")} placeholder={f.versionPlaceholder} />
        </Field>

        <Field id={id("maintainer")} label={p.maintainerLabel} findings={manifestFindings}
          hint={f.maintainerHint}>
          <input id={id("maintainer")} className="input" value={draft.maintainer}
            onChange={onInput("maintainer")} />
        </Field>

        <Choice id={id("affiliation")} label={f.affiliationLabel} value={draft.affiliation}
          findings={manifestFindings} placeholder={f.choose}
          onChange={set("affiliation")} options={f.affiliationChoices} />

        <Choice id={id("deployment")} label={p.deploymentLabel} value={draft.deployment}
          findings={manifestFindings} placeholder={f.choose}
          onChange={set("deployment")} options={f.deploymentChoices}
          hint={draft.deployment === "team" || draft.deployment === "organization"
            ? f.deploymentHintClaim : f.deploymentHintPersonal} />

        <details className="disclosure">
          <summary className="h3 disclosure__summary">{t.optional.summary}</summary>
          <p className="field__hint">{p.fitHint}</p>
          <Field id={id("useWhen")} label={t.optional.useWhenLabel} findings={manifestFindings}>
            <textarea id={id("useWhen")} className="textarea" rows={2}
              value={draft.useWhen} onChange={onInput("useWhen")} />
          </Field>
          <Field id={id("avoidWhen")} label={t.optional.avoidWhenLabel}
            findings={manifestFindings} hint={t.optional.avoidWhenHint}>
            <textarea id={id("avoidWhen")} className="textarea" rows={2}
              value={draft.avoidWhen} onChange={onInput("avoidWhen")} />
          </Field>
          <Field id={id("modelsTested")} label={t.optional.modelsTestedLabel}
            findings={manifestFindings} hint={t.optional.modelsTestedHint}>
            <input id={id("modelsTested")} className="input" value={draft.modelsTested}
              onChange={onInput("modelsTested")}
              placeholder={t.optional.modelsTestedPlaceholder} />
          </Field>
          <Field id={id("deployedAt")} label={t.optional.deployedAtLabel}
            findings={manifestFindings}>
            <input id={id("deployedAt")} className="input" value={draft.deployedAt}
              onChange={onInput("deployedAt")} />
          </Field>
          <Field id={id("deployedIn")} label={t.optional.deployedInLabel}
            findings={manifestFindings} hint={t.optional.deployedInHint}>
            <input id={id("deployedIn")} className="input" value={draft.deployedIn}
              onChange={onInput("deployedIn")} placeholder={t.optional.deployedInPlaceholder} />
          </Field>
          <Field id={id("deployedSince")} label={t.optional.deployedSinceLabel}
            findings={manifestFindings}>
            <input id={id("deployedSince")} className="input" value={draft.deployedSince}
              onChange={onInput("deployedSince")}
              placeholder={t.optional.deployedSincePlaceholder} />
          </Field>
        </details>

        <FindingList findings={otherManifest} testid={`findings-${PLUGIN_MANIFEST}`}
          heading={p.fileFindings(PLUGIN_MANIFEST)} />
        <FindingList findings={check.mcp} testid={`findings-${PLUGIN_MCP_CONFIG}`}
          heading={p.fileFindings(PLUGIN_MCP_CONFIG)} />
      </section>

      <section className="prose__block">
        <h2 className="h2">{p.skillsHeading}</h2>
        <p>{p.skillsLede}</p>
        {source.skills.map((sk) => {
          const findings = check.skills[sk.name] ?? [];
          const questions = asked[sk.name] ?? [];
          const other = findings.filter((x) => !questions.includes(x.where))
            .map((x) => plain(x, names));
          return (
            <details key={sk.name} className="disclosure" open={questions.length > 0}
              data-testid={`skill-${sk.name}`}>
              <summary className="disclosure__summary">
                <code>{sk.name}</code>{" — "}
                <span data-testid="skill-status">
                  {findings.length === 0 ? p.skillComplete : p.skillOpen(findings.length)}
                </span>
              </summary>
              {questions.map((key) => question(sk.name, key, findings))}
              {questions.length === 0 && answered(sk.name)}
              <FindingList findings={other} testid={`findings-skills/${sk.name}`}
                heading={p.skillOther} />
              {skills[sk.name]!.problems.map((m) => (
                <p className="field__finding" key={m}>{m}</p>
              ))}
            </details>
          );
        })}
      </section>

      <section className="prose__block">
        <h2 className="h2">{t.send.heading}</h2>
        <p className="submit__note">{t.send.addedNote}</p>
        <Added file={PLUGIN_MANIFEST} lines={manifestAdded}
          summary={p.addedSummary(PLUGIN_MANIFEST, manifestAdded.length)} />
        <Added file={PLUGIN_MCP_CONFIG} lines={mcpAdded}
          summary={p.addedSummary(PLUGIN_MCP_CONFIG, mcpAdded.length)} />
        {source.skills.map((sk) => {
          const path = skillMdPath(sk.name);
          const lines = addedFrontmatterLines(sk.skillMd, skills[sk.name]!.skillMd);
          return <Added key={path} file={path} lines={lines}
            summary={p.addedSummary(path, lines.length)} />;
        })}

        <p className="submit__note" data-testid="multi-file-note">
          {p.multiFileNote(source.entries.length)}
        </p>
        {!ready && !blocked && (
          <p className="submit__note" data-testid="download-why">{p.downloadWhy}</p>
        )}
        <UploadSteps
          repo={repo} reserved={reserved} tree="plugins"
          draft={draft} folderName={folderName} folderBody={p.folderBody}
          forkInput={forkInput} onForkInput={setForkInput}
          onDownload={download} canDownload={ready && !blocked}
          review={{
            kind: "plugin", namespace: draft.author, name: draft.name,
            findings: [...check.structural, ...check.manifest],
          }}
        />
        <AfterHandoff repo={repo} kind="plugin" reserved={reserved} />

        <details className="disclosure">
          <summary className="disclosure__summary">{t.send.commandLine}</summary>
          <p className="submit__note">{t.send.recipeIntro}</p>
          {/* Withheld with the box empty: every line would name plugins//… (S-2). */}
          {hasNamespace(draft) ? (
            <pre className="submit__yaml" data-testid="command-line"><code>{
              recipe(recipeInput(repo, usableFork(forkInput, repo), draft, "plugins", "your-plugin"))
            }</code></pre>
          ) : (
            <p className="submit__note" data-testid="username-needed">
              {t.send.usernameNeeded}
            </p>
          )}
          <p className="submit__note">{t.send.recipeAfter}</p>
        </details>
      </section>
    </div>
  );
}
