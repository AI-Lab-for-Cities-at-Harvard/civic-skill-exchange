/**
 * Frontmatter safety. Pure, but carries the `yaml` dependency, so it lives
 * apart from structure-core.ts — a caller that only needs the caps and the
 * allowlist should not pay for a YAML parser to get them.
 */

import { parseDocument, isAlias, visit } from "yaml";
import { MAX_FRONTMATTER_BYTES } from "./structure-core";
import type { Finding } from "./types";

const finding = (where: string, message: string): Finding => ({ where, message });

/**
 * Reject frontmatter that is oversized or alias-bearing.
 *
 * YAML aliases are the billion-laughs vector. No skill has a legitimate use for
 * them in sixteen kilobytes of frontmatter, so they are rejected outright rather
 * than bounding their expansion.
 */
export function checkYamlSafety(raw: string): Finding[] {
  if (new TextEncoder().encode(raw).length > MAX_FRONTMATTER_BYTES) {
    return [finding("frontmatter", `frontmatter exceeds ${MAX_FRONTMATTER_BYTES} bytes`)];
  }

  const doc = parseDocument(raw, { merge: false });
  if (doc.errors.length > 0) {
    return [finding("frontmatter", `frontmatter is not valid YAML: ${doc.errors[0]?.message}`)];
  }
  if (doc.contents === null) {
    return [finding("frontmatter", "frontmatter is empty")];
  }

  let aliased = false;
  visit(doc, {
    Alias() {
      aliased = true;
      return visit.BREAK;
    },
  });
  if (aliased || (doc.contents !== null && isAlias(doc.contents))) {
    return [finding("frontmatter", "YAML anchors and aliases are not permitted in frontmatter")];
  }

  return [];
}
