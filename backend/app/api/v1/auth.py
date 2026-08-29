from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.compat import role_for_frontend
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    frontend_role = role_for_frontend(user.role)
    token = create_access_token(
        user_id=user.id,
        email=user.email,
        role=frontend_role,
    )
    
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.access_token_expire_minutes * 60,
    )
    
    user_out = UserOut.from_user(user)
    return TokenResponse(access_token=token, token=token, user=user_out)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_active_user)) -> UserOut:
    return UserOut.from_user(user)


from uuid import UUID
from app.models.enums import UserRole


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response) -> dict[str, str]:
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
    )
    return {"detail": "Logged out"}


@router.get("/users/{id}/public", response_model=dict)
def get_user_public(id: UUID, db: Session = Depends(get_db)):
    user = db.get(User, id)
    if not user or not user.is_active or user.role != UserRole.LOCAL_HR:
        raise HTTPException(status_code=404, detail="HR recruiter not found")
    return {"full_name": user.full_name, "branch_location": user.branch_location}

