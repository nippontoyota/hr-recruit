import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.branding import NIPPON_TOYOTA, RIVER, brand_is_river
from app.models.enums import UserRole
from app.models.job_opening import JobOpening
from app.models.user import User
from app.schemas.job_opening import JobOpeningCreate, JobOpeningOut, JobOpeningUpdate

router = APIRouter(prefix="/openings", tags=["openings"])

_READ = require_roles(UserRole.HO_HR, UserRole.LOCAL_HR)
_WRITE = require_roles(UserRole.HO_HR)


def _get_opening(db: Session, opening_id: uuid.UUID) -> JobOpening:
    row = db.get(JobOpening, opening_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opening not found")
    return row


@router.get("", response_model=list[JobOpeningOut])
def list_openings(
    db: Session = Depends(get_db),
    user: User = Depends(_READ),
):
    statement = select(JobOpening)
    if user.role == UserRole.LOCAL_HR:
        statement = statement.where(
            JobOpening.brand == RIVER
            if brand_is_river(user.brand)
            else or_(JobOpening.brand.is_(None), JobOpening.brand == NIPPON_TOYOTA)
        )
    return list(db.scalars(statement.order_by(JobOpening.created_at.desc())).all())


@router.post("", response_model=JobOpeningOut, status_code=status.HTTP_201_CREATED)
def create_opening(
    body: JobOpeningCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_WRITE),
):
    row = JobOpening(
        position=body.position,
        department=body.department,
        location=body.location,
        headcount=body.headcount,
        created_by=user.id,
        brand=RIVER if brand_is_river(body.brand or user.brand) else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{opening_id}", response_model=JobOpeningOut)
def update_opening(
    opening_id: uuid.UUID,
    body: JobOpeningUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_WRITE),
):
    row = _get_opening(db, opening_id)
    row.position = body.position
    row.department = body.department
    row.location = body.location
    row.headcount = body.headcount
    if body.brand is not None:
        row.brand = RIVER if brand_is_river(body.brand) else None
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{opening_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_opening(
    opening_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(_WRITE),
):
    row = _get_opening(db, opening_id)
    db.delete(row)
    db.commit()
