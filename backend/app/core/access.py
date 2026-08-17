from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.enums import UserRole
from app.models.user import User
from app.core.ho_pipeline import candidate_reached_ho, handed_over_to_ho, is_ho_pipeline_stage

LOCAL_HR_HANDOVER_LOCKED = (
    "This candidate has been handed over to Head Office. Local HR cannot make changes."
)
SALARY_VIEW_ROLES = (UserRole.ADMIN, UserRole.HO_HR)


def can_view_salary(user: User | None) -> bool:
    return user is not None and user.role in SALARY_VIEW_ROLES


def assert_candidate_access(user: User, candidate: Candidate, db: Session | None = None) -> None:
    if user.role == UserRole.LOCAL_HR:
        if candidate.branch_location != user.branch_location:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Candidate is not in your branch.")

    if user.role in (UserRole.HO_HR, UserRole.ADMIN):
        if is_ho_pipeline_stage(candidate.current_stage):
            return
        if db is not None and candidate_reached_ho(db, candidate.id):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Candidate has not been handed over to Head Office yet.",
        )


def assert_local_hr_can_mutate(user: User, candidate: Candidate, db: Session | None = None) -> None:
    if user.role != UserRole.LOCAL_HR:
        return
    if handed_over_to_ho(candidate, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=LOCAL_HR_HANDOVER_LOCKED)


def get_candidate_for_user(db: Session, candidate_id, user: User, *, write: bool = False) -> Candidate:
    row = db.get(Candidate, candidate_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    assert_candidate_access(user, row, db)
    if write:
        assert_local_hr_can_mutate(user, row, db)
    return row
