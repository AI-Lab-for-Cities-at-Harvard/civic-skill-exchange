/** The install commands for a listing, in one place (#289), so a skill's
 *  page, a plugin's page and the guide can't come to disagree.
 *
 *  The registry is both a Claude Code and a Codex plugin marketplace (#73,
 *  ADR 0006). A listing's install name carries its namespace, matching what
 *  scripts/build_marketplace.py's plugin_name writes into both: plugin names
 *  are unique across a marketplace, and two people may publish the same skill
 *  name. Commands are what a reader types, so they are the same in every
 *  locale and live here rather than in the strings. */

export const REPO = "AI-Lab-for-Cities-at-Harvard/civic-skill-exchange";
export const MARKETPLACE = "civic-skill-exchange";

export const installName = (namespace: string, name: string) => `${namespace}-${name}`;

/** The same --sparse as the guide and README (#259). */
export const CLAUDE_MARKETPLACE =
  `/plugin marketplace add ${REPO} --sparse .claude-plugin skills plugins`;
export const CODEX_MARKETPLACE =
  `codex plugin marketplace add ${REPO} --sparse .agents --sparse skills --sparse plugins`;

export function installCommands(namespace: string, name: string) {
  const id = `${installName(namespace, name)}@${MARKETPLACE}`;
  return {
    claudeMarketplace: CLAUDE_MARKETPLACE,
    claudeInstall: `/plugin install ${id}`,
    codexMarketplace: CODEX_MARKETPLACE,
    codexInstall: `codex plugin add ${id}`,
  };
}
