# OpenContext Backends

OpenContext (github.com/sgarcese/OpenContext) deploys one MCP server per portal, and **each deployment runs exactly one backend**. The backend decides the tool verbs, the query dialect, and the row limits. This file is what lets the same scan run against any of them.

Tool names follow `mcp__<connector>__<backend>__<verb>`, where `<connector>` is whatever the connector was named when it was added to Claude (spaces become underscores) and `<backend>` is the plugin prefix. Custom plugins use their own prefix. If the tool list does not match the table below, trust the tool list and read each tool's description before calling it.

## Verbs by backend

| Job | Socrata | CKAN | ArcGIS Hub | Opendatasoft |
|---|---|---|---|---|
| Search the catalog | `search_datasets` | `search_datasets`, `list_datasets` (exact-match filters, sort) | `search_datasets` (query required) | `search_datasets` |
| Browse by category | `list_categories` | `get_catalog_stats` | `get_aggregations` | `list_categories` |
| Dataset metadata | `get_dataset` (4x4 ID) | `get_dataset` (returns every resource with its own ID) | `get_dataset` | `get_dataset` |
| Schema | `get_schema(dataset_id)` | `get_schema(resource_id)` | `get_schema(dataset_id)` | `get_schema(dataset_id)` |
| Query rows | `query_dataset(dataset_id, soql_query)` | `query_data(resource_id, filters, limit)` | `query_data(dataset_id, where, out_fields, limit)` | `query_data(dataset_id, where, select, order_by, limit)` |
| Aggregate server-side | SoQL `GROUP BY` in `query_dataset` | `aggregate_data` or `execute_sql` | **Counts only**, via `get_aggregations` | `aggregate_data`, or aggregates in `select` |
| Raw query | `execute_sql(dataset_id, soql)` | `execute_sql(sql)` (validated `SELECT`) | — | — |
| Row cap per call | Set by `LIMIT`; default is low | Set by `limit` | **1,000 max**, default 100 | **100 max** |

## Socrata

- The query parameter for `query_dataset` is `soql_query` (not `soql`, not `query`). `execute_sql` takes `soql`.
- The `SELECT` is written without a `FROM` clause.
- `GROUP BY` is required whenever any aggregate appears.
- `LIMIT` caps rows returned and can silently truncate an aggregation — set it above the expected group count.
- Booleans are `= true` / `= false`, never `'Y'` or `1`.
- Conditional counts: `SUM(CASE WHEN col = true THEN 1 ELSE 0 END)`.
- Dates compare as quoted ISO strings: `WHERE month >= '2025-01-01'`.
- A query failing with an app-token error while search still works means the connector was configured with an API key rather than an app token. That is a connector problem to report, not a dataset problem.

Pattern — a ranking by geography that avoids the mixed-granularity trap:

```sql
SELECT <geo_field>, AVG(<metric>) AS avg_value
WHERE <period_field> = <period> AND <geo_field> NOT IN (<aggregate rows found by inspection>)
GROUP BY <geo_field> ORDER BY avg_value DESC LIMIT 20
```

Run `SELECT DISTINCT <geo_field>` first to find the aggregate rows; do not guess them.

## CKAN

- A CKAN *dataset* holds one or more *resources*, and queries run against a **resource ID**, not the dataset ID. Call `get_dataset` first to get resource IDs.
- **Series split by year are common.** A 311 or incident dataset often has one resource per year. A multi-year trend means one query per resource; forgetting this produces a "trend" that is really one year. Resource names and dates in `get_dataset` output identify each slice.
- Only resources with the DataStore flag are queryable. A resource that is a file download only cannot be queried through the connector; say so rather than working around it.
- `aggregate_data` takes `metrics` as alias → expression (`{"cnt": "count(*)"}`), supports `count`, `count(distinct)`, `sum`, `avg`, `min`, `max`, `stddev`, `variance`, and `having`. Prefer it to hand-written SQL.

## ArcGIS Hub

- Queries go through the Hub to a Feature Service. `where` is an ArcGIS SQL fragment; `out_fields` limits columns.
- **There is no server-side sum or average through the connector.** `get_aggregations` returns counts for a field. Anything else — mean response time, median days open — has to be computed from returned rows, and returned rows cap at 1,000. For any dataset larger than that, a computed average is a sample, not a population figure: say so, say how the rows were ordered, and mark the item `Partial`.
- A narrow `where` (one month, one category) is the usual way to get a population small enough to compute on honestly.
- Feature Services hosted on the jurisdiction's own GIS server may be blocked unless the connector lists that host as trusted. A dataset that appears in search but will not query is often this.

## Opendatasoft

- ODSQL fragments, not full SQL. String literals take double quotes. Full-text match uses `search("text")`; wildcards use `like "North*"`.
- **Records return at most 100 rows per call.** Never count rows returned. Use `aggregate_data`, or `count(*)` in `select` with `group_by`.
- `order_by` may reference a `select` alias.

## Traps that cross every backend

- **The row cap hides itself.** A result of exactly 100 or 1,000 rows is almost always a truncation. Treat any round-number count as suspect until an aggregate confirms it.
- **Timestamps may be UTC or local.** A dataset stored in UTC will shift evening events into the next day. Check before any hour-of-day or day-of-week analysis.
- **Location may be generalized.** Public safety and human services data is often offset to the block or withheld. Do not treat a coordinate as an address, and do not attempt to re-identify.
- **Portal search is not exhaustive.** A dataset that search does not return may still exist under a different title. Browse by category once before concluding a series is absent.
