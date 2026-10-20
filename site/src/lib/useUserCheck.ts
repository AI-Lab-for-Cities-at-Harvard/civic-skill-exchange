import { useEffect, useState } from "react";
import { RESERVED_NAMESPACES } from "@civic-skill-exchange/validator/rules";
import { checkGitHubUser, type UserCheck } from "./github";
import { isGitHubLogin } from "./login";

/** The typed username, looked up on GitHub — one hook for both submit forms.
 *
 *  Debounced, and aborted when the value moves on. The rate limit is 60 an
 *  hour per address, so a request per keystroke would exhaust it inside one
 *  username. Nothing is asked for an empty box, a name GitHub would not allow,
 *  or a reserved namespace: that is not a person, and CODEOWNERS gates it
 *  instead, so the lookup would 404 on a name that is entirely correct.
 *
 *  The verdict is kept with the name it is about, so a "no such user" for the
 *  last name is not shown against the next one while the debounce runs. */
export function useUserCheck(author: string, delay = 500): UserCheck {
  const login = author.trim();
  const [verdict, setVerdict] = useState<{ login: string; check: UserCheck }>(
    { login: "", check: "unknown" });

  useEffect(() => {
    if (!login || !isGitHubLogin(login) || RESERVED_NAMESPACES.has(login.toLowerCase())) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      checkGitHubUser(login, controller.signal).then((check) => {
        // An aborted request rejects, which would read as "could not check".
        if (!controller.signal.aborted) setVerdict({ login, check });
      });
    }, delay);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [login, delay]);

  return verdict.login === login ? verdict.check : "unknown";
}
