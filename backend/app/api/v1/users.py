from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import UserOut, UserCreate, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN))
):
    users = db.scalars(select(User).where(User.is_active == True).order_by(User.created_at.desc())).all()
    return [UserOut.from_user(u) for u in users]

@router.get("/interviewers", response_model=list[UserOut])
def list_interviewers(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HO_HR, UserRole.LOCAL_HR))
):
    users = db.scalars(select(User).where(User.is_active == True).order_by(User.full_name.asc())).all()
    out = []
    for u in users:
        uo = UserOut.from_user(u)
        uo.email = "redacted@example.com"  # Redact PII
        out.append(uo)
    return out

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN))
):
    existing = db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if body.role == UserRole.HO_HR:
        ho_hr_count = db.scalar(select(func.count(User.id)).where(User.role == UserRole.HO_HR))
        if ho_hr_count > 0:
            raise HTTPException(status_code=400, detail="Only one Head Office HR account is allowed")
    elif body.role == UserRole.LOCAL_HR:
        if not body.branch_location:
            raise HTTPException(status_code=400, detail="Branch location is required for Local HR")
        local_hr_count = db.scalar(
            select(func.count(User.id))
            .where(User.role == UserRole.LOCAL_HR, User.branch_location == body.branch_location)
        )
        if local_hr_count > 0:
            raise HTTPException(status_code=400, detail=f"A Local HR account already exists for {body.branch_location}")

    new_user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=body.role,
        branch_location=body.branch_location,
        department=body.department,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserOut.from_user(new_user)

@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN))
):
    found = db.scalar(select(User).where(User.id == user_id))
    if not found:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.from_user(found)

@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN))
):
    found = db.scalar(select(User).where(User.id == user_id))
    if not found:
        raise HTTPException(status_code=404, detail="User not found")

    new_role = body.role if body.role is not None else found.role
    new_branch = body.branch_location if body.branch_location is not None else found.branch_location

    if (body.role is not None and body.role != found.role) or (body.branch_location is not None and body.branch_location != found.branch_location):
        if new_role == UserRole.HO_HR:
            ho_hr_count = db.scalar(select(func.count(User.id)).where(User.role == UserRole.HO_HR, User.id != user_id))
            if ho_hr_count > 0:
                raise HTTPException(status_code=400, detail="Only one Head Office HR account is allowed")
        elif new_role == UserRole.LOCAL_HR:
            if not new_branch:
                raise HTTPException(status_code=400, detail="Branch location is required for Local HR")
            local_hr_count = db.scalar(
                select(func.count(User.id))
                .where(User.role == UserRole.LOCAL_HR, User.branch_location == new_branch, User.id != user_id)
            )
            if local_hr_count > 0:
                raise HTTPException(status_code=400, detail=f"A Local HR account already exists for {new_branch}")

    if body.full_name is not None:
        found.full_name = body.full_name
    if body.role is not None:
        found.role = body.role
    if body.branch_location is not None:
        found.branch_location = body.branch_location
    if body.department is not None:
        found.department = body.department
    if body.password is not None:
        found.hashed_password = hash_password(body.password)

    db.commit()
    db.refresh(found)
    return UserOut.from_user(found)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN))
):
    if user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    found = db.scalar(select(User).where(User.id == user_id))
    if not found or not found.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    # Soft delete to preserve integrity of historical records (interviews, logs)
    found.is_active = False
    
    # Append unique hash to email to free up the original email for reuse
    import uuid
    found.email = f"{found.email}_deleted_{uuid.uuid4().hex[:8]}"

    db.commit()
