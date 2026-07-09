# Candidate create + resume upload

Date: 2026-07-09  
Branch target: `feature/auth-api` (backend). Frontend peers: `feature/auth-ui`, `feature/app-shell`, `feature/candidate-add-form`.  
Do not push until human approval.

## Goal

HR can create a candidate via the existing JSON API, then optionally upload a resume to private Supabase Storage. Frontend keeps a two-step save: create, then upload file.

## Decisions

| Topic | Choice |
|-------|--------|
| Storage | Supabase Storage (recruitment project) |
| Create + upload | Two calls: JSON create, then multipart resume |
| Resume required? | Optional |
| Metadata | `recruitment.documents` table |
| Auth | Any authenticated active user for create, upload, download |
| Re-upload | Replace prior resume (one active resume per candidate) |
| Upload path | API proxies file with service role key |

## Architecture

```
Frontend                    FastAPI                         Supabase
────────                    ───────                         ────────
POST /candidates (JSON)  →  insert candidates + stage_history
POST /candidates/{id}/resume (multipart)
                         →  upload object                →  Storage bucket
                         →  upsert documents row         →  Postgres
GET  /candidates/{id}/resume
                         →  read documents
                         →  create signed URL            →  Storage
                         ←  metadata + download_url
```

Private bucket `candidate-documents`. Browser never holds the service role key. Backend mints short-lived signed URLs for preview/download.

## Data model

### Table `recruitment.documents`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `candidate_id` | uuid FK → `candidates.id` | ON DELETE CASCADE |
| `doc_type` | `document_type` enum | value `RESUME` for this feature |
| `file_name` | varchar | original client filename |
| `content_type` | varchar | e.g. `application/pdf` |
| `storage_path` | text | object key in bucket |
| `file_size_bytes` | int | |
| `uploaded_by_user_id` | uuid FK → `users.id` | ON DELETE SET NULL |
| `created_at` | timestamptz | server default now() |

Unique constraint on `(candidate_id, doc_type)`.

Object key: `resumes/{candidate_id}/{document_id}.{ext}`.

Alembic migration `002_documents` creates enum `document_type` (`RESUME`) and the table.

### `CandidateOut` change

Add `has_resume: bool` (derived: documents row exists for `RESUME`). Existing create/list/get keep working; clients that ignore the field stay fine.

## API

### Existing: create candidate

`POST /api/v1/candidates`  
Auth: active user. Body unchanged (`CandidateCreate`). Assigns `assigned_hr_user_id` to current user when omitted. Duplicate phone/email flagging unchanged.

### Upload / replace resume

`POST /api/v1/candidates/{id}/resume`  
Auth: active user.  
Body: `multipart/form-data`, field name `file`.  
Accept: PDF, DOC, DOCX (extension + content-type). Max 10 MB.  
Steps:

1. Load candidate or 404.
2. Validate type and size or 400.
3. If a `RESUME` document exists, note old `storage_path`.
4. Upload new object to Storage.
5. Upsert `documents` row.
6. Delete old Storage object if present (best effort).
7. Return 201 with document metadata + signed `download_url` (~1 hour).

### Get resume

`GET /api/v1/candidates/{id}/resume`  
Auth: active user.  
404 if candidate or resume missing.  
Return same metadata shape + fresh signed URL.

### Response shape (`DocumentOut`)

```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "doc_type": "RESUME",
  "file_name": "resume.pdf",
  "content_type": "application/pdf",
  "file_size_bytes": 12345,
  "uploaded_by_user_id": "uuid",
  "created_at": "ISO-8601",
  "download_url": "https://..."
}
```

### Errors

| Code | When |
|------|------|
| 400 | Bad MIME/extension, oversize, empty file |
| 401 | Missing/invalid JWT |
| 403 | Inactive user |
| 404 | Candidate or resume not found |
| 502 | Storage upload/sign failed |

## Config

| Env var | Purpose |
|---------|---------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Storage + admin |
| `SUPABASE_STORAGE_BUCKET` | Default `candidate-documents` |

Document bucket setup in README (create private bucket in the recruitment Supabase project). App does not auto-create the bucket.

Python client: `supabase` package (or storage REST via httpx if lighter). Prefer official client if already a fit for FastAPI sync code; otherwise thin httpx wrapper around Storage REST.

## Frontend contract

Peers on `feature/candidate-add-form` (and related UI branches):

1. `POST /candidates` with at least `full_name`, `phone`, `email`, `source_channel` (map wizard `source` → backend enum).
2. If a file was chosen: `POST /candidates/{id}/resume` with `FormData` field `file`, `Authorization: Bearer <token>`.
3. Use `download_url` from upload or `GET .../resume` for PDF preview instead of only local `blob:` URLs.

This backend work does not change frontend code. JSON create stays compatible with the current wizard submit.

Note: frontend mock types still use display labels for `source_channel` and different role names. Real API expects backend enums (`WALK_IN`, `INDEED`, …) and backend roles. Call that out to the frontend owner; out of scope to fix here unless asked.

## Out of scope

- Profile photo upload
- Storing full wizard `application_data` sections
- Multiple document types beyond `RESUME` (table supports them later)
- Public bucket or browser-direct Storage uploads
- Git push

## Verification plan

Run against local API + configured Supabase project:

1. `alembic upgrade head` — documents table exists.
2. Login as seeded user → `POST /candidates` → 201 with `has_resume: false`.
3. `POST /candidates/{id}/resume` with a small PDF → 201, `download_url` opens/downloads.
4. `GET /candidates/{id}/resume` → fresh URL; candidate get/list shows `has_resume: true`.
5. Upload a second file → one documents row; old object gone or replaced.
6. Reject `.exe` / >10 MB with 400.
7. Unauthenticated upload → 401.

No push. Show diff and wait for human OK before push.
