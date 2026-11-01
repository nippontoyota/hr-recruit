from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

from app.api.v1.candidates_core import candidate_queue_counts
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.candidate_query import CandidateListQuery


def test_queue_counts_returns_expected_structure():
    mock_db = Mock()
    # Mock row returned by db.execute().one(): (total, needs_action, waiting_for_candidate, waiting_for_ho, ready_for_offer, on_hold, stalled)
    mock_db.execute.return_value.one.return_value = (150, 40, 10, 50, 15, 8, 27)

    test_user = User(
        id=uuid4(),
        email="ho_hr@toyota.test",
        full_name="HO HR",
        role=UserRole.HO_HR,
        is_active=True,
    )
    query = CandidateListQuery()

    result = candidate_queue_counts(query=query, db=mock_db, user=test_user)

    assert result["OVERVIEW"] == 150
    assert result["NEEDS_ACTION"] == 40
    assert result["WAITING_FOR_CANDIDATE"] == 10
    assert result["WAITING_FOR_HO"] == 50
    assert result["READY_FOR_OFFER"] == 15
    assert result["ON_HOLD"] == 8
    assert result["STALLED"] == 27
