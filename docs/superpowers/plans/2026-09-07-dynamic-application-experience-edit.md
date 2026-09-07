# Dynamic application experience editing implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HR-edited employment rows persist in one canonical format and appear dynamically in every application-derived view, including CSS and summary sheets.

**Architecture:** Normalize employment rows at the editor boundary and again at the backend boundary so old records and old clients remain readable. The backend will mirror the first four rows into legacy fields and update profile columns in the same transaction. Frontend documents will read the full canonical array and will not truncate it.

**Tech Stack:** React 19, TypeScript, FastAPI, SQLAlchemy, pytest, Vite.

## Global Constraints

- Preserve existing candidate access checks and Local HR mutation rules.
- Preserve system-managed raw-data metadata during HR edits.
- Keep the save path to one raw-data PATCH and one database commit after any selected file uploads.
- Keep compatibility with records using `co`, `pos`, `from`, `sal`, and the legacy `prev*` fields.
- Do not rewrite already-sent documents or resend messages.
- Run focused tests, the complete backend suite, frontend lint, TypeScript checking, and the frontend build.

---

### Task 1: Add failing coverage for canonical employment edits

**Files:**
- Modify: `backend/tests/test_application_form_edit.py`

**Interfaces:**
- Tests `merge_hr_application_raw_data` and `update_profile_raw_data`.
- The tests use the existing `SimpleNamespace` and `MagicMock` style in this file.

- [ ] **Step 1: Add a five-row normalization test**

Add a test that submits five rows using the editor's current short keys and asserts the normalized result contains five rows with `company`, `position`, `reporting`, `fromDate`, `toDate`, `salary`, and `reason`, and that the first four legacy slots match those rows.

```python
def test_merge_hr_application_normalizes_all_previous_jobs_and_legacy_slots():
    submitted = {
        "previousExperience": True,
        "previousJobs": [
            {"co": f"Company {index}", "pos": f"Role {index}", "from": f"202{index}-01-01", "to": f"202{index}-12-31", "sal": str(index * 1000), "reason": "Change"}
            for index in range(1, 6)
        ],
    }

    merged = merge_hr_application_raw_data({}, submitted)

    assert len(merged["previousJobs"]) == 5
    assert merged["previousJobs"][4]["company"] == "Company 5"
    assert merged["previousJobs"][0]["fromDate"] == "2021-01-01"
    assert merged["prevCompanyName"] == "Company 1"
    assert merged["prev2Name"] == "Company 2"
    assert merged["prev3Name"] == "Company 3"
    assert merged["prev4Name"] == "Company 4"
```

- [ ] **Step 2: Add profile synchronization assertions**

Extend the endpoint test payload with five canonical jobs, `previousExperience`, `totalExperience`, `expectedSalary`, and `expectedJoiningDate`. Give the fake profile all synchronized columns and assert after the endpoint call that `experience_level`, `total_experience`, `current_company`, `expected_salary`, and `joining_date` match the submitted values. Assert the fifth job remains in `row.profile.raw_data["previousJobs"]`.

- [ ] **Step 3: Add deletion and empty-state coverage**

Add a test with existing four legacy slots and a submitted empty `previousJobs` array plus `previousExperience: False`. Assert the normalized legacy values are empty and the profile becomes `Fresher` with no current company.

- [ ] **Step 4: Run the focused tests and record the failure**

Run:

```powershell
pytest backend/tests/test_application_form_edit.py -q
```

Expected: the new tests fail because the current merge function does not normalize short row keys or mirror dynamic rows, and the endpoint does not update profile columns.

### Task 2: Normalize and persist the complete employment record

**Files:**
- Modify: `backend/app/services/candidate_service.py`
- Modify: `backend/app/api/v1/candidates_core.py`
- Test: `backend/tests/test_application_form_edit.py`

**Interfaces:**
- Keep `merge_hr_application_raw_data(existing: dict | None, submitted: dict) -> dict` as the endpoint-facing function.
- Add focused private helpers in `candidate_service.py` for row normalization and legacy-slot synchronization.

- [ ] **Step 1: Normalize row aliases without a row-count limit**

Inside the existing merge path, copy `submitted`, read `previousJobs` when it is a list, and map these aliases:

```python
company = row.get("company", row.get("co", ""))
position = row.get("position", row.get("pos", ""))
reporting = row.get("reporting", row.get("rep", ""))
from_date = row.get("fromDate", row.get("from", row.get("from_date", "")))
to_date = row.get("toDate", row.get("to", row.get("to_date", "")))
salary = row.get("salary", row.get("sal", ""))
```

Write canonical rows with all nine `PreviousJob` keys. Keep rows that contain any employment value, including rows that contain only a reporting person or date.

- [ ] **Step 2: Mirror the first four rows and clear removed slots**

Write the first row to `prevCompanyName`, `prevPosition`, and `prev1*`; write rows two through four to `prev2*`, `prev3*`, and `prev4*`. Set missing slots to empty strings so deleting a job cannot leave stale legacy values. Leave the complete canonical array intact for rows five and later.

- [ ] **Step 3: Preserve system-owned metadata after normalization**

Keep the existing `SYSTEM_MANAGED_RAW_DATA_KEYS` preservation behavior. The submitted form can replace editable keys, including `previousJobs`, but it must not replace communication, verification, or workflow metadata.

- [ ] **Step 4: Synchronize profile columns in the existing endpoint transaction**

After calculating `merged_raw`, update the profile in `update_profile_raw_data`:

```python
jobs = merged_raw.get("previousJobs") or []
profile.experience_level = "Experienced" if submitted_raw.get("previousExperience") or jobs else "Fresher"
profile.total_experience = str(submitted_raw.get("totalExperience") or "").strip() or None
profile.current_company = str(jobs[0].get("company") or "").strip() or None if jobs else None
profile.expected_salary = str(submitted_raw.get("expectedSalary") or "").strip() or None
profile.joining_date = str(submitted_raw.get("expectedJoiningDate") or "").strip() or None
```

Use explicit parentheses in the real code so the conditional expression cannot change assignment precedence. Preserve the existing candidate-column synchronization and audit log.

- [ ] **Step 5: Run the focused tests**

Run:

```powershell
pytest backend/tests/test_application_form_edit.py -q
```

Expected: all focused tests pass, including the five-row, deletion, metadata, response, and profile synchronization cases.

### Task 3: Make the shared frontend reader and editor canonical

**Files:**
- Modify: `frontend/src/pages/candidates/wizard/wizardTypes.ts`
- Modify: `frontend/src/components/candidates/EditableApplicationFormDocument.tsx`
- Modify: `frontend/src/lib/bgVerification.ts`

**Interfaces:**
- `previousJobsFromForm(data: CandidateFormData) -> PreviousJob[]` returns canonical `PreviousJob` rows for both old and new raw-data shapes.
- The editable application form continues to pass `Record<string, unknown>` to `onSave`.

- [ ] **Step 1: Make `previousJobsFromForm` accept both row formats**

When `previousJobs` exists, map both canonical keys and editor aliases into `PreviousJob`. If no array exists, keep the current legacy `prev1` through `prev4` fallback. Filter rows with `jobHasContent` so empty deleted rows do not appear.

- [ ] **Step 2: Convert editor rows before saving**

In `EditableApplicationFormDocument.handleSubmit`, convert each `JobRow` to:

```ts
{
  company: row.co.trim(),
  position: row.pos.trim(),
  reporting: row.rep.trim(),
  reportingDesignation: row.repDesignation.trim(),
  reportingPhone: row.repPhone.trim(),
  fromDate: row.from,
  toDate: row.to,
  salary: row.sal.trim(),
  reason: row.reason.trim(),
}
```

Send all non-empty rows, including row five and later. Do not persist the React-only `id`.

- [ ] **Step 3: Make background verification use the shared reader**

Use `previousJobsFromForm` in `buildInitialBgData` to derive previous employment, employer name, designation, and dates. This makes old short-key rows and newly edited canonical rows behave the same way.

- [ ] **Step 4: Run the frontend static checks**

Run:

```powershell
Set-Location frontend
npx tsc --noEmit
npm run lint
```

Expected: PASS.

### Task 4: Remove fixed row limits from CSS and summary output

**Files:**
- Modify: `frontend/src/components/candidates/CandidateSummarySheet.tsx`
- Modify: `frontend/src/components/candidates/EditableCandidateSummarySheet.tsx`

**Interfaces:**
- Both components consume `previousJobsFromForm` and render every returned `PreviousJob`.
- Existing salary, evaluation, and photo editing behavior stays unchanged.

- [ ] **Step 1: Stop padding and truncating summary jobs**

Remove `while (jobs.length < 6) jobs.push(EMPTY_JOB)` and change `jobs.slice(0, 6).map(...)` to `jobs.map(...)` in the read-only CSS/summary sheet. Keep the existing fallback to `profile.current_company` when no job array exists.

- [ ] **Step 2: Make the editable summary use every job**

Remove the six-row padding and six-row slice in `EditableCandidateSummarySheet`. Its existing `PreviousJob` state and save payload already use canonical keys, so retain all rows through save.

- [ ] **Step 3: Check all remaining fixed employment readers**

Run:

```powershell
rg -n "slice\(0, 6\)|length < 6|prev[1-4]|previousJobs" frontend/src backend/app -g '!openapi.json'
```

Update only application-derived readers that still ignore canonical rows. Do not change unrelated interview or offer logic.

- [ ] **Step 4: Run the frontend build**

Run:

```powershell
Set-Location frontend
npm run build
```

Expected: Vite build and dual-build verification pass.

### Task 5: Verify the complete flow

**Files:**
- Modify: none unless a scoped verification failure identifies a defect.

**Interfaces:**
- The backend response remains a complete `CandidateOut`.
- The frontend uses the returned candidate for the next render and cache state.

- [ ] **Step 1: Run the focused backend regression suite**

```powershell
pytest backend/tests/test_application_form_edit.py -q
```

- [ ] **Step 2: Run the complete backend suite**

```powershell
pytest backend/tests -q
```

- [ ] **Step 3: Run final frontend checks**

```powershell
Set-Location frontend
npm run lint
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Inspect the final diff for stale-state or row-limit regressions**

```powershell
git diff --check
rg -n "slice\(0, 6\)|length < 6|co:|pos:|from:|sal:" frontend/src/components frontend/src/lib backend/app/services backend/app/api -g '*.tsx' -g '*.ts' -g '*.py'
git status --short
```

Expected: no six-row truncation remains in application-derived sheets, editor-only aliases are converted before persistence, and only intended files are modified.
