from typing import Annotated
from uuid import UUID

from email_validator import EmailNotValidError, validate_email
from pydantic import AfterValidator, BaseModel, ConfigDict, Field

from app.models.enums import UserRole


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
    email: EmailAddress
    full_name: str
    role: UserRole
    branch_location: str | None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
