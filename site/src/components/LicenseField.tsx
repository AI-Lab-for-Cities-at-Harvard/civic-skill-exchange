/** The license question, shared by the skill form and the plugin form (#296).
 *
 *  Asked for, never assumed: it opens empty unless the submitted files already
 *  declare one. The common choices are offered by their SPDX identifiers, which
 *  is what both the skill's frontmatter and plugin.json are validated as; any
 *  other identifier goes through "another", which reveals a box rather than
 *  dropping a value the select does not list.
 */

import { useState } from "react";
import type { Finding } from "@civic-skill-exchange/validator";
import { rich } from "../i18n/rich";
import { useStrings } from "../i18n/strings";
import { Choice, Field } from "./Field";

const OTHER = "other";

export function LicenseField({ id, value, onChange, findings }: {
  /** The select's id, which is also where a finding about the license lands. */
  id: string;
  value: string;
  onChange: (value: string) => void;
  findings: Finding[];
}) {
  const f = useStrings().submit.form;
  const offered = f.licenseChoices.map(([v]) => v).filter((v) => v !== OTHER);
  // Kept as state because "another" chosen with nothing typed yet looks exactly
  // like nothing chosen in the value.
  const [otherChosen, setOtherChosen] = useState(false);
  const other = otherChosen || (value.trim() !== "" && !offered.includes(value.trim()));

  const choose = (picked: string) => {
    setOtherChosen(picked === OTHER);
    onChange(picked === OTHER ? "" : picked);
  };

  return (
    <>
      <Choice id={id} label={f.licenseLabel} hint={f.licenseHint} findings={findings}
        value={other ? OTHER : value} placeholder={f.choose}
        onChange={choose} options={f.licenseChoices} />
      {other && (
        <Field id={`${id}-other`} label={f.licenseOtherLabel} findings={[]}
          hint={rich(f.licenseOtherHint)}>
          <input id={`${id}-other`} className="input" value={value}
            onChange={(e) => onChange(e.target.value)} autoComplete="off" spellCheck={false}
            placeholder={f.licenseOtherPlaceholder} />
        </Field>
      )}
    </>
  );
}
