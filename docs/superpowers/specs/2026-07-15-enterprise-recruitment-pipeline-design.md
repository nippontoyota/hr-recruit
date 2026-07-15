# Enterprise Recruitment Pipeline & Token-Based Evaluations Design

**Date**: 2026-07-15  
**Topic**: Enterprise Recruitment Pipeline  

---

## 1. Goal

Implement the complete enterprise recruitment workflow for Nippon Toyota. The system transition will expand candidate stages, support role-based access control (RBAC) with a new `HQ_HR` role, and implement secure token-based links for branch interviewers and candidate technical tests.

---

## 2. Proposed Changes

### 2.1. Stage & Role Definitions

#### enums.py / types/index.ts
*   **UserRole**: Add `HQ_HR` (Head Office HR).
*   **PipelineStage**: Set to:
    *   `SCREENING`: Sourcing and initial screening checklist.
    *   `CANDIDATE_FORM`: Candidate fills pre-interview form.
    *   `BRANCH_EVALUATION`: Local branch interviews and technical test.
    *   `HQ_EVALUATION`: HQ reviews package and conducts online interview.
    *   `HIRED`: Candidate approved for hiring.
    *   `REJECTED`: Candidate rejected.
    *   `ON_HOLD`: Candidate placed on hold.
*   **EvaluationType**:
    *   `BRANCH_HR`, `DEPT_HEAD`, `GM_LEVEL`, `TECHNICAL_TEST`, `HQ_INTERVIEW`.
*   **EvaluationVerdict**:
    *   `SELECTED`, `REJECTED`, `ON_HOLD`, `PASS`, `FAIL`.

---

### 2.2. Database Schema (New Tables & Migrations)

#### Table `recruitment.evaluations` (Replaces `hr_interviews` table)
| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Primary key |
| `candidate_id` | uuid FK | References `candidates.id` ON DELETE CASCADE |
| `type` | enum `evaluation_type` | `BRANCH_HR`, `DEPT_HEAD`, `GM_LEVEL`, `TECHNICAL_TEST`, `HQ_INTERVIEW` |
| `status` | enum `interview_status` | `PENDING_SCHEDULE`, `SCHEDULED`, `EVALUATED` |
| `interview_mode` | enum `interview_mode` | `PHYSICAL`, `ONLINE` |
| `scheduled_time` | timestamptz | Optional scheduled date/time |
| `location_or_link` | varchar | Room location or Google Meet URL |
| `verdict` | enum `evaluation_verdict` | Scorecard selection |
| `remarks` | text | Interviewer notes |
| `scores` | jsonb | Rating categories or test answers |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | default now() |

*Unique constraint on `(candidate_id, type)`.*

#### Table `recruitment.evaluation_tokens`
| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Primary key |
| `evaluation_id` | uuid FK | References `evaluations.id` ON DELETE CASCADE |
| `token` | varchar | Secure random URL token (unique index) |
| `is_used` | boolean | Set to true upon form submission |
| `expires_at` | timestamptz | Token expiration timestamp |

---

### 2.3. Backend Endpoints

#### `app/api/v1/evaluations.py` [NEW]
*   `GET /candidates/{id}/evaluations` (Auth: active users): List all evaluations and statuses.
*   `POST /evaluations/{id}/schedule` (Auth: active users): Schedule an evaluation.
*   `POST /evaluations/{id}/token` (Auth: active users): Generate and return a secure token.
*   `POST /evaluations/{id}/submit-scorecard` (Auth: active users): Allows HR to submit scorecard remarks directly.
*   `GET /evaluations/public/{token}` (Public): Return candidate overview (Name, Position, Education/Experience, Resume URL) and prior remarks.
*   `POST /evaluations/public/{token}/submit` (Public): Submit interviewer ratings, remarks, and verdict. Marks token as used.
*   `POST /evaluations/public/{token}/submit-test` (Public): Candidate submits online technical test answers. Calculates score against static JSON questions and records marks/verdict.

---

### 2.4. Frontend Components

*   `BranchEvaluationDashboard.tsx` [NEW]: Grid containing the four local evaluation cards. Handles scheduling, copying evaluation links, and "Recommend & Send to HQ".
*   `HQEvaluationDashboard.tsx` [NEW]: Displays branch summaries, schedules the online HQ interview, and has the final hire/reject scorecard.
*   `PublicInterviewerPage.tsx` [NEW]: Public route `/eval/:token`. Secure layout presenting candidate details and scorecard inputs.
*   `PublicTestPage.tsx` [NEW]: Public route `/test/:token`. Technical test interface with MCQ quiz questions.

---

## 3. Verification Plan

### Automated Tests
*   `pytest backend/tests/test_evaluations.py` to verify:
    *   Creation of evaluations upon candidate moving to `BRANCH_EVALUATION`.
    *   Token generation, validation, and usage tracking.
    *   Role-based read/write access (Branch HR vs HQ HR vs public endpoints).
    *   Static technical test scoring logic.

### Manual Verification
*   Create candidate ➔ Screen as Qualified ➔ Fill Pre-interview form.
*   Log in as Branch HR ➔ Schedule Department Head Interview ➔ Copy evaluation link.
*   Open the link in incognito mode ➔ Submit scorecard remarks ➔ Verify portal updates live.
*   Run the Technical Test ➔ Grade it ➔ Verify workflow transitions.
*   Log in as HQ HR ➔ Review candidate ➔ Complete online interview ➔ Set as Hired.
