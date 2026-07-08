from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.candidate import Candidate


def generate_candidate_id(db: Session) -> str:
    """
    Produce the next candidate ID in the format NT-{YEAR}-{5-digit}.
    Example: NT-2026-00001, NT-2026-00042
    """
    year = datetime.now(UTC).year
    prefix = f"NT-{year}-"

    last_id = db.scalar(
        select(func.max(Candidate.candidate_id)).where(
            Candidate.candidate_id.like(f"{prefix}%")
        )
    )

    if last_id:
        sequence = int(last_id.split("-")[-1]) + 1
    else:
        sequence = 1

    return f"{prefix}{sequence:05d}"
