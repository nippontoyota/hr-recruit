from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.enums import UserRole, PipelineStage
from app.models.user import User


def assert_candidate_access(user: User, candidate: Candidate) -> None:
    if user.role == UserRole.LOCAL_HR:
        if candidate.branch_location != user.branch_location:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Candidate is not in your branch.")
            
    if user.role == UserRole.HO_HR:
        if candidate.current_stage not in [PipelineStage.SENT_TO_HO, PipelineStage.FINAL_APPROVAL, PipelineStage.HIRED]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Candidate has not been handed over to Head Office yet.")


def get_candidate_for_user(db: Session, candidate_id, user: User) -> Candidate:
    row = db.get(Candidate, candidate_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    assert_candidate_access(user, row)
    return row
