# Head Office Interview Mode-Specific WhatsApp Templates

## Goal

Make the Head Office interview-intimation stage clearly support both physical and online interviews. The saved interview mode must control the form requirements, preview copy, and DoubleTick template selected for the candidate.

## Design

### Physical interviews

- Require interview date, time, and Head Office location.
- Preview the existing location-based WhatsApp message.
- Send the approved `nippon_head_office_interview_invite` DoubleTick template with the location variable.

### Online interviews

- Require interview date and time, but do not require a meeting link at scheduling time.
- Hide the location/link input and show a short note that the joining link will follow.
- Preview an online-specific message that says the joining link and further interview details will be shared shortly.
- Send a separate approved `nippon_head_office_online_interview_invite` DoubleTick template without a location variable.

Both modes retain the candidate name, position, date, time, recruiter name, and the existing WhatsApp send choices. The invitation is recorded and the candidate moves to the Head Office interviews stage only after the send/manual-confirm action succeeds.

## Data flow

1. HR selects a mode and enters the schedule.
2. The UI validates fields according to that mode and renders the matching mockup.
3. DoubleTick receives the matching template name and its exact variable order.
4. The backend records the outbound communication and stage transition using the existing evaluation invite endpoint.

The template name is selected server-side from `interview_mode`; the client sends the mode as a variable for display only. This prevents the UI from accidentally sending the physical template for an online interview.

## Error handling

- Physical mode with no location remains unsendable and shows the existing validation message.
- Online mode remains unsendable until date/time are saved, but a missing link is not an error.
- DoubleTick errors continue to use the existing friendly error handling.
- If the online template is not approved/configured, the existing DoubleTick error is shown and the candidate stage is not advanced.

## Verification

- Unit-test the template registry for both names, keys, and online copy.
- Exercise the invite endpoint for both modes and assert the selected template name and variable list.
- Build the frontend and verify the preview changes when the saved mode changes.
