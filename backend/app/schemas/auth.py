from typing import Annotated
from uuid import UUID

from email_validator import EmailNotValidError, validate_email
import pydantic
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator, EmailStr

from app.core.compat import role_for_frontend
from app.models.enums import UserRole
from app.models.user import User


def _normalize_email(value: str) -> str:
    try:
        result = validate_email(value, check_deliverability=False, test_environment=True)
    except EmailNotValidError as exc:
        raise ValueError(str(exc)) from exc
    return result.normalized.lower()


EmailAddress = Annotated[str, AfterValidator(_normalize_email)]


class LoginRequest(BaseModel):
    email: EmailAddress
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    role: str
    branch_location: str | None = None

    department: str | None = None

    @classmethod
    def from_user(cls, user: User) -> "UserOut":
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=role_for_frontend(user.role),
            branch_location=user.branch_location,
            department=user.department,
        )

    @field_validator("role", mode="before")
    @classmethod
    def _map_role(cls, value: object) -> str:
        if isinstance(value, UserRole):
            try:
                return role_for_frontend(value)
            except KeyError:
                return value.value
        if isinstance(value, str):
            try:
                return role_for_frontend(UserRole(value))
            except (ValueError, KeyError):
                return value
        raise ValueError("Invalid role")


class UserCreate(BaseModel):
    email: EmailAddress
    full_name: str
    password: str = Field(min_length=1)
    role: UserRole
    branch_location: str | None = None
    department: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    branch_location: str | None = None
    department: str | None = None
    password: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token: str
    token_type: str = "bearer"
    user: UserOut
