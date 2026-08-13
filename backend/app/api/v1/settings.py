import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.enums import InterviewMode, UserRole
from app.models.settings import HR_BRANCHES, InterviewerName, LocationTemplate, MessageTemplate
from app.models.user import User
from app.schemas.settings import (
    InterviewerNameCreate,
    InterviewerNameResponse,
    LocationTemplateCreate,
    LocationTemplateResponse,
    LocationTemplateUpdate,
    MessageTemplateCreate,
    MessageTemplateResponse,
    MessageTemplateUpdate,
)

router = APIRouter()

_HR = require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR)

KALAMASSERY_MAPS = (
    "https://www.google.com/maps/dir/10.0517264,76.3289828/Nippon+Toyota+Kalamassery/"
    "@10.0532732,76.320385,16z/data=!3m1!4b1!4m9!4m8!1m1!4e1!1m5!1m1!"
    "1s0x3b080c2db1f58613:0x58a056812a3dd924!2m2!1d76.3213193!2d10.054305"
)


def _normalize_branch(raw: str | None) -> str | None:
    if not raw or not raw.strip():
        return None
    wanted = raw.strip().lower()
    for b in HR_BRANCHES:
        if b.lower() == wanted:
            return b
    return raw.strip()


def _resolve_branch(user: User, override: str | None = None) -> str:
    """LOCAL_HR always uses their account branch; ADMIN/HO_HR may pass override."""
    if user.role == UserRole.LOCAL_HR:
        branch = _normalize_branch(user.branch_location)
        if not branch:
            raise HTTPException(
                status_code=400,
                detail="This HR account has no branch assigned. Contact admin.",
            )
        return branch

    branch = _normalize_branch(override) or _normalize_branch(user.branch_location)
    if not branch:
        raise HTTPException(
            status_code=400,
            detail="branch_location is required (one of the HR branch accounts).",
        )
    return branch


def _ensure_kalamassery_for_branch(db: Session, branch: str) -> None:
    if branch != "Kalamassery":
        return
    exists = db.scalar(
        select(LocationTemplate.id).where(
            LocationTemplate.branch_location == "Kalamassery",
            func.lower(LocationTemplate.name) == "kalamassery",
        )
    )
    if exists:
        return
    db.add(
        LocationTemplate(
            branch_location="Kalamassery",
            name="Kalamassery",
            location_or_link=KALAMASSERY_MAPS,
            mode=InterviewMode.PHYSICAL,
            is_default=True,
        )
    )
    db.commit()


@router.get("/locations", response_model=list[LocationTemplateResponse])
def list_location_templates(
    branch: str | None = Query(None, description="Branch for ADMIN/HO_HR"),
    db: Session = Depends(get_db),
    user: User = Depends(_HR),
):
    branch_loc = _resolve_branch(user, branch)
    _ensure_kalamassery_for_branch(db, branch_loc)
    return list(
        db.scalars(
            select(LocationTemplate)
            .where(LocationTemplate.branch_location == branch_loc)
            .order_by(LocationTemplate.name)
        ).all()
    )


@router.post("/locations", response_model=LocationTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_location_template(
    body: LocationTemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_HR),
):
    branch_loc = _resolve_branch(user, body.branch_location)
    name = body.name.strip()
    if not name or not body.location_or_link.strip():
        raise HTTPException(status_code=400, detail="Name and maps link are required.")
    existing = db.scalar(
        select(LocationTemplate).where(
            LocationTemplate.branch_location == branch_loc,
            func.lower(LocationTemplate.name) == name.lower(),
        )
    )
    if existing:
        existing.location_or_link = body.location_or_link.strip()
        if body.mode is not None:
            existing.mode = body.mode
        db.commit()
        db.refresh(existing)
        return existing
    row = LocationTemplate(
        branch_location=branch_loc,
        name=name,
        location_or_link=body.location_or_link.strip(),
        mode=body.mode or InterviewMode.PHYSICAL,
        is_default=body.is_default,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/locations/{template_id}", response_model=LocationTemplateResponse)
def update_location_template(
    template_id: uuid.UUID,
    body: LocationTemplateUpdate,
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(_HR),
):
    branch_loc = _resolve_branch(user, branch)
    row = db.get(LocationTemplate, template_id)
    if not row or row.branch_location != branch_loc:
        raise HTTPException(status_code=404, detail="Location template not found")
    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(row, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/locations/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location_template(
    template_id: uuid.UUID,
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(_HR),
):
    branch_loc = _resolve_branch(user, branch)
    row = db.get(LocationTemplate, template_id)
    if not row or row.branch_location != branch_loc:
        raise HTTPException(status_code=404, detail="Location template not found")
    db.delete(row)
    db.commit()


@router.get("/messages", response_model=list[MessageTemplateResponse])
def list_message_templates(
    db: Session = Depends(get_db),
    _: User = Depends(_HR),
):
    return list(db.scalars(select(MessageTemplate).order_by(MessageTemplate.name)).all())


@router.post("/messages", response_model=MessageTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_message_template(
    body: MessageTemplateCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_HR),
):
    row = MessageTemplate(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/messages/{template_id}", response_model=MessageTemplateResponse)
def update_message_template(
    template_id: uuid.UUID,
    body: MessageTemplateUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_HR),
):
    row = db.get(MessageTemplate, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Message template not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/messages/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(_HR),
):
    row = db.get(MessageTemplate, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Message template not found")
    db.delete(row)
    db.commit()


@router.get("/interviewers", response_model=list[InterviewerNameResponse])
def list_interviewers(
    branch: str | None = Query(None, description="Branch for ADMIN/HO_HR"),
    db: Session = Depends(get_db),
    user: User = Depends(_HR),
):
    branch_loc = _resolve_branch(user, branch)
    return list(
        db.scalars(
            select(InterviewerName)
            .where(InterviewerName.branch_location == branch_loc)
            .order_by(InterviewerName.name)
        ).all()
    )


@router.post("/interviewers", response_model=InterviewerNameResponse, status_code=status.HTTP_201_CREATED)
def create_interviewer(
    body: InterviewerNameCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_HR),
):
    branch_loc = _resolve_branch(user, body.branch_location)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Interviewer name is required.")
    existing = db.scalar(
        select(InterviewerName).where(
            InterviewerName.branch_location == branch_loc,
            func.lower(InterviewerName.name) == name.lower(),
        )
    )
    if existing:
        return existing
    row = InterviewerName(branch_location=branch_loc, name=name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/interviewers/{interviewer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interviewer(
    interviewer_id: uuid.UUID,
    branch: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(_HR),
):
    branch_loc = _resolve_branch(user, branch)
    row = db.get(InterviewerName, interviewer_id)
    if not row or row.branch_location != branch_loc:
        raise HTTPException(status_code=404, detail="Interviewer name not found")
    db.delete(row)
    db.commit()
