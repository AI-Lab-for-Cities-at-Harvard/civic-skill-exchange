# Domain pack — City operations: permits, code enforcement, city workforce

Tier: city (or county). Three sub-domains that often share a principal — a chief operating officer, a performance office, or a mayor's office. Scan one sub-domain per run unless the principal owns all three.

## Typical remit (List A territory)

Where the context does not define it: building permits and inspections; code and housing enforcement; the city's own workforce as an employer (hiring, retention, overtime). Each usually has its own department; List A follows what the principal owns.

## Dataset families to look for

| Family | Search terms | Stock / flow | Why it matters |
|---|---|---|---|
| Building permits | [building permits], [permits issued], [permit applications] | Applications, issuances: flow. Pending: stock | Time to permit; review cycles |
| Inspections | [inspections], [building inspections] | Flow | Wait time; first-pass rate |
| Code enforcement cases and violations | [code enforcement], [code violations], [housing violations] | Cases opened: flow. Open cases: stock | Time to first inspection; time to compliance |
| Business licenses | [business licenses] | Flow | New business formation |
| Employee payroll | [payroll], [employee earnings], [salaries] | Earnings: flow | Overtime concentration |
| Headcount, vacancies, separations | [headcount], [vacancies], [separations], [workforce] | Headcount, vacancies: stock. Hires, separations: flow | Capacity and attrition |

## Metrics

- **Permits:** median and 90th-percentile time from application to issuance by permit type; number of review cycles per permit; share approved on first review; inspection wait time; first-inspection pass rate.
- **Code enforcement:** time from complaint to first inspection; time from violation to compliance; share of cases complaint-driven vs. proactive; repeat properties; fines issued against fines collected.
- **City workforce:** vacancy rate by department at a single date; separations per hundred employees; overtime as a share of earnings by department; the age or tenure profile where published.

## Timeliness metric

Permits: time to issuance. Code enforcement: time to first inspection. Workforce: time to fill a vacancy, where published.

## Domain traps

- **Review cycles are rework, and they are usually invisible.** If the data has only application and issuance dates, the scan cannot separate city review time from time the applicant took to respond. Say so; do not attribute the whole interval to the city.
- **Permit types are not comparable.** A fence permit and a new multi-family building sit in the same table. Always segment by type before computing times.
- **Valuation is self-reported** by the applicant and should not be treated as construction cost.
- **Cases vs. violations.** One code case can carry many violation rows. Count distinct cases for workload.
- **Proactive enforcement changes the numbers** the same way employee-generated 311 requests do. Split by origin.
- **Annual payroll is not headcount.** It includes partial-year, seasonal and departed employees. Counting names in a payroll file overstates staffing; use a headcount series or a single pay period.
- **Overtime in payroll can include retroactive pay, details and other pay types** depending on how the city codes them. Check the pay-type definitions before calling it overtime.

## Acute signals to check

A permitting system cutover; a surge in applications after a rule or fee change; a code enforcement backlog following a storm or a building failure in the news; a hiring freeze or a wave of retirements; an overtime spike in one department.

## External comparators

The Census Building Permits Survey publishes monthly permits by place — a cross-check on the city's own counts. BLS QCEW publishes local government employment and wages by county. Peer-city comparisons are a judgment; name the basis.

## Local media and resident signals

Local coverage tends to surface: permit delays from builders and small business owners; building failures and the enforcement history behind them; landlord and tenant disputes over unaddressed violations; payroll and overtime stories, since many local papers publish annual city payroll databases; hiring freezes and vacancies in visible departments.

Business associations and neighborhood groups are where permitting and code complaints are raised, when a tool can reach them.

## List B — leverage touchpoints

Permitting sees every construction project and new business at the moment of investment. Code enforcement sees housing conditions from inside. The city's payroll sees the city's own workforce.

Productive territory: local hiring and apprenticeship on permitted projects (workforce); housing supply and the permit pipeline for new units (housing); lead, mold and asthma triggers found in inspections (public health); tenant protection where code cases cluster (housing, legal services); small business support at licensing (economic development); the city's own retirement wave as a workforce pipeline problem (labor, training).

## Cross-tier notes

Contractor licensing and building codes are often set by the state; the city influences rather than controls them. State labor data on construction employment and apprenticeship helps size local-hire opportunities.
