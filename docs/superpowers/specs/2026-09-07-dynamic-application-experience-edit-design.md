# Dynamic application experience editing design

## Goal

When HR edits a candidate's application, every saved experience row must remain visible and current in the application form, CSS and summary sheets, interviewer and Head Office packets, background verification, exports, and other views built from the application.

## Cause

The editable application form currently saves rows with short UI keys such as `co`, `pos`, `from`, and `sal`. Shared readers expect the canonical keys `company`, `position`, `fromDate`, and `salary`. Some readers therefore ignore rows created or changed by HR. The CSS and summary sheets also limit output to six rows. The raw-data endpoint updates only a few candidate columns, so profile fields can stay stale after an edit.

## Design

### One canonical experience shape

Use the existing `PreviousJob` shape everywhere application data is read or written:

```ts
{
  company: string,
  position: string,
  reporting: string,
  reportingDesignation: string,
  reportingPhone: string,
  fromDate: string,
  toDate: string,
  salary: string,
  reason: string
}
```

The editor will convert its local row state to this shape before sending it. The shared reader will still accept the old short keys so existing records continue to render. Local row IDs stay in React state only and will never be persisted.

### Backend save

Keep `PATCH /candidates/{id}/profile/raw_data` as the only save request. The endpoint will:

1. Preserve system-managed raw-data keys.
2. Store the submitted canonical `previousJobs` array without a row-count limit.
3. Mirror the first four jobs into the legacy `prev*` fields for older integrations.
4. Update profile fields from the same submitted values: experience level, total experience, current company, expected salary, and joining date.
5. Commit once and return the fully reloaded candidate.

An empty job list will clear the mirrored legacy fields and mark the profile as Fresher. The existing authorization, validation, file upload, and audit-log rules remain unchanged.

### Dynamic consumers

Application documents and interviewer packets will read the complete canonical array. CSS and summary sheets will render every saved job instead of padding to six rows and slicing away later rows. Existing print styles may allow the sheet to continue onto another page when the list is longer than the paper layout.

Background verification and any other application-derived code will use the same reader, so changing a job or removing one affects the next render without another migration or request.

### State handoff and latency

The frontend will use the candidate returned by the save request immediately. It will update the page state and candidate cache before leaving edit mode. It will not start a competing background refresh. The save path remains one PATCH and one database commit after any selected file uploads.

## Error handling

If an attachment upload or the raw-data PATCH fails, the editor stays open and the current candidate stays unchanged. If the PATCH succeeds, the returned candidate is the only source used for the next render. System-managed metadata is preserved even when an old client submits a complete raw-data object.

## Verification

Add tests for:

- Saving five experience rows with canonical field names.
- Editing a saved row and confirming the changed value survives reload.
- Removing a row and confirming it disappears from every derived list.
- Rendering more than six rows in CSS and summary data.
- Preserving old short-key rows.
- Synchronizing candidate profile fields and legacy fields.
- Preserving system-managed raw-data metadata.
- Returning the committed candidate and recording the existing audit activity.

Run the focused backend tests, the complete backend suite, frontend lint, TypeScript checking, and the production frontend build.

## Scope

This change covers application-derived data that is rendered from the candidate record. It does not rewrite documents already sent to candidates, resend messages, change candidate portal submission rules, or alter interview evaluation rules.
