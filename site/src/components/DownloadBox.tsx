import { useState } from "react";
import { RESERVED_NAMESPACES } from "@civic-skill-exchange/validator";
import { bytes } from "../lib/format";
import type { SkillDetail } from "../lib/types";

/** The disclaimer sits here, not in a footer, because this is the moment
 *  someone is about to act. A Community listing is not an endorsement, and the
 *  place to say so is next to the button. */
export function DownloadBox({ skill }: { skill: SkillDetail }) {
  const [copied, setCopied] = useState<string | null>(null);

  // Derived, not declared. `civic-skills` is the Lab's seeded namespace and is
  // already reserved in the validator, so a Lab-authored skill discloses itself
  // without anyone remembering to set a field (ADR 0001, ruling 2). Under one
  // reviewer the Lab can be both author and reviewer, and the sentence that
  // makes the review claim is the sentence that has to say so.
  const selfReviewed =
    skill.tier === "reviewed" && RESERVED_NAMESPACES.has(skill.namespace.toLowerCase());

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
      label: "Add the marketplace, once",
      value: `/plugin marketplace add ${repo}`,
    },
    {
      id: "install",
      label: "Install it",
      value: `/plugin install ${skill.namespace}-${skill.name}@${marketplace}`,
    },
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
          <strong>Reviewed{selfReviewed ? " — by its own author" : ""}.</strong>{" "}
          {skill.reviewed?.reviewers.join(" and ")} read this exact commit
          against the published checklist
          {skill.reviewed?.date ? ` on ${skill.reviewed.date}` : ""}. That is a
          statement about this content, not a warranty.
          {selfReviewed && (
            <>
              {" "}The AI Lab for Cities wrote and reviewed this skill. Nobody
              outside the Lab has read it.
            </>
          )}
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
            Download the skill ({bytes(skill.archive.size)})
          </a>
          <span>
            A zip of this folder. Upload it wherever your agent tool takes
            skills — no git, no command line.
          </span>
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
        In Claude Code the two <code>/plugin</code> lines are all you need. Skills
        here follow the open{" "}
        <a href="https://agentskills.io">Agent Skills</a> format, so they also
        work in ChatGPT, Codex, Gemini CLI, Copilot, Cursor and others — those
        take a skill at a time, so use the download above.
      </p>

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
