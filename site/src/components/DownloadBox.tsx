import { useState } from "react";
import type { Skill } from "../lib/types";

/** The disclaimer sits here, not in a footer, because this is the moment
 *  someone is about to act. A Community listing is not an endorsement, and the
 *  place to say so is next to the button. */
export function DownloadBox({ skill }: { skill: Skill }) {
  const [copied, setCopied] = useState<string | null>(null);

  const repo = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
  const commands = [
    {
      id: "degit",
      label: "Just this skill",
      value: `npx degit ${repo}/${skill.path} ${skill.name}`,
    },
    {
      id: "clone",
      label: "The whole registry",
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
      <h2 className="h3" id="download-heading">Use this skill</h2>

      {skill.tier === "community" ? (
        <p className="download__warn">
          <strong>Nobody has reviewed this skill.</strong> It passed automated
          structural and signature checks, which can only ever reject — a pass is
          not a statement that it is safe. Read the source on GitHub before you
          run it, particularly anything under <code>scripts/</code>.
        </p>
      ) : (
        <p className="download__ok">
          <strong>Reviewed.</strong>{" "}
          {skill.reviewed?.reviewers.join(" and ")} read this exact commit
          against the published checklist
          {skill.reviewed?.date ? ` on ${skill.reviewed.date}` : ""}. That is a
          statement about this content, not a warranty.
        </p>
      )}

      {commands.map((c) => (
        <div className="download__cmd" key={c.id}>
          <span className="download__cmd-label">{c.label}</span>
          <code>{c.value}</code>
          <button className="btn btn--subtle" onClick={() => copy(c.id, c.value)}>
            {copied === c.id ? "Copied" : "Copy"}
          </button>
        </div>
      ))}

      <p className="download__note">
        Install paths differ across agent tools — <code>.claude/skills/</code>,{" "}
        <code>.agents/skills/</code>, and others. Check your tool's docs for
        where it looks.
      </p>

      <p className="download__note">
        <a className="arrow-link" href={skill.download}>
          View on GitHub <span aria-hidden="true">→</span>
        </a>
      </p>
    </section>
  );
}
