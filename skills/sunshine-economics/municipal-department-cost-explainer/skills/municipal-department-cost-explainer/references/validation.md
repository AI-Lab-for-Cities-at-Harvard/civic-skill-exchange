# Validation notes — visualization 1.1.0

Prepared for review on 2026-11-03; authorized for submission on 2026-11-04
after the private preview was delivered. Repository acceptance is separate
from this local validation. No municipal deployment, human practitioner
review, Harvard endorsement, or accessibility certification is claimed.

## Reproduce

From the inner skill folder:

```bash
python3 scripts/test_explorer.py
node --check assets/explorer.js
python3 scripts/render_explorer.py --demo --output /tmp/follow-the-money.html
```

From the Civic Skill Exchange repository root after its validator dependencies
are installed:

```bash
node --import tsx validator/src/check.ts skills/sunshine-economics/municipal-department-cost-explainer --author sunshine-economics
```

This runs the repository's actual check entrypoint. The ordinary `npm run check`
wrapper attempted to open a tsx IPC socket that this execution environment did
not permit; Node's import loader ran the same validator without that socket.

## Results

| Check | Result |
|---|---|
| Python input/render regression suite | 21 tests passed |
| JavaScript syntax | Passed `node --check` |
| Exchange structure and ownership | Passed for `sunshine-economics` |
| Exchange signature scan | No blocking findings; three nonblocking external-URL flags for citations |
| Browser selection and disclosure | All four demo cases opened; keyboard Enter opened detail and moved focus to its heading |
| Cost calculation in browser | Matched expected amounts below |
| Boston discrepancy | Published subtotal retained; difference displayed as −$1 |
| Funding view | San Diego's four revenue categories totaled correctly; transfer-only fictional case withheld a net figure |
| Evidence download | Browser downloaded nine San Diego ledger rows; amounts, period/status and source URLs checked from the actual CSV |
| Narrow layout | 390-pixel iframe checked; body width and scroll width both 375 pixels after the scrollbar; table scrolls within its container |
| Print | Full-detail print stylesheet implemented; browser print control invoked, but the cloud browser did not expose a print dialog/PDF for visual inspection |

The 21 regression tests cover source URL schemes, script-closing input, missing
amounts, unsupported numeric types, integer overflow, duplicate identifiers,
mixed years/status/bases, unverified expenses, allocation signs, adjustment scope,
net-revenue eligibility, double counting in checks, exact dates, synthetic
adopted examples, and accidental output replacement. These are software tests,
not proof of the truth of user-entered classifications or source documents.

## Expected fixed examples

| Case | Expected interpretation |
|---|---|
| Escondido | $192,030 − (−$3,008,510) = $3,200,540 gross; adding distinct salaries $102,940 and $82,770 gives $3,386,250 documented subtotal; Measure I benefits remain unknown |
| San Diego | $89,215,833 + $6,600,102 = $95,815,935; reported revenue categories sum to $9,350,965; expense–revenue difference $86,464,970, not certified taxpayer cost |
| Boston | $10,942,503 + $300,000 external spending = $11,242,503 within the schedules; personnel components $8,593,502 versus reported $8,593,503; recommended status retained |
| Fictional | $700,000 − (−$300,000) = $1,000,000; retain the included $50,000 IT charge; exclude matching Water allocation and $120,000 transfer; keep the $120,000 unattributed contract unresolved |

Official source URLs and page/column citations are in the data and the existing
worked examples. This update checked Escondido's line-item pages, San Diego's
department summary/revenue categories, and Boston's personnel-detail labels.
Boston's personnel adjustment rows are on printed page 30 / PDF page 26; the
$139,441 label is Other, not overtime. San Diego's department total includes
a $3,000 capital-expenditure component in the source; it is not removed or
described as a pure operating-only total in the new evidence data.

## Independent fictional exercise

A separate AI exercise used Harbor City Public Works: net $4,000,000, gross
$5,000,000, $1,000,000 allocation out, included IT $200,000, matching Water
allocation, distinct contract $250,000, transfer $90,000, and unattributed
contract $80,000. Initial input correctly stopped because exact fiscal dates
were unknown. With explicitly supplied July 1, 2026–June 30, 2027 dates, HTML
generation succeeded. The expected documented subtotal is $5,250,000, with
no eligible net-funding calculation. The exercise identified and prompted a fix
so fictional data can preserve an adopted status while remaining marked synthetic.

## Remaining review limits

Reviewers should inspect allocation reversal, overlapping costs, eligibility of
revenue offsets and source attribution. The software accepts the author's
`verified` and `scopeConfirmed` assertions; it cannot authenticate them. Current
checks do not establish accounting correctness in a new jurisdiction, full cost,
spending adequacy, procurement suitability, or production readiness. Real assistive
technology and Safari/Firefox testing, and visual inspection of exported PDFs,
remain outside the completed checks. No automatic PDF extraction or live updates
are included. Local data is embedded in generated output and must be public
aggregate information before sharing.
