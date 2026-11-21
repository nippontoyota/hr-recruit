# Thrissur Branch UI Display as Irinjalakuda Design Spec

- **Author**: Antigravity Assistant & Engineering Team
- **Date**: 2026-11-21
- **Topic**: Displaying Irinjalakuda in Place of Thrissur Across Portal UI
- **Status**: Draft Spec for User Review

---

## 1. Background & Requirement

In Nippon Toyota's recruitment portal, the Thrissur showroom cluster roster shares the branch location `"Thrissur"` in the database. Users associated with this branch (such as `hrirj@nippontoyota.com` and `hrtcr@nippontoyota.com`) currently see `"Thrissur"` in the UI.

The user requirement is:
> *"in thrissur branch poratl ui i want to show it "Irinjalakuda" no thrissue... no other chngaes..just teh ui chnage..."*

The user confirmed that across the portal UI (Local HR header badge, candidate lists, candidate profile branch tags, public candidate portal, and filter options), the UI should display **"Irinjalakuda"** instead of **"Thrissur"**, while strictly avoiding changes to the backend, database records, and API queries.

---

## 2. Architecture & Implementation

### A. Centralized Branch Formatting Helper (`frontend/src/lib/branding.ts`)
To keep a single source of truth and avoid ad-hoc string replacements, we introduce two utility functions in `frontend/src/lib/branding.ts`:

```typescript
/**
 * Formats a branch name for user-facing UI display.
 * Maps 'Thrissur' to 'Irinjalakuda' while keeping other branch names intact.
 */
export function formatBranchName(branch?: string | null): string {
  if (!branch) return '';
  const trimmed = branch.trim();
  if (trimmed.toLowerCase() === 'thrissur') {
    return 'Irinjalakuda';
  }
  return branch;
}

/**
 * Returns branch filter/select options with UI display labels while preserving
 * underlying values for backend API requests and queries.
 */
export function getBranchSelectOptions(branches: string[]): { value: string; label: string }[] {
  return branches.map((branch) => ({
    value: branch,
    label: formatBranchName(branch),
  }));
}
```

### B. UI Display Touchpoints

1. **Local HR Top Navigation Badge (`frontend/src/components/layout/AppShell.tsx` and `AdminDemoShell.tsx`)**:
   - Updates: Display `{formatBranchName(user.branch_location)}` inside the branch badge instead of `{user.branch_location}`.
   - When a Local HR user with `branch_location = "Thrissur"` logs in, the header badge renders `"IRINJALAKUDA"`.

2. **Candidate Profile Subheader (`frontend/src/pages/candidates/CandidateProfile.tsx`)**:
   - Updates: Display `{formatBranchName(user.branch_location)} Branch` instead of `{user.branch_location} Branch`.

3. **Public Candidate Portal (`frontend/src/pages/candidates/CandidatePortalPage.tsx`)**:
   - Updates: Render `{formatBranchName(portalData.branch_location)}` alongside the MapPin icon.
   - Candidates for Thrissur see `"Irinjalakuda"` on their review/confirmation portal.

4. **Candidates List Table & Filter Header (`frontend/src/pages/candidates/CandidatesList.tsx`)**:
   - Table Cell: Renders `{formatBranchName(candidate.branch_location) || '-'}`.
   - Filter Header: Uses `getBranchSelectOptions(...)` so the dropdown menu option displays `"Irinjalakuda"` while the filter query param sent to the API remains `branch=Thrissur`.

5. **Candidate Header & Background Verification Details (`CandidateHeader.tsx`, `BackgroundVerificationWidget.tsx`)**:
   - Updates: Displays formatted branch name in the candidate detail chips and verification info cards.

6. **Admin Read-Only Lists (`AdminCandidatesList.tsx`, `AdminBottlenecksList.tsx`, `AdminOutcomesList.tsx`)**:
   - Updates: Renders `{formatBranchName(candidate.branch_location) || 'Head Office'}`.

7. **Dropdown Selects for Candidate Form / Openings (`AddCandidateForm.tsx`, `RecentOpeningsCard.tsx`)**:
   - Options render `<option key={branch} value={branch}>{formatBranchName(branch)}</option>`. Form submissions continue sending the canonical branch value (`Thrissur`).

---

## 3. Safety & Boundary Considerations

1. **Zero Database Changes**: No tables, columns, migrations, or database records are touched. Existing candidate rows and user accounts keep their existing `branch_location = "Thrissur"`.
2. **Zero Backend Changes**: Backend models (`settings.py`, `enums.py`, `user.py`), seed scripts, API routes, and offer CC logic (`offer_cc.py`) continue operating normally without regression.
3. **API Query Compatibility**: Filter queries sent to the backend continue using `Thrissur`, so database filtering remains 100% accurate.
4. **Resilience**: `formatBranchName` handles null, undefined, whitespace, and case variations gracefully.

---

## 4. Verification & Testing Plan

1. **Type Checking & Build Verification**:
   - Run `npm run build` (or Vite build) to verify TypeScript compilation and clean bundle creation.
2. **Component Rendering Check**:
   - Verify `formatBranchName('Thrissur')` returns `'Irinjalakuda'`.
   - Verify `formatBranchName('Kalamassery')` returns `'Kalamassery'`.
   - Verify `formatBranchName(null)` returns `''`.
   - Verify header badge, candidate list table row, candidate portal, and filters show `"Irinjalakuda"`.
