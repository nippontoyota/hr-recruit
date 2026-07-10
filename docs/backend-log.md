# Recruitment Portal — backend log

Running notes for backend work on this repo. Newest day at the top. Add a new `## YYYY-MM-DD` section when you ship or decide something; keep reasons next to the work so future-you (or a teammate) knows why, not only what.

**How to add a day**

1. Copy the template at the bottom.
2. Paste it under this intro (above older days).
3. Fill **Shipped**, **Decisions**, **Still open**. Skip empty headings.

---

## 2026-07-09

Branch: `feature/candidate-add-api` (pushed). Backend only; no frontend in this branch.

### Shipped

**Candidate create (kept, extended)**  
`POST /api/v1/candidates` was already there. Left the core flow alone: JSON create, assign logged-in HR when unset, duplicate phone/email flag, first stage-history as `NEW_APPLICATION`. Extended the response and loosened input so the SPA can merge with less pain.

**Resume upload**  
Two steps: create candidate, then `POST /api/v1/candidates/{id}/resume` (multipart field `file`). `GET .../resume` returns metadata + short-lived signed URL. Files in private Supabase Storage bucket `candidate-documents`. Metadata in `recruitment.documents`. One resume per candidate; re-upload replaces. Candidate responses include `has_resume`.

**SPA compatibility (API edge)**  
- Login: `access_token` and `token` (same value).  
- Roles on login/`/me`/JWT: SPA names (`SUPER_ADMIN`, `HR`, …); DB still stores `ADMIN`, `LOCAL_HR`, ….  
- `source_channel` accepts labels (`Walk-in`, `Indeed`, `LinkedIn`, …) → enums.  
- `branch_name` → `branch_location`. Extra wizard fields ignored.  
- `is_rejoining: false` on candidate responses.  
- Seed emails include SPA mocks (`hr@`, `hrexec@`, `gm@`).

**Hardening**  
CORS for Vite, batched `has_resume` on list, 10 MB read cap, filename sanitize, orphan Storage delete if DB commit fails, generic 502/503 on Storage errors.

**Docs / tests**  
Design spec under `docs/superpowers/specs/`. README: Storage env, curl examples, role table. Pytest: resume + compat (31 passed when last run).

### Decisions

| Choice | Why |
|--------|-----|
| Supabase Storage, not local disk | Same project as Postgres; works with more than one API instance. |
| Two calls (create then resume), not one multipart create | Matches the wizard’s JSON-first + local blob preview; less SPA rewrite. |
| Resume optional | HR can open a profile before the PDF exists. |
| `documents` table, not columns on `candidates` | Room for more doc types later without a new pattern. |
| API proxies upload (service role) | SPA must not hold the service role key; no Supabase client on frontend yet. |
| Replace on re-upload | One active resume for v1; revision history can wait. |
| Any authenticated user for upload/download | Same bar as create/get today; tighten with `require_roles` when product asks. |
| Map roles outward, don’t rename DB enums | SPA RoleRoute needs its names; renaming Postgres breaks seeds/migrations. |
| LinkedIn / Website → `OTHER` | Avoid enum migration for mock labels; add real values later if reporting needs them. |
| No frontend in this branch | This workstream is backend-only. |

### Still open

- Real `.env`: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.  
- Private bucket `candidate-documents` + `alembic upgrade head`.  
- Frontend must call `POST /candidates/{id}/resume` after create if a file was chosen.  
- SPA: `VITE_USE_MOCK_AUTH=false`, `VITE_API_BASE_URL` → this API.

---

## Template (copy for the next day)

```markdown
## YYYY-MM-DD

Branch: `feature/...` (local / pushed). Scope: backend / …

### Shipped

-

### Decisions

| Choice | Why |
|--------|-----|
| | |

### Still open

-
```
+