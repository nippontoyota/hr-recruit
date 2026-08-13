# Call-letter application form (single form) — design

**Date:** 2026-08-13  
**Status:** Approved for planning (pending user review of this file)  
**Reference:** `Nippon_Motor_Corporation_Interview_Application_Form_2_Page.pdf`

## Goal

There is **one** candidate form, filled via the call-letter / pre-form link. It must cover every candidate-facing section of the Nippon Interview Application Form PDF. Local HR print at `CALL_LETTER` must look like that PDF in a compressed ~2-page layout.

**Out of scope for the candidate form and its printout**

- Interview panel / HR assessment table  
- Regional HR comments, CMD comments, final decision boxes  
- HR comments – social media screening  

Those stay as separate evaluation/HR workflows later.

## Current state

- Candidate wizard + `PreFormApplicationData` collect a subset (personal, address, identity, basic education, one job, referral, medical remarks).  
- Richer PDF fields already exist as `PostFormApplicationData` / `raw_data` keys but are treated as a later “post form.”  
- `PreFormStatus` print is a categorized key/value dump, not the paper layout.  
- User confirmed: **no post form** — merge into the single call-letter form.

## Approach

Merge pre-form + post-form into one smart wizard with progressive disclosure. Required only when every candidate can answer; optional / “add another” for N/A rows. Replace CALL_LETTER print with a compressed HTML facsimile of the PDF (no assessment footer).

## Form structure (wizard sections)

Order mirrors the PDF:

1. **Header / basics** — mobile, applied date, position applied for, position suitable (optional), photo, full name  
2. **Personal data** — permanent + present address, age/DOB/height/weight/blood group/gender/marital/religion & caste, languages, ID numbers, confident to drive  
3. **Educational qualification** — 10th, 12th, grad/diploma, PG/diploma (mode of study per row), computer knowledge, other software/certs  
4. **Family details** — table rows (father, mother, spouse, children, siblings)  
5. **Employment record** — experience Y/N, total years, expected salary; up to 4 prior jobs; source of opening; referred by; branches ready to work; joining date  
6. **Additional** — achievements, hobbies  
7. **General information** — Y/N questions a–e  
8. **Emergency contacts** — up to 2  
9. **Social media** — Facebook / Instagram / Twitter names (optional)  
10. **Email + declaration** — email, place, date, typed-name acknowledgment  

Reuse existing `raw_data` camelCase keys from `PostFormApplicationData` where they already match; extend only when the PDF needs a field that does not exist (e.g. single `confidentToDrive` if drive checkboxes are insufficient — prefer mapping “confident to drive” to existing drive flags or one clear Yes/No plus optional vehicle types).

## Mandatory vs optional (UX rules)

### Always required

| Area | Fields |
|------|--------|
| Header | Mobile, applied date, position applied for, full name, photo |
| Address | Permanent address (house, PO, landmark, district, PIN) |
| Personal | Age, DOB, height, weight, blood group, gender, marital status, religion & caste |
| Languages | Read, write, speak |
| IDs | Aadhaar, PAN, driving licence |
| Drive | Confident to drive Yes/No |
| Education | 10th and 12th full rows (school/college, course/board/stream, marks, year, mode) |
| Employment gate | Previous experience Yes/No, expected salary |
| Recruitment | Source of opening, preferred branches / region, expected joining date |
| General | All five Yes/No (terminated, nervous disorder, physical disability, eye/colour/night blindness, criminal conviction) |
| Emergency | At least contact #1 (relation, name, address, phone) |
| Close | Email, declaration place, declaration date, typed-name acknowledgment |

### Required when relevant

- Present address if not “same as permanent”  
- Referred by if source is employee referral / referred  
- Job #1 detail columns if experience = Yes (company & address, position, reporting person, from/to, last salary, reason for leaving) + total experience years  
- Spouse row if marital status is married / equivalent  
- Father name and mother name (age / occupation / phone encouraged; company optional but not blocking)

### Optional / add-more

- Position suitable  
- Passport  
- Other languages  
- Graduation / diploma and post-graduation rows (and mode)  
- Computer knowledge detail + software/certs  
- Children and sibling rows  
- Jobs 2–4  
- Achievements, hobbies  
- Emergency contact #2  
- Social media handles  
- Drive vehicle-type detail (2W/3W/4W/heavy) if kept as enrichment under confident-to-drive = Yes  

Do **not** force empty spouse/child/job-2 rows on submit.

## Data model / API

- Single write path: public full apply → `CandidateProfile` columns + `raw_data` JSON (existing).  
- Expand `PreFormApplicationData` (or rename conceptually to `ApplicationFormData`) to include the merged fields; retire the idea of a separate post-form submit.  
- Keep `extra="ignore"` for forward compatibility.  
- Frontend: extend `CandidateFormData` / wizard sections / `validatePreForm` to match the rules above.  
- Backend validators mirror FE required-when-relevant rules.  
- Existing candidates with partial `raw_data` remain loadable; print shows blanks for missing keys.

## Local HR CALL_LETTER print

- Trigger stays on `PreFormStatus` (and any “Print form” at this stage).  
- New print component (e.g. `InterviewApplicationFormDocument`) styled like the PDF: company header, section titles, two-column addresses, education/family/employment tables, general Y/N, emergency, social, email, declaration.  
- Compressed typography / tighter spacing to target ~2 A4 pages.  
- **Omit** interview panel, regional HR, CMD, social-media screening HR blocks.  
- Photo: fixed passport slot with `object-cover` (same fix as profile header).  
- Screen UI for submitted form can stay editable categorized view for HR corrections; print uses the PDF-like document only.

## Non-goals

- Rebuilding evaluation / interview scoring UI into this form  
- Changing WhatsApp call-letter template copy (unless a field label must match)  
- Migrating historical print routes at APPLICATION/CSS unless they already share the summary document — only CALL_LETTER print is required to match this PDF now; later stages may reuse the same document component if trivial

## Testing

- Validator tests: fresher vs experienced; married vs single; same-as-permanent; referral source  
- Smoke: submit full form public path; Local HR print produces 2-page layout without assessment section  
- Regression: photo upload + resume still required as today  

## Success criteria

1. Candidate completes one form covering PDF candidate sections.  
2. Mandatory/optional rules match the table above without blocking N/A life situations.  
3. Local HR print at call-letter stage visually matches the paper form (compressed), minus panel/assessment.
