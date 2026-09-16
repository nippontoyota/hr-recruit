from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from app.api.v1.admin import get_dashboard_stats
from app.models.enums import PipelineStage


class _Rows:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


def test_dashboard_uses_two_bounded_selects_and_limits_each_branch_preview_to_ten_rows():
    first_branch_candidate = (
        uuid4(),
        "Asha",
        "Sales",
        PipelineStage.CALL_LETTER,
        datetime(2026, 9, 11, tzinfo=UTC),
        "Kochi",
    )
    db = MagicMock()
    db.execute.side_effect = [
        _Rows([
            (PipelineStage.CALL_LETTER, 3),
            (PipelineStage.HIRED, 2),
            (PipelineStage.REJECTED, 1),
        ]),
        _Rows([first_branch_candidate]),
    ]

    result = get_dashboard_stats(db=db, user=SimpleNamespace())

    assert result.total_candidates == 6
    assert result.conversion_rate == 66.66666666666666
    assert result.branch_data[0].branch_name == "Kochi"
    assert result.branch_data[0].candidates[0].full_name == "Asha"
    assert db.execute.call_count == 2
    preview_sql = str(db.execute.call_args_list[1].args[0].compile())
    assert "row_number" in preview_sql.lower()
    assert "<= :branch_rank_1" in preview_sql
