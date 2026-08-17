from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from app.core.positions import (
    PAPER_ACCOUNTS,
    PAPER_BACK_OFFICE,
    PAPER_CR_EXPERIENCED,
    PAPER_CR_FRESHER,
    PAPER_DRIVER,
    PAPER_GEM_EXPERIENCED,
    PAPER_GEM_FRESHER,
    PAPER_HR,
    PAPER_LOBBY,
    POS_ACCOUNTS,
    POS_BACK_OFFICE,
    POS_CR,
    POS_DRIVER,
    POS_GEM,
    POS_HR,
    POS_LOBBY,
    paper_key,
    positions_for,
    validate_assignment,
)
from app.core.test_paper import assemble_test_questions
from app.models.technical_question import TechnicalQuestion
from app.schemas.candidate import CandidateCreate


def test_sales_positions_include_gem_and_driver():
    roles = positions_for("Sales")
    assert POS_GEM in roles
    assert POS_BACK_OFFICE in roles
    assert POS_LOBBY in roles
    assert POS_DRIVER in roles


def test_other_departments_driver_only():
    assert positions_for("Service") == (POS_DRIVER,)
    assert positions_for("Call Centre") == (POS_DRIVER,)


def test_paper_departments_include_staff_and_driver():
    assert positions_for("HR") == (POS_HR, POS_DRIVER)
    assert positions_for("CR") == (POS_CR, POS_DRIVER)
    assert positions_for("Accounts") == (POS_ACCOUNTS, POS_DRIVER)


def test_paper_key_gem_splits_on_experience():
    assert paper_key("Sales", POS_GEM, "Fresher") == PAPER_GEM_FRESHER
    assert paper_key("Sales", POS_GEM, "Experienced") == PAPER_GEM_EXPERIENCED


def test_paper_key_driver_any_department():
    assert paper_key("Service", POS_DRIVER, "Fresher") == PAPER_DRIVER
    assert paper_key("Sales", POS_DRIVER, "Experienced") == PAPER_DRIVER


def test_paper_key_sales_role_banks():
    assert paper_key("Sales", POS_BACK_OFFICE, "Fresher") == PAPER_BACK_OFFICE
    assert paper_key("Sales", POS_LOBBY, "Experienced") == PAPER_LOBBY


def test_paper_key_unknown_position():
    assert paper_key("Sales", "Sales", "Fresher") is None
    assert paper_key("Accounts", "Accountant", "Fresher") is None


def test_paper_key_cr_splits_on_experience():
    assert paper_key("CR", POS_CR, "Fresher") == PAPER_CR_FRESHER
    assert paper_key("CR", POS_CR, "Experienced") == PAPER_CR_EXPERIENCED


def test_paper_key_department_staff_banks():
    assert paper_key("Accounts", POS_ACCOUNTS, "Fresher") == PAPER_ACCOUNTS
    assert paper_key("HR", POS_HR, "Experienced") == PAPER_HR
    assert paper_key("Accounts", POS_DRIVER, "Fresher") == PAPER_DRIVER


def test_validate_assignment_rejects_bad_position():
    with pytest.raises(ValueError, match="Position must be one of"):
        validate_assignment("Sales", "Sales Consultant")
    with pytest.raises(ValueError, match="Position must be one of"):
        validate_assignment("Service", POS_GEM)


def test_create_allows_department_without_position():
    body = CandidateCreate.model_validate(
        {
            "full_name": "Rahul Kumar",
            "phone": "9876543210",
            "department": "Sales",
        }
    )
    assert body.department == "Sales"
    assert body.position_applied_for == "Unknown"


def test_create_accepts_sales_gem():
    body = CandidateCreate.model_validate(
        {
            "full_name": "Rahul Kumar",
            "phone": "9876543210",
            "department": "Sales",
            "position_applied_for": POS_GEM,
            "experience": "Fresher",
        }
    )
    assert body.position_applied_for == POS_GEM
    assert body.experience == "Fresher"


def test_create_accepts_service_driver():
    body = CandidateCreate.model_validate(
        {
            "full_name": "Rahul Kumar",
            "phone": "9876543210",
            "department": "Service",
            "position_applied_for": POS_DRIVER,
            "experience": "Experienced",
        }
    )
    assert body.position_applied_for == POS_DRIVER


def test_assemble_is_six_common_then_nine_role(monkeypatch):
    common = [
        TechnicalQuestion(id=f"C{i}", department="COMMON", text=f"C{i}", options={"A": "x"}, answer="A")
        for i in range(1, 7)
    ]
    bank = [
        TechnicalQuestion(
            id=f"R{i}",
            department=PAPER_GEM_FRESHER,
            text=f"R{i}",
            options={"A": "x"},
            answer="A",
        )
        for i in range(1, 19)
    ]

    def fake_load(_db, key: str):
        if key == "COMMON":
            return list(common)
        if key == PAPER_GEM_FRESHER:
            return list(bank)
        return []

    monkeypatch.setattr("app.core.test_paper._load_paper", fake_load)
    qs = assemble_test_questions(MagicMock(), "Sales", POS_GEM, "Fresher")
    assert len(qs) == 15
    assert {q.id for q in qs[:6]} == {f"C{i}" for i in range(1, 7)}
    role_ids = {q.id for q in qs[6:]}
    assert len(role_ids) == 9
    assert role_ids <= {f"R{i}" for i in range(1, 19)}


def test_assemble_gem_experienced_uses_other_bank(monkeypatch):
    common = [
        TechnicalQuestion(id=f"C{i}", department="COMMON", text=f"C{i}", options={"A": "x"}, answer="A")
        for i in range(1, 7)
    ]
    loaded = []

    def fake_load(_db, key: str):
        loaded.append(key)
        if key == "COMMON":
            return list(common)
        return [
            TechnicalQuestion(id=f"R{i}", department=key, text=f"R{i}", options={"A": "x"}, answer="A")
            for i in range(1, 10)
        ]

    monkeypatch.setattr("app.core.test_paper._load_paper", fake_load)
    assemble_test_questions(MagicMock(), "Sales", POS_GEM, "Experienced")
    assert PAPER_GEM_EXPERIENCED in loaded
    assert PAPER_GEM_FRESHER not in loaded


def test_assemble_cr_fresher_uses_cr_bank(monkeypatch):
    common = [
        TechnicalQuestion(id=f"C{i}", department="COMMON", text=f"C{i}", options={"A": "x"}, answer="A")
        for i in range(1, 7)
    ]
    loaded = []

    def fake_load(_db, key: str):
        loaded.append(key)
        if key == "COMMON":
            return list(common)
        return [
            TechnicalQuestion(id=f"R{i}", department=key, text=f"R{i}", options={"A": "x"}, answer="A")
            for i in range(1, 10)
        ]

    monkeypatch.setattr("app.core.test_paper._load_paper", fake_load)
    assemble_test_questions(MagicMock(), "CR", POS_CR, "Fresher")
    assert PAPER_CR_FRESHER in loaded
    assert PAPER_CR_EXPERIENCED not in loaded


def test_assemble_fails_without_common(monkeypatch):
    monkeypatch.setattr("app.core.test_paper._load_paper", lambda _db, _key: [])
    with pytest.raises(HTTPException) as exc:
        assemble_test_questions(MagicMock(), "Sales", POS_GEM, "Fresher")
    assert exc.value.status_code == 400
    assert "Common" in exc.value.detail
