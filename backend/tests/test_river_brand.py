from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from app.core.branding import NIPPON_TOYOTA, RIVER, brand_is_river, normalize_brand
from app.core.positions import PAPER_COMMON
from app.core.test_paper import assemble_test_questions
from app.models.technical_question import TechnicalQuestion
from app.core.security import verify_password
from app.models.enums import PipelineStage
from app.models.enums import UserRole
from app.schemas.auth import UserOut
from app.api.v1.candidates_actions import _head_office_forwarding_email_content
from app.schemas.candidate import CandidateCreate
from app.services.candidate_service import create_candidate
from scripts.seed_river_user import RIVER_EMAIL, seed_river_user


def test_null_and_unknown_brands_fall_back_to_toyota():
    assert normalize_brand(None) == NIPPON_TOYOTA
    assert normalize_brand("unknown") == NIPPON_TOYOTA


def test_river_brand_is_explicit_and_case_insensitive():
    assert normalize_brand(" river ") == RIVER
    assert brand_is_river("RIVER") is True
    assert brand_is_river(None) is False


def test_brand_migration_is_additive_only():
    migration = Path(__file__).parents[1] / "alembic" / "versions" / "q7r8s9t0u1v2_add_brand_fields.py"
    source = migration.read_text(encoding="utf-8")
    assert 'op.add_column("users"' in source
    assert 'op.add_column("candidates"' in source
    assert "UPDATE " not in source.upper()
    assert "DELETE " not in source.upper()
    assert "server_default" not in source


class FakeUserDb:
    def __init__(self, found=None):
        self.found = found
        self.added = []
        self.commit_count = 0

    def scalar(self, _query):
        return self.found

    def add(self, row):
        self.added.append(row)

    def commit(self):
        self.commit_count += 1


def test_river_seed_inserts_only_the_missing_account():
    db = FakeUserDb()

    inserted = seed_river_user(db)

    assert inserted is True
    assert len(db.added) == 1
    assert db.commit_count == 1
    row = db.added[0]
    assert row.email == RIVER_EMAIL
    assert row.brand == RIVER
    assert row.branch_location == "River"
    assert verify_password("nippon2026", row.hashed_password)


def test_river_seed_existing_account_is_a_noop():
    existing = SimpleNamespace(
        email=RIVER_EMAIL,
        hashed_password="keep",
        is_active=False,
        brand="RIVER",
    )
    db = FakeUserDb(existing)

    inserted = seed_river_user(db)

    assert inserted is False
    assert db.added == []
    assert db.commit_count == 0
    assert existing.hashed_password == "keep"
    assert existing.is_active is False


def test_candidate_creation_stamps_only_explicit_river_brand():
    db = MagicMock()
    db.scalar.return_value = None
    body = CandidateCreate.model_validate(
        {
            "full_name": "River Candidate",
            "phone": "9000000090",
            "email": "candidate@example.com",
            "position_applied_for": "Sales Executive",
            "experience": "Fresher",
            "department": "Sales",
            "branch_location": "River",
            "brand": NIPPON_TOYOTA,
        }
    )

    row = create_candidate(
        db,
        body,
        uuid4(),
        created_via_public_apply=False,
        brand=RIVER,
    )

    assert row.brand == RIVER
    assert row.current_stage == PipelineStage.CALL_LETTER


class QuestionRows:
    def __init__(self, values):
        self.values = values

    def all(self):
        return self.values


def question_db():
    common = [
        TechnicalQuestion(id=f"C{i}", department=PAPER_COMMON, text=f"Common {i}", options={"A": "x"}, answer="A")
        for i in range(6)
    ]
    role = [
        TechnicalQuestion(id=f"R{i}", department="SALES_GEM_FRESHER", text=f"Role {i}", options={"A": "x"}, answer="A")
        for i in range(9)
    ]
    db = MagicMock()
    db.scalars.side_effect = [QuestionRows(common), QuestionRows(role)]
    return db


def test_toyota_test_keeps_six_common_questions():
    questions = assemble_test_questions(
        question_db(),
        "Sales",
        "GEM (Guest Experienced Manager)",
        "Fresher",
        brand=NIPPON_TOYOTA,
    )
    assert sum(q.department == PAPER_COMMON for q in questions) == 6
    assert len(questions) == 15


def test_river_test_has_only_role_specific_questions():
    db = MagicMock()
    db.scalars.return_value = QuestionRows(
        [
            TechnicalQuestion(
                id=f"R{i}",
                department="SALES_GEM_FRESHER",
                text=f"Role {i}",
                options={"A": "x"},
                answer="A",
            )
            for i in range(9)
        ]
    )
    questions = assemble_test_questions(
        db,
        "Sales",
        "GEM (Guest Experienced Manager)",
        "Fresher",
        brand=RIVER,
    )
    assert len(questions) == 9
    assert all(q.department != PAPER_COMMON for q in questions)


def test_auth_output_exposes_river_brand():
    user = SimpleNamespace(
        id=uuid4(),
        email=RIVER_EMAIL,
        full_name="River HR",
        role=UserRole.LOCAL_HR,
        branch_location="River",
        brand=RIVER,
        department=None,
    )

    assert UserOut.from_user(user).brand == RIVER


def test_river_head_office_handover_uses_river_subject_and_copy():
    subject, body, preview = _head_office_forwarding_email_content(
        SimpleNamespace(full_name="River Candidate", brand=RIVER)
    )

    assert subject == "Update Regarding Interview – River"
    assert "at River" in body
    assert "River application" in preview
