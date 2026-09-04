<!-- For a pull request that adds to or removes from registry/reviewed.yml.
     Open it with ?template=attestation.md — GitHub does not offer a chooser
     for pull requests, so the query parameter is how you get here. -->

## The review

Link the review-request issue: closes #

The nine checklist answers belong in that issue, not here and not in `notes` —
`docs/TIERS.md` step 4. The first real review put all nine into `notes`, which
crowded out the one thing `notes` is for: what the next reviewer, a year from
now, should look at first.

`python scripts/attestation.py --questionnaire` prints the nine items as a block
to paste into the issue.

## The attestation

- [ ] The SHA came from `main` after the skill merged, not from a branch —
      `python scripts/attestation.py {namespace}/{name}` refuses the wrong cases
- [ ] `notes` says what was checked closely and what to look at first, in a few
      sentences
- [ ] If the Lab wrote the skill, `notes` says so — `docs/REVIEW.md` item 7
- [ ] `python scripts/build_index.py --out /tmp/idx` derives the tier expected,
      checked by reading the output rather than the file

## If this withdraws a sign-off

No justification is owed and none should be asked for. Comment on the original
issue and remove the entry; `docs/REVIEW.md` has the rest.
