# HR Application Edit Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every permitted HR application-form edit persist and immediately update the candidate profile, derived documents, and related views, with unit and end-to-end regression coverage.

**Architecture:** Keep the existing raw-data endpoint and storage APIs, but make the backend response canonical and metadata-safe. Replace the frontend’s fire-and-forget refresh with an explicit updated-candidate handoff that updates page state and caches before edit mode closes. Derived documents remain render-on-demand from the canonical candidate object.

**Tech Stack:** FastAPI, SQLAlchemy, pytest, React 19, TypeScript, Vite, Vercel.

## Global Constraints

- Preserve existing candidate access restrictions and local-HR mutation rules.
- Preserve system-managed raw-data metadata during HR form edits.
- Do not rewrite or resend already-delivered offer letters or messages.
- Run backend tests and frontend lint/build before claiming completion.
- Deploy only through the repository’s existing Vercel configuration.

---

### Task 1: Add backend regression coverage for canonical HR edits

**Files:**
- Create: `backend/tests/test_application_form_edit.py`
- Modify: none

**Interfaces:**
- Tests the existing `PATCH /api/v1/candidates/{id}/profile/raw_data` behavior through the project’s established test fixtures and database setup.
- Verifies persistence, response serialization, scalar synchronization, metadata preservation, arrays, and audit logging.

- [ ] **Step 1: Inspect existing test fixtures and endpoint test style**

Run:

```powershell
rg -n "TestClient|override|get_db|ActivityLog|profile/raw_data" backend/tests backend/app -g '*.py'
```

- [ ] **Step 2: Write failing endpoint/service tests**

Create tests that construct a candidate with existing raw-data metadata such as `whatsapp_template`, `headOfficeForwardingEmailStatus`, and editable fields; submit a complete edited payload containing changed identity values, `familyMembers`, and `previousJobs`; assert the response and reloaded database row contain the edits, preserved metadata, synchronized candidate columns, and an `Application Form Updated` activity.

Also add a test for an empty optional email value to make the intended synchronization behavior explicit without changing authorization rules.

- [ ] **Step 3: Run only the new tests to confirm the regression**

Run:

```powershell
pytest backend/tests/test_application_form_edit.py -q
```

Expected: the tests fail against the current implementation where the returned state or metadata behavior is incorrect.

### Task 2: Implement canonical backend application updates

**Files:**
- Modify: `backend/app/api/v1/candidates_core.py:475-520`
- Modify: `backend/app/services/candidate_service.py` if a focused update helper is needed
- Test: `backend/tests/test_application_form_edit.py`

**Interfaces:**
- Preserve `update_profile_raw_data(id: UUID, body: CandidateProfileRawDataUpdate, db: Session, user: User) -> CandidateOut`.
- The endpoint returns a fully refreshed `CandidateOut` with the current profile and resume/work-state data.

- [ ] **Step 1: Define the editable/system-managed raw-data boundary in code**

Use the existing form payload shape and preserve server-owned metadata keys, including communication/status markers and other nested records not produced by `EditableApplicationFormDocument`. Apply editable values without silently deleting those server-owned keys.

- [ ] **Step 2: Update scalar synchronization**

Synchronize `fullName`, `mobileNumber`/`contactNumber`, `emailId`, and `positionAppliedFor` to candidate columns using trimmed values. Keep validation/access behavior consistent with existing endpoints and allow an explicitly empty optional email to clear the candidate email where the schema permits it.

- [ ] **Step 3: Refresh the committed response**

After `db.commit()`, reload the candidate with `joinedload(Candidate.profile)`, calculate current resume/work-state data, and serialize that reloaded object. Ensure the response’s profile contains the exact committed raw data.

- [ ] **Step 4: Run the focused backend tests**

Run:

```powershell
pytest backend/tests/test_application_form_edit.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit the backend change**

```powershell
git add backend/app/api/v1/candidates_core.py backend/app/services/candidate_service.py backend/tests/test_application_form_edit.py
git commit -m "fix: persist HR application edits canonically"
```

### Task 3: Replace stale frontend refresh with explicit state handoff

**Files:**
- Modify: `frontend/src/components/candidates/PreFormStatus.tsx`
- Modify: `frontend/src/pages/candidates/CandidateProfile.tsx`
- Modify: `frontend/src/api/candidates.ts` only if cache replacement needs a named helper

**Interfaces:**
- `PreFormStatus.onUpdate` accepts the canonical `Candidate` returned by save.
- The save callback returns `Promise<Candidate>` and updates parent state/cache before closing edit mode.

- [ ] **Step 1: Update callback types and save return value**

Make `handleSave` await uploads, await `updateCandidateRawData`, pass the returned candidate to `onUpdate`, and return it. Keep the editor open on any failure.

- [ ] **Step 2: Update parent state and cache atomically from the response**

In `CandidateProfile`, create a callback that stores the returned candidate in `profileCache`, updates React state, updates evaluations when present, and only then exits edit mode through the child’s existing successful flow. Remove reliance on a fire-and-forget `fetchCandidate()` for this save path.

- [ ] **Step 3: Ensure cache invalidation cannot reintroduce stale data**

Keep invalidation before the mutation, and add a narrowly scoped cache setter if needed so the successful response becomes the cache value after mutation. Do not alter unrelated list caching behavior.

- [ ] **Step 4: Run frontend static checks**

Run:

```powershell
cd frontend
npm run lint
npx tsc --noEmit
```

Expected: PASS.

### Task 4: Add frontend end-to-end regression coverage and verify derived views

**Files:**
- Create or modify: the repository’s existing frontend test/e2e location discovered from `rg --files frontend | rg -i 'test|spec|playwright|cypress'`
- Modify: `frontend/src/components/candidates/PreFormStatus.tsx` only if testability requires a minimal seam

**Interfaces:**
- Exercises the HR candidate profile application editor through the UI.
- Verifies that save closes edit mode and the application form, summary/packet data, and candidate header show the edited values without a full page reload.

- [ ] **Step 1: Locate and follow the existing browser-test harness**

Run:

```powershell
rg --files frontend backend | rg -i 'playwright|cypress|e2e|\.spec\.|\.test\.'
```

Use the existing harness if present; otherwise add the smallest project-consistent browser test seam rather than introducing a new test framework.

- [ ] **Step 2: Write the failing NT-28-shaped flow**

Seed or mock a submitted candidate with candidate ID `NT-28`, open the HR edit form, change a visible scalar field plus a family/job row, click `Save Application Changes`, and assert the updated values appear in the read-only form and dependent view without reload.

- [ ] **Step 3: Run the focused end-to-end test**

Run the harness-specific command discovered in Step 1 and confirm the current stale-state behavior fails before the frontend fix.

- [ ] **Step 4: Run the full frontend build**

```powershell
cd frontend
npm run build
```

Expected: PASS, including the dual-build verification.

### Task 5: Full verification and deployment

**Files:**
- Modify: none unless verification exposes a scoped defect

**Interfaces:**
- Backend and frontend artifacts remain compatible with `vercel.json`, `frontend/vercel.json`, and `backend/vercel.json`.

- [ ] **Step 1: Run the complete backend suite**

```powershell
pytest backend/tests -q
```

- [ ] **Step 2: Run final frontend lint, type-check, and build**

```powershell
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

- [ ] **Step 3: Inspect deployment configuration and available CLI authentication**

```powershell
Get-Content vercel.json
Get-Content frontend/vercel.json
Get-Content backend/vercel.json
vercel --version
vercel whoami
```

- [ ] **Step 4: Deploy the affected applications**

Use the repository’s configured Vercel project/linkage and deploy the frontend/backend targets without changing production configuration. Record deployment URLs and output.

- [ ] **Step 5: Smoke-test the deployed edit flow**

Open the deployed HR candidate profile for NT-28 or the equivalent seeded test candidate, edit a harmless field, save, confirm the updated application/derived views, and restore the test value if the environment is production-like.

- [ ] **Step 6: Commit any final scoped fixes and report evidence**

Run `git diff --check`, `git status --short`, and report test/deployment results with links to changed files.
