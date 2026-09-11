# End-to-End Latency Reduction Design

## Goal

Make the Recruitment Portal materially faster across initial navigation, candidate
lists, candidate profiles, forms, and routine updates without weakening data
correctness or showing stale results after mutations.

## Scope

- Preserve and validate the in-progress candidate-list query, cache, and index
  changes already present in the worktree.
- Reduce client-side JavaScript and delay expensive PDF/DOCX work until the user
  opens the feature that needs it.
- Remove avoidable client request waterfalls and duplicate concurrent reads.
- Reduce API and database work on high-traffic list, profile, dashboard, history,
  and lookup endpoints.
- Add lightweight timing evidence so future performance regressions are observable.

Out of scope: changing product workflows, loosening authorization, using stale
data after writes, broad schema redesigns, and speculative indexes that do not
serve a measured query shape.

## Architecture and Data Flow

### Frontend

Routes remain lazy-loaded. The implementation will inspect the production bundle,
then isolate large document/PDF dependencies from ordinary candidate and dashboard
workflows. Candidate-profile subpanels will only load their data when they are
visible or required for the active action.

The shared API client will coalesce identical in-flight GET requests and retain
short-lived cached responses. All non-GET mutations continue to invalidate cached
GET data before the next read, preserving immediate UI consistency.

### API and Database

Hot endpoints will be measured and optimized using their actual request shapes.
Independent reads will run together where safe. List and detail responses will
select/eager-load only the relationships needed by their response contracts,
avoiding per-row relationship queries and repeated serialization work.

The candidate-list indexes already in progress are the first database change.
Additional indexes are limited to confirmed filter/order/join paths for dashboard,
profile-history, and reusable lookup endpoints. Their migrations must be safe for
an existing production database.

### Observability

The API will expose request duration in a response header for development and
production diagnostics without emitting candidate data. Development diagnostics
will make it possible to compare endpoint timings before and after each targeted
change.

## Error Handling and Correctness

- Request cancellation remains supported when a component unmounts or an input
  changes.
- GET coalescing must remove failed or aborted requests from its in-flight map;
  failures must never be cached as successful data.
- Cache invalidation remains conservative after every write.
- Database migrations use idempotent-safe operations where required by the
  migration framework and are validated against the test database.
- Deferred profile panels retain clear loading and error states rather than
  presenting incomplete data as final.

## Validation

1. Capture baseline and final production build asset sizes.
2. Run targeted backend query/API tests, including candidate-list pagination,
   filtering, counts, access scope, and mutation invalidation behavior.
3. Run frontend lint and production build checks.
4. Inspect timing headers and request counts for login, candidate lists, candidate
   profiles, and form/update flows in a local production-like run.

## Success Criteria

- Initial protected-page JavaScript excludes document-viewer code unless that
  capability is opened.
- Repeated concurrent reads result in one network request per cache key.
- Candidate-list, profile, dashboard, history, and lookup paths avoid known
  avoidable query waterfalls and N+1 access patterns.
- All current behavior and permission scopes continue to pass targeted tests.
