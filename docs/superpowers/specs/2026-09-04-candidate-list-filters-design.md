# Candidate list filters and latency design

## Goal

Make the candidate list useful for operational questions such as "which candidates received the application form on 05-09-2026?" while keeping list interactions fast as the dataset grows.

## Scope

- Add Excel-style filters to the candidate table for candidate, position, stage, offer response, branch, next action, source, date added, and application form sent.
- Add sortable columns with ascending, descending, and unsorted states.
- Add one global search field.
- Add CSV export that uses the active filters and sort order.
- Keep the existing role visibility rules, row actions, selection, pagination, and candidate profile navigation.
- Improve the list endpoint and client request behavior for latency.

## User behavior

The table header will expose a compact filter control for each filterable column. Categorical filters use multi-select values with a clear action. Text columns support matching text. Date filters support an exact date, before, after, and a date range.

Dates are entered and displayed as `DD-MM-YYYY`. An exact date such as `05-09-2026` means the full calendar day in the application's India-time operating context. The application-form-sent filter queries `candidates.pre_form_sent_at`, not the current stage or a guessed communication record. Date Added queries `candidates.created_at`.

The global search matches candidate name, candidate ID, phone, email, position, branch, and source. Active filters appear in a summary row and can be cleared individually or all at once. Search and filter changes reset to page one. The UI debounces text input, cancels obsolete requests, and keeps the previous rows visible while a new result is loading.

Sorting is server-side. Clicking a sortable header cycles ascending, descending, and unsorted. Every sorted query gets a stable secondary sort by candidate ID so rows do not jump between pages.

CSV export downloads the complete filtered result set, not only the current page, and applies the selected sort. It uses the same authorization and filter contract as the list endpoint. Export remains available only to roles that can currently export candidate data.

## API design

Extend the candidate list endpoint with a typed query contract for:

- global search
- multi-value stage, offer response, branch, source, position, and next-action filters
- `created_at` date filtering
- `pre_form_sent_at` date filtering
- sort field and direction
- page and limit

The API will validate sort fields against an allowlist and reject invalid dates, directions, and out-of-range pagination values. Date-only parameters will be converted to a half-open day range, `[start, next_day)`, so timestamps at the end of a day are included without relying on `23:59:59.999`.

The endpoint will return only the existing list projection needed by the table plus the total count. Filter option metadata will come from lightweight distinct queries or stable application enums, with role visibility applied. It will not load profile, communications, evaluations, or other relationships for list rows.

Add a CSV endpoint or an export format parameter that reuses the same query builder. It will stream rows in bounded batches, escape CSV values correctly, set UTF-8 output, and send a clear filename. The existing Excel endpoint may remain unchanged unless sharing the query builder removes duplication safely.

## Data and performance

Build one reusable, role-scoped candidate query builder. Apply authorization predicates before user filters. Keep count and page queries on the database. Select only the list columns and avoid per-row relationship queries.

Add indexes for the date and composite access patterns used by the new queries, including form-sent date and the common role or branch plus date ordering path. Confirm the final indexes against the deployed database dialect and migration conventions. Do not add speculative indexes without checking query plans.

On the client, keep one request in flight per list state, abort stale requests, debounce global search, avoid filtering the loaded page for server-owned filters, and memoize only inexpensive display calculations. Do not fetch every candidate to make the browser act as the database.

## Error and empty states

- Invalid filter values return a clear validation error and do not replace the current table with an empty result.
- A failed refresh keeps the last successful rows visible and offers retry.
- Empty filtered results explain that filters are active and provide a clear-all action.
- CSV failures show an actionable toast and reset the export loading state.
- Slow requests show a non-blocking refresh state. Existing row actions remain protected by their current role and workflow rules.

## Testing

Backend tests will cover authorization, each filter family, exact `05-09-2026` date matching, date ranges, null form-sent dates, multi-value filters, stable sorting, pagination, search combinations, invalid parameters, and CSV output. Include a regression test proving that a candidate sent the form on the selected date is found even after moving to a different stage.

Frontend tests or build-level checks will cover filter state serialization, debounce and abort behavior, sort cycling, active-filter clearing, CSV download handling, pagination reset, and rendering of the `DD-MM-YYYY` date format. Verification will include the backend test suite and frontend lint/build commands.

## Acceptance criteria

1. A user can select `05-09-2026` in Application form sent and see every candidate whose recorded form-sent timestamp falls on that day.
2. All requested table columns support the appropriate Excel-style filter behavior.
3. Search, filters, sorting, pagination, and CSV export use the server-side query contract.
4. Existing role restrictions remain intact.
5. The list does not load candidate relationships per row or fetch the full candidate dataset for normal browsing.
6. Tests and production builds pass with the new behavior.
