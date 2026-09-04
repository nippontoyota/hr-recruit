from __future__ import annotations

from datetime import date, datetime, timedelta
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.enums import PipelineStage


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"


class CandidateSortField(str, Enum):
    CANDIDATE = "full_name"
    POSITION = "position_applied_for"
    STAGE = "current_stage"
    OFFER_RESPONSE = "offer_status"
    BRANCH = "branch_location"
    SOURCE = "source"
    DATE_ADDED = "created_at"
    FORM_SENT = "pre_form_sent_at"


def parse_dmy(value: str | date | None) -> date | None:
    if value is None or isinstance(value, date):
        return value
    try:
        return datetime.strptime(value, "%d-%m-%Y").date()
    except ValueError as exc:
        raise ValueError("Use date format DD-MM-YYYY") from exc


class CandidateListQuery(BaseModel):
    search: str | None = Field(default=None, max_length=120)
    # Explicit list defaults are intentional: FastAPI's dependency adapter on
    # the Vercel runtime can pass Field's default_factory sentinel for omitted
    # query-list parameters instead of evaluating it.
    stage: list[PipelineStage] = Field(default=[])
    offer_status: list[str] = Field(default=[], max_length=10)
    branch: list[str] = Field(default=[], max_length=50)
    source: list[str] = Field(default=[], max_length=50)
    position: str | None = Field(default=None, max_length=255)
    next_action: list[str] = Field(default=[], max_length=30)
    created_date: date | None = None
    created_before: date | None = None
    created_after: date | None = None
    sent_date: date | None = None
    sent_before: date | None = None
    sent_after: date | None = None
    sort_by: CandidateSortField = CandidateSortField.DATE_ADDED
    sort_direction: SortDirection = SortDirection.DESC
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=50, ge=1, le=200)

    _parse_dates = field_validator(
        "created_date",
        "created_before",
        "created_after",
        "sent_date",
        "sent_before",
        "sent_after",
        mode="before",
    )(parse_dmy)

    @field_validator("search", "position", mode="before")
    @classmethod
    def clean_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None

    @field_validator("offer_status", "branch", "source", "next_action", mode="before")
    @classmethod
    def clean_lists(cls, value):
        if value is None:
            return []
        values = value if isinstance(value, list) else [value]
        return [str(item).strip() for item in values if str(item).strip()]

    @model_validator(mode="after")
    def validate_date_ranges(self) -> "CandidateListQuery":
        for prefix in ("created", "sent"):
            exact = getattr(self, f"{prefix}_date")
            before = getattr(self, f"{prefix}_before")
            after = getattr(self, f"{prefix}_after")
            if exact is not None and (before is not None or after is not None):
                raise ValueError(f"Use either {prefix}_date or {prefix}_before/{prefix}_after")
            if before is not None and after is not None and before < after:
                raise ValueError(f"{prefix}_before cannot be earlier than {prefix}_after")
        return self

    def day_range(self, field: str) -> tuple[date | None, date | None]:
        exact = getattr(self, f"{field}_date")
        before = getattr(self, f"{field}_before")
        after = getattr(self, f"{field}_after")
        if exact:
            return exact, exact + timedelta(days=1)
        return after, before + timedelta(days=1) if before else None
