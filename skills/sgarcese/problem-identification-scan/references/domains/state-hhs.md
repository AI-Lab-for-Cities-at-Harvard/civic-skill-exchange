# Domain pack — State health and human services

Tier: state. Counties administer human services in some states; for those, the county is often the operational unit and the state the policy owner — see cross-tier notes.

Every standard and federal source named here is background knowledge until retrieved in the run. Quote a standard only after confirming its current version.

## Typical remit (List A territory)

Where the context does not define the principal agency's remit, assume some combination of: Medicaid and CHIP eligibility, SNAP, TANF and cash assistance, child care subsidy, child welfare and child protective services, adult protective services and aging, disability services, behavioral health, and public health.

This is the domain where organization varies most. Some states run one umbrella agency; others split Medicaid, public health, child welfare and aging into separate departments; many state-supervise, county-administer. The context's remit is authoritative. If it names only one program, List A covers only that program and everything else moves to List B.

## Dataset families to look for

| Family | Search terms | Stock / flow | Why it matters |
|---|---|---|---|
| Enrollment and caseload by month and county | [Medicaid enrollment], [SNAP recipients], [caseload], [public assistance] | Stock | Scale; never sum across months |
| Applications received and decided | [applications], [determinations] | Flow | Intake volume and throughput |
| Application processing time | [timeliness], [processing time], [pending applications] | Pending: stock. Decisions: flow | **Process improvement** — the core timeliness metric |
| Renewals and terminations, by reason | [renewals], [redetermination], [disenrollment], [terminations] | Flow | Procedural terminations are rework in waiting |
| Fair hearings | [fair hearing], [administrative hearing] | Requests: flow. Pending: stock | Rework and reputation |
| Call center | [call center], [wait time] | Flow | Where applicants feel process failure first |
| Child welfare reports, investigations, entries, exits | [child protective], [foster care], [child welfare] | Reports and entries: flow. In care: stock | Timeliness of response; time to permanency |
| Child care providers, capacity, subsidy use | [child care], [child care subsidy], [child care providers] | Capacity: stock | Supply against need |
| Vital statistics, overdose deaths, communicable disease | [overdose], [vital statistics], [deaths] | Flow | Public health condition |
| Crisis lines and behavioral health | [988], [crisis], [behavioral health] | Flow | Demand for crisis response |

## Federal comparators

- **CMS** — monthly Medicaid and CHIP enrollment by state, and Performance Indicator data covering applications, determinations by processing time, and call center volume, wait time and abandonment.
- **USDA Food and Nutrition Service** — SNAP participation by state, the annual SNAP payment error rate, application processing timeliness, and school meal direct certification rates.
- **HHS Administration for Children and Families** — TANF caseload data, child welfare outcomes reporting, and child care program data.
- **CDC** — provisional drug overdose death counts by state; CDC WONDER for mortality.
- **988 Suicide and Crisis Lifeline** state-level performance data.
- **Census ACS and SAIPE** — denominators for need (poverty, uninsurance) by county.

Federal timeliness rules worth checking the current text of: SNAP applications decided within 30 days, and within 7 days for expedited service; Medicaid determinations within 45 days, or 90 where disability is the basis. Federal legislation enacted in 2025 changed SNAP state cost-sharing in ways tied to payment error rates, and changed Medicaid eligibility rules and redetermination frequency for some adults. Check the current implementation status and dates before treating any of this as a live acute item; do not state thresholds or dates from this file.

## Timeliness metric

Share of applications decided within the federal window, by program and county. Where only enrollment is published, the renewal outcome mix (procedural vs. eligibility-based terminations) is the next-best process signal.

## Domain traps

- **Cases, households and individuals are different units.** SNAP counts households and persons; Medicaid counts individuals; TANF often counts cases. Label every figure.
- **Unduplicated vs. duplicated counts.** A person in three programs appears three times in a cross-program total.
- **Procedural terminations are not eligibility findings.** A termination for missing paperwork, followed by re-enrollment within a few months, is churn — rework on both sides. Look for re-enrollment within 90 days where the data allows.
- **Small-cell suppression.** Counts below a threshold are withheld, often shown blank or as an asterisk. A suppressed cell is not zero; rural county rankings are especially exposed.
- **Child welfare data describes reports, not maltreatment.** Report rates reflect who is watched as much as what happens.
- **Privacy.** Aggregate only. Never attempt to identify a family, child or recipient, even when cell sizes are small.

## Acute signals to check

A spike in pending applications or a fall in timely decisions; an eligibility system cutover; a federal rule taking effect; a sharp change in the procedural termination share; a child fatality review or audit in current reporting; a surge in overdose deaths in a region.

## Local media and resident signals

Local coverage tends to surface: applications delayed or paperwork lost; people losing coverage or benefits at renewal; call center waits; county office staffing and closures; child care center closures and subsidy waitlists; caseworker turnover; and child welfare fatalities.

Handle child welfare stories with particular care. A single tragedy is high-salience and says little about rates on its own; it often does point to a real process question, such as caseload per worker or time to first contact. Name the process question, not the case.

## List B — leverage touchpoints

Human services agencies see people at the moment of need and at every renewal, hold address and household data kept current by that contact, and administer eligibility that other programs could key off.

Productive territory: school meal direct certification from SNAP and Medicaid data (a mature, measurable example of leverage); employment and training connection for SNAP and Medicaid work requirements, which overlaps the labor agency; child care as a labor-force constraint; housing instability visible at application; benefit cliffs; reentry from incarceration; language access; digital access for online applications and renewals; transportation to appointments; overdose response through Medicaid-covered treatment.

## Cross-tier notes

In county-administered states, timeliness and churn vary by county office and are the county's process; the state influences through policy, systems and funding. Tag control accordingly. A city scan using this pack will usually need the state's connector; city health departments may publish their own public health data.
