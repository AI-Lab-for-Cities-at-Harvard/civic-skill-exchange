# Visualization data contract, version 1

The JSON root is `{ "schemaVersion": 1, "cases": [...] }`. The Python validator
in `scripts/render_explorer.py` is the executable contract. It rejects invalid
input before writing HTML. Version 1 supports USD whole dollars only: normalize
source units explicitly and describe conversion in provenance. Do not round
fractional source dollars silently. Values must be integer numbers within
JavaScript's safe integer range; numeric strings, booleans and non-finite values
are rejected. Inputs may contain 1–50 cases and at most 250 rows per case.

## Case fields

| Field | Requirement |
|---|---|
| `id` | Unique nonempty case identifier |
| `city`, `department` | Public jurisdiction and department labels |
| `period` | Exact fiscal label, repeated identically on each row |
| `status` | `final`, `adopted`, `amended`, `recommended`, `proposed`, or `synthetic` |
| `synthetic` | Explicit boolean; fictional cases may model an adopted budget while retaining `true` |
| `startDate`, `endDate` | Established fiscal dates, ISO `YYYY-MM-DD`; must not be reversed |
| `snapshotDate` | ISO date identifying the evidence snapshot, not a live-update claim |
| `currency`, `unit` | Exactly `USD` and `whole dollars` |
| `basis` | Source accounting/budgetary basis, or an explicit statement that it is unstated |
| `scope` | Included funds/measures and boundary; distinguish operating, capital, debt and actuals |
| `headlineLabel`, `resultLabel` | Precise names for reported and calculated measures |
| `summary`, `provenance` | Plain-language conclusion and source/check limitations |
| `limits` | 1–12 specific evidence gaps; every view remains explicitly incomplete |
| `questions` | 1–3 questions tied to the missing evidence |
| `sources` | Source objects below, IDs unique within this case |
| `rows` | Evidence rows below; exactly one headline |
| `checks` | Optional arithmetic checks; default empty list |
| `netFunding` | `null` unless same-scope revenue offsets have been established |

The explorer always says full cost is not established. Version 1 is intentionally
for bounded, incomplete evidence; it does not certify complete full-cost datasets.
Synthetic status requires `synthetic: true`. A fictional example may use another
budget status with `synthetic: true` and must remain visibly labeled fictional.

## Sources and rows

Each source has `id`, `publisher`, `title`, and `url`. URLs must be HTTPS without
embedded credentials. For fictional cases, `url: null` identifies a synthetic
source rather than inventing an official link. Real cases require citation URLs.

Every row has `id`, `label`, `fund`, `amount`, `treatment`, `reason`, `sourceId`,
`location`, `column`, `period`, `status`, `basis`, and `verified`.

- Row IDs are unique within a case; `sourceId` must exist.
- `location` identifies the table plus printed and one-based PDF pages when available.
  `column` names the exact source column. Do not label unviewed pages verified.
- Row `period`, `status`, and `basis` must equal the case. Separate incompatible records.
- `verified: true` means extraction has been checked against the cited evidence.
  It is an author assertion, not a verification performed by the program.
- Only `unresolved` or `excluded` rows may be unverified or have `amount: null`.
  Zero is a real value. Null is unknown and is never added or charted as zero.

| Treatment | Calculation treatment |
|---|---|
| `headline` | The single starting figure; preserve its reported sign |
| `component` | Already included detail; never add again |
| `allocation_out` | Reported nonpositive offset; subtract it to restore gross presentation |
| `addition` | Add a proven distinct, compatible expense; preserve documented sign |
| `duplicate` | Subtract a proven positive duplication already in the starting aggregate |
| `revenue` | Funding only; no cost addition |
| `transfer` | Financing only; no cost addition or automatic revenue offset |
| `excluded` | Show the amount and reason without changing the starting figure |
| `unresolved` | Show known amount or unknown, but exclude from calculations |

`allocation_out`, `addition`, and `duplicate` also require `scopeConfirmed: true`
and a specific evidence-based reason. A repeated table is normally **excluded**;
it is a `duplicate` deduction only if the starting aggregate actually counts it
twice. Internal-service charges remain components of a department appropriation.
Never remove them merely because the provider is another city department.

The calculation is: headline − allocation_out + addition − duplicate, in row
order. Every intermediate integer is range-checked. Bar widths use absolute
values on a common within-case scale; signed numbers and the equation explain
direction. Negative amounts are not silently converted into positive cost.

## Checks and optional net funding

A check contains `label`, unique `rowIds`, `reported`, and `location`. The program
sums the verified numeric rows and displays **components minus reported**. It
does not replace reported amounts, invent a balancing line, or hide differences.
Check row IDs may describe a separate component subtotal, not just the main bridge.
Explain that scope in the label and citation.

`netFunding` contains `label`, `reason`, `scopeConfirmed: true`, and unique
`revenueIds`. All referenced rows must be `revenue`. The program subtracts them
from the reconciled expenditure subtotal. The author must establish attribution,
compatible scope and non-overlap before setting this field. A transfer is not an
eligible revenue offset. Do not use the label taxpayer cost without separate
evidence; the demo uses a narrower expense–revenue difference.

## Data handling

The renderer embeds data in an inert JSON element and escapes `<` to prevent an
input string from closing that element. UI text uses DOM `textContent`; no data
is treated as HTML. Citation schemes are validated. CSV text that can start a
spreadsheet formula is prefixed with an apostrophe, including formula-like text
after whitespace. Numeric amount cells retain their numeric signs.

Only reviewed public aggregate material belongs in this format. Schema checks
cannot establish authenticity, accounting correctness, public-data status, or
whether two differently named rows describe the same underlying expense.
