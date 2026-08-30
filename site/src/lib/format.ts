/** Byte sizes, shown to a person deciding whether to click something.
 *  Shared so the file tree and the download button never disagree. */
export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
