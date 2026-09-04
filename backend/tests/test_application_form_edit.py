from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.v1.candidates_core import update_profile_raw_data
from app.models.enums import ActivityType, UserRole
from app.schemas.candidate_query import CandidateListQuery
from app.services.candidate_service import merge_hr_application_raw_data


def test_merge_hr_application_preserves_server_metadata_and_applies_form():
    existing = {
        "whatsapp_template": {"formLink": "https://example.test/form"},
        "bg_verification": {"status": "PENDING"},
        "fullName": "Old Name",
        "familyMembers": [{"name": "Old"}],
    }
    submitted = {
        "fullName": "New Name",
        "whatsapp_template": {"formLink": "stale-client-value"},
        "familyMembers": [{"name": "New"}],
        "previousJobs": [{"company": "Toyota"}],
    }

    merged = merge_hr_application_raw_data(existing, submitted)

    assert merged["fullName"] == "New Name"
    assert merged["familyMembers"] == [{"name": "New"}]
    assert merged["previousJobs"] == [{"company": "Toyota"}]
    assert merged["whatsapp_template"] == existing["whatsapp_template"]
    assert merged["bg_verification"] == existing["bg_verification"]


def test_application_edit_endpoint_returns_committed_canonical_candidate():
    candidate_id = uuid4()
    user = SimpleNamespace(id=uuid4(), role=UserRole.LOCAL_HR, branch_location="Kochi")
    row = SimpleNamespace(
        id=candidate_id,
        profile=SimpleNamespace(raw_data={"whatsapp_template": {"formLink": "keep"}}),
        full_name="Old Name",
        phone="9876543210",
        email="old@example.com",
        position_applied_for="Old Role",
        branch_location="Kochi",
    )
    refreshed = SimpleNamespace(id=candidate_id, profile=SimpleNamespace(raw_data={"fullName": "New Name"}))
    db = MagicMock()
    db.scalar.side_effect = [row, refreshed]
    body = SimpleNamespace(
        raw_data={
            "fullName": " New Name ",
            "mobileNumber": " 9123456789 ",
            "emailId": "new@example.com",
            "positionAppliedFor": " Senior Advisor ",
            "familyMembers": [{"name": "Parent"}],
            "previousJobs": [{"company": "Toyota"}],
        }
    )
    response = MagicMock()
    response.model_copy.return_value = response

    with (
        patch("app.api.v1.candidates_core.assert_candidate_access"),
        patch("app.api.v1.candidates_core.assert_local_hr_can_mutate"),
        patch("app.api.v1.candidates_core.resume_candidate_ids", return_value=set()),
        patch("app.api.v1.candidates_core.to_candidate_out", return_value=response),
        patch("app.api.v1.candidates_core.build_candidate_work_state", return_value=MagicMock()),
    ):
        result = update_profile_raw_data(candidate_id, body, db, user)

    assert result is response
    assert row.full_name == "New Name"
    assert row.phone == "9123456789"
    assert row.email == "new@example.com"
    assert row.position_applied_for == "Senior Advisor"
    assert row.profile.raw_data["whatsapp_template"] == {"formLink": "keep"}
    assert row.profile.raw_data["familyMembers"] == [{"name": "Parent"}]
    assert db.commit.called
    activity = next(
        item for item in db.add.call_args_list
        if getattr(item.args[0], "activity_type", None) == ActivityType.NOTE
    )
    assert activity.args[0].title == "Application Form Updated"


def test_candidate_list_query_works_as_fastapi_dependency_without_filters():
    app = FastAPI()

    @app.get("/candidates")
    def list_candidates(query: CandidateListQuery = Depends()):
        return {"stage": query.stage, "offer_status": query.offer_status}

    response = TestClient(app).get("/candidates")

    assert response.status_code == 200
    assert response.json() == {"stage": [], "offer_status": []}
