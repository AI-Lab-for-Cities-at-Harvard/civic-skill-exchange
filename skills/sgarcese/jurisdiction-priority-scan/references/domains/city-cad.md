# Domain pack — City emergency dispatch (CAD) and response

Tier: city (or county, where the county runs the 911 center). Covers police, fire and EMS calls for service as recorded in computer-aided dispatch.

Every standard named here is background knowledge until retrieved in the run. Quote a standard only after confirming its current version.

## Typical remit (List A territory)

Where the context does not define it: the emergency communications center (call answering, call processing, dispatch), and field response by whichever services the principal owns. The 911 center may sit in the police department, the fire department, or a standalone emergency communications agency, and may be run by the county for several cities. Follow the context; the answer decides what the city controls.

## Dataset families to look for

| Family | Search terms | Stock / flow | Why it matters |
|---|---|---|---|
| Police calls for service | [calls for service], [CAD], [police calls], [dispatch] | Flow | Demand, response time, call mix |
| Fire and EMS incidents | [fire incidents], [EMS], [fire calls], [NFIRS], [NERIS] | Flow | Response time, incident mix |
| 911 call answering | [911], [call answer time] | Flow | Often published by a state 911 board rather than the city |
| Crime incidents | [crime], [incidents], [NIBRS] | Flow | Adjacent — not the same as calls |
| Staffing | [sworn staffing], [dispatcher], [overtime] | Headcount: stock. Overtime: flow | Capacity |

Typical CAD fields: incident number, call received, dispatched, en route, arrived, cleared, initial priority, final priority, initial call type, final call type, disposition, source (911, non-emergency line, officer-initiated), beat or district, and one or more unit identifiers.

## Metrics

Break response time into segments; the segments have different owners.

| Segment | From → to | Owner |
|---|---|---|
| Call answering | Ring → answer | 911 center |
| Call processing | Answer → dispatch | 911 center |
| Turnout | Dispatch → en route | Field unit |
| Travel | En route → arrival | Field unit, deployment |
| Time on scene / committed | Arrival → cleared | Field unit |

Report the **90th percentile**, not the mean, and by priority. Also: share of calls officer-initiated; call type mix, especially behavioral health, welfare checks and quality-of-life calls; repeat addresses; calls with no unit available (queued time).

Standards worth checking the current edition of: the NENA call answering standard (long cited as 90% of 911 calls answered within 15 seconds, 95% within 20); NFPA 1710 for career fire departments (turnout and travel time benchmarks at the 90th percentile); the NFPA communications standard, which has been consolidated into a newer standard number. Do not cite any of these without retrieving the current text.

## Timeliness metric

90th-percentile call processing time and total response time for the highest-priority calls, by district.

## Domain traps

- **Rows are often units, not incidents.** One incident with four units is four rows. Count distinct incident numbers for demand; use the first-arriving unit for response time.
- **Officer-initiated calls have near-zero response times** and dilute any average. Exclude them from response time; report them separately as a share of workload.
- **Priority and call type change during a call.** Use the initial priority and initial call type for response time analysis — that is what the dispatcher knew. The final call type is better for what the call turned out to be. The gap between them is itself a finding for behavioral health calls.
- **Bad timestamps.** Missing, placeholder, or out-of-order times produce negative or impossibly long intervals. Filter them, and report the share filtered — a high share is a data quality finding.
- **Cancelled calls and calls with no dispatch** belong in demand counts and not in response time.
- **Calls are not crime.** Calls for service measure demand for response; crime incidents measure reported offenses. Do not substitute one for the other.
- **Location is generalized or withheld** for sensitive call types. Never attempt to re-identify a caller, victim or address.
- **CAD upgrades change the taxonomy.** Call type codes and priority definitions often reset at a cutover. Check before trending across it.

## Acute signals to check

A CAD cutover date; a drop in dispatcher staffing or a spike in 911 center overtime; a major weather event; the launch of an alternative response program; a sustained rise in queued time for high-priority calls.

## External comparators

State 911 boards often publish call volumes and answer times by public safety answering point. USFA's national fire incident reporting system is in transition from NFIRS to NERIS; check which one the city reports to. FBI crime data (NIBRS) is adjacent. Peer-city comparisons are a judgment and the memo should name the basis.

## Local media and resident signals

Local coverage tends to surface: slow response after a specific incident; 911 callers placed on hold; dispatcher shortages and mandatory overtime; CAD or phone system outages; launches and early results of alternative response programs.

An incident story is one call. It is high-salience and says nothing about rates by itself; check the portal for the response time distribution in that district and priority before treating it as a pattern. When it does match the data, it is often the item that moves a principal.

## List B — leverage touchpoints

Dispatch sees every crisis, in real time, at a specific address, and knows which addresses call again. That makes it an early-warning system for problems owned by agencies that never see them as they happen.

Productive territory: behavioral health calls that a clinician-led or 988-linked response could handle; repeat EMS calls to the same building for falls and lift assists (aging services, community paramedicine); repeat fire and EMS calls to the same property (code enforcement); overdose responses (public health, where data sharing allows); encampment and welfare-check calls (homelessness services); quality-of-life calls on the 911 line that 311 could absorb; repeat domestic incidents at an address (victim services — handle with particular care for privacy).

## Cross-tier notes

The 988 crisis line and mobile crisis funding usually run through the state. A state connector can show whether crisis capacity exists where CAD shows demand. Where the county runs dispatch, the city influences rather than controls call processing.
