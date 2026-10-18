/** GitHub's rule for a username: letters, digits and single hyphens, at most 39
 *  characters, no leading or trailing hyphen. The one definition, read by both
 *  submit forms. */
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export const isGitHubLogin = (s: string): boolean => LOGIN.test(s);
