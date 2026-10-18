---
name: housing-brief
description: "Writes a short housing conditions brief or memo for a U.S. city or county (a state works too, with fewer comparisons), with recommendations first and then demand, construction economy and assisted-housing findings, using the same Census, BLS and HUD data as the housing dashboard. Use when someone asks for a housing memo, briefing, one-pager, talking points or what the data says about housing in a place, with or without an existing dashboard."
license: MIT
compatibility: >
  U.S. cities and counties; a state works with fewer comparisons. Reuses build-housing-dashboard's data and scripts, so both must be installed together. The fallback scripts need your own credentials: a contact email for BLS (BLS_CONTACT_EMAIL), and API keys (BLS_API_KEY, CENSUS_API_KEY) for anything beyond light use. The plugin ships none.
metadata:
  civic.category: policy
  civic.category-secondary: data-analysis
  civic.scope: municipal
  civic.scope-secondary: regional
  civic.language: en
  civic.localization: generalized
  civic.data-sensitivity: none
  civic.human-review: advisory-only
---

# Housing brief

## 1. Get the data
- If a dashboard run exists for the place (`housing-runs/<slug>/build/dashboard_data.json`), reuse it. Refresh it first only if it is more than a few months old and the user wants current figures (see the refresh skill's release calendar).
- Otherwise run Steps 1–2 and Step 3.1 of `../build-housing-dashboard/SKILL.md` (geography, pulls, `build_data.py`). You do not need to render the dashboard.
- Run `python3 ../build-housing-dashboard/scripts/digest.py <run>` and work only from its numbers.

## 2. Ask what the brief is for
Unless the request already says, ask the user once (with the host's question tool if it has one). Offer audience options (mayor/council, housing department staff, funders or partners, public/press) and a length (one page, or two to three pages). The audience decides which recommendations lead and how technical the language is.

## 3. Write it
Follow `references/brief-structure.md`. Core rules:
- Recommendations before background. Each recommendation names the problem it addresses, the evidence (one or two numbers) and the lever: zoning/land use, funding, preservation, workforce, tenant support, or data.
- Direct, specific, evidence-based prose. No filler, no adjectives doing the work of numbers.
- Every number carries its source and period in the text or a note ("ACS 2020–2024", "BLS PPI, Aug 2026").
- Say what the data cannot show: no permits, no evictions, voucher floors, regional CPI.
- Recommendations are options for the reader to weigh, not verdicts.

## 4. Deliver
- Default: a document the user can edit and share. Use the host's document tool when one exists (for example a Claude doc), otherwise a Markdown file. Produce .docx or PDF only when asked.
- If a dashboard exists, link it at the top as the companion.
- In the reply, summarize the top three recommendations in two or three sentences.
