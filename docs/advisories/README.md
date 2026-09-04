# Advisories

One file per advisory, `YYYY-MM-DD-{namespace}-{skill}.md`. Empty until the
first one, which is the correct state — `docs/SECURITY.md` instructed a reviewer
to publish here and the directory did not exist, which is how a first advisory
gets written somewhere else.

`docs/SECURITY.md` says what an advisory must cover: what the skill did, which
commit range was affected, how it was found, when it was delisted, and what
somebody who installed it should do.

**Say plainly that delisting is not recall.** Anyone who cloned the skill still
has it, and telling them exactly what to look for on their own machine is the
only remediation the registry can offer.

A withdrawal that is not a security matter does not belong here. It goes in
[../archive/removals.md](../archive/removals.md) as a single line.
