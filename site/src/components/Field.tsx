/** The submission page's question boxes, shared by the skill form and the
 *  plugin form (#213). A finding is matched to its box by `where === id`. */

import { useStrings, type Strings } from "../i18n/strings";
import type { Finding } from "@civic-skill-exchange/validator";
import { plainMessage, fieldKey } from "../lib/plain";

export type FieldNames = Strings["submit"]["form"]["fieldNames"];

/** Findings are written for a reviewer reading a diff, and name the raw key.
 *  Said in the form's own words instead (#295). */
const readable = (finding: Finding, form: Strings["submit"]["form"]) =>
  plainMessage(finding, fieldKey(finding.where, form.fieldNames), form);

export function Field(
  { label, hint, id, findings, children }: {
    label: string; hint?: React.ReactNode; id: string; findings: Finding[];
    children: React.ReactNode;
  },
) {
  const form = useStrings().submit.form;
  const mine = findings.filter((f) => f.where === id);
  return (
    <div className={`field${mine.length ? " field--flagged" : ""}`}>
      <label className="field__label" htmlFor={id}>{label}</label>
      {hint && <p className="field__hint">{hint}</p>}
      {children}
      {mine.map((f) => (
        <p className="field__finding" key={f.message}>{readable(f, form)}</p>
      ))}
    </div>
  );
}

export function Choice(
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
