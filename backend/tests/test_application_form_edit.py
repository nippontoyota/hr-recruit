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
    assert merged["previousJobs"][0]["company"] == "Toyota"
    assert merged["previousJobs"][0]["position"] == ""
    assert merged["whatsapp_template"] == existing["whatsapp_template"]
    assert merged["bg_verification"] == existing["bg_verification"]


def test_merge_hr_application_normalizes_all_previous_jobs_and_legacy_slots():
    submitted = {
        "previousExperience": True,
        "previousJobs": [
            {
                "co": f"Company {index}",
                "pos": f"Role {index}",
                "rep": f"Manager {index}",
                "from": f"202{index}-01-01",
                "to": f"202{index}-12-31",
                "sal": str(index * 1000),
                "reason": "Change",
            }
            for index in range(1, 6)
        ],
    }

    merged = merge_hr_application_raw_data({}, submitted)

    assert len(merged["previousJobs"]) == 5
    assert merged["previousJobs"][4]["company"] == "Company 5"
    assert merged["previousJobs"][0]["fromDate"] == "2021-01-01"
    assert merged["previousJobs"][0]["reporting"] == "Manager 1"
    assert merged["prevCompanyName"] == "Company 1"
    assert merged["prev2Name"] == "Company 2"
    assert merged["prev3Name"] == "Company 3"
    assert merged["prev4Name"] == "Company 4"


def test_merge_hr_application_preserves_fifteen_family_members():
    family = [
        {
            "rel": f"Relative {index}",
            "name": f"Member {index}",
            "age": str(20 + index),
            "occ": "Employee",
            "co": f"Company {index}",
            "ph": "9876543210",
        }
        for index in range(1, 16)
    ]

    merged = merge_hr_application_raw_data({}, {"familyMembers": family})

    assert len(merged["familyMembers"]) == 15
    assert merged["familyMembers"][-1]["name"] == "Member 15"


def test_merge_hr_application_clears_removed_legacy_jobs():
    existing = {
        "prevCompanyName": "Old 1",
        "prev2Name": "Old 2",
        "prev3Name": "Old 3",
        "prev4Name": "Old 4",
        "previousJobs": [{"company": "Old 1"}],
    }

    merged = merge_hr_application_raw_data(existing, {"previousExperience": False, "previousJobs": []})

    assert merged["previousJobs"] == []
    assert merged["prevCompanyName"] == ""
    assert merged["prev2Name"] == ""
    assert merged["prev3Name"] == ""
    assert merged["prev4Name"] == ""


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
        experience="Fresher",
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


def test_application_edit_endpoint_synchronizes_profile_from_dynamic_jobs():
    candidate_id = uuid4()
    user = SimpleNamespace(id=uuid4(), role=UserRole.LOCAL_HR, branch_location="Kochi")
    profile = SimpleNamespace(raw_data={"whatsapp_template": {"formLink": "keep"}})
    row = SimpleNamespace(
        id=candidate_id,
        profile=profile,
        full_name="Old Name",
        phone="9876543210",
        email="old@example.com",
        position_applied_for="Old Role",
        branch_location="Kochi",
    )
    refreshed = SimpleNamespace(id=candidate_id, profile=profile)
    jobs = [
        {
            "company": f"Company {index}",
            "position": f"Role {index}",
            "reporting": f"Manager {index}",
            "reportingDesignation": "Lead",
            "reportingPhone": "9000000000",
            "fromDate": f"202{index}-01-01",
            "toDate": f"202{index}-12-31",
            "salary": str(index * 1000),
            "reason": "Change",
        }
        for index in range(1, 6)
    ]
    body = SimpleNamespace(
        raw_data={
            "fullName": "New Name",
            "mobileNumber": "9123456789",
            "emailId": "new@example.com",
            "positionAppliedFor": "Senior Advisor",
            "previousExperience": True,
            "previousJobs": jobs,
            "totalExperience": "5 years",
            "expectedSalary": "30000",
            "expectedJoiningDate": "2026-10-01",
        }
    )
    response = MagicMock()
    response.model_copy.return_value = response
    db = MagicMock()
    db.scalar.side_effect = [row, refreshed]

    with (
        patch("app.api.v1.candidates_core.assert_candidate_access"),
        patch("app.api.v1.candidates_core.assert_local_hr_can_mutate"),
        patch("app.api.v1.candidates_core.resume_candidate_ids", return_value=set()),
        patch("app.api.v1.candidates_core.to_candidate_out", return_value=response),
        patch("app.api.v1.candidates_core.build_candidate_work_state", return_value=MagicMock()),
    ):
        result = update_profile_raw_data(candidate_id, body, db, user)

    assert result is response
    assert len(row.profile.raw_data["previousJobs"]) == 5
    assert row.profile.raw_data["previousJobs"][4]["company"] == "Company 5"
    assert row.profile.experience_level == "Experienced"
    assert row.experience == "Experienced"
    assert row.profile.total_experience == "5 years"
    assert row.profile.current_company == "Company 1"
    assert row.profile.expected_salary == "30000"
    assert row.profile.joining_date == "2026-10-01"


def test_candidate_list_query_works_as_fastapi_dependency_without_filters():
    app = FastAPI()

    @app.get("/candidates")
    def list_candidates(query: CandidateListQuery = Depends()):
        return {"stage": query.stage, "offer_status": query.offer_status}

    response = TestClient(app).get("/candidates")

    assert response.status_code == 200
    assert response.json() == {"stage": [], "offer_status": []}
