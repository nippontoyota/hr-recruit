# End-to-End Latency Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring normal JSON and UI operations toward a sub-second p95 by removing redundant round trips, database work, and JavaScript from critical paths.

**Architecture:** Keep the current Vite/React and synchronous FastAPI/SQLAlchemy architecture. Make latency measurable with a low-overhead response-timing header, use already-fetched candidate detail data for serialization instead of querying it again, preserve the candidate-list work currently in the worktree, and split large route-only dependencies from the profile page.

**Tech Stack:** React 19, TypeScript, Vite 8, FastAPI, SQLAlchemy, Alembic, pytest.

## Global Constraints

- Target sub-second p95 for normal JSON operations; exclude uploads, third-party delivery, and cold wakes.
- Do not add runtime dependencies or weaken authorization, validation, or cache invalidation.
- Preserve the existing uncommitted candidate-list and migration work; never overwrite it.
- Failed or aborted GETs must never populate caches or leave in-flight entries behind.
- Deployable database indexes must be represented by safe Alembic migrations.

---

### Task 1: Measure server request time without changing response bodies

**Files:**
- Create: `backend/app/middleware/server_timing.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_server_timing.py`

**Interfaces:**
- Consumes: ASGI `scope`, `receive`, `send` and the existing FastAPI application.
- Produces: `ServerTimingMiddleware(app)` which appends `Server-Timing: app;dur=<milliseconds>` to every HTTP response without replacing application headers or response bodies.

- [ ] **Step 1: Write failing middleware tests**

```python
def test_server_timing_adds_non_negative_duration_header():
    app = FastAPI()
    app.add_middleware(ServerTimingMiddleware)
    @app.get("/ok")
    def ok(): return {"ok": True}
    response = TestClient(app).get("/ok")
    assert response.status_code == 200
    assert float(response.headers["server-timing"].split("dur=")[1]) >= 0

def test_server_timing_preserves_application_headers():
    app = FastAPI()
    app.add_middleware(ServerTimingMiddleware)
    @app.get("/created")
    def created(response: Response):
        response.headers["X-Trace"] = "preserved"
        return {"ok": True}
    assert TestClient(app).get("/created").headers["x-trace"] == "preserved"
```

- [ ] **Step 2: Verify the tests fail before implementation**

Run: `venv\Scripts\python.exe -m pytest tests/test_server_timing.py -q` from `backend`.

- [ ] **Step 3: Implement a pure-ASGI middleware**

```python
class ServerTimingMiddleware:
    def __init__(self, app): self.app = app
    async def __call__(self, scope, receive, send):
        started = perf_counter()
        async def send_timed(message):
            if message["type"] == "http.response.start":
                message.setdefault("headers", []).append(
                    (b"server-timing", f"app;dur={(perf_counter()-started)*1000:.1f}".encode())
                )
            await send(message)
        await self.app(scope, receive, send_timed)
```

Register it immediately after the existing security middleware in `app/main.py`.

- [ ] **Step 4: Run focused tests**

Run: `venv\Scripts\python.exe -m pytest tests/test_server_timing.py -q` from `backend`.

- [ ] **Step 5: Commit the isolated observability change**

Run: `git add backend/app/middleware/server_timing.py backend/app/main.py backend/tests/test_server_timing.py && git commit -m "perf: expose server request timing"`.

### Task 2: Remove redundant candidate-detail database reads

**Files:**
- Modify: `backend/app/api/v1/candidates_core.py`
- Modify: `backend/app/services/candidate_service.py`
- Modify: `backend/app/services/candidate_work.py`
- Modify: `backend/tests/test_candidate_work.py`
- Modify: `backend/tests/test_frontend_compat.py`

**Interfaces:**
- Consumes: the candidate’s already-loaded profile and evaluations plus exactly one explicit list each of stage history and activity records.
- Produces: `to_candidate_out(..., handed_over: bool | None, ho_handover_blockers: list[str] | None)` and a candidate-detail endpoint that passes data it has already fetched to `offer_blockers` and `build_candidate_work_state`.

- [ ] **Step 1: Add serializer regression tests**

```python
def test_candidate_detail_serialization_uses_supplied_evaluations(mocker, candidate):
    db = mocker.Mock()
    to_candidate_out(candidate, True, db, evaluations=[hq_selected], handed_over=True)
    assert db.scalars.call_count == 0

def test_candidate_work_state_accepts_prefetched_audit_rows(candidate):
    state = build_candidate_work_state(None, candidate, stage_history=[], activities=[], evaluations=[])
    assert state.next_action
```

- [ ] **Step 2: Verify the serializer test exposes the redundant database access**

Run: `venv\Scripts\python.exe -m pytest tests/test_candidate_work.py tests/test_frontend_compat.py -q` from `backend`.

- [ ] **Step 3: Make the detail endpoint fetch each dependency once**

Fetch evaluations, stage history, activity logs, and resume existence once for the detail request. Derive handover from the current stage or those history rows. Pass `evaluations` into `offer_blockers`, pass the three prefetched collections into `build_candidate_work_state`, and pass the precomputed handover/blocker values into `to_candidate_out`. Do not change the JSON schema.

- [ ] **Step 4: Run detail and work-state tests**

Run: `venv\Scripts\python.exe -m pytest tests/test_candidate_work.py tests/test_frontend_compat.py tests/test_ho_handover_gate.py -q` from `backend`.

- [ ] **Step 5: Commit the detail query reduction**

Run: `git add backend/app/api/v1/candidates_core.py backend/app/services/candidate_service.py backend/app/services/candidate_work.py backend/tests/test_candidate_work.py backend/tests/test_frontend_compat.py && git commit -m "perf: reuse candidate detail query data"`.

### Task 3: Keep heavy profile-only code out of the initial profile chunk

**Files:**
- Modify: `frontend/src/pages/candidates/CandidateProfile.tsx`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/scripts/verify-performance-build.mjs`

**Interfaces:**
- Consumes: React `lazy`, `Suspense`, and existing candidate profile stage predicates.
- Produces: lazily imported profile stage widgets and a production-build check that rejects document-viewer packages in the initial entry/profile chunks.

- [ ] **Step 1: Build a failing bundle inspection harness**

```js
const files = await readdir(resolve('dist/assets'));
const entry = await readFile(findEntry(files), 'utf8');
assert(!entry.includes('pdfjs-dist'));
assert(!entry.includes('docx-preview'));
assert(profileChunkBytes < 350_000);
```

- [ ] **Step 2: Run the build and harness to record the baseline**

Run: `npm run build && node scripts/verify-performance-build.mjs` from `frontend`.

- [ ] **Step 3: Lazily load only conditional stage and timeline panels**

Replace static imports for `ActivityTimeline`, `CommunicationTimeline`, and the stage-specific widgets with `lazy(() => import(...))`. Render each with a small `Suspense` fallback only inside the corresponding opened panel or active stage. Keep core header, record sections, stage navigation, and all API functions eagerly available.

- [ ] **Step 4: Configure stable vendor chunks**

Configure Rollup `manualChunks` for `react`, `router`, `motion`, `pdf`, and `docx`. The `pdf` and `docx` chunks must remain dynamically reachable but not imported by login/list/profile entry code.

- [ ] **Step 5: Run frontend verification**

Run: `npm run lint && npm run build && node scripts/verify-dual-build.mjs && node scripts/verify-performance-build.mjs` from `frontend`.

- [ ] **Step 6: Commit the client critical-path reduction**

Run: `git add frontend/src/pages/candidates/CandidateProfile.tsx frontend/vite.config.ts frontend/scripts/verify-performance-build.mjs && git commit -m "perf: defer profile-only client code"`.

### Task 4: Validate candidate-list indexes and end-to-end performance behavior

**Files:**
- Verify: `backend/alembic/versions/s3t4u5v6w7x8_add_work_state_indexes.py`
- Verify: `backend/app/services/candidate_list_query.py`
- Verify: `frontend/src/hooks/api/useCandidates.ts`
- Modify: `backend/tests/test_candidate_list_query.py`

**Interfaces:**
- Consumes: the existing list query, work-state loading options, and current migration.
- Produces: tests that assert bounded query composition and the candidate/history indexes required by the latest-row database access pattern.

- [ ] **Step 1: Add migration and pagination query regression checks**

```python
def test_work_state_indexes_cover_candidate_and_timestamp():
    source = Path("alembic/versions/s3t4u5v6w7x8_add_work_state_indexes.py").read_text()
    assert '["candidate_id", "created_at"]' in source

def test_paginated_list_uses_window_count_once():
    sql = str(build_candidate_list_query(user, CandidateListQuery()).compile())
    assert "ORDER BY" in sql
```

- [ ] **Step 2: Run candidate-list and migration-focused tests**

Run: `venv\Scripts\python.exe -m pytest tests/test_candidate_list_query.py tests/test_candidate_work.py -q` from `backend`.

- [ ] **Step 3: Run the complete verification suite**

Run: `venv\Scripts\python.exe -m pytest -q` from `backend`; then `npm run lint && npm run build` from `frontend`.

- [ ] **Step 4: Measure local endpoint timing without writes**

Use authenticated read-only requests to `/health`, `/auth/me`, a paginated `/candidates` request, and one candidate detail request. Record each `Server-Timing` header and confirm no endpoint exceeds the sub-second target in the local production-like run.

- [ ] **Step 5: Review the complete diff and commit only owned changes**

Run: `git diff --check`, `git status --short --branch`, and stage only files changed by this plan. Do not stage unrelated pre-existing worktree changes.
