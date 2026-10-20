import { useState } from "react";
import { RESERVED_NAMESPACES } from "@civic-skill-exchange/validator/rules";
import { Cluster, Stack } from "./Layout";
import { rich } from "../i18n/rich";
import { useStrings } from "../i18n/strings";
import { bytes } from "../lib/format";
import { guideHref } from "../lib/route";
import { REPO, installCommands } from "../lib/install";
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

  // The registry is a Claude Code and a Codex plugin marketplace, which is
  // the shortest path in and needs no knowledge of where a tool keeps its
  // skills. Since the layout move (ADR 0006) a single skill installs from
  // either, as a plugin does, so both clients' lines are here (#289).
  const lines = installCommands(skill.namespace, skill.name);
  const c = s.download.commands;
  const commands = [
    { id: "claude-marketplace", label: c.claudeMarketplace, value: lines.claudeMarketplace },
    { id: "claude-install", label: c.claudeInstall, value: lines.claudeInstall },
    { id: "claude-check", label: c.claudeCheck, value: lines.claudeCheck },
    { id: "codex-marketplace", label: c.codexMarketplace, value: lines.codexMarketplace },
    { id: "codex-install", label: c.codexInstall, value: lines.codexInstall },
    { id: "codex-check", label: c.codexCheck, value: lines.codexCheck },
    {
      id: "degit",
      label: s.download.commands.degit,
      // The skill's own folder, not the listing around it (ADR 0006): what
      // lands is {name}/SKILL.md, ready for a skills directory.
      value: `npx degit ${REPO}/${skill.skill_path} ${skill.name}`,
    },
    {
      id: "clone",
      label: s.download.commands.clone,
      value: `git clone https://github.com/${REPO}.git`,
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
    <Stack as="section" className="download" aria-labelledby="download-heading" gap="4">
      {/* The groups, by the space between them (measured before #318 and kept):
          12 from the heading to the status, 16 to the archive, 24 to what
          follows it, 8 between the notes and to the first command, 16 between
          the commands and to the closing notes. */}
      <Stack gap="5">
        <Stack gap="4">
          <Stack gap="3">
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
          </Stack>

          {/* First, and deliberately. degit needs Node and clone needs git; this
              is the only path open to somebody with a browser and nothing else. */}
          {skill.archive && (
            <Stack gap="2" className="download__archive" data-testid="download-archive">
              <Cluster>
                <a
                  className="btn btn--strong download__get"
                  href={`${import.meta.env.BASE_URL}${skill.archive.path}`}
                  download={`${skill.name}.zip`}
                >
                  {s.download.archive(bytes(skill.archive.size))}
                </a>
              </Cluster>
              <span>{s.download.archiveNote}</span>
            </Stack>
          )}
        </Stack>

        <Stack gap="2">
          {/* The step-by-step for each product is the guide's (#259). */}
          <p className="download__note" data-testid="guide-steps">
            {rich(s.download.stepByStep, {
              claude: guideHref("claude"), chatgpt: guideHref("chatgpt"),
              gemini: guideHref("gemini"), codex: guideHref("codex"),
            })}
          </p>

          {/* Before the commands (#302, I-6): it says two of them are all most
              people need, and read after eight it said so too late. */}
          <p className="download__note">
            {rich(s.download.formatNote, {
              spec: "https://agentskills.io", claudeCode: guideHref("claude-code"),
            })}
          </p>

          <Stack gap="4">
            {commands.map((c) => (
              <CommandRow key={c.id} label={c.label} value={c.value} copied={copied === c.id}
                onCopy={() => copy(c.id, c.value)} />
            ))}
          </Stack>
        </Stack>
      </Stack>

      <Stack gap="2">
        <p className="download__note">{rich(s.download.pathsNote)}</p>

        <p className="download__note">
          <a className="arrow-link" href={skill.download}>
            {s.download.github} <span aria-hidden="true">→</span>
          </a>
        </p>
      </Stack>
    </Stack>
  );
}

/** One line to copy, with the label that says where it is typed. The button is
 *  in a Cluster so it keeps its own width in a column. Shared with the plugin
 *  page's box. */
export function CommandRow(
  { label, value, copied, onCopy }:
  { label: string; value: string; copied: boolean; onCopy: () => void },
) {
  const s = useStrings();
  return (
    <Stack gap="2" className="download__cmd">
      <span className="download__cmd-label">{label}</span>
      <code>{value}</code>
      <Cluster>
        <button className="btn btn--subtle" onClick={onCopy}>
          {copied ? s.download.copied : s.download.copy}
        </button>
      </Cluster>
    </Stack>
  );
}
