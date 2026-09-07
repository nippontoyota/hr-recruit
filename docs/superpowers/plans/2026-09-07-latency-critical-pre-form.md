# Latency-Critical Pre-Form Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce public pre-form submission latency and repeated network traffic while preserving the existing all-or-nothing file gate, Toyota/River isolation, and candidate data integrity.

**Architecture:** Add backward-compatible batch upload authorization and confirmation endpoints. The frontend uses one batch authorization request, concurrent direct storage uploads, and one batch confirmation request before the existing final JSON submission. The backend avoids redundant final refresh/count queries and the frontend guards the submit action with a synchronous in-flight lock.

**Tech Stack:** React 19, TypeScript, Vite, FastAPI, SQLAlchemy, Supabase Storage, pytest.

## Global Constraints

- Do not submit, alter, delete, or migrate any existing candidate data during testing.
- Preserve the existing file-before-text all-or-nothing submission gate.
- Preserve Toyota/River brand isolation and existing public endpoint compatibility.
- Do not add runtime dependencies.
- Keep large-file and failed-upload behavior recoverable.

---

### Task 1: Add safe batch upload contracts and service behavior

**Files:**
- Modify: `backend/app/api/v1/candidates_public.py`
- Test: `backend/tests/test_pre_form_full_apply.py`

**Interfaces:**
- Consumes: existing `PublicUploadUrlRequest`, `PublicUploadConfirmRequest`, storage signing, storage existence checks, and pre-form token guards.
- Produces: `POST /candidates/public-upload-urls/{token}` returning `{ files: PublicUploadUrlOut[] }`; `POST /candidates/public-upload-confirms/{token}` accepting `{ files: PublicUploadConfirmRequest[] }` and returning `{ status: "ok" }`.

- [ ] **Step 1: Write failing endpoint tests**

  Add tests that mock the database and storage, then assert the batch authorization endpoint signs both requested files and the batch confirmation endpoint verifies both paths and commits the resume/profile records once. Add a rejection test for an invalid path and assert no submission status change occurs.

- [ ] **Step 2: Run focused tests to verify failure**

  Run `venv\\Scripts\\python.exe -m pytest tests/test_pre_form_full_apply.py -q` from `backend`. Expected: the new endpoint tests fail because the routes do not exist.

- [ ] **Step 3: Implement the batch endpoints**

  Reuse the existing token, size, content-type, safe-filename, and path-prefix checks. Resolve the two signed URLs concurrently with `asyncio.to_thread`. Verify requested storage objects concurrently before making one database commit for the batch. Keep the existing single-file endpoints unchanged for old clients.

- [ ] **Step 4: Run focused tests to verify the implementation**

  Run `venv\\Scripts\\python.exe -m pytest tests/test_pre_form_full_apply.py -q`. Expected: all focused tests pass.

- [ ] **Step 5: Commit the backend batch path**

  Run `git add backend/app/api/v1/candidates_public.py backend/tests/test_pre_form_full_apply.py` and commit with `feat: batch public pre-form uploads`.

### Task 2: Use the batch path and prevent duplicate submits in the frontend

**Files:**
- Modify: `frontend/src/api/candidates.ts`
- Modify: `frontend/src/pages/candidates/PreFormPage.tsx`

**Interfaces:**
- Consumes: the batch endpoints from Task 1 and the existing direct signed storage upload response.
- Produces: a single `publicApplyFullCandidate` upload flow with one batch authorization request, concurrent PUTs, one batch confirmation request, and a synchronous submit lock.

- [ ] **Step 1: Add frontend request-shape tests/checks**

  Extend the existing no-write runtime harness to assert the compiled upload helper preserves both file kinds and that the submit handler contains an in-flight guard before any write request.

- [ ] **Step 2: Implement batch upload orchestration**

  Add typed API helpers for batch authorization and confirmation. In `publicApplyFullCandidate`, request both signed URLs once, upload both files with `Promise.all`, confirm both once, then call the existing final JSON endpoint. Retry only failed direct storage PUTs with the same signed path; do not create new upload records for a confirmation response that may already have succeeded.

- [ ] **Step 3: Add a synchronous submit lock**

  Add a `useRef<boolean>` lock checked at the start of `handleSubmit`, set immediately before the first upload request, and cleared in `finally`. Keep the existing `isSubmitting` state for UI feedback.

- [ ] **Step 4: Run frontend build and focused runtime checks**

  Run `npm run build`, `npm run lint`, and the generated-bundle Node harness. Expected: build and runtime checks pass; lint may report only the repository’s existing warnings.

- [ ] **Step 5: Commit the frontend batch path**

  Run `git add frontend/src/api/candidates.ts frontend/src/pages/candidates/PreFormPage.tsx` and commit with `feat: reduce public pre-form submission requests`.

### Task 3: Remove redundant final response work and verify isolation

**Files:**
- Modify: `backend/app/api/v1/candidates_public.py`
- Test: `backend/tests/test_pre_form_full_apply.py`

**Interfaces:**
- Consumes: the existing final `public_apply_full` transaction and `_public_out` response helper.
- Produces: the same `PublicCandidateOut` response with fewer post-commit queries, using an explicit known `has_resume` value after the file gate succeeds.

- [ ] **Step 1: Add a response-query regression assertion**

  Extend the existing final-apply test to assert the successful response still reports `has_resume: true` while the final path does not require a post-commit candidate refresh for correctness.

- [ ] **Step 2: Implement the response optimization**

  Let `_public_out` accept an optional `has_resume` override. In the final submission path, reuse the already-verified resume document, avoid `db.refresh(row)`, and return with `has_resume=True`. Do not change the persisted payload or stage/status transitions.

- [ ] **Step 3: Run the focused backend tests**

  Run `venv\\Scripts\\python.exe -m pytest tests/test_pre_form_full_apply.py tests/test_public_candidate_flows.py -q`. Expected: all pass.

- [ ] **Step 4: Commit the final response optimization**

  Run `git add backend/app/api/v1/candidates_public.py backend/tests/test_pre_form_full_apply.py` and commit with `perf: shorten public pre-form response path`.

### Task 4: Full verification, no-write smoke test, and deployment

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: the completed frontend/backend implementation and existing local services.
- Produces: verified production deployment with unchanged data counts and a clean worktree.

- [ ] **Step 1: Run all automated tests**

  Run `venv\\Scripts\\python.exe -m pytest -q` from `backend`, `npm run build`, and `npm run lint` from `frontend`. Expected: backend suite passes, frontend build passes, lint exits successfully with pre-existing warnings only.

- [ ] **Step 2: Run no-write request-count verification**

  Use a disposable mocked client/runtime harness to verify one batch authorization call, two concurrent PUTs, one batch confirmation call, and one final JSON call. Do not call a live public submission token.

- [ ] **Step 3: Verify service health and isolation**

  Check `http://127.0.0.1:8000/health`, `http://127.0.0.1:5173`, the production frontend alias, and read-only Toyota/River aggregate counts. Confirm no candidate or account counts changed.

- [ ] **Step 4: Deploy the prebuilt frontend and backend if required**

  Build and deploy from an isolated temporary prebuilt directory. Inspect the deployment until `readyState` is `READY`, verify the production assets, and keep the existing local background services running.

- [ ] **Step 5: Final verification**

  Run `git diff --check`, `git status --short --branch`, and record test/deployment results. Do not click Submit in any live candidate form.
