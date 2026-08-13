# Recruitment Portal — Requirements Status

Edit this file freely. Status legend: **Done** / **Partial** / **Missing** / **Wrong**

Last checked: 2026-08-12

---

## Checklist

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Send-to-candidate message should auto-adjust | Done | Fills name/position/branch/maps from candidate (+ screening visit if set). Single form / call-letter copy (HR Word template). DoubleTick: `nippon_interview_call_letter`. |
| 2 | Name of the interviewer on the HR interview | Done | Required on scorecard; **per-branch** roster (`branch_location`) for the 9 HR accounts. |
| 7 | Technical test 8 minutes long + visual timer for candidates | Missing | No timer UI; token TTL ≠ 8-min visual countdown. |
| 9 | Change department of candidate mid-process | Done | Change **consideration** department + role mid-process (`PATCH /candidates/{id}/department`). Includes Customer Service. |
| 10 | Interview comments on application page and test results | Partial | In print pack / stage widgets; not one unified application view. |
| 11 | Source handled / assigned properly | Partial | Public apply sets source. HR Add Candidate hardcodes `OTHER`. |
| 12 | Flow: application → HR interview → dept interview → selected → CSS generated | Partial | Actual order differs: interviews → test → BGV → application pack → HO → CSS → offer. CSS is HO stage. |
| 13 | Salary sheet upload only by admin | Wrong | Currently `ADMIN` **and** `HO_HR` can bulk-upload. |
| 14 | HOHR create offer letter only if candidate selected **and** salary sheet uploaded | Missing | Offer only checks Final Approval/Hired + email. No salary/`selected` gate. |
| 15 | Offer letter email + WhatsApp intimation | Partial | Email + PDF only. No WhatsApp on offer. |
| 16 | Offer mail copy to branch admin + Jerry sir + Naveen sir | Missing | No CC list. |
| 17 | Admin sees everything (summary, edit, normal flow; no interviews) | Partial | Sees all; can still do interviews; no summary dashboard. |
| 18 | Salary sheet bulk upload | Partial | API exists; `BulkSalaryUpload` UI not wired into pages. |
| 19 | Candidates sign separate salary sheet, ESI and other sheets (printable) | Missing | — |
| 20 | After offer letter sent, salary proposal document also sent | Missing | — |
| 21 | Kalamassery branch instead of doing everything in HOHR account | Partial | In branch list; use LOCAL_HR + branch. No special workflow. |
| 22 | Only these branches: Trivandrum, Kollam, Pathanamthitta, Kayamkulam, Kottayam, Muvattupuzha, Kalamassery, Cochin, Thrissur | Done | Candidate UI list matches. Extra sub-locations may still exist in maps/WhatsApp helpers. |
| 23 | Candidates upload photo and resume | Done | Full pre-form. |
| 24 | 3 days to fill candidate form after WhatsApp; regenerate link after expiry | Partial | `EXPIRED` + resend UI; no real 3-day token enforcement. |
| 25 | Application on a single page, then interview notes, resume, test results | Partial | APPLICATION = multi-doc print pack; profile is stage stepper. |

---

## Templates / config still needed

Mark each as: have / need / draft

| Asset | Status | Notes |
|-------|--------|-------|
| Offer letter template | | |
| Salary excel | | |
| Salary proposal | | |
| Number of branches / sub-branches | | |
| Questions for technical test | | |
| WhatsApp messages being sent | | |
| Background verification templates and inputs | | |
| CSS structure (any changes) | | |
| Candidate form fields | | |
| Names of printed forms | | |

### Printed form names (fill in)

- Candidate Summary / CSS — _(exists in code)_
- Interview Panel Suggestion — _(exists)_
- Background Verification — _(exists)_
- Technical Test / Question Paper — _(exists)_
- Offer of Employment — _(exists)_
- Salary sheet (sign) — _(missing)_
- ESI sheet — _(missing)_
- Other joining sheets — _(missing / name TBD)_
- Salary proposal — _(missing)_

---

## Source (detail)

- Field: `Candidate.source` (+ optional `source_reference`)
- Public apply: candidate picks Walk-in / Indeed / Referral / Campus / Other
- HR Add Candidate: always writes `OTHER` — **not really assigned**
- Fix needed: source picker on Add Candidate form

---

## Current flow (as coded)

**Branch (LOCAL_HR):** Add candidate → WhatsApp / pre-form → INTERVIEWS (HR + Dept) → TECHNICAL TEST → BACKGROUND VERIFICATION → APPLICATION (print pack) → Send to HO

**HO (HO_HR):** SENT_TO_HO → HO_INTERVIEWS → CSS → FINAL_APPROVAL (offer email)

**ADMIN:** All candidates + user management; interviews not specially disabled

Roles in code: `ADMIN`, `HO_HR`, `LOCAL_HR`

---

## Priority to implement (edit order as you like)

1. [ ] Source picker on add-candidate
2. [ ] Mid-process department edit
3. [ ] Question papers + 8-min timer
4. [ ] Offer gates + WhatsApp + CC
5. [ ] Admin-only salary + wire bulk upload UI
6. [ ] Form 3-day expiry enforcement
7. [ ] Printable joining forms + salary proposal
8. [ ] HO interview parity / head-office-hire path
9. [ ] Unified application page layout

---

## Your notes

_(add anything below)_
