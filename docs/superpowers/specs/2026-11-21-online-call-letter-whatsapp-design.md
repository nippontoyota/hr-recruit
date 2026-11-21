# Online Interview Call Letter WhatsApp Feature Design Spec

- **Author**: Antigravity Assistant & Engineering Team
- **Date**: 2026-11-21
- **Topic**: Adding "Online" Interview Mode to Call Letter WhatsApp Workflow
- **Status**: Approved Design

---

## 1. Background & Requirement

When issuing a Candidate Call Letter via WhatsApp, the system currently only generates copy tailored for an **in-person showroom interview**. This assumes the candidate must travel to a branch location with physical bio-data and passport photo, meeting showroom touchpoints.

The user requirement is:
> *"when we send intervioew call letter in wahstapp we need to give another option "Online"... which changes the respective messasge accordinggly... Should there be an input field for the recruiter to paste a meeting link , yes keep the rest of thje pipeline sasme"*

---

## 2. Architecture & Design

### A. Template Variables Schema
In `frontend/src/lib/whatsappTemplate.ts`:
```typescript
export interface WhatsAppTemplateVars {
  brand?: string | null;
  candidateName: string;
  position: string;
  formLink: string;
  branchName: string;
  visitDate: string;
  arrivalTime: string;
  mapsLink: string;
  recruiterName: string;
  extraInstructions: string;
  meetingPoint: string;
  touchPoint1: string;
  touchPoint2: string;
  mode?: 'IN_PERSON' | 'ONLINE';
  meetingLink?: string;
}
```

In `backend/app/schemas/candidate.py`:
Add `mode: str | None = None` and `meetingLink: str | None = None` to `WhatsAppTemplateSave`.

### B. Message Formatting Logic (`buildWhatsAppMessage`)
- **When `mode === 'ONLINE'`**:
  ```text
  Dear {candidateName},

  "Greetings from {brandName} HRD"

  This is to inform you that, pertaining to your application for *{position}*, we have scheduled an online interview on *{visitDate}*.

  Also complete the Job Application Form using the link below without fail:
  {formLink}

  Interview Time – *{arrivalTime}*
  Mode – Online
  {meetingLink ? `Meeting Link – ${meetingLink}` : 'Meeting Link – Joining details will be shared with you shortly.'}
  Dress Code – Formal Wear with Proper Grooming (Mandatory)

  Please ensure a stable internet connection and be ready at the scheduled time.

  Regards
  {recruiterName}
  Talent Acquisition Team
  {brandName}
  ```

- **When `mode === 'IN_PERSON'` (or undefined)**:
  Existing message is 100% preserved with zero modification.

### C. Validation Logic
- **In-Person**: Requires `candidateName`, `position`, `visitDate`, `arrivalTime`, `recruiterName`, `formLink`, `branchName`, and `mapsLink`.
- **Online**: Requires `candidateName`, `position`, `visitDate`, `arrivalTime`, `recruiterName`, and `formLink`. Does **not** require `branchName` or `mapsLink`.

### D. UI/UX in `WhatsAppPreviewPanel.tsx`
1. **Mode Selector**:
   - A clear toggle between **"In-Person"** and **"Online"** in both the quick sidebar preview and the Edit modal.
2. **Conditional Fields**:
   - In **In-Person** mode: Displays Location selector, Maps link, Meeting Point, and Touch Points.
   - In **Online** mode: Hides physical location/touchpoint fields and displays a **Meeting Link** input (`https://meet.google.com/...`) with helper text indicating that leaving it empty defaults to *"Joining details will be shared with you shortly."*
3. **Preview**:
   - The WhatsApp message preview bubble immediately reflects the selected mode.

### E. Backend Action Safety (`candidates_actions.py`)
In `send_whatsapp_invite`:
- If `mode == "ONLINE"`, skips the `branchName` and `mapsLink` requirement check.
- For fallback DoubleTick compatibility, if DoubleTick is triggered on an online invite, populates fallback placeholders (`branchName="Online"`, `mapsLink=meetingLink or "Online"`) so Meta does not fail on missing placeholder variables.

---

## 3. Safety & Boundary Considerations
1. **Zero Pipeline Regressions**: Candidate form link generation, token tracking, stage advancement (*"Call letter issued, waiting for candidate response"*), and candidate response handling remain 100% unchanged.
2. **Default Backward Compatibility**: Default mode is `'IN_PERSON'`, ensuring all existing drafts and candidate workflows behave identically unless explicitly switched to Online.
3. **Data Persistence**: Mode and meeting link persist cleanly in `candidate.profile.raw_data.whatsapp_template`.

---

## 4. Verification Plan
1. Unit testing `buildWhatsAppMessage` with both `IN_PERSON` and `ONLINE` modes.
2. Form validation testing with missing location in Online mode (should be valid) vs In-Person mode (should require location).
3. Production frontend build (`npm run build`).
