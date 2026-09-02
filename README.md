# Guide images

Screenshots for [`docs/SUBMITTING.md`](https://github.com/AI-Lab-for-Cities-at-Harvard/civic-skill-exchange/blob/main/docs/SUBMITTING.md), on an orphan branch with no history in common with `main`.

## Why they are here and not on `main`

`/plugin marketplace add` clones this repository, and measurement on a real
install shows the clone is **shallow and single-branch** — its fetch refspec is
`+refs/heads/main:refs/remotes/origin/main`, at depth 1. So a branch outside
`main` costs somebody installing a civic skill **nothing**, while the same images
committed to `main` would roughly double the download.

Release assets were tried first and do not work: GitHub serves them
`Content-Disposition: attachment` with `X-Content-Type-Options: nosniff`, so a
browser will not render one in an `<img>` tag. `raw.githubusercontent.com` serves
these with an image content type, so Markdown renders them inline.

## Captured

**1 September 2026.** The `site-*` images come from a Playwright script driving
the real submission page. The `github-*` images need an authenticated session
with write access and are captured by hand.

**They will go stale.** GitHub redesigns, and a screenshot of an interface that
no longer exists is worse than none — it makes a confused submitter doubt they
are in the right place. Recapture, replace on this branch, and the guide picks
them up without a change to `main`.
