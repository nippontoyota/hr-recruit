# HR Application Edit Consistency Design

## Goal

Ensure every HR edit made through the candidate application form is persisted, immediately visible in the current profile, and reflected by all application-derived views and documents.

## Current failure

The editor submits resume/photo uploads and raw application data as separate requests. After the raw-data request returns a refreshed candidate, `PreFormStatus` discards that candidate and invokes a background refresh callback. The profile page can therefore continue rendering its previous candidate object while the editor closes. Candidate-derived documents and packets read `candidate.profile.raw_data`, so they also remain stale until a later reload. The API additionally replaces the complete JSON payload, allowing stale clients to overwrite system-maintained metadata.

## Recommended design

### Backend canonical update

Keep the existing `PATCH /candidates/{id}/profile/raw_data` contract, but route it through a focused update implementation that:

1. Loads the candidate with its profile and enforces the existing access and mutation rules.
2. Applies the submitted HR form data while preserving system-managed raw-data metadata that is not part of the editable form.
3. Synchronizes editable identity fields (`fullName`, `mobileNumber`, `emailId`, and `positionAppliedFor`) to the candidate columns using the same canonical values returned to the client.
4. Writes the existing “Application Form Updated” activity log.
5. Commits, reloads the candidate/profile relationship, and returns a complete `CandidateOut` including current resume state and work state.

Photo and resume uploads remain separate storage operations, but the frontend will use the final canonical candidate response after all operations complete. Existing access restrictions and document storage behavior remain unchanged.

### Frontend state handoff

Change the save callback to return the candidate returned by the API. `PreFormStatus` will update its local state from that response and pass it to the parent instead of calling a fire-and-forget refresh. The candidate profile page will replace its displayed candidate and both relevant caches with that object before leaving edit mode. This removes the stale-object/racing-refresh path.

### Derived views and documents

No new persisted document-generation subsystem is required. The application form, candidate summary, Head Office review packet, salary proposal view, exports, and other derived UI already render from candidate/profile data. Supplying the canonical updated candidate makes those outputs reflect the edit immediately; print/PDF actions then render the new values on demand. Existing sent offer letters and already-delivered messages are not rewritten or resent automatically.

## Error handling

- If photo or resume upload fails, the raw application update is not attempted and the editor remains open with the existing error toast.
- If raw-data persistence fails, the editor remains open and the parent candidate is unchanged.
- A successful response is considered complete only after the backend commit and response serialization succeed.
- Cache invalidation occurs before mutation and canonical cache replacement occurs only after a successful response.

## Verification

Add regression tests covering:

- An HR edit to scalar form fields is persisted and returned in the refreshed candidate.
- Family-member and previous-job arrays survive the round trip.
- System-managed raw-data metadata survives an HR edit.
- Candidate scalar fields stay synchronized with the editable form values.
- The existing audit activity is recorded.

Run the backend test suite and the frontend lint/build checks. If deployment configuration and credentials are available, deploy both affected applications through their existing Vercel configuration and smoke-test the deployed candidate edit flow.

## Scope boundaries

This change covers all HR edits made through the application-form editor, regardless of candidate ID or pipeline stage where the existing authorization permits editing. It does not alter candidate portal submission semantics, interview evaluations, stage transitions, offer-letter delivery, or historical documents that have already been sent.
