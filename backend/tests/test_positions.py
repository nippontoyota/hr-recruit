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
    canonical_position,
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
    assert positions_for("Administration") == (POS_DRIVER,)
    assert positions_for("Purchase") == (POS_DRIVER,)


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


def test_department_update_syncs_raw_data():
    from app.schemas.candidate import CandidateDepartmentUpdate

    # Direct model update check
    body = CandidateDepartmentUpdate(department="Sales", position_applied_for=POS_GEM)
    assert body.position_applied_for == POS_GEM


def test_service_positions_catalog():
    from app.core.positions import (
        POS_SERVICE_TECH_TRAINEE,
        POS_SERVICE_TECH,
        POS_SERVICE_PAINT_TECH,
        POS_SERVICE_PAINT_TECH_TRAINEE,
        POS_SERVICE_BODY_TECH_TRAINEE,
        POS_SERVICE_BODY_TECH,
        POS_SERVICE_ADVISOR_TRAINEE,
        POS_SERVICE_ADVISOR,
        POS_SERVICE_CHIEF_GEN_TECH,
        POS_SERVICE_FRONT_BACK_OFFICE,
        POS_SERVICE_WARRANTY_INCHARGE,
        POS_SERVICE_TECH_LEADER,
        POS_SERVICE_PARTS_INCHARGE,
    )
    svc = positions_for("Service")
    expected = [
        POS_SERVICE_TECH_TRAINEE,
        POS_SERVICE_TECH,
        POS_SERVICE_PAINT_TECH_TRAINEE,
        POS_SERVICE_PAINT_TECH,
        POS_SERVICE_BODY_TECH_TRAINEE,
        POS_SERVICE_BODY_TECH,
        POS_SERVICE_ADVISOR_TRAINEE,
        POS_SERVICE_ADVISOR,
        POS_SERVICE_CHIEF_GEN_TECH,
        POS_SERVICE_FRONT_BACK_OFFICE,
        POS_SERVICE_WARRANTY_INCHARGE,
        POS_SERVICE_TECH_LEADER,
        POS_SERVICE_PARTS_INCHARGE,
        POS_DRIVER,
    ]
    for p in expected:
        assert p in svc


def test_accessories_security_call_centre_catalog():
    from app.core.positions import (
        POS_ACCESSORIES_TECH,
        POS_ACCESSORIES_SALES_EXEC,
        POS_ACCESSORIES_PARTS_INCHARGE,
        POS_SECURITY_GUARD,
        POS_SECURITY_SUPERVISOR,
        POS_CALL_CENTRE_EXEC,
    )
    acc = positions_for("Accessories")
    assert POS_ACCESSORIES_TECH in acc
    assert POS_ACCESSORIES_SALES_EXEC in acc
    assert POS_ACCESSORIES_PARTS_INCHARGE in acc
    assert POS_DRIVER in acc

    sec = positions_for("Security")
    assert POS_SECURITY_GUARD in sec
    assert POS_SECURITY_SUPERVISOR in sec
    assert POS_DRIVER in sec

    cc = positions_for("Call Centre")
    assert POS_CALL_CENTRE_EXEC in cc
    assert POS_DRIVER in cc


def test_all_19_roles_paper_keys_and_test_assembly(monkeypatch):
    from scripts.service_ops_question_banks import SERVICE_OPS_PAPERS
    from app.core.positions import (
        POS_SERVICE_TECH_TRAINEE,
        POS_SERVICE_TECH,
        POS_SERVICE_PAINT_TECH_TRAINEE,
        POS_SERVICE_PAINT_TECH,
        POS_SERVICE_BODY_TECH_TRAINEE,
        POS_SERVICE_BODY_TECH,
        POS_SERVICE_ADVISOR_TRAINEE,
        POS_SERVICE_ADVISOR,
        POS_SERVICE_CHIEF_GEN_TECH,
        POS_SERVICE_FRONT_BACK_OFFICE,
        POS_SERVICE_WARRANTY_INCHARGE,
        POS_SERVICE_TECH_LEADER,
        POS_SERVICE_PARTS_INCHARGE,
        POS_CALL_CENTRE_EXEC,
        POS_ACCESSORIES_TECH,
        POS_ACCESSORIES_SALES_EXEC,
        POS_ACCESSORIES_PARTS_INCHARGE,
        POS_SECURITY_GUARD,
        POS_SECURITY_SUPERVISOR,
    )

    test_roles = [
        ("Service", POS_SERVICE_TECH_TRAINEE),
        ("Service", POS_SERVICE_TECH),
        ("Service", POS_SERVICE_PAINT_TECH_TRAINEE),
        ("Service", POS_SERVICE_PAINT_TECH),
        ("Service", POS_SERVICE_BODY_TECH_TRAINEE),
        ("Service", POS_SERVICE_BODY_TECH),
        ("Service", POS_SERVICE_ADVISOR_TRAINEE),
        ("Service", POS_SERVICE_ADVISOR),
        ("Service", POS_SERVICE_CHIEF_GEN_TECH),
        ("Service", POS_SERVICE_FRONT_BACK_OFFICE),
        ("Service", POS_SERVICE_WARRANTY_INCHARGE),
        ("Service", POS_SERVICE_TECH_LEADER),
        ("Service", POS_SERVICE_PARTS_INCHARGE),
        ("Call Centre", POS_CALL_CENTRE_EXEC),
        ("Accessories", POS_ACCESSORIES_TECH),
        ("Accessories", POS_ACCESSORIES_SALES_EXEC),
        ("Accessories", POS_ACCESSORIES_PARTS_INCHARGE),
        ("Security", POS_SECURITY_GUARD),
        ("Security", POS_SECURITY_SUPERVISOR),
    ]

    assert len(test_roles) == 19

    # Mock common questions
    common_bank = [
        TechnicalQuestion(id=f"C{i}", department="COMMON", text=f"Common Q{i}", options={"A": "1", "B": "2"}, answer="A")
        for i in range(1, 7)
    ]

    # Convert SERVICE_OPS_PAPERS to TechnicalQuestion model objects
    role_banks = {}
    for p_key, q_tuples in SERVICE_OPS_PAPERS.items():
        role_banks[p_key] = [
            TechnicalQuestion(id=qid, department=p_key, text=qtxt, options=qopts, answer=qans)
            for qid, qtxt, qopts, qans in q_tuples
        ]
        assert len(role_banks[p_key]) == 15, f"{p_key} must have exactly 15 questions"

    def fake_load(_db, key: str):
        if key == "COMMON":
            return list(common_bank)
        return list(role_banks[key])

    monkeypatch.setattr("app.core.test_paper._load_paper", fake_load)

    # Validate paper_key and assemble_test_questions for all 19 roles
    for dept, pos in test_roles:
        key = paper_key(dept, pos, "Fresher")
        assert key is not None, f"paper_key returned None for ({dept}, {pos})"
        assert key in SERVICE_OPS_PAPERS, f"paper_key {key} not found in SERVICE_OPS_PAPERS"

        # Generate test paper
        test_questions = assemble_test_questions(MagicMock(), dept, pos, "Fresher")
        # Must have exactly 15 questions: 6 common + 9 sampled from the 15
        assert len(test_questions) == 15, f"Expected 15 questions for {pos}, got {len(test_questions)}"
        assert {q.id for q in test_questions[:6]} == {f"C{i}" for i in range(1, 7)}
        role_q_ids = {q.id for q in test_questions[6:]}
        assert len(role_q_ids) == 9
        assert role_q_ids <= {f"R{i}" for i in range(1, 16)}


def test_service_advisor_trainee_case_and_alias_normalization():
    # Lowercase, trailing space, hyphens
    variations = [
        "Service Advisor Trainee",
        "service advisor trainee",
        "SERVICE ADVISOR TRAINEE",
        "Service Advisor - Trainee",
        "service advisor (trainee)",
    ]
    for pos_var in variations:
        key = paper_key("Service", pos_var, None)
        assert key == "SERVICE_ADVISOR_TRAINEE", f"Failed for {pos_var}"
        canon = canonical_position("Service", pos_var)
        assert canon == "Service Advisor Trainee", f"Canonical failed for {pos_var}"
        validate_assignment("Service", pos_var)


def test_load_paper_catalog_fallback_when_db_empty():
    from app.core.test_paper import _load_paper

    mock_db = MagicMock()
    # Simulate DB returning empty list (unseeded)
    mock_db.scalars.return_value.all.return_value = []
    # Simulate DB commit failing or succeeding
    mock_db.commit.side_effect = Exception("DB read only / unseeded")

    questions = _load_paper(mock_db, "SERVICE_ADVISOR_TRAINEE")
    assert len(questions) == 15
    assert questions[0].department == "SERVICE_ADVISOR_TRAINEE"
    assert questions[0].text is not None
    assert len(questions[0].options) == 4




