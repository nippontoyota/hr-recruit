# Head Office Interview Modes Implementation Plan

> **For agentic workers:** Execute the tasks inline in order; keep the changes small and run each verification command before the next task.

**Goal:** Make Head Office interview invitations use separate physical and online WhatsApp templates, with a mode-aware schedule form and preview.

**Architecture:** Keep the existing evaluation invite endpoint and DoubleTick transport. Add a second template spec and choose the template/placeholders server-side from the saved evaluation mode; mirror the same branch in the frontend preview and validation.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, React, TypeScript, Vite, pytest.

## Global Constraints

- Physical mode requires date, time, and Head Office location.
- Online mode requires date and time only; the joining link and further details are sent later.
- The template name is selected server-side from `interview_mode`.
- Do not advance the candidate stage when DoubleTick fails.

---

### Task 1: Add separate WhatsApp template specifications

**Files:**
- Modify: `backend/app/services/whatsapp_templates.py`
- Modify: `backend/app/services/doubletick.py`
- Test: `backend/tests/test_doubletick.py` (or the existing DoubleTick test module)

**Interfaces:**
- Produce `ONLINE_INTERVIEW_SCHEDULE` with name `nippon_head_office_online_interview_invite`.
- Produce `online_interview_placeholders(vars_map)` and retain `hr_interview_placeholders(vars_map)` for physical invites.

- [ ] Add the online template body with candidate, position, date, time, recruiter variables and the exact “joining link and further interview details will be shared shortly” copy.
- [ ] Add a five-key placeholder order for the online template and keep the existing seven-key physical order unchanged.
- [ ] Test both template names, key order, and online copy.

### Task 2: Select the template from the saved interview mode

**Files:**
- Modify: `backend/app/api/v1/evaluations.py`
- Test: `backend/tests/test_doubletick.py` or the closest evaluation API test module

**Interfaces:**
- `POST /api/v1/evaluations/{eval_id}/send-whatsapp-invite` continues accepting `EvaluationWhatsAppInvite`.
- The endpoint chooses the online template only when the evaluation’s `interview_mode` is `ONLINE`; all other Head Office invites use the physical template.

- [ ] Import the online placeholder helper.
- [ ] In the Head Office branch, choose `settings.whatsapp_ho_online_interview_template_name` for online mode and the existing setting otherwise.
- [ ] Persist the selected template name in the communication preview as today.
- [ ] Test that online and physical evaluations call `send_template` with different names and placeholder lengths.

### Task 3: Add production configuration for the online template

**Files:**
- Modify: `backend/app/core/config.py`
- Test: `backend/tests/test_doubletick.py`

- [ ] Add `whatsapp_ho_online_interview_template_name` with default `nippon_head_office_online_interview_invite`.
- [ ] Assert the default is stable so a deployment missing the optional env var still selects the intended approved template name.

### Task 4: Make the Head Office form and mockup mode-aware

**Files:**
- Modify: `frontend/src/components/candidates/HeadOfficeInvitePanel.tsx`
- Modify: `frontend/src/lib/whatsappTemplate.ts`
- Test: `frontend/src/lib/whatsappTemplate.test.ts` if present, otherwise validate through the build and a small pure-function test added beside the existing tests.

- [ ] Define `isOnline = mode === 'ONLINE'` and validate `candidate.phone`, date, and mode for online; require location only for physical.
- [ ] Hide the location/link input in online mode and show a note that the joining link and further details will be shared shortly.
- [ ] Keep the physical location input and validation unchanged.
- [ ] Branch `buildHeadOfficeInterviewWhatsAppMessage` so online previews omit `Location/Link` and include the follow-up-details copy.
- [ ] Send variables appropriate to the selected mode; omit `locationOrLink` from online payloads.
- [ ] Ensure changing the saved mode refreshes the preview and button enabled state.

### Task 5: Verify and commit

**Files:**
- No new source files.

- [ ] Run `python -m pytest -q -k "not test_create_candidate_accepts_linkedin_source"` from `backend`.
- [ ] Run `npm run build` from `frontend`.
- [ ] Run `git diff --check` and inspect the final diff for only mode-template changes.
- [ ] Commit with `Add adaptive head office interview templates`.
