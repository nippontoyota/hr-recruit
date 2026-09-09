from types import SimpleNamespace

from app.core.branding import RIVER
from app.models.enums import UserRole
from app.schemas.candidate_query import CandidateListQuery
from app.services.candidate_list_query import build_candidate_list_query


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
