from types import SimpleNamespace

from app.core.branding import RIVER
from app.models.enums import UserRole
from app.schemas.candidate_query import CandidateListQuery
from app.services.candidate_list_query import build_candidate_list_metadata_query, build_candidate_list_query


def test_next_action_sort_uses_the_derived_action_expression():
    user = SimpleNamespace(
        role=UserRole.LOCAL_HR,
        brand=RIVER,
        branch_location="Trivandrum",
    )
    query = CandidateListQuery(sort_by="next_action", sort_direction="asc")

    sql = str(build_candidate_list_query(user, query).compile())

    assert "CASE" in sql
    assert "current_stage" in sql
    assert "ASC NULLS LAST" in sql


def test_list_metadata_is_selected_in_the_paginated_query_without_follow_up_lookups():
    user = SimpleNamespace(
        role=UserRole.LOCAL_HR,
        brand=RIVER,
        branch_location="Trivandrum",
    )

    sql = str(
        build_candidate_list_metadata_query(
            build_candidate_list_query(user, CandidateListQuery())
        ).compile()
    )

    assert "count(*) OVER" in sql
    assert sql.count("EXISTS") >= 2
    assert "candidate_profiles" in sql
    assert "documents" in sql
    assert "stage_history" in sql


def test_queue_filter_applies_queue_clause():
    for role in (UserRole.LOCAL_HR, UserRole.HO_HR, UserRole.ADMIN):
        user = SimpleNamespace(
            role=role,
            brand=RIVER if role == UserRole.LOCAL_HR else None,
            branch_location="Trivandrum" if role == UserRole.LOCAL_HR else None,
        )
        for q in ("ON_HOLD", "WAITING_FOR_HO", "WAITING_FOR_CANDIDATE", "READY_FOR_OFFER", "STALLED", "NEEDS_ACTION"):
            query = CandidateListQuery(queue=q, search="Test")
            sql = str(build_candidate_list_query(user, query).compile())
            assert "WHERE" in sql
            if q == "ON_HOLD":
                assert "current_stage" in sql
            elif q == "WAITING_FOR_HO":
                assert "current_stage IN" in sql
            elif q == "WAITING_FOR_CANDIDATE":
                assert "pre_form_status IN" in sql or "offer_status" in sql
            elif q == "READY_FOR_OFFER":
                assert "salary_data IS NOT NULL" in sql
            elif q == "STALLED":
                assert "updated_at" in sql or "created_at" in sql
