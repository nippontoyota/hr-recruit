# Candidate list filters and latency implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side Excel-style candidate filters, sorting, search, and CSV export, including exact `DD-MM-YYYY` application-form-sent lookups, without loading the full candidate dataset in the browser.

**Architecture:** Introduce a typed query model and one role-scoped SQLAlchemy query builder shared by paginated JSON and CSV endpoints. Keep date filtering as half-open timestamp ranges, validate all dynamic fields through allowlists, and select only list columns. Replace the current stage/search-only hook state with a serialized query state that debounces search and aborts stale requests.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL, React 19, TypeScript, Vite, existing UI primitives and `lucide-react`, pytest.

## Global Constraints

- Dates are entered and displayed as `DD-MM-YYYY`.
- `05-09-2026` means the full calendar day in the application's India-time operating context.
- Application-form-sent filtering queries `candidates.pre_form_sent_at`.
- Date Added filtering queries `candidates.created_at`.
- Filtering, sorting, pagination, and CSV export happen server-side.
- Do not fetch every candidate for normal browsing.
- Do not load candidate relationships per list row.
- Preserve existing role visibility, workflow rules, row actions, selection, and profile navigation.
- Do not add a dependency for table filtering or CSV generation.

---

## File map

- Create `backend/app/schemas/candidate_query.py` for validated list/export query parameters and filter types.
- Create `backend/app/services/candidate_list_query.py` for role-scoped predicates, filters, sorting, and list projection helpers.
- Modify `backend/app/api/v1/candidates_core.py` to use the shared query contract for JSON and CSV endpoints.
- Modify `backend/app/models/candidate.py` with only indexes justified by query plans.
- Create an Alembic migration under `backend/alembic/versions/` for approved indexes.
- Modify `backend/app/schemas/candidate.py` only if the list response needs explicit query metadata or a reduced projection type.
- Modify `backend/tests/test_candidate_export.py` and create `backend/tests/test_candidate_list_filters.py` for API/query/export coverage.
- Modify `frontend/src/api/candidates.ts` for typed query serialization and CSV download.
- Modify `frontend/src/hooks/api/useCandidates.ts` for debounced, cancellable query state.
- Modify `frontend/src/pages/candidates/CandidatesList.tsx` to render server-owned sorting and filter state.
- Create `frontend/src/components/candidates/CandidateTableFilter.tsx` for reusable popovers, multi-selects, text matching, and date operators.
- Modify `frontend/src/components/candidates/CandidateFilters.tsx` only if global search and active-filter clearing are moved into the shared toolbar.
- Modify `frontend/src/lib/dateTime.ts` or add `frontend/src/lib/candidateListQuery.ts` for `DD-MM-YYYY` parsing/formatting and URL-safe query serialization.

## Task 1: Define the server query contract

**Files:**
- Create: `backend/app/schemas/candidate_query.py`
- Test: `backend/tests/test_candidate_list_filters.py`

**Interfaces:**
- Produces `CandidateListQuery` with `search`, `page`, `limit`, `sort_by`, `sort_direction`, categorical lists, and date filter objects.
- Date filters expose `mode: Literal["equals", "before", "after", "between"]`, `start: date`, and optional `end: date`.
- Sort fields are an allowlist containing `full_name`, `position_applied_for`, `current_stage`, `offer_status`, `branch_location`, `source`, `created_at`, and `pre_form_sent_at`.

- [ ] **Step 1: Write failing validation tests**

```python
def test_exact_date_is_parsed_as_day_month_year():
    query = CandidateListQuery.model_validate({"sent_date": "05-09-2026"})
    assert query.sent_date.start.isoformat() == "2026-09-05"
    assert query.sent_date.end.isoformat() == "2026-09-05"

def test_invalid_sort_field_is_rejected():
    with pytest.raises(ValidationError):
        CandidateListQuery.model_validate({"sort_by": "salary_data"})
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `pytest backend/tests/test_candidate_list_filters.py -q`

Expected: FAIL because the query schema and date parser do not exist.

- [ ] **Step 3: Implement the Pydantic query schema**

Parse `DD-MM-YYYY` explicitly with `datetime.strptime(value, "%d-%m-%Y")`. Reject ambiguous ISO date input for the UI-facing date parameters. Enforce `page >= 1`, `1 <= limit <= 200`, valid sort directions, and `between` ranges where end is not earlier than start. Keep existing `stage` and `search` parameter compatibility while accepting the expanded form.

- [ ] **Step 4: Run the focused tests**

Run: `pytest backend/tests/test_candidate_list_filters.py -q`

Expected: PASS for date parsing, invalid sort fields, invalid ranges, and pagination bounds.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/candidate_query.py backend/tests/test_candidate_list_filters.py
git commit -m "feat: define candidate list query contract"
```

## Task 2: Build and index the shared database query

**Files:**
- Create: `backend/app/services/candidate_list_query.py`
- Modify: `backend/app/models/candidate.py`
- Create: `backend/alembic/versions/20260904_candidate_list_indexes.py`
- Modify: `backend/tests/test_candidate_list_filters.py`

**Interfaces:**
- `build_candidate_list_query(db: Session, user: User, query: CandidateListQuery) -> Select`
- `candidate_list_count(db: Session, statement: Select) -> int`
- `candidate_list_rows(db: Session, statement: Select) -> list[Candidate]`
- `candidate_csv_rows(db: Session, statement: Select, batch_size: int) -> Iterator[Candidate]`

- [ ] **Step 1: Add failing query behavior tests**

Cover role scoping, multi-value stage/branch/source filters, offer response, exact form-sent day matching, created-date ranges, null form-sent values, search combinations, stable secondary sorting, and page boundaries. Use the existing test database fixtures and assert candidate IDs rather than display order alone.

- [ ] **Step 2: Run the tests and confirm the new cases fail**

Run: `pytest backend/tests/test_candidate_list_filters.py -q`

Expected: FAIL for the new filters because the shared builder is not implemented.

- [ ] **Step 3: Implement the role-first query builder**

Start with the existing `_candidate_list_query` role predicates from `candidates_core.py`. Apply filters only after authorization. Use `ilike` for global text search across the approved text columns. Use SQL `>= start` and `< next_day` for exact date filters. Use a correlated `EXISTS` only if a requested next-action value is not a stored candidate column; otherwise map it to the existing work-state source without querying relationships per row. Apply an allowlisted column expression and `Candidate.candidate_id.asc()` as the final order.

- [ ] **Step 4: Add only measured indexes**

Run `EXPLAIN` against representative queries for branch/date, stage/date, and `pre_form_sent_at` date filtering on the target database. Add a standalone `pre_form_sent_at` index and a composite role/date index only when the plan shows a sequential scan for those paths. Use the project’s Alembic naming and schema conventions. Do not index every filter column automatically.

- [ ] **Step 5: Run query tests and migration checks**

Run: `pytest backend/tests/test_candidate_list_filters.py -q`

Expected: PASS, with role boundaries and exact date semantics verified. Run the project’s migration validation command from `backend/README` or deployment instructions and confirm the migration is reversible if the project convention requires downgrades.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/candidate_list_query.py backend/app/models/candidate.py backend/alembic/versions backend/tests/test_candidate_list_filters.py
git commit -m "perf: add indexed candidate list query"
```

## Task 3: Wire JSON and CSV endpoints to the same query

**Files:**
- Modify: `backend/app/api/v1/candidates_core.py`
- Modify: `backend/app/services/candidate_export.py`
- Modify: `backend/tests/test_candidate_export.py`
- Modify: `backend/tests/test_candidate_list_filters.py`

**Interfaces:**
- `GET /candidates` accepts the serialized `CandidateListQuery` and returns the existing paginated response.
- `GET /candidates/export.csv` accepts the same query parameters and streams the full filtered result set.

- [ ] **Step 1: Write failing endpoint tests**

Test that `GET /candidates?sent_date=05-09-2026` finds a candidate whose form was sent that day even when their current stage changed, that CSV honors the same filters and sort, that CSV includes headers and escaped values, and that unauthorized export remains rejected.

- [ ] **Step 2: Run the endpoint tests and confirm failure**

Run: `pytest backend/tests/test_candidate_export.py backend/tests/test_candidate_list_filters.py -q`

Expected: FAIL for the new query parameters and CSV endpoint.

- [ ] **Step 3: Replace duplicated list query logic**

Make `list_candidates` parse `CandidateListQuery`, call the shared builder, count before pagination, and serialize only the existing list response fields. Keep the existing work-state and resume batch helpers bounded to the current page. Return validation errors through FastAPI’s normal 422 response.

- [ ] **Step 4: Add streaming CSV export**

Reuse the exact builder and authorization. Stream the header followed by rows from bounded database batches. Encode UTF-8, quote values with Python’s `csv` module, use stable display labels, and include `Application form sent` and `Date Added` as `DD-MM-YYYY`. Do not include sensitive fields that the current export does not expose.

- [ ] **Step 5: Run endpoint and regression tests**

Run: `pytest backend/tests/test_candidate_export.py backend/tests/test_candidate_list_filters.py -q`

Expected: PASS with the same candidate IDs in JSON and CSV for equivalent filters. Run the broader backend suite before handing off this task.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/candidates_core.py backend/app/services/candidate_export.py backend/tests/test_candidate_export.py backend/tests/test_candidate_list_filters.py
git commit -m "feat: add filtered candidate JSON and CSV endpoints"
```

## Task 4: Add typed frontend query state and filter controls

**Files:**
- Modify: `frontend/src/api/candidates.ts`
- Modify: `frontend/src/hooks/api/useCandidates.ts`
- Create: `frontend/src/components/candidates/CandidateTableFilter.tsx`
- Modify: `frontend/src/components/candidates/CandidateFilters.tsx`
- Create: `frontend/src/lib/candidateListQuery.ts`

**Interfaces:**
- `CandidateListQueryState` mirrors the backend query contract and serializes to `URLSearchParams`.
- `useCandidatesList(initialPage, initialLimit)` returns `query`, `setQuery`, `activeFilterCount`, and the existing loading/result fields.
- `downloadCandidatesCsv(query: CandidateListQueryState): Promise<Blob>` downloads the complete filtered result set.

- [ ] **Step 1: Add frontend serialization tests or a deterministic test harness**

Verify `05-09-2026` is serialized unchanged, multi-select values are repeatable or comma-separated consistently, empty filters are omitted, sort cycles serialize correctly, and clearing filters resets the page.

- [ ] **Step 2: Implement query serialization and API calls**

Keep the request builder deterministic. Add `AbortSignal` support to list and CSV calls. Preserve the existing API client error extraction. Do not issue a request for every keystroke; expose the raw search value separately from the debounced query value.

- [ ] **Step 3: Implement cancellable hook state**

Use one `AbortController` per query effect. Debounce only global search, reset `page` to one when any filter or sort changes, and leave previous rows rendered while refreshing. Do not apply `matchesQueue` or other server-owned filtering to the loaded page.

- [ ] **Step 4: Implement filter popovers**

Build one reusable filter control with a trigger, active indicator, clear action, and keyboard-accessible popover. Use multi-select checkboxes for stage, offer response, branch, source, and next action. Use text input for candidate and position. Use a date operator plus `DD-MM-YYYY` inputs for Date Added and Application form sent. Keep the control small enough for the existing dense header and allow horizontal scrolling on narrow screens.

- [ ] **Step 5: Run frontend checks**

Run: `npm run lint --prefix frontend`

Expected: PASS with no new lint errors. Run the frontend build after Task 5 because table rendering is completed there.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/candidates.ts frontend/src/hooks/api/useCandidates.ts frontend/src/components/candidates/CandidateTableFilter.tsx frontend/src/components/candidates/CandidateFilters.tsx frontend/src/lib/candidateListQuery.ts
git commit -m "feat: add candidate list query state and filters"
```

## Task 5: Replace the table header behavior and add CSV export

**Files:**
- Modify: `frontend/src/pages/candidates/CandidatesList.tsx`
- Modify: `frontend/src/components/candidates/CandidateFilters.tsx`
- Modify: `frontend/src/lib/dateTime.ts` when the existing formatter does not render `DD-MM-YYYY`
- Modify: `frontend/src/types/index.ts` when the typed list fields are missing

**Interfaces:**
- The table receives server-filtered candidates and never filters the full dataset in memory.
- Sort buttons expose `aria-sort` and cycle `none -> ascending -> descending -> none`.
- CSV export uses the current query state and names the file `nippon-toyota-candidates.csv`.

- [ ] **Step 1: Write the table interaction checks**

Exercise sort cycling, filter open/close, active-filter count, clear-all, no-result state, pagination reset, export loading/error state, and row selection while refreshing. Confirm the filter controls stop event propagation so opening a filter does not navigate to a candidate.

- [ ] **Step 2: Replace the current header and toolbar state**

Keep the checkbox, existing actions, work queue behavior, loading skeleton, error state, empty roster state, and profile navigation. Add filter triggers to the requested columns and a compact active-filter summary. Use the server’s `total_count` in the result summary rather than the current page length.

- [ ] **Step 3: Add CSV export from current state**

Call `downloadCandidatesCsv(query)`, create an object URL, trigger a download, and revoke the URL in a `finally` path. Show a clear error toast if export fails. Keep export role-gated using the existing `canExport` rule.

- [ ] **Step 4: Remove client-side latency traps**

Delete the page-local derived filtering for server-owned filters. Keep only presentation calculations such as work-state labels. Avoid rendering expensive components in table cells and preserve row identity with candidate IDs.

- [ ] **Step 5: Run the frontend build and checks**

Run: `npm run lint --prefix frontend; npm run build --prefix frontend`

Expected: both commands exit with code 0, including the project’s dual-build verification.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/candidates/CandidatesList.tsx frontend/src/components/candidates/CandidateFilters.tsx frontend/src/lib/dateTime.ts frontend/src/types/index.ts
git commit -m "feat: add fast candidate table filters and CSV export"
```

## Task 6: Verify latency and full acceptance criteria

**Files:**
- Modify: relevant backend or frontend files only if verification finds a defect.
- Test: backend and frontend test/build commands.

- [ ] **Step 1: Run the complete backend suite**

Run: `pytest backend -q`

Expected: exit code 0 with zero failures. If the repository requires a specific backend working directory, run the equivalent command from that directory and record the result.

- [ ] **Step 2: Run the complete frontend verification**

Run: `npm run lint --prefix frontend; npm run build --prefix frontend`

Expected: exit code 0 for lint, production build, and dual-build verification.

- [ ] **Step 3: Measure representative list requests**

Use the deployed-like database and capture query plans plus request timings for an unfiltered first page, a global search, an exact `05-09-2026` form-sent filter, a multi-filter query, and a sorted page after page one. Confirm no query loads relationships and no request returns more than the requested page size during browsing.

- [ ] **Step 4: Check acceptance criteria against the running app**

Verify the exact date lookup, categorical filters, sort cycle, search fields, CSV parity, role restrictions, pagination, refresh behavior, and `DD-MM-YYYY` display. Check desktop and narrow-screen table usability.

- [ ] **Step 5: Review the final diff and commit any bounded fixes**

Run: `git diff --check; git status --short`

Expected: no whitespace errors, only intended files changed, and no generated artifacts committed.
