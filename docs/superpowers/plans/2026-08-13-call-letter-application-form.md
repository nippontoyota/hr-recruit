# Call-Letter Application Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One candidate call-letter form covering all PDF candidate sections (no interview panel/assessment), with Local HR print matching the paper form in a compressed ~2-page layout.

**Architecture:** Expand `CandidateFormData` + `PreFormApplicationData` / `validatePreForm` to absorb former post-form `raw_data` keys. Add wizard sections with progressive disclosure. Replace `PreFormStatus` print content with a new `InterviewApplicationFormDocument` HTML facsimile of the Nippon PDF (assessment blocks omitted).

**Tech Stack:** React + TypeScript (Vite), FastAPI + Pydantic, pytest, `react-to-print`, existing `raw_data` JSONB on `CandidateProfile`.

**Spec:** `docs/superpowers/specs/2026-08-13-call-letter-application-form-design.md`

## Global Constraints

- Single form only — no separate post-form submit path for new work.
- Reuse existing camelCase `raw_data` keys from `PostFormApplicationData` wherever they already match the PDF.
- Omit from form + print: interview panel, regional HR / CMD / social-media screening HR blocks.
- Mandatory/optional rules follow the spec tables (required-when-relevant for spouse, job #1, present address, referral).
- Keep public apply write path: profile columns + `raw_data` dump.
- Print target: compressed ~2 A4 pages via tight HTML/CSS.
- Do not commit secrets; do not expand scope into evaluation scoring UI.

---

## File map

| File | Responsibility |
|------|----------------|
| `frontend/src/pages/candidates/wizard/wizardTypes.ts` | Full form shape + defaults |
| `frontend/src/lib/validatePreForm.ts` | Client validation rules |
| `frontend/src/pages/candidates/wizard/sections/*.tsx` | Section UIs (extend + new) |
| `frontend/src/pages/candidates/PreFormPage.tsx` | Mount sections + autofill |
| `backend/app/schemas/candidate.py` | `PreFormApplicationData` merge + validators |
| `backend/tests/test_validators.py` | Backend accept/reject cases |
| `frontend/src/components/candidates/InterviewApplicationFormDocument.tsx` | PDF-like print layout |
| `frontend/src/components/candidates/PreFormStatus.tsx` | Use new print document |
| `frontend/src/api/candidates.ts` | Remove dead post-form client helpers if unused |

---

### Task 1: Backend schema + validator tests (merged fields)

**Files:**
- Modify: `backend/app/schemas/candidate.py` (`PreFormApplicationData`, keep `PostFormApplicationData` as a thin alias or unused leftover — prefer merging fields into `PreFormApplicationData` and leave `PostFormApplicationData` as `= PreFormApplicationData` only if something still imports it; else delete after grep)
- Modify: `backend/tests/test_validators.py`

**Interfaces:**
- Consumes: existing `PreFormApplicationData`, `app.utils.validators`
- Produces: `PreFormApplicationData` accepting merged PDF fields with spec required-when-relevant rules; `_valid_pre_form()` fixture updated

- [ ] **Step 1: Write failing tests for new required rules**

Append to `backend/tests/test_validators.py`:

```python
def test_pre_form_requires_father_and_mother_name():
    payload = _valid_pre_form()
    payload.pop("fatherName", None)
    payload["fatherName"] = ""
    payload["motherName"] = "Meera"
    with pytest.raises(ValueError):
        PreFormApplicationData.model_validate(payload)


def test_pre_form_requires_emergency1():
    payload = _valid_pre_form()
    payload["emergency1Name"] = ""
    payload["emergency1Relation"] = "Uncle"
    payload["emergency1Address"] = "Kochi"
    payload["emergency1Contact"] = "9876543210"
    with pytest.raises(ValueError):
        PreFormApplicationData.model_validate(payload)


def test_pre_form_requires_job1_when_experienced():
    payload = _valid_pre_form()
    payload["previousExperience"] = True
    payload["totalExperience"] = "2 Years"
    payload["prevCompanyName"] = ""
    payload["prevPosition"] = "Advisor"
    with pytest.raises(ValueError):
        PreFormApplicationData.model_validate(payload)


def test_pre_form_requires_spouse_when_married():
    payload = _valid_pre_form()
    payload["maritalStatus"] = "Married"
    payload["spouseName"] = ""
    with pytest.raises(ValueError):
        PreFormApplicationData.model_validate(payload)


def test_pre_form_accepts_fresher_without_job_rows():
    payload = _valid_pre_form()
    payload["previousExperience"] = False
    payload["totalExperience"] = "Fresher"
    PreFormApplicationData.model_validate(payload)
```

Update `_valid_pre_form()` to include minimal new required fields:

```python
"confidentToDrive": True,
"fatherName": "Ravi Kumar",
"motherName": "Meera Kumar",
"emergency1Relation": "Uncle",
"emergency1Name": "Suresh Nair",
"emergency1Address": "Kalamassery",
"emergency1Contact": "9876501234",
"emailId": "rahul@example.com",
"declarationPlace": "Kochi",
"declarationDate": "2026-08-13",
"declarationName": "Rahul Kumar",
"prevTerminated": False,
"nervousDisorder": False,
"physicalDisability": False,
"eyeVision": False,
"criminalConviction": False,
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd backend && .\venv\Scripts\python.exe -m pytest tests/test_validators.py -v -k pre_form`

Expected: new tests fail (missing fields / no validation yet).

- [ ] **Step 3: Extend `PreFormApplicationData`**

In `backend/app/schemas/candidate.py`, add fields (defaults `""` / `False` except always-required strings). Reuse post-form names:

- Drive: `confidentToDrive: bool`
- Optional enrich: `drive2Wheeler`, `drive3Wheeler`, `drive4Wheeler`, `driveHeavy` (bool)
- Languages: `languagesOther: str = ""`
- Education modes: `gradMode`, `postGradMode`
- Computer: `compWord`, `compExcel`, `compPowerPoint`, `compTally`, `compOther`, `softwareCerts`
- Family: father/mother/spouse/child1–2/sibling1–2 blocks (name/age/occupation/company/phone + relation where PDF has it)
- Employment extras: `prev1Reporting`, `prev1From`, `prev1To`, `prev1Salary`, `prev1Reason`, and `prev2*`…`prev4*` optional
- Also map job1 company/position to existing `prevCompanyName` / `prevPosition`
- Additional: `achievements`, `hobbies`
- Header optional: `positionSuitable: str = ""`
- Emergency 1–2, social `facebookUrl`/`instagramUrl`/`twitterUrl`
- Declaration: `emailId`, `declarationPlace`, `declarationDate`, `declarationName`
- Keep existing general bools

In `validate_all`:
- Require `confidentToDrive` is bool (always present)
- Require `fatherName`, `motherName` non-empty
- Require emergency1 relation/name/address/phone (`validate_phone` on contact)
- Require `emailId` via `validate_email` (or existing email helper)
- Require declaration place/date/name
- If `maritalStatus == "Married"`: require `spouseName`
- If `previousExperience`: require job1 period/salary/reason/reporting in addition to company/position; copy into `prev1*` if you prefer single source — pick **one**: keep `prevCompanyName`/`prevPosition` as job1 and require `prev1From`/`prev1To`/`prev1Salary`/`prev1Reason`/`prev1Reporting`
- Jobs 2–4: if any field in a row filled, validate the whole row
- Grad/PG: keep existing “if any filled, require all” including mode when present
- Do not require social, hobbies, achievements, passport, children, siblings

- [ ] **Step 4: Re-run tests — expect PASS**

Run: `cd backend && .\venv\Scripts\python.exe -m pytest tests/test_validators.py -v -k pre_form`

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/candidate.py backend/tests/test_validators.py
git commit -m "feat: expand pre-form schema to full application fields"
```

---

### Task 2: Frontend form types + client validation

**Files:**
- Modify: `frontend/src/pages/candidates/wizard/wizardTypes.ts`
- Modify: `frontend/src/lib/validatePreForm.ts`

**Interfaces:**
- Consumes: Task 1 field names (same camelCase)
- Produces: `CandidateFormData` + `initialCandidateData` + `validatePreForm` / `validateSingleField` covering spec rules

- [ ] **Step 1: Extend `CandidateFormData` and defaults**

Add every new field from Task 1 to the interface and `initialCandidateData` (booleans `false`, strings `''`).

- [ ] **Step 2: Mirror backend rules in `validatePreForm.ts`**

Update the required-field walk and conditional checks to match Task 1. Ensure `validatePreForm` returns a clear first-error string (existing style). Cover:

- Always-required new fields
- Present address if `!sameAsPermanent`
- Referral `referredBy` when source needs it (existing)
- Job1 extras when `previousExperience`
- `spouseName` when married
- Emergency1 block
- Declaration + email

- [ ] **Step 3: Manual typecheck**

Run: `cd frontend && npx tsc -p tsconfig.json --noEmit`

Expected: errors only in wizard sections until Task 3–4 (if any); fix type-only issues in these two files so they are clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/candidates/wizard/wizardTypes.ts frontend/src/lib/validatePreForm.ts
git commit -m "feat: expand client form types and pre-form validation"
```

---

### Task 3: Wizard section UIs (personal → employment)

**Files:**
- Modify: `frontend/src/pages/candidates/wizard/sections/PersonalInfoForm.tsx`
- Modify: `frontend/src/pages/candidates/wizard/sections/IdentityForm.tsx`
- Modify: `frontend/src/pages/candidates/wizard/sections/EducationForm.tsx`
- Modify: `frontend/src/pages/candidates/wizard/sections/EmploymentForm.tsx`
- Create: `frontend/src/pages/candidates/wizard/sections/FamilyForm.tsx`

**Interfaces:**
- Consumes: `CandidateFormData`, `update(field, value)`
- Produces: UI controls bound to new fields; progressive disclosure for experience jobs and married spouse (spouse lives in FamilyForm)

- [ ] **Step 1: Personal / identity**

- PersonalInfoForm: optional `positionSuitable` if not already; ensure photo stays required.
- IdentityForm: `confidentToDrive` Yes/No radios; if Yes, show optional 2W/3W/4W/heavy checkboxes; `languagesOther` text input.

- [ ] **Step 2: EducationForm**

Add `gradMode` / `postGradMode` selects (reuse `STUDY_MODES` from `frontend/src/lib/validation.ts`). Add computer knowledge checkboxes + `softwareCerts` text.

- [ ] **Step 3: FamilyForm (new)**

Table-like stacked rows for Father*, Mother*, Spouse (required UI only if `maritalStatus === 'Married'`), optional Child 1–2 and Sibling 1–2 with Add/show toggles (default hide empty optional rows behind “Add child” / “Add sibling”).

- [ ] **Step 4: EmploymentForm**

- Keep experience checkbox.
- When experienced: Job 1 fields — company & address (`prevCompanyName`), position, reporting (`prev1Reporting`), from/to, last salary, reason.
- “Add previous employer” reveals job 2–4 using `prev2*`…`prev4*`.
- Always: total experience (Fresher default when unchecked), expected salary.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/candidates/wizard/sections/
git commit -m "feat: wizard UI for family, drive, education extras, jobs"
```

---

### Task 4: Wizard section UIs (recruitment → declaration) + PreFormPage wire-up

**Files:**
- Modify: `frontend/src/pages/candidates/wizard/sections/RecruitmentForm.tsx`
- Modify: `frontend/src/pages/candidates/wizard/sections/MedicalForm.tsx`
- Create: `frontend/src/pages/candidates/wizard/sections/EmergencySocialForm.tsx` (or split if clearer)
- Modify: `frontend/src/pages/candidates/PreFormPage.tsx`

**Interfaces:**
- Consumes: sections from Task 3 + new fields
- Produces: PreFormPage renders full PDF field set; autofill fills new required fields

- [ ] **Step 1: RecruitmentForm**

Ensure source of opening, referred by, preferred region/branches, joining date remain; labels match PDF (“Ready to work in below-mentioned branches”, “If selected, when can you join?”).

- [ ] **Step 2: MedicalForm → General + additional**

Replace remarks-only UI with:

- Achievements, hobbies textareas (optional)
- Five Yes/No questions bound to `prevTerminated`, `nervousDisorder`, `physicalDisability`, `eyeVision`, `criminalConviction`
- Optional `medicalRemarks`

- [ ] **Step 3: Emergency + social + declaration section**

Fields: emergency1* required, emergency2* optional; facebook/instagram/twitter optional; `emailId`, `declarationPlace`, `declarationDate`, `declarationName` + short acknowledgment checkbox text matching PDF declaration (store name in `declarationName`).

- [ ] **Step 4: Mount in `PreFormPage.tsx`**

Insert FamilyForm after Identity (or after Personal+Address per PDF: Address → Personal IDs already split — order: Personal, Address, Identity, Education, Family, Employment, Recruitment, Medical/General, Emergency/Social/Declaration).

Update `handleAutofill` dummy data for all new required fields so local testing still works.

- [ ] **Step 5: Smoke in browser**

Run frontend + backend; open a pre-form link; confirm sections render and submit hits API (expect 200 with valid autofill).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/candidates/wizard/sections/ frontend/src/pages/candidates/PreFormPage.tsx
git commit -m "feat: wire full application sections into pre-form page"
```

---

### Task 5: PDF-like print document

**Files:**
- Create: `frontend/src/components/candidates/InterviewApplicationFormDocument.tsx`
- Modify: `frontend/src/components/candidates/PreFormStatus.tsx`

**Interfaces:**
- Consumes: `candidate: Candidate` (uses `full_name`, `phone`, `email`, `position_applied_for`, `branch_location`, `profile.photo_url`, `profile.raw_data`, `applied_at` / `created_at`)
- Produces: printable React tree; `PreFormStatus` `useReactToPrint` targets this component (screen edit UI unchanged)

- [ ] **Step 1: Build `InterviewApplicationFormDocument`**

Create a compressed A4 layout (`w-[210mm]`, small type `text-[9px]`/`text-[10px]`, tight borders) mirroring PDF sections 1–declaration only:

1. Company header (name, address, phone, email from PDF)
2. Title INTERVIEW APPLICATION FORM
3. Mobile + Date | Position Applied | Position Suitable
4. PERSONAL DATA + photo box (`object-cover object-left-top` in fixed mm box)
5. Address two columns
6. Age/DOB/Height/Weight/Blood/Gender/Marital/Religion
7. Languages + IDs + Confident to Drive
8. EDUCATION table (10th/12th/Grad/PG)
9. Computer / certs lines
10. FAMILY table
11. EMPLOYMENT record + up to 4 job rows
12. Opening / referred / branches / joining
13. Achievements / Hobbies
14. General Y/N a–e
15. Emergency table
16. Social + Email
17. Declaration + place/date/signature name

Empty values render as blank underline/`—` so print still looks like a form.

Do **not** render interview panel / HR assessment / CMD blocks.

Helper: `const d = candidate.profile?.raw_data ?? {}` and small `v(key)` getter.

- [ ] **Step 2: Wire print in `PreFormStatus`**

- Import document component.
- Keep `componentRef` on a wrapper that contains `InterviewApplicationFormDocument` (can be `hidden`/`print-only` via CSS if screen already has categorized view — preferred: render document off-screen or in a print-only container; screen list stays for edit).
- `documentTitle`: `ApplicationForm_${candidate.full_name}`.
- Ensure Print button still calls `handlePrint`.

Example structure:

```tsx
<div className="hidden">
  <div ref={componentRef}>
    <InterviewApplicationFormDocument candidate={candidate} />
  </div>
</div>
```

(If `hidden` breaks print, use `fixed left-[-9999px]` or react-to-print’s contentRef pattern already used — verify one print in browser.)

- [ ] **Step 3: Manual print check**

With a submitted candidate, Print → print preview should show ~2 pages, no assessment table, photo not clipped.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/candidates/InterviewApplicationFormDocument.tsx frontend/src/components/candidates/PreFormStatus.tsx
git commit -m "feat: CALL_LETTER print matches interview application PDF"
```

---

### Task 6: Dead post-form client cleanup + regression

**Files:**
- Modify: `frontend/src/api/candidates.ts` (remove `fetchPublicPostForm` / `submitPublicPostForm` / `sendPostForm` if no imports remain)
- Grep + fix any leftover imports
- Modify: `frontend/src/components/candidates/PreFormStatus.tsx` field category lists if edit UI should show new keys (add family/emergency/etc. to existing category arrays)

**Interfaces:**
- Produces: no broken imports; HR edit categories include new keys

- [ ] **Step 1: Grep post-form usage**

Run: `rg "post-form|PostForm|sendPostForm|fetchPublicPostForm" frontend backend/app -g "!alembic/**"`

Remove dead FE helpers only when unused. Do not resurrect post-form API.

- [ ] **Step 2: Extend PreFormStatus category key lists**

Add new keys into `FAMILY_FIELDS`, `EMPLOYMENT_FIELDS`, `MEDICAL_FIELDS`, etc., so HR edit mode can see them.

- [ ] **Step 3: Run backend validator tests + FE tsc**

```bash
cd backend && .\venv\Scripts\python.exe -m pytest tests/test_validators.py -v -k pre_form
cd frontend && npx tsc -p tsconfig.json --noEmit
```

Expected: PASS / no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/candidates.ts frontend/src/components/candidates/PreFormStatus.tsx
git commit -m "chore: drop dead post-form client helpers; show new keys in HR edit"
```

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Single form merges post-form fields | 1–4 |
| Mandatory / required-when-relevant / optional | 1–2 |
| Wizard progressive disclosure | 3–4 |
| Print PDF-like, no assessment | 5 |
| Photo slot not clipped | 5 |
| Existing partial raw_data still loads | 5 (blanks) |
| Validator tests fresher/married/referral/address | 1 (+ referral/address already partially covered; keep/extend) |
| Retire post-form submit concept | 6 |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-13-call-letter-application-form.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with checkpoints  

Which approach?
