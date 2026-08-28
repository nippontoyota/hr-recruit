# Head Office interview WhatsApp invitation design

## Goal

Head Office HR must be able to preview and send a candidate's Head Office
interview invitation from the Head Office interview stage. HR can send through
DoubleTick or open the prepared message in WhatsApp.

The Head Office invitation does not contain a candidate application form link.
The candidate has completed that form before reaching this stage.

## User flow

1. Head Office HR opens the candidate's Head Office interview stage.
2. HR schedules the interview with its date, time, mode, and location or link.
3. A candidate-facing WhatsApp preview displays the resulting invitation.
4. HR can edit the message details that belong to the invitation.
5. HR chooses either `Send via DoubleTick` or `Open WhatsApp`.
6. A successful DoubleTick send appears in the existing communication and
   activity history. Direct WhatsApp uses the same prepared message.

The send actions remain unavailable until the candidate has a valid phone
number and the invitation has a date, time, and location or online link.

## Message content

The copy follows the interview call-letter section in
`C:\Users\krish\Downloads\For RT Software (1).docx`, adapted for Head Office.
It contains:

- candidate name
- position
- interview date
- reporting time
- interview mode
- Head Office location or online meeting link
- formal dress and grooming instruction
- optional meeting-point or contact instructions
- recruiter name and Nippon Toyota Talent Acquisition signature

It does not contain an application-form instruction or form URL.

## Frontend

Add a focused Head Office invitation component to the existing Head Office
interview stage. It will present the same candidate-perspective WhatsApp visual
language used by the Local HR call-letter panel without importing that panel's
branch location, application-form, or call-letter state.

The component will use the interview schedule already stored on the Head Office
HR evaluation. Editing or scheduling remains part of the existing interview
workflow. The invitation panel owns only preview and delivery.

Both delivery choices render one shared message builder so the preview and
direct WhatsApp text cannot drift apart.

## Backend and DoubleTick

Use the existing evaluation invitation endpoint and the dedicated
`nippon_head_office_interview_invite` template name. Update the repository's template
specification and placeholder contract to match the approved Head Office copy.
The endpoint will continue to record successful and failed DoubleTick attempts
in communications and activity logs.

DoubleTick and Meta require template approval outside this application. The
portal can send the configured template but cannot use revised copy until the
matching template is approved in DoubleTick. The final template body and
placeholder order will be documented in code for dashboard submission.

## Error handling

- Missing or invalid candidate phone: disable sending and show the field issue.
- Missing schedule details: disable sending and identify the missing values.
- Pop-up blocked: keep the preview open and tell HR to allow pop-ups.
- DoubleTick configuration, balance, template approval, or network errors: use
  the existing safe provider-specific messages.
- Failed sends do not appear as successful.

## Verification

- Unit test the Head Office message builder and required-field checks.
- Unit test the DoubleTick placeholder order and sanitation.
- Test that the evaluation endpoint selects `nippon_interview_schedule` for a
  candidate Head Office interview invitation.
- Build and lint the frontend.
- Run the backend test suite.
- Inspect the Head Office stage at desktop and mobile widths, including ready,
  missing-data, provider-error, and direct-WhatsApp states.

## Scope

This change adds candidate invitation preview and delivery to the Head Office
interview stage. It does not change Local HR call letters, candidate forms,
interviewer evaluation links, interview scoring, or pipeline transitions.
