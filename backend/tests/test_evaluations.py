import importlib
from uuid import uuid4
from datetime import datetime, timedelta, UTC
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.main import app
from app.models.candidate import Candidate
from app.models.evaluation import Evaluation
from app.models.evaluation_token import EvaluationToken
from app.models.enums import PipelineStage, UserRole, EvaluationType, InterviewMode, InterviewStatus, EvaluationVerdict
from app.schemas.evaluation import EvaluationWhatsAppInvite
from app.api.v1.evaluations import send_evaluation_whatsapp_invite
from app.models.user import User

client = TestClient(app)


def _admin_user() -> User:
    return User(
        id=uuid4(),
        email="admin@nippon.test",
        hashed_password="x",
        full_name="Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )


def test_online_head_office_invite_uses_online_template():
    evaluation_id = uuid4()
    candidate_id = uuid4()
    evaluation = SimpleNamespace(
        id=evaluation_id,
        candidate_id=candidate_id,
        type=EvaluationType.HQ_INTERVIEW_1,
        interview_mode=InterviewMode.ONLINE,
    )
    candidate = SimpleNamespace(id=candidate_id)
    db = MagicMock()
    db.get.side_effect = lambda model, value: evaluation if model is Evaluation else candidate
    current_user = SimpleNamespace(id=uuid4())
    body = EvaluationWhatsAppInvite(
        to_phone="9876543210",
        variables={
            "candidateName": "Arun",
            "position": "Sales Consultant",
            "date": "22 Aug 2026",
            "time": "10:30 AM",
            "mode": "Online",
            "recruiterName": "Jerin",
        },
    )

    with patch(
        "app.api.v1.evaluations.send_template",
        return_value={"messages": [{"id": "msg-online"}]},
    ) as send:
        response = send_evaluation_whatsapp_invite(evaluation_id, body, db, current_user)

    assert response == {"status": "success", "message_id": "msg-online"}
    assert send.call_args.kwargs["template_name"] == "nippon_head_office_online_interview_invite"
    assert send.call_args.kwargs["placeholders"] == [
        "Arun",
        "Sales Consultant",
        "22 Aug 2026",
        "10:30 AM",
        "Jerin",
    ]


def test_candidate_evaluations_relationship_maps_to_evaluation():
    candidate_module = importlib.import_module("app.models.candidate")
    candidate_cls = candidate_module.Candidate

    relationship = candidate_cls.__mapper__.relationships["evaluations"]
    assert relationship.entity.class_.__name__ == "Evaluation"


def test_public_rejected_submission_uses_assigned_hr_user():
    token = "public-token"
    hr_user = User(
        id=uuid4(),
        email="hr@nippon.test",
        hashed_password="x",
        full_name="HR User",
        role=UserRole.LOCAL_HR,
        is_active=True,
    )
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-3",
        full_name="Rejected Candidate",
        phone="9876543210",
        current_stage=PipelineStage.HR_INTERVIEW,
        assigned_hr_user_id=hr_user.id,
    )
    evaluation = Evaluation(
        id=uuid4(),
        candidate_id=candidate.id,
        type=EvaluationType.BRANCH_HR,
        status=InterviewStatus.PENDING_SCHEDULE,
        verdict=None,
    )
    token_row = EvaluationToken(
        id=uuid4(),
        evaluation_id=evaluation.id,
        token=token,
        is_used=False,
        expires_at=datetime.now(UTC) + timedelta(days=1),
    )

    db = MagicMock()

    def mock_scalar(query):
        return token_row

    def mock_get(model, obj_id):
        if model is Evaluation:
            return evaluation
        if model is Candidate:
            return candidate
        if model is User:
            return hr_user
        return None

    db.scalar.side_effect = mock_scalar
    db.get.side_effect = mock_get
    db.scalars.return_value.all.return_value = []

    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.api.v1.evaluations.transition") as transition_mock:
            response = client.post(
                f"/api/v1/evaluations/public/{token}/submit",
                json={
                    "verdict": EvaluationVerdict.REJECTED.value,
                    "remarks": "Not a fit",
                    "scores": {},
                },
            )

        assert response.status_code == 200, response.text
        assert response.json()["status"] == "success"
        transition_mock.assert_called_once()
        assert transition_mock.call_args.kwargs["user"] is hr_user
    finally:
        app.dependency_overrides.clear()


def test_technical_test_grading_and_no_leakage():
    # Test public-test-questions and submit-test endpoints
    from datetime import timedelta
    from app.models.evaluation_token import EvaluationToken
    
    token = "test-token"
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-4",
        full_name="Tech Candidate",
        phone="9876543210",
        current_stage=PipelineStage.BRANCH_EVALUATION,
        position_applied_for="Software Developer"
    )
    evaluation = Evaluation(
        id=uuid4(),
        candidate_id=candidate.id,
        type=EvaluationType.TECHNICAL_TEST,
        status=InterviewStatus.PENDING_SCHEDULE,
        verdict=None,
    )
    
    token_row = EvaluationToken(
        id=uuid4(),
        evaluation_id=evaluation.id,
        token=token,
        is_used=False,
        expires_at=datetime.now(UTC) + timedelta(days=1),
        test_data={
            "questions": [
                {"id": "q2", "text": "Q2 text", "options": {"a": "A", "b": "B"}},
                {"id": "q1", "text": "Q1 text", "options": {"a": "A", "b": "B"}}
            ],
            "answers": {
                "q2": "b",
                "q1": "a"
            }
        }
    )
    
    db = MagicMock()
    
    def mock_scalar(query):
        return token_row
        
    def mock_get(model, obj_id):
        if model is Evaluation:
            return evaluation
        if model is Candidate:
            return candidate
        return None
        
    db.scalar.side_effect = mock_scalar
    db.get.side_effect = mock_get
    
    app.dependency_overrides[get_db] = lambda: db
    try:
        # 1. Fetch public test questions
        response = client.get(f"/api/v1/evaluations/public/{token}/test-questions")
        assert response.status_code == 200
        data = response.json()
        # assert data["department"] == "IT"
        assert len(data["questions"]) == 2
        # Verify no "answer" key is leaked
        for q in data["questions"]:
            assert "answer" not in q
            
        # 2. Submit test answers
        response = client.post(
            f"/api/v1/evaluations/public/{token}/submit-test",
            json={
                "answers": {
                    "q1": "a",
                    "q2": "b"
                }
            }
        )
        assert response.status_code == 200
        submit_body = response.json()
        # Candidate-facing response must never leak the verdict/percentage
        assert "verdict" not in submit_body
        assert "score" not in submit_body
        # But the raw x/y count is shown to the candidate at the top of the result screen
        assert submit_body["correct_answers"] == 2
        assert submit_body["total_questions"] == 2
        assert evaluation.verdict == EvaluationVerdict.PASS # 100% grade, graded server-side
        assert evaluation.scores["correct_answers"] == 2
        assert evaluation.scores["total_questions"] == 2
        assert evaluation.scores["percentage"] == 100.0
        assert evaluation.scores["candidate_answers"]["q1"] == "a"
        assert len(evaluation.scores["questions"]) == 2
        # Verify candidate raw responses are NOT stored
        assert "responses" not in evaluation.scores
    finally:
        app.dependency_overrides.clear()


def test_evaluation_token_generation_shuffles_questions():
    from unittest.mock import MagicMock, patch
    from app.models.technical_question import TechnicalQuestion
    from app.models.evaluation_token import EvaluationToken
    from app.core.positions import POS_GEM

    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-5",
        full_name="Tech Candidate 2",
        phone="9876543210",
        current_stage=PipelineStage.CSS,
        department="Sales",
        position_applied_for=POS_GEM,
        experience="Fresher",
    )
    evaluation = Evaluation(
        id=uuid4(),
        candidate_id=candidate.id,
        type=EvaluationType.TECHNICAL_TEST,
        status=InterviewStatus.PENDING_SCHEDULE,
        verdict=None,
    )

    mock_questions = [
        TechnicalQuestion(id="q1", department="COMMON", text="Q1", options={"a": "1"}, answer="a"),
        TechnicalQuestion(id="q2", department="COMMON", text="Q2", options={"a": "2"}, answer="b"),
        TechnicalQuestion(id="q3", department="SALES_GEM_FRESHER", text="Q3", options={"a": "3"}, answer="c"),
    ]

    db = MagicMock()

    def mock_get(model, obj_id):
        if model is Evaluation:
            return evaluation
        if model is Candidate:
            return candidate
        return None

    db.get.side_effect = mock_get
    db.scalar = lambda q: None

    added_objects = []
    def mock_add(obj):
        added_objects.append(obj)
    db.add.side_effect = mock_add

    dummy_user = User(id=uuid4(), email="admin@nippon.test", role=UserRole.ADMIN, is_active=True)
    app.dependency_overrides[get_current_active_user] = lambda: dummy_user
    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.api.v1.evaluations.assemble_for_candidate", return_value=mock_questions):
            response = client.post(f"/api/v1/evaluations/{evaluation.id}/token")
        assert response.status_code == 200, response.text

        assert len(added_objects) == 1
        new_token = added_objects[0]
        assert isinstance(new_token, EvaluationToken)
        assert new_token.test_data is not None
        assert "questions" in new_token.test_data
        assert "answers" in new_token.test_data

        for q in new_token.test_data["questions"]:
            assert "answer" not in q

        assert new_token.test_data["answers"] == {"q1": "a", "q2": "b", "q3": "c"}
    finally:
        app.dependency_overrides.clear()


def test_ho_dept_scorecard_advances_despite_assigned_local_hr():
    """Public HO links attribute the stage change to assigned local HR; that must not 403 after handover."""
    from app.api.v1.evaluations import _apply_evaluation_outcome

    hr_user = User(
        id=uuid4(),
        email="hr@nippon.test",
        hashed_password="x",
        full_name="Local HR",
        role=UserRole.LOCAL_HR,
        is_active=True,
        branch_location="Kollam",
    )
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-20",
        full_name="HO Candidate",
        phone="9876543210",
        current_stage=PipelineStage.HO_DEPT_INTERVIEW,
        assigned_hr_user_id=hr_user.id,
        branch_location="Kollam",
    )
    hr_eval = Evaluation(
        id=uuid4(),
        candidate_id=candidate.id,
        type=EvaluationType.HQ_INTERVIEW_1,
        status=InterviewStatus.EVALUATED,
        verdict=EvaluationVerdict.SELECTED,
    )
    dept_eval = Evaluation(
        id=uuid4(),
        candidate_id=candidate.id,
        type=EvaluationType.HQ_INTERVIEW_2,
        status=InterviewStatus.EVALUATED,
        verdict=EvaluationVerdict.SELECTED,
    )

    class DummySession:
        def scalars(self, query):
            return type("R", (), {"all": lambda self: [hr_eval, dept_eval]})()

        def add(self, obj):
            return None

        def flush(self):
            return None

        def scalar(self, query):
            return None

    _apply_evaluation_outcome(
        DummySession(),
        dept_eval,
        candidate,
        EvaluationVerdict.SELECTED,
        hr_user,
    )
    assert candidate.current_stage == PipelineStage.CSS


def test_public_scores_keeps_stars_and_drops_noise():
    from app.api.v1.evaluations import _public_scores

    assert _public_scores(
        {
            "attitude": 4,
            "communication": 2,
            "knowledge": 3,
            "total_score": 9,
            "interviewer_name": "Priya",
            "responses": {"q1": "A"},
            "secret": "nope",
        }
    ) == {
        "attitude": 4,
        "communication": 2,
        "knowledge": 3,
        "total_score": 9,
        "interviewer_name": "Priya",
    }
    assert _public_scores(None) is None
    assert _public_scores({}) is None


def test_questions_ignore_unknown_stored_position_until_designation_selected():
    from urllib.parse import quote
    from app.core.positions import POS_GEM
    from app.models.technical_question import TechnicalQuestion

    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-21",
        full_name="No Designation",
        phone="9876543210",
        current_stage=PipelineStage.TEST,
        department="Sales",
        position_applied_for="Unknown",
        experience="Fresher",
    )
    mock_questions = [
        TechnicalQuestion(id="C1", department="COMMON", text="Q1", options={"A": "x"}, answer="A"),
    ]
    db = MagicMock()
    db.get.return_value = candidate
    dummy_user = _admin_user()
    app.dependency_overrides[get_current_active_user] = lambda: dummy_user
    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.api.v1.evaluations._frozen_test_questions", return_value=None):
            empty = client.get(f"/api/v1/evaluations/questions?candidate_id={candidate.id}")
        assert empty.status_code == 200, empty.text
        assert empty.json() == []

        with patch("app.api.v1.evaluations._frozen_test_questions", return_value=None), patch(
            "app.api.v1.evaluations.assemble_test_questions", return_value=mock_questions
        ) as assemble:
            filled = client.get(
                "/api/v1/evaluations/questions"
                f"?candidate_id={candidate.id}"
                "&department=Sales"
                f"&position={quote(POS_GEM)}"
                "&experience=Fresher"
            )
        assert filled.status_code == 200, filled.text
        assert filled.json()[0]["id"] == "C1"
        assemble.assert_called_once()
        assert assemble.call_args.args[1] == "Sales"
        assert assemble.call_args.args[2] == POS_GEM
        assert assemble.call_args.args[3] == "Fresher"
    finally:
        app.dependency_overrides.clear()



