/** A finding, said the way the form says everything else (#295, S-3).
 *
 *  The validator writes for a reviewer reading a diff: it names `civic.*` keys
 *  and quotes the values a file holds. A submitter answers questions in a form
 *  and has never seen either, so a finding is rewritten here, once, for both the
 *  skill form and the plugin form.
 *
 *  Matched on the shape of the message and the field it is about, because the
 *  validator gives a finding no code. A message it words differently falls
 *  through to the last step, which still removes every key — and the tests scan
 *  the whole rule set, so a new rule that slips past is caught there.
 */

import type { Finding } from "@civic-skill-exchange/validator";
import type { Strings } from "../i18n/strings";

type Form = Strings["submit"]["form"];

/** The field a finding is about. The plugin form's findings carry a path —
 *  `plugin.json#extensions.….civic.maintainer` — so the key is its last part. */
export function fieldKey(where: string, names: Form["fieldNames"]): string {
  if (where in names) return where;
  return /(civic\.[a-z-]+|[a-z$]+)$/.exec(where)?.[1] ?? where;
}

export function plainMessage(finding: Finding, key: string, f: Form): string {
  const p = f.plain;
  const names = f.fieldNames as Record<string, string>;
  const name = names[key] ?? p.thisAnswer;
  const m = finding.message;

  if (/ is required when civic\.deployment is /.test(m)) return p.organizationNeeded;
  if (/ is set, but civic\.deployment: none /.test(m)) return p.neverUsedHasOrganization;
  if (/^\S+ is required$/.test(m)) return p.required(name);
  if (/ describes the whole plugin, /.test(m)) return p.pluginLevel(name);
  if (/ is declared by each skill, /.test(m)) return p.notForPlugin(name);
  if (/ is not one of: |is not in the vocabulary/.test(m)) return p.notOffered(name);
  if (/^civic\.localization: generalized contradicts /.test(m)) return p.generalizedHasPlace;
  if (/^civic\.scope: any says /.test(m)) return p.anyHasPlace;
  if (key === "civic.jurisdiction" && / is not a place\./.test(m)) return p.notAPlace;
  if (key === "civic.scope-secondary") {
    if (/ repeats /.test(m)) return p.secondaryRepeats;
    if (/^'any' means /.test(m)) return p.anyAlone;
  }
  if (key === "civic.category-secondary" && / is the same as /.test(m)) return p.categoryRepeats;
  if (key === "civic.languages-tested") {
    if (/ does not include /.test(m)) return p.testedLeavesOut;
    if (/ is not a comma-separated list /.test(m)) return p.testedShape;
  }
  if (key === "civic.language" && /BCP 47/.test(m)) return p.languageTag;
  if (key === "allowed-tools") return p.bashWildcard;
  if (key === "civic.source-repo") return p.sourceRepo;
  if (key === "civic.source-commit") return p.sourceCommit;

  // Anything else is already in plain words around a key. Swap each key for
  // its question, longest first so `civic.category-secondary` is not eaten by
  // `civic.category`, and name any key the table does not know generically.
  let out = m;
  for (const k of Object.keys(names).sort((a, b) => b.length - a.length)) {
    if (k.includes(".")) out = out.replaceAll(k, names[k]!);
  }
  return out.replaceAll(key, name).replace(/civic\.[a-z-]+/g, p.thisAnswer);
}

/** A finding that says an empty box is needed. Only these wait (#302, S-13): a
 *  problem with a value that is there, typed or read from a file, is shown at
 *  once. The validator gives findings no code, so this is the shape of its
 *  "is required" wording, which plain.ts matches the same way. */
export const waits = (f: Finding) => / is required(?: when |$)/.test(f.message);
