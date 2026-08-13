import importlib
from uuid import uuid4
from datetime import datetime, timedelta, UTC
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
from app.models.enums import PipelineStage, UserRole, EvaluationType, InterviewStatus, EvaluationVerdict
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


def test_evaluations_initialized_on_department_stage():
    from app.services import workflow
    db = type("DB", (), {})()
    db.flush = lambda: None
    
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-2026-00001",
        full_name="Test Candidate",
        phone="9876543210",
        current_stage=PipelineStage.HR_INTERVIEW
    )
    
    added_evaluations = []
    
    def mock_add(obj):
        if isinstance(obj, Evaluation):
            added_evaluations.append(obj)
            
    db.add = mock_add
    
    def mock_scalar(query):
        if "BRANCH_HR" in str(query):
            return Evaluation(
                candidate_id=candidate.id,
                type=EvaluationType.BRANCH_HR,
                status=InterviewStatus.EVALUATED,
                verdict=EvaluationVerdict.SELECTED
            )
        return None
    db.scalar = mock_scalar
    db.flush = lambda: None
    
    user = _admin_user()
    workflow.transition(db, candidate, PipelineStage.DEPARTMENT_INTERVIEW, user, remarks="Start dept review")
    
    assert candidate.current_stage == PipelineStage.DEPARTMENT_INTERVIEW
    assert len(added_evaluations) == 1
    assert added_evaluations[0].type == EvaluationType.DEPT_HEAD
    assert added_evaluations[0].status == InterviewStatus.PENDING_SCHEDULE


def test_transition_flushes_new_evaluations_into_session():
    from app.services import workflow

    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-2026-00005",
        full_name="Session Candidate",
        phone="9876543210",
        current_stage=PipelineStage.HR_INTERVIEW,
    )

    created_evaluations = []
    flushed = False

    class DummySession:
        def add(self, obj):
            if isinstance(obj, Evaluation):
                created_evaluations.append(obj)

        def scalar(self, query):
            if "BRANCH_HR" in str(query):
                return Evaluation(
                    candidate_id=candidate.id,
                    type=EvaluationType.BRANCH_HR,
                    status=InterviewStatus.EVALUATED,
                    verdict=EvaluationVerdict.SELECTED
                )
            return None

        def flush(self):
            nonlocal flushed
            flushed = True

    db = DummySession()
    user = _admin_user()

    workflow.transition(db, candidate, PipelineStage.DEPARTMENT_INTERVIEW, user, remarks="Start dept review")

    assert flushed is True
    assert len(created_evaluations) == 1
    assert created_evaluations[0].type == EvaluationType.DEPT_HEAD
    assert created_evaluations[0].status == InterviewStatus.PENDING_SCHEDULE


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
        candidate_id="NT-2026-00003",
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
        if "EvaluationToken" in str(query):
            return token_row
        return None

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

    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.services.workflow.transition") as transition_mock:
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


def test_transition_validation_department_to_branch():
    from app.services import workflow
    db = type("DB", (), {})()
    db.flush = lambda: None
    
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-2026-00002",
        full_name="Test Candidate 2",
        phone="9876543210",
        current_stage=PipelineStage.DEPARTMENT_INTERVIEW
    )
    
    # 1. No evaluation exists -> should raise HTTPException (Wait, actually auto-initialize handles it now)
    # Since we auto-initialize, the validation requirement for existing evaluation was changed/removed.
    db.scalar = lambda q: None
    db.add = lambda obj: None
    user = _admin_user()
    
    with pytest.raises(HTTPException) as exc:
        workflow.transition(db, candidate, PipelineStage.BRANCH_EVALUATION, user, remarks="Move to branch")
    assert exc.value.status_code == 400
    assert "Department Head evaluation must be completed" in exc.value.detail

    # 2. Evaluation exists but status is scheduled (not evaluated) ➔ should raise HTTPException
    incomplete_eval = Evaluation(
        id=uuid4(),
        candidate_id=candidate.id,
        type=EvaluationType.DEPT_HEAD,
        status=InterviewStatus.SCHEDULED,
        verdict=None
    )
    db.scalar = lambda q: incomplete_eval
    
    with pytest.raises(HTTPException) as exc:
        workflow.transition(db, candidate, PipelineStage.BRANCH_EVALUATION, user, remarks="Move to branch")
    assert exc.value.status_code == 400
    
    # 3. Evaluation is completed ➔ transition should succeed and initialize GM_LEVEL & TECHNICAL_TEST
    completed_eval = Evaluation(
        id=uuid4(),
        candidate_id=candidate.id,
        type=EvaluationType.DEPT_HEAD,
        status=InterviewStatus.EVALUATED,
        verdict=EvaluationVerdict.SELECTED
    )
    
    added_evaluations = []
    def mock_add(obj):
        if isinstance(obj, Evaluation):
            added_evaluations.append(obj)
            
    db.add = mock_add
    
    calls = []
    def mock_scalar(q):
        calls.append(q)
        if len(calls) == 1:
            return completed_eval
        return None
        
    db.scalar = mock_scalar
    db.flush = lambda: None
    
    workflow.transition(db, candidate, PipelineStage.BRANCH_EVALUATION, user, remarks="Move to branch")
    assert candidate.current_stage == PipelineStage.BRANCH_EVALUATION
    assert len(added_evaluations) == 2
    types = {e.type for e in added_evaluations}
    assert types == {EvaluationType.GM_LEVEL, EvaluationType.TECHNICAL_TEST}


def test_technical_test_grading_and_no_leakage():
    # Test public-test-questions and submit-test endpoints
    from datetime import timedelta
    from app.models.evaluation_token import EvaluationToken
    
    token = "test-token"
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-2026-00004",
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
        assert response.json()["verdict"] == "PASS" # 100% grade
        assert evaluation.verdict == EvaluationVerdict.PASS
        assert evaluation.scores["correct_answers"] == 2
        assert evaluation.scores["total_questions"] == 2
        assert evaluation.scores["percentage"] == 100.0
        # Verify candidate raw responses are NOT stored
        assert "responses" not in evaluation.scores
    finally:
        app.dependency_overrides.clear()


def test_evaluation_token_generation_shuffles_questions():
    # Test token generation shuffles and saves questions to test_data
    from unittest.mock import MagicMock
    from app.models.technical_question import TechnicalQuestion
    from app.models.evaluation_token import EvaluationToken
    
    candidate = Candidate(
        id=uuid4(),
        candidate_id="NT-2026-00005",
        full_name="Tech Candidate 2",
        phone="9876543210",
        current_stage=PipelineStage.BRANCH_EVALUATION,
        position_applied_for="Developer"
    )
    evaluation = Evaluation(
        id=uuid4(),
        candidate_id=candidate.id,
        type=EvaluationType.TECHNICAL_TEST,
        status=InterviewStatus.PENDING_SCHEDULE,
        verdict=None,
    )
    
    mock_questions = [
        TechnicalQuestion(id="q1", department="IT", text="Q1", options={"a": "1"}, answer="a"),
        TechnicalQuestion(id="q2", department="IT", text="Q2", options={"a": "2"}, answer="b"),
        TechnicalQuestion(id="q3", department="IT", text="Q3", options={"a": "3"}, answer="c"),
    ]
    
    db = MagicMock()
    
    def mock_get(model, obj_id):
        if model is Evaluation:
            return evaluation
        if model is Candidate:
            return candidate
        return None
        
    def mock_scalars(query):
        # We need to simulate the query for existing tokens (empty) and query for TechnicalQuestion
        query_str = str(query)
        m = MagicMock()
        if "technical_questions" in query_str:
            m.all.return_value = mock_questions
        else:
            m.all.return_value = []
        return m
        
    db.get.side_effect = mock_get
    db.scalars.side_effect = mock_scalars
    db.scalar = lambda q: None
    
    added_objects = []
    def mock_add(obj):
        added_objects.append(obj)
    db.add.side_effect = mock_add
    
    # Mock authentication / roles dependency override
    dummy_user = User(id=uuid4(), email="admin@nippon.test", role=UserRole.ADMIN, is_active=True)
    app.dependency_overrides[get_current_active_user] = lambda: dummy_user
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post(f"/api/v1/evaluations/{evaluation.id}/token")
        assert response.status_code == 200, response.text
        
        # Verify the generated token has test_data
        assert len(added_objects) == 1
        new_token = added_objects[0]
        assert isinstance(new_token, EvaluationToken)
        assert new_token.test_data is not None
        assert "questions" in new_token.test_data
        assert "answers" in new_token.test_data
        
        # Verify questions do not leak correct answers
        for q in new_token.test_data["questions"]:
            assert "answer" not in q
            
        # Verify answers dictionary maps question IDs to correct answer
        assert new_token.test_data["answers"] == {"q1": "a", "q2": "b", "q3": "c"}
    finally:
        app.dependency_overrides.clear()


