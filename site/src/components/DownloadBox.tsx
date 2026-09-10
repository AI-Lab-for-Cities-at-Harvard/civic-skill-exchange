import { useState } from "react";
import { RESERVED_NAMESPACES } from "@civic-skill-exchange/validator";
import { rich } from "../i18n/rich";
import { useStrings } from "../i18n/strings";
import { bytes } from "../lib/format";
import type { SkillDetail } from "../lib/types";

/** The disclaimer sits here, not in a footer, because this is the moment
 *  someone is about to act. A Community listing is not an endorsement, and the
 *  place to say so is next to the button. */
export function DownloadBox({ skill }: { skill: SkillDetail }) {
  const s = useStrings();
  const [copied, setCopied] = useState<string | null>(null);

  // Derived, not declared. `civic-skills` is the Lab's seeded namespace and is
  // already reserved in the validator, so a Lab-authored skill discloses itself
  // without anyone remembering to set a field (ADR 0001, ruling 2). Under one
  // reviewer the Lab can be both author and reviewer, and the sentence that
  // makes the review claim is the sentence that has to say so.
  const selfReviewed =
    skill.tier === "reviewed" && RESERVED_NAMESPACES.has(skill.namespace);

  const repo = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";

  // The registry is a Claude Code plugin marketplace (#73), which is the
  // shortest path in and needs no knowledge of where a tool keeps its skills.
  //
  // The plugin name carries the namespace, matching what
  // scripts/build_marketplace.py writes: plugin names are unique across a
  // marketplace and two people may publish the same skill name.
  const marketplace = "civic-skill-exchange";
  const commands = [
    {
      id: "marketplace",
      label: s.download.commands.marketplace,
      value: `/plugin marketplace add ${repo}`,
    },
    {
      id: "install",
      label: s.download.commands.install,
      value: `/plugin install ${skill.namespace}-${skill.name}@${marketplace}`,
    },
    {
      id: "degit",
      label: s.download.commands.degit,
      value: `npx degit ${repo}/${skill.path} ${skill.name}`,
    },
    {
      id: "clone",
      label: s.download.commands.clone,
      value: `git clone https://github.com/${repo}.git`,
    },
  ];

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard is blocked in some contexts. The command is on screen and
      // selectable, so there is nothing to recover from.
    }
  };

  return (
    <section className="download" aria-labelledby="download-heading">
      <h2 className="h3" id="download-heading">{s.download.heading}</h2>

      {skill.tier === "community" ? (
        <p className="download__warn">{rich(s.download.community)}</p>
      ) : (
        <p className="download__ok">
          {rich(s.download.reviewed(
            s.badges.tier.reviewers(skill.reviewed?.reviewers ?? []),
            skill.reviewed?.date ?? "",
            selfReviewed,
          ))}
        </p>
      )}

      {/* First, and deliberately. degit needs Node and clone needs git; this is
          the only path open to somebody with a browser and nothing else. */}
      {skill.archive && (
        <p className="download__archive" data-testid="download-archive">
          <a
            className="btn btn--strong download__get"
            href={`${import.meta.env.BASE_URL}${skill.archive.path}`}
            download={`${skill.name}.zip`}
          >
            {s.download.archive(bytes(skill.archive.size))}
          </a>
          <span>{s.download.archiveNote}</span>
        </p>
      )}

      {commands.map((c) => (
        <div className="download__cmd" key={c.id}>
          <span className="download__cmd-label">{c.label}</span>
          <code>{c.value}</code>
          <button className="btn btn--subtle" onClick={() => copy(c.id, c.value)}>
            {copied === c.id ? s.download.copied : s.download.copy}
          </button>
        </div>
      ))}

      <p className="download__note">
        {rich(s.download.formatNote, { spec: "https://agentskills.io" })}
      </p>

      <p className="download__note">{rich(s.download.pathsNote)}</p>

      <p className="download__note">
        <a className="arrow-link" href={skill.download}>
          {s.download.github} <span aria-hidden="true">→</span>
        </a>
      </p>
    </section>
  );
}
