# Recruitment Pipeline Addons Design Spec

- **Author**: Antigravity Assistant & Engineering Team
- **Date**: 2026-11-19
- **Topic**: Head Office Forwarding Email Branch Name, "Rejoining" Source Option, and CSS Fresher Mode
- **Status**: Approved Design

---

## 1. Overview & Scope

This specification details three targeted improvements to the recruitment pipeline:

1. **Head Office Forwarding Email Branch Name**: Incorporate the candidate's branch name into the automated candidate email when an application is forwarded to Head Office (`Update Regarding Interview – Nippon Toyota <Branch>`).
2. **"Rejoining" Candidate Source Option**: Add `"Rejoining"` (`REJOINING`) as a standard, first-class option in candidate source dropdowns and filters across the frontend and backend.
3. **Candidate Summary Sheet (CSS) "Fresher" Mode**: Add a clean, modern "Fresher" checkbox (default `false`). When ticked, the experience block is collapsed, contact address cells stretch to 9 columns (maintaining the strict 12-column table grid), and previous employment history is suppressed.

---

## 2. Feature 1: Head Office Forwarding Email Branch Name

### Location & Implementation
In [`backend/app/api/v1/candidates_actions.py`](file:///Users/shivasajay/Desktop/hr-recruit/backend/app/api/v1/candidates_actions.py):

1. **Helper Function**:
   ```python
   def _candidate_branch_brand_label(candidate: Candidate) -> str:
       brand = _candidate_brand_label(candidate)
       branch = (getattr(candidate, "branch_location", "") or "").strip()
       if not branch:
           return brand
       if branch.casefold().startswith(brand.casefold()):
           return branch
       return f"{brand} {branch}"
   ```
2. **Template Content (`_head_office_forwarding_email_content`)**:
   - **Subject**: `Update Regarding Interview – {branch_brand_name}`
     - Example with branch: `Update Regarding Interview – Nippon Toyota Kalamassery`
     - Example without branch: `Update Regarding Interview – Nippon Toyota`
   - **Opening Sentence**:
     `<p>Thank you for taking the time to attend the interview at {escape(branch_brand_name)}.</p>`
   - **Subsequent Body References & Signature**:
     Retains `{brand_name}` (`Nippon Toyota`) for Head Office references and closing signature:
     `<p>Best regards,<br>Mathew Paul<br>Talent Acquisition Team<br>{brand_name}</p>`

---

## 3. Feature 2: "Rejoining" Candidate Source Option

### Frontend Updates
1. [`frontend/src/lib/candidateSources.ts`](file:///Users/shivasajay/Desktop/hr-recruit/frontend/src/lib/candidateSources.ts):
   Add `{ value: 'REJOINING', label: 'Rejoining' }` to `SOURCE_OPTIONS`.
2. [`frontend/src/lib/stages.ts`](file:///Users/shivasajay/Desktop/hr-recruit/frontend/src/lib/stages.ts):
   Add `REJOINING: 'Rejoining'` to `SOURCE_LABELS`.
3. [`frontend/src/pages/candidates/CandidatesList.tsx`](file:///Users/shivasajay/Desktop/hr-recruit/frontend/src/pages/candidates/CandidatesList.tsx):
   Include `'REJOINING'` in table filter options for `source`.
4. **Behavior**: Simple dropdown selection without a secondary reference field.

### Backend Updates
1. [`backend/app/models/enums.py`](file:///Users/shivasajay/Desktop/hr-recruit/backend/app/models/enums.py):
   Add `REJOINING = "REJOINING"` to `SourceChannel`.
2. [`backend/app/utils/validators.py`](file:///Users/shivasajay/Desktop/hr-recruit/backend/app/utils/validators.py):
   Add `"REJOINING"` to allowed `SOURCES`.
3. [`backend/app/core/compat.py`](file:///Users/shivasajay/Desktop/hr-recruit/backend/app/core/compat.py):
   Map `"rejoining"` to `SourceChannel.REJOINING`.
4. **Database**: Zero migrations (`candidate.source` is stored as `String(100)`).

---

## 4. Feature 3: CSS "Fresher" Mode & Experience Collapse

### UI Control
In [`frontend/src/components/candidates/EditableCandidateSummarySheet.tsx`](file:///Users/shivasajay/Desktop/hr-recruit/frontend/src/components/candidates/EditableCandidateSummarySheet.tsx):
- Modern toggle pill in the sticky top action bar:
  `<label className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer transition-colors select-none">`
  `<input type="checkbox" checked={Boolean(form.isFresher)} onChange={(e) => update('isFresher', e.target.checked)} className="w-3.5 h-3.5 rounded-xs accent-emerald-600 cursor-pointer" />`
  `<span className="text-xs font-bold text-slate-700">Fresher</span>`
  `</label>`
- Defaults to `false` (unchecked).
- Persisted in candidate `profile.raw_data.isFresher`.

### Table Grid Arithmetic (Strict 12 Columns)
When `isFresher === true`:
- **Experience Block (Cols 6–10)**: Completely omitted from table rows.
- **Contact Details (Cols 2–10)**:
  - Phone row 2: `colSpan={9}`
  - Address lines (House Name, Landmark, Post Office, District, Pin Code): `colSpan={9}`
  - Row column balance: `1 (label) + 9 (value) + 2 (photo) = 12 columns`.
- **Employment Record**:
  - Replaces previous job rows with a single clean row:  
    `<Cell colSpan={12} className="text-center italic text-slate-500 py-3">Fresher — No Prior Employment Record</Cell>`
  - Suppresses the `+ Add experience row` button.
- **Dossier & Print Sync**:
  - [`frontend/src/components/candidates/CandidateSummarySheet.tsx`](file:///Users/shivasajay/Desktop/hr-recruit/frontend/src/components/candidates/CandidateSummarySheet.tsx) applies the identical condition when `raw.isFresher` is true, ensuring printed A4 dossier matches.

---

## 5. Verification Plan

1. **Backend Tests**:
   - Run `pytest backend/tests/test_offer_letter.py` covering branch name in HO forwarding email (both with branch and fallback without branch).
   - Verify `"REJOINING"` source validates correctly in `test_validators.py`.
2. **Frontend Build**:
   - Run `npm --prefix frontend run build` to verify zero TypeScript errors and dual build verification.
3. **Manual Flow Checks**:
   - Create/edit candidate with source "Rejoining".
   - Open Candidate Summary Sheet, toggle "Fresher" checkbox, verify smooth collapse to 9-column address, save, and verify printed dossier.
