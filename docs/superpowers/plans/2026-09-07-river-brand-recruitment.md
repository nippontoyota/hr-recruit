# River Brand Recruitment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated River Mobility local-HR account and brand-aware recruitment flow without rewriting existing records or changing Toyota behavior.

**Architecture:** Store an explicit nullable brand on users and candidates, resolve null/unknown values as Nippon Toyota, and derive a new candidate’s brand from the authenticated recruiter or assigned public-link recruiter on the server. Centralize brand metadata in backend/frontend helpers, use it for River-only theme/logo/document copy, and pass the candidate brand into technical-test assembly and Head Office outputs.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL, pytest, React 19, TypeScript, Vite, Tailwind CSS, static public assets.

## Global Constraints

- Existing user and candidate rows must not be backfilled, rewritten, deactivated, or have passwords changed.
- The new `brand` columns are nullable; null and unknown values resolve to `NIPPON_TOYOTA` in application logic.
- River account: `hr.river@incheonmobility.com`, role `LOCAL_HR`, branch label `River`, brand `RIVER`.
- River account provisioning is idempotent and must be a no-op if that email already exists.
- The River account uses the existing seed password value `nippon2026` without running the existing sitewide password rewrite.
- River palette: `#007DB6`, `#12120D`, `#ABD5E7`, `#E9847D`; Toyota palette and logo remain unchanged.
- River technical tests use only the existing role-specific question sample; Toyota tests retain six common plus role-specific questions.
- Existing technical-test tokens retain their stored question set.
- No production deployment or production database mutation is part of implementation verification.

## File Map

- Create `backend/app/core/branding.py`: shared backend brand constants, normalization, and display metadata.
- Create `backend/alembic/versions/q7r8s9t0u1v2_add_brand_fields.py`: additive nullable `users.brand` and `candidates.brand` migration.
- Create `backend/scripts/seed_river_user.py`: insert-only River account provisioning.
- Modify `backend/app/models/user.py` and `backend/app/models/candidate.py`: nullable brand columns.
- Modify `backend/app/schemas/auth.py`, `backend/app/schemas/candidate.py`, and `frontend/src/types/index.ts`: expose brand fields.
- Modify `backend/app/api/v1/auth.py`, `backend/app/api/v1/candidates_core.py`, and `backend/app/api/v1/candidates_public.py`: expose/derive brand at auth and creation boundaries.
- Modify `backend/app/services/candidate_service.py`, `backend/app/services/candidate_list_query.py`, and `backend/app/services/candidate_export.py`: resolve and carry brand through candidate outputs and HO export.
- Modify `backend/app/core/test_paper.py` and `backend/app/api/v1/evaluations.py`: brand-aware test assembly.
- Modify `backend/app/api/v1/candidates_actions.py` and frontend review components: River-aware HO handover copy and printable packet.
- Modify `frontend/src/components/layout/BrandMark.tsx`, `AppShell.tsx`, `AdminDemoShell.tsx`, `PublicShell.tsx`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/candidates/PublicTestPage.tsx`, and document components: River theme/logo use.
- Create `frontend/public/river-logo.jpg`: supplied River logo asset.
- Create/modify `backend/tests/test_river_brand.py` and focused existing tests: backend regression coverage.

### Task 1: Add the non-mutating brand data model and migration

**Files:**
- Create: `backend/app/core/branding.py`
- Modify: `backend/app/models/user.py`
- Modify: `backend/app/models/candidate.py`
- Create: `backend/alembic/versions/q7r8s9t0u1v2_add_brand_fields.py`
- Test: `backend/tests/test_river_brand.py`

**Interfaces:**
- Produces `NIPPON_TOYOTA`, `RIVER`, `normalize_brand(value) -> str`, and `brand_is_river(value) -> bool` for backend callers.
- Produces nullable `User.brand` and `Candidate.brand` model attributes.

- [ ] **Step 0: Add the test module imports and deterministic helpers.**

Start `backend/tests/test_river_brand.py` with the standard-library imports and these helpers so later steps are self-contained:

```python
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from app.models.candidate import Candidate
from app.models.enums import PipelineStage


def valid_candidate_fields() -> dict:
    return {
        "id": uuid4(),
        "candidate_id": "NT-900",
        "full_name": "River Candidate",
        "phone": "9000000090",
        "email": "candidate@example.com",
        "source": "REFERRAL",
        "position_applied_for": "Sales Executive",
        "experience": "Fresher",
        "current_stage": PipelineStage.APPLICATION,
        "branch_location": "River",
    }


def valid_candidate_payload() -> dict:
    return {
        "full_name": "River Candidate",
        "phone": "9000000090",
        "email": "candidate@example.com",
        "source": "REFERRAL",
        "position_applied_for": "Sales Executive",
        "experience": "Fresher",
        "department": "SALES",
        "branch_location": "River",
    }
```

- [ ] **Step 1: Write the failing brand helper tests.**

```python
from app.core.branding import NIPPON_TOYOTA, RIVER, brand_is_river, normalize_brand


def test_null_and_unknown_brands_fall_back_to_toyota():
    assert normalize_brand(None) == NIPPON_TOYOTA
    assert normalize_brand("unknown") == NIPPON_TOYOTA


def test_river_brand_is_explicit_and_case_insensitive():
    assert normalize_brand(" river ") == RIVER
    assert brand_is_river("RIVER") is True
    assert brand_is_river(None) is False
```

- [ ] **Step 2: Run the focused test to verify it fails.**

Run: `pytest backend/tests/test_river_brand.py -q`

Expected: FAIL because `app.core.branding` does not exist.

- [ ] **Step 3: Implement the helper and nullable model columns.**

Use this helper contract:

```python
NIPPON_TOYOTA = "NIPPON_TOYOTA"
RIVER = "RIVER"


def normalize_brand(value: object) -> str:
    return RIVER if str(value or "").strip().upper() == RIVER else NIPPON_TOYOTA


def brand_is_river(value: object) -> bool:
    return normalize_brand(value) == RIVER
```

Add `brand: Mapped[str | None] = mapped_column(String(50), nullable=True)` to both models. Do not add a server default.

- [ ] **Step 4: Add the additive Alembic migration.**

The upgrade must only execute:

```python
op.add_column("users", sa.Column("brand", sa.String(length=50), nullable=True), schema=SCHEMA)
op.add_column("candidates", sa.Column("brand", sa.String(length=50), nullable=True), schema=SCHEMA)
```

The downgrade drops only those two columns. Do not issue `UPDATE`, default/backfill, delete, or password statements.

- [ ] **Step 5: Test the migration source for data-preservation guards.**

```python
def test_brand_migration_is_additive_only():
    source = Path("backend/alembic/versions/q7r8s9t0u1v2_add_brand_fields.py").read_text()
    assert "op.add_column(\"users\"" in source
    assert "op.add_column(\"candidates\"" in source
    assert "UPDATE " not in source.upper()
    assert "DELETE " not in source.upper()
    assert "server_default" not in source
```

- [ ] **Step 6: Run the focused tests and diff check.**

Run: `pytest backend/tests/test_river_brand.py -q` and `git diff --check`

Expected: PASS and no whitespace errors.

- [ ] **Step 7: Commit the model/migration unit.**

```bash
git add backend/app/core/branding.py backend/app/models/user.py backend/app/models/candidate.py backend/alembic/versions/q7r8s9t0u1v2_add_brand_fields.py backend/tests/test_river_brand.py
git commit -m "feat: add non-mutating recruitment brand fields"
```

### Task 2: Provision River account without touching existing users

**Files:**
- Create: `backend/scripts/seed_river_user.py`
- Modify: `backend/app/schemas/auth.py`
- Modify: `backend/app/api/v1/auth.py`
- Modify: `frontend/src/types/index.ts`
- Test: `backend/tests/test_river_brand.py`

**Interfaces:**
- Produces insert-only `seed_river_user()`.
- Auth `UserOut` and frontend `User` expose `brand?: string`.

- [ ] **Step 0: Add the fake user database used by the seed tests.**

Add this test double before the seed tests:

```python
class FakeUserDb:
    def __init__(self, users, found=None):
        self.users = list(users)
        self.found = found
        self.added = []

    def scalar(self, _query):
        return self.found

    def add(self, row):
        self.added.append(row)

    def commit(self):
        pass
```

- [ ] **Step 1: Write tests for insert-only account provisioning.**

```python
def test_river_seed_adds_only_missing_account():
    existing = [SimpleNamespace(email="old@example.com", hashed_password="old", is_active=True)]
    db = FakeUserDb(existing, found=None)
    seed_river_user(db, password="nippon2026")
    assert [row.email for row in db.added] == ["hr.river@incheonmobility.com"]
    assert existing[0].hashed_password == "old"


def test_river_seed_existing_account_is_a_noop():
    river = SimpleNamespace(email="hr.river@incheonmobility.com", hashed_password="keep", is_active=False)
    db = FakeUserDb([river], found=river)
    seed_river_user(db, password="nippon2026")
    assert db.added == []
    assert river.hashed_password == "keep"
    assert river.is_active is False
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pytest backend/tests/test_river_brand.py -q`

Expected: FAIL because the dedicated seed function does not exist.

- [ ] **Step 3: Implement the dedicated seed script.**

The script must query by normalized email, return without mutation when found, and otherwise add exactly:

```python
User(
    email="hr.river@incheonmobility.com",
    hashed_password=hash_password("nippon2026"),
    full_name="River HR",
    role=UserRole.LOCAL_HR,
    branch_location="River",
    brand=RIVER,
    is_active=True,
)
```

Commit only the new user on the insert path. Do not call `scripts.seed_users.seed_users()`.

- [ ] **Step 4: Expose brand through auth.**

Add `brand: str | None = None` to `UserOut`, return the stored value from `from_user`, and carry it through the login cache record/response. Do not change login password handling or the cache policy.

- [ ] **Step 5: Run account and auth tests.**

Run: `pytest backend/tests/test_river_brand.py backend/tests/test_users_rbac.py -q`

Expected: PASS with no existing user updates asserted.

- [ ] **Step 6: Commit the account/auth unit.**

```bash
git add backend/scripts/seed_river_user.py backend/app/schemas/auth.py backend/app/api/v1/auth.py frontend/src/types/index.ts backend/tests/test_river_brand.py
git commit -m "feat: add isolated River HR account"
```

### Task 3: Stamp River brand at candidate creation and preserve HO visibility

**Files:**
- Modify: `backend/app/services/candidate_service.py`
- Modify: `backend/app/api/v1/candidates_core.py`
- Modify: `backend/app/api/v1/candidates_public.py`
- Modify: `backend/app/schemas/candidate.py`
- Modify: `backend/app/services/candidate_list_query.py`
- Modify: `backend/app/services/candidate_export.py`
- Modify: `backend/app/api/v1/candidates_actions.py`
- Modify: `frontend/src/types/index.ts`
- Test: `backend/tests/test_river_brand.py`

**Interfaces:**
- `create_candidate(..., brand: str | None = None)` stores a normalized server-derived brand.
- `CandidateOut`, `CandidateListOut`, and public candidate payloads expose resolved brand.

- [ ] **Step 0: Add the candidate output helpers used by these tests.**

Use the `valid_candidate_fields()` helper from Task 1 and import `CandidateCreate`, `to_candidate_list_out`, and `iter_candidates_csv` in the test module. Use a real `Candidate` instance for output/export assertions and a `MagicMock` only for the database parameter where the service needs a session.

- [ ] **Step 1: Write creation and HO-output tests.**

```python
def test_authenticated_river_creation_stamps_river_even_if_body_has_toyota():
    body = CandidateCreate.model_validate({**valid_candidate_payload(), "brand": "NIPPON_TOYOTA"})
    row = create_candidate(db, body, user.id, created_via_public_apply=False, brand=RIVER)
    assert row.brand == RIVER


def test_null_brand_candidate_resolves_to_toyota_in_output():
    row = Candidate(brand=None, **valid_candidate_fields())
    output = to_candidate_list_out(row, has_resume=False)
    assert output.brand == NIPPON_TOYOTA


def test_ho_export_contains_brand_without_changing_candidate_fields():
    row = Candidate(brand=RIVER, **valid_candidate_fields())
    before = dict(row.__dict__)
    csv_text = "".join(iter_candidates_csv([row]))
    assert "Brand" in csv_text
    assert "RIVER" in csv_text
    assert dict(row.__dict__) == before
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pytest backend/tests/test_river_brand.py -q`

Expected: FAIL because brand is not in candidate schemas/outputs/creation.

- [ ] **Step 3: Derive brand from the authenticated recruiter.**

In the authenticated create route, pass `brand=user.brand` to `create_candidate`. Keep `assigned_hr_user_id` and branch behavior unchanged. In `public_apply`, load the recruiter and pass `brand=hr_user.brand`; the public payload must not accept a brand override. For existing candidates, resolve `normalize_brand(candidate.brand)` only at response/presentation time.

- [ ] **Step 4: Add brand to candidate schemas and outputs.**

Add `brand: str = NIPPON_TOYOTA` to `CandidateOut`, `CandidateListOut`, and the public response models. In `to_candidate_out` and `to_candidate_list_out`, override the serialized value with `normalize_brand(candidate.brand)` so null legacy rows never produce a null brand in the frontend.

- [ ] **Step 5: Carry brand through Head Office list/export/handover.**

Keep `_role_predicate` unchanged so HO still sees the same handover stages. Add a `Brand` export column that uses `normalize_brand(candidate.brand)`. Update the handover subject/body/preview to say River Mobility/River when the candidate brand is River and retain current Nippon Toyota wording otherwise. Do not change recipients, stage transitions, or retry status behavior.

- [ ] **Step 6: Run candidate and handover regression tests.**

Run: `pytest backend/tests/test_river_brand.py backend/tests/test_ho_handover_gate.py backend/tests/test_candidate_export.py backend/tests/test_offer_letter.py -q`

Expected: PASS, including existing Toyota handover copy assertions.

- [ ] **Step 7: Commit the candidate/HO unit.**

```bash
git add backend/app/services/candidate_service.py backend/app/api/v1/candidates_core.py backend/app/api/v1/candidates_public.py backend/app/schemas/candidate.py backend/app/services/candidate_list_query.py backend/app/services/candidate_export.py backend/app/api/v1/candidates_actions.py frontend/src/types/index.ts backend/tests/test_river_brand.py
git commit -m "feat: carry River candidates through Head Office"
```

### Task 4: Make technical-test assembly brand-aware

**Files:**
- Modify: `backend/app/core/test_paper.py`
- Modify: `backend/app/api/v1/evaluations.py`
- Modify: `backend/app/schemas/evaluation.py` if public test metadata needs brand
- Modify: `frontend/src/api/evaluations.ts`
- Modify: `frontend/src/types/index.ts`
- Test: `backend/tests/test_river_brand.py`

**Interfaces:**
- `assemble_test_questions(db, department, position, experience, brand=None)` returns role-only questions for River and the current common-plus-role paper for Toyota.
- `assemble_for_candidate(db, candidate)` uses `candidate.brand`.

- [ ] **Step 0: Add the in-memory question database helper.**

Define this test helper and import `TechnicalQuestion`, `PAPER_COMMON`, `ROLE_SAMPLE_SIZE`, and `assemble_test_questions`:

```python
def question_db(common_count=6, role_count=9):
    common = [TechnicalQuestion(id=f"C{i}", department=PAPER_COMMON, text=f"Common {i}", options={"A": "x"}, answer="A") for i in range(common_count)]
    role = [TechnicalQuestion(id=f"R{i}", department="SALES_EXECUTIVE_FRESHER", text=f"Role {i}", options={"A": "x"}, answer="A") for i in range(role_count)]

    class Rows:
        def __init__(self, values):
            self.values = values

        def all(self):
            return self.values

    db = MagicMock()
    db.scalars.side_effect = [Rows(common), Rows(role)]
    return db
```

The implementation may use the repository’s actual `paper_key` result; the test data must match the role key returned for the selected sales/fresher input.

- [ ] **Step 1: Write failing question-selection tests.**

```python
def test_toyota_test_keeps_six_common_questions(db):
    questions = assemble_test_questions(db, "SALES", "Sales Executive", "Fresher", brand=NIPPON_TOYOTA)
    assert sum(q.department == PAPER_COMMON for q in questions) == 6


def test_river_test_has_only_role_specific_questions(db):
    questions = assemble_test_questions(db, "SALES", "Sales Executive", "Fresher", brand=RIVER)
    assert questions
    assert all(q.department != PAPER_COMMON for q in questions)
    assert len(questions) == ROLE_SAMPLE_SIZE
```

- [ ] **Step 2: Run focused tests to verify failure.**

Run: `pytest backend/tests/test_river_brand.py backend/tests/test_evaluations.py -q`

Expected: the new River test fails because the assembler always loads the common bank.

- [ ] **Step 3: Implement the minimal brand policy.**

Normalize `brand` once. Load/validate the common bank only for non-River brands. Always validate the role key/bank and sample it with the existing `ROLE_SAMPLE_SIZE`. Keep `to_test_data` and stored token semantics unchanged.

- [ ] **Step 4: Pass candidate brand from every generation path.**

Update candidate-based generation and token generation to call `assemble_for_candidate`; update direct department/position generation to accept an optional brand only where the caller has a candidate context. Public test routes use the brand stored on the token’s candidate, not request input.

- [ ] **Step 5: Verify question counts and legacy tokens.**

Run: `pytest backend/tests/test_river_brand.py backend/tests/test_evaluations.py -q`

Expected: all existing tests pass; Toyota remains 15 questions and River contains only role-specific questions; no token regeneration mutates an already-started token’s question set.

- [ ] **Step 6: Commit the test-policy unit.**

```bash
git add backend/app/core/test_paper.py backend/app/api/v1/evaluations.py backend/app/schemas/evaluation.py frontend/src/api/evaluations.ts frontend/src/types/index.ts backend/tests/test_river_brand.py
git commit -m "feat: use River role-only technical tests"
```

### Task 5: Add River logo, theme, and branded documents

**Files:**
- Create: `frontend/public/river-logo.jpg`
- Create: `frontend/src/lib/branding.ts`
- Modify: `frontend/src/components/layout/BrandMark.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Modify: `frontend/src/components/layout/AdminDemoShell.tsx`
- Modify: `frontend/src/components/layout/PublicShell.tsx`
- Modify: `frontend/src/pages/Login.tsx`
- Modify: `frontend/src/pages/candidates/PublicTestPage.tsx`
- Modify: `frontend/src/pages/candidates/ApplyForm.tsx`
- Modify: `frontend/src/pages/candidates/CandidatePortalPage.tsx`
- Modify: `frontend/src/components/candidates/InterviewApplicationFormDocument.tsx`
- Modify: `frontend/src/components/candidates/EditableApplicationFormDocument.tsx`
- Modify: `frontend/src/components/candidates/CandidateSummarySheet.tsx`
- Modify: `frontend/src/components/candidates/HoReviewPacket.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- `getBrandConfig(brand?: string): BrandConfig` returns resolved label, logo path, palette classes, and document copy.
- Document components accept or derive `brand` from `candidate.brand` and default to Toyota.

- [ ] **Step 1: Copy the supplied logo as a static asset.**

Run: `Copy-Item -LiteralPath 'C:\Users\krish\Downloads\River_Logo.jpg' -Destination 'frontend/public/river-logo.jpg' -Force`

Preserve the source image; do not edit or overwrite the supplied file.

- [ ] **Step 2: Add frontend brand configuration and tests/static assertions.**

Use a configuration shape like:

```ts
export const BRAND_CONFIG = {
  NIPPON_TOYOTA: { name: 'Nippon Toyota', logo: '/nippon-toyota-logo.png' },
  RIVER: {
    name: 'River',
    logo: '/river-logo.jpg',
    primary: '#007DB6',
    ink: '#12120D',
    surface: '#ABD5E7',
    accent: '#E9847D',
  },
} as const;
```

`getBrandConfig` must fallback to Toyota for null/unknown values.

- [ ] **Step 3: Make shell/login branding session-aware.**

Pass the authenticated `user.brand` into `BrandMark`, apply CSS variables or scoped classes to the River shell, use the supplied River logo, and replace Nippon Toyota copy with River copy only for River sessions. The login screen itself should keep the Toyota default until a successful River login is known; after login, the workspace must show River.

- [ ] **Step 4: Make public surfaces candidate-aware.**

Add brand to public candidate/test responses and pass it into `PublicShell`, `ApplyForm`, `CandidatePortalPage`, and `PublicTestPage`. Use River logo/palette/copy for River links and Toyota fallback for legacy/null rows. Do not use the recruiter email in frontend branding logic.

- [ ] **Step 5: Make application/review documents brand-aware.**

Replace hardcoded document header logo/name/address styling with a resolved brand config. River documents use the River logo and River blue/ink/pale-blue/coral accents; Toyota documents keep the existing logo, name, address, and colors. Ensure `HoReviewPacket` passes the candidate brand to every included document section.

- [ ] **Step 6: Run frontend type/build verification.**

Run: `npm run build` from `frontend`

Expected: Vite build and `verify:build` complete with exit code 0. Run `rg -n "river-logo|007DB6|12120D|ABD5E7|E9847D" frontend/src frontend/public` and confirm all references are in brand-aware paths.

- [ ] **Step 7: Commit the UI/logo unit.**

```bash
git add frontend/public/river-logo.jpg frontend/src/lib/branding.ts frontend/src/components frontend/src/pages/Login.tsx frontend/src/pages/candidates frontend/src/types/index.ts frontend/src/index.css
git commit -m "feat: add River branded recruitment surfaces"
```

### Task 6: Full verification, local startup, and handoff

**Files:**
- Modify only if verification exposes a defect; otherwise no source changes.
- Inspect: `backend/.env`, `backend/.env.local`, `.env.local`, `run.bat`, `backend/start.sh`, `frontend/vite.config.ts`.

- [ ] **Step 1: Confirm the worktree and data-safety boundary.**

Run: `git status --short`, `git diff --check`, and `git log --oneline -8`.

Expected: only feature commits are present; no generated database dumps, secrets, or existing data files are changed.

- [ ] **Step 2: Run the complete backend test suite.**

Run: `pytest backend -q`

Expected: exit code 0 and zero failures.

- [ ] **Step 3: Run the complete frontend build and lint.**

Run from `frontend`: `npm run build` and `npm run lint`

Expected: both exit code 0.

- [ ] **Step 4: Apply the additive migration only to the configured local/test database.**

Before running Alembic, inspect the resolved `DATABASE_URL` and confirm it points to a local/disposable database. If it points to Supabase or another shared/production database, do not run the migration or seed against it. Use a disposable local database for integration verification instead.

- [ ] **Step 5: Seed only the River account in the verified local database.**

Run: `python -m scripts.seed_river_user` from `backend` twice. Verify the first run inserts one River row and the second run reports a no-op; query/count existing users before and after to ensure unrelated users are unchanged.

- [ ] **Step 6: Start backend and frontend in the background without accidental production mutation.**

Start backend with the repository’s configured local environment only after the migration check. Start Vite on localhost in a separate background process. Use `http://localhost:8000/health` and `http://localhost:5173` as readiness checks. Keep process IDs/log paths recorded for cleanup.

- [ ] **Step 7: Open the local app to the River account and verify the River login flow.**

Use the local browser at `http://localhost:5173`, sign in as `hr.river@incheonmobility.com`, and verify the workspace shows the River logo/colors and River label. Create no candidate during this smoke check unless using a disposable database; if created, verify it is test data only and remove the disposable database afterward.

- [ ] **Step 8: Report evidence and remaining limitations.**

Report exact test/build/lint results, local URLs, the River login email, whether the password was used from the existing seed constant, and whether the configured database was safely avoided or disposable. Do not claim completion without fresh command output.
