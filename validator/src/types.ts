/** One problem with a skill, in the form a submitter can act on. */
export interface Finding {
  /** Dotted path into the frontmatter, or a file path for structural findings. */
  where: string;
  message: string;
}

export interface Frontmatter {
  name?: unknown;
  description?: unknown;
  license?: unknown;
  compatibility?: unknown;
  "allowed-tools"?: unknown;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Everything rules.ts needs that it cannot work out for itself.
 *  Supplied by the CLI from disk, and by the browser from data/categories.json —
 *  so the vocabulary has exactly one source in both runtimes. */
export interface RuleContext {
  categories: string[];
  /** The directory the skill lives in, when there is one. The browser has no
   *  filesystem, so a name/directory mismatch simply is not checkable there. */
  directoryName?: string;
  /** The pull request author's login, for the namespace ownership check. */
  author?: string;
  /** The namespace the skill was written into. */
  namespace?: string;
}
