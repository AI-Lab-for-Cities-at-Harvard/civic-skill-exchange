# Interactive evidence explorer

## Run the example

From the inner `municipal-department-cost-explainer` directory, run:

```bash
python3 scripts/render_explorer.py --demo --output /tmp/follow-the-money.html
```

Open that HTML file in a modern browser. Python 3.10+ is required for generation;
no Python packages, installation, server, CDN, or network access is required.
Browser JavaScript is needed for interaction. The generated file contains the
data, styles, and application; keep it outside the submitted skill directory.
The renderer refuses to replace an existing file unless `--force` is supplied.

Choose a case, then activate its reported budget line. The open view contains:

1. Headline, documented subtotal, and an explicit statement of incomplete coverage.
2. Zero-based bars and an equation explaining each supported adjustment.
3. An evidence ledger with reported signs, reasons, fund, source, page and column.
4. Funding shown separately, with a net calculation only when explicitly supported.
5. Arithmetic discrepancies, missing evidence, and questions for Finance.

Use **Download evidence CSV** for the selected case's source ledger. The CSV
includes fiscal year, status, basis, scope, source locations and limitations.
Empty amount cells mean unknown, never zero. The on-screen report supplies the
calculated subtotals; the CSV preserves reported ledger amounts.

Use **Print / save report** for the selected case's complete report, including
detail when the interactive panel is closed. Choose Save as PDF in the browser's
print dialog if desired. No email is sent and no file is uploaded automatically.

## Use reviewed local data

Complete the main skill's source and reconciliation steps first. Follow
[the data contract](data-contract.md); use [example-data.json](example-data.json)
for structure. Do not copy amounts, dates or accounting treatments to another city.

```bash
python3 scripts/render_explorer.py --input reviewed-evidence.json --output /tmp/department-explorer.html
```

Each case is one department, one period, one budget status and one accounting
basis. Establish exact fiscal dates before rendering; a fiscal-year label alone
does not establish the calendar. If those essentials are unknown, provide the
source inventory and unanswered questions from the main skill instead.

Classification, scope and non-overlap require source review. The validator checks
declared structure and arithmetic ranges; it cannot verify accounting judgments
or whether the cited document supports a claim. Do not classify a disputed entry
as an addition just to balance the chart. Keep it unresolved with its stated amount.

## Integrate into a budget explorer

For an existing General Fund table, retain a stable case ID for each department
and open that case's evidence view from its budget line. This standalone reference
implementation uses a case selector and a clickable headline. It does not connect
to an existing dashboard, automatically parse budget PDFs, or supply every city
department. Adapt the same reviewed data and calculations in the host application;
do not pass totals from charts back into the evidence ledger as new expenses.

The `assets/` files are source templates, not a hosted website. Generate a file
for local review; publishing requires a separate authorized hosting action. A
generated HTML file embeds all input data and exposes it to anyone receiving the
file. Use only public aggregate budget information. No accounts, telemetry,
local storage, credentials, remote scripts, or backend are used. Citation links
open official sources only when a visitor chooses them.

## Design and accessibility

Sunshine Economics colors: teal `#2a7d78`, pale blue `#eefeff`, yellow `#ffd633`
as a small accent; white background. System and Georgia fonts avoid remote font
loads. Text labels, signed numbers and tables accompany every bar. Bar length
encodes magnitude, not evidence completeness or city performance. No cross-city
scale, ranking, funding pie, or percentage of complete cost is inferred.

Controls use native buttons/selects, visible keyboard focus, a skip link, an
announced case change and an expanded-state attribute. The detail heading receives
focus after opening. Layout adapts to narrow screens; the evidence table scrolls
horizontally. Print includes source URLs, limitations and the draft notice.
W3C guidance informs the text alternatives; this is not accessibility certification.

## Files and checks

| File | Purpose |
|---|---|
| `scripts/render_explorer.py` | Validate input and create a standalone HTML file |
| `scripts/test_explorer.py` | Dependency-free input and rendering regression tests |
| `assets/explorer.html` | Semantic page template |
| `assets/explorer.css` | Responsive and print layout |
| `assets/explorer.js` | Selection, disclosure, reconciliation, checks and CSV |
| `references/example-data.json` | Three public snapshots and one fictional case |
| `references/data-contract.md` | Field definitions and inclusion rules |
| `references/validation.md` | Reproduction instructions, results and limits |

Run `python3 scripts/test_explorer.py` before distributing an edited renderer.
Recheck every data change against its source, and repeat browser checks when UI
code changes. Finance review remains necessary before use in a budget decision.
