# Domain pack — City 311 and service delivery

Tier: city (or county). 311 is an intake and routing system; resolution usually belongs to departments. Whether List A includes departmental resolution depends on who the principal is — see remit.

## Typical remit (List A territory)

Where the context does not define it:

- **If the principal is the 311 or customer service office:** intake across channels, call handling, routing to the right department, request categorization, status communication to residents, and the integrity of closure data.
- **If the principal is the chief operating officer, a performance office, or a mayor's office:** all of the above plus departmental resolution — time to close, closure quality, repeat problems.

Departments that resolve requests (public works, sanitation, transportation, parks, code enforcement) are List A only when the principal owns them.

## Dataset families to look for

| Family | Search terms | Stock / flow | Why it matters |
|---|---|---|---|
| Service requests, one row per request | [311], [service requests], [constituent requests], [CRM] | Opened and closed: flow. Open requests: stock | The core series |
| Call center metrics | [311 call center], [call volume], [wait time] | Flow | Intake capacity |
| Work orders from departmental systems | [work orders], [asset management] | Flow | What happened after routing |
| Neighborhood and district boundaries | [neighborhoods], [council districts], [wards] | — | Geography for equity analysis |
| Population by small area | Census ACS by tract or block group | Stock | Denominators for per-capita rates |

The Open311 GeoReport v2 standard names fields many cities follow: `service_request_id`, `status`, `service_code`, `service_name`, `agency_responsible`, `requested_datetime`, `updated_datetime`, `expected_datetime`, `address`, `lat`, `long`, `status_notes`. Local CRMs often diverge — an open date, a closed date, a case status, a closure reason, a source or channel, a queue or department. Map the local schema to these concepts before analysis.

## Metrics

- **Time to close by request type, as a median and 90th percentile** — not a mean. Close times are heavily skewed.
- **Share closed within the department's target**, where targets are published.
- **Closure reason mix** — resolved, duplicate, no action needed, unable to locate, referred elsewhere. A rising "unable to locate" or "no action" share is often a routing or form problem.
- **Reopen and duplicate rates** — rework, measured.
- **Backlog age** — open requests by how long they have been open, at a single snapshot date.
- **Channel mix** — phone, web, app, social, walk-in, employee-generated.
- **Requests per 1,000 residents by neighborhood**, with the caveat below.

## Timeliness metric

Median and 90th-percentile time to close for the highest-volume request types, by neighborhood.

## Domain traps

- **Closed is not resolved.** Administrative closures — duplicate, no action, transferred, closed after contact attempts — sit in the same status as a completed repair. Always split by closure reason before computing time to close.
- **Employee-generated requests.** Crews logging problems they found themselves inflate volume and shorten average close times. A change in that share looks like a change in demand. Split by source.
- **Request volume measures reporting, not need.** Neighborhoods differ in their propensity to report. Low volume can mean few problems or little trust in the system. Equity analysis should compare time to close and closure quality across neighborhoods, and treat volume per capita as a lead, not a finding about conditions.
- **Status tables are snapshots.** Most published 311 data carries only the current status and final timestamps, not the history. Time spent in each stage usually cannot be computed; say so rather than inferring it.
- **Category taxonomies change** with CRM upgrades and reorganizations. A request type that disappears in one year and a new one that appears are often the same thing. Check for a break before reporting a trend.
- **Yearly files.** On CKAN portals 311 data is commonly one resource per year; see `backends.md`.

## Acute signals to check

A storm, snow event or heat wave in the last 90 days; a new app or CRM launch (channel mix and category shifts follow); a department's backlog jump; a sudden change in closure reason mix; a service change (collection schedule, parking rule) that generated a wave of requests.

## External comparators

311 has no federal standard. Many peer cities publish comparable 311 data; any peer comparison is a judgment about which cities are similar, and the memo should name the basis. Census ACS supplies denominators; NOAA weather records explain seasonal and storm-driven spikes.

## Local media and resident signals

Local coverage of 311 is usually framed as a neighborhood story: potholes, missed trash pickup, rats, broken streetlights, illegal dumping, "I reported it five times". Council members complaining about response in their districts are a recurring and useful signal. App or phone outages make the news when they happen.

Neighborhood groups and community forums are where 311 complaints live, when a tool can reach them. They skew toward residents already inclined to report — the same bias as 311 volume itself.

## List B — leverage touchpoints

311 sees every block continuously, hears from residents at the moment a problem is noticed, and holds a geocoded record of conditions no other system keeps. It is also a channel the city can speak back through.

Productive territory: housing conditions surfacing as heat, hot water, pest or mold complaints (code enforcement, public health); illegal dumping and vacant lots (blight, public safety); encampment requests (homelessness services); streetlight outages clustered near transit (safety, transportation); rodent complaints (sanitation, public health); non-emergency calls reaching 911 that 311 could absorb (dispatch capacity); pushing information back to residents at the moment of contact — cooling centers, benefits, tenant rights.

For each, name the request types that carry the signal and the department that owns the response.

## Cross-tier notes

Some 311 signals map to state programs — housing conditions to state weatherization and energy assistance, lead complaints to state health. Where a state connector exists, one cross-tier query can turn a city signal into a List B item with a named state owner.
