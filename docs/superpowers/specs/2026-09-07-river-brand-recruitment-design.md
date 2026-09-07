# River Brand Recruitment Design

**Date:** 2026-09-07

## Goal

Add an isolated River Mobility recruitment account for `hr.river@incheonmobility.com` while preserving the existing Nippon Toyota recruitment behavior and existing records. River candidates use River branding, are visible to Head Office after handover, and receive role-specific technical questions only.

## Approved scope

- Create an idempotent River local-HR account with the same password value used by the existing seed accounts.
- Identify River with a first-class brand value rather than email or branch-name inference.
- Apply River branding only to River sessions and River candidate/public/print surfaces.
- Add the supplied River logo as a local static asset and use it in the River login/workspace and application/review documents.
- Preserve Toyota branding and the current Toyota question-paper behavior.
- River technical tests omit the six common questions and use only the existing role-specific question bank/sample.
- River candidate records remain visible to the existing Head Office pipeline and carry an explicit River label in Head Office lists, exports, emails, and packets.

## Brand identity

Use the supplied asset `C:\Users\krish\Downloads\River_Logo.jpg`, copied into the frontend public assets as `river-logo.jpg`.

Use the River Mobility site palette:

- Primary River blue: `#007DB6`
- Deep ink: `#12120D`
- Pale blue surface: `#ABD5E7`
- Coral/red accent: `#E9847D` (used sparingly for highlights and status accents)

The implementation may use accessible neutral text/surface colors around these values. Existing Nippon Toyota colors and logo assets remain unchanged.

## Architecture and data flow

### Brand storage

Add nullable `brand` string columns to `users` and `candidates`. Do not backfill or rewrite existing rows. A null brand is interpreted as `NIPPON_TOYOTA` in application logic for backward compatibility; the River seed account and newly created River candidates store `RIVER` explicitly.

Use shared constants/helpers for `NIPPON_TOYOTA`, `RIVER`, brand normalization, and brand metadata so backend and frontend do not duplicate email-based checks.

### Account and candidate creation

Add the River account through a dedicated idempotent seed path that inserts only the River user if absent. If the River user already exists, the seed path must leave that row untouched. It must not run the existing sitewide password rewrite or deactivate unrelated users.

When an authenticated local HR creates a candidate, derive the candidate brand from that HR account on the server. Ignore any client-supplied brand field. The public application link created for a recruiter inherits the recruiter’s brand through the assigned HR user, so River’s candidate-facing application flow remains River-branded.

No existing candidate fields, stages, profiles, evaluations, documents, passwords, or user rows are updated as part of this feature.

### Head Office handover

Keep the current handover transition and internal recipient behavior. River candidates enter the same Head Office pipeline after prerequisites are complete. Include their resolved brand in the Head Office candidate response/list/export, handover email subject/body/preview, and printable review packet. This makes the River profile visibly available to Head Office without creating a second HO workflow or changing Toyota handovers.

### Technical test selection

Extend question assembly with an explicit `brand` input or candidate-derived policy:

- `NIPPON_TOYOTA`: current six common questions plus the role-specific sample.
- `RIVER`: role-specific sample only; no common-bank load or requirement.

Existing role-specific question banks and sample size remain unchanged. Existing technical-test tokens keep their stored question set; the policy applies when a River test is generated.

### Frontend theme and logo

Expose resolved brand in auth and candidate API responses. Add a small brand configuration module that returns River/Toyota labels, palette classes, logo path, and copy.

Use the configuration in:

- login branding after the user enters/logs in as the River account, where available without leaking River identity to other sessions;
- authenticated workspace shell/header;
- River public application, candidate portal, and technical-test surfaces via candidate data;
- editable/printable application form, candidate summary, HO review packet, and related document headers.

The default/fallback remains Nippon Toyota for null or unknown brands. No River colors or logo should appear for Toyota users or Toyota candidates.

## Error handling

- Missing/invalid brand values resolve to Toyota behavior rather than failing existing records.
- River technical-test generation fails only for the same missing/invalid role-bank conditions already enforced for Toyota; it does not fail because the common bank is absent.
- Duplicate River seed execution is a no-op for an existing River user.
- Handover email failures preserve the existing retry/status behavior; brand text is presentation-only.

## Testing and verification

Backend tests will cover:

- River seed insertion is idempotent and does not update unrelated users.
- Auth response exposes the River brand.
- River authenticated creation stamps `RIVER`; client input cannot override it.
- Existing/null-brand candidates resolve as Toyota.
- Head Office can list/receive River candidates and the handover output identifies River.
- Toyota papers retain common questions; River papers contain only role-specific questions.

Frontend verification will cover TypeScript/build output and targeted static checks for the River logo/theme references. Run the full backend test suite and frontend build before claiming completion.

## Non-goals

- No new physical branch network or separate Head Office role.
- No migration/backfill of existing candidates or users.
- No changes to existing Toyota account passwords, branding, question sets, stages, or candidate data.
- No external deployment or production database mutation in this task.
