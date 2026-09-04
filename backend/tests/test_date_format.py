from datetime import datetime, timezone

from app.schemas.candidate_query import CandidateListQuery
from app.utils.date_format import format_date_dmy


def test_format_date_dmy_normalizes_common_date_inputs():
    assert format_date_dmy("2026-09-04") == "04/09/2026"
    assert format_date_dmy("2026-09-04T18:30:00Z") == "04/09/2026"
    assert format_date_dmy(datetime(2026, 9, 4, tzinfo=timezone.utc)) == "04/09/2026"
    assert format_date_dmy("04-09-2026") == "04/09/2026"


def test_candidate_date_filters_accept_display_format():
    query = CandidateListQuery.model_validate({"created_date": "04/09/2026"})
    assert query.created_date.isoformat() == "2026-09-04"
