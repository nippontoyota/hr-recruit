import uuid
from unittest.mock import Mock
import pytest
from app.api.v1.auth import login
from app.schemas.auth import LoginRequest
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import hash_password


def test_login_request_normalizes_whitespace_and_casing():
    req = LoginRequest(email="  HR.Admin@nippontoyota.com  ", password="secretpassword")
    assert req.email == "hr.admin@nippontoyota.com"


def test_login_authenticates_with_whitespace_and_casing():
    mock_db = Mock()
    mock_user = User(
        id=uuid.uuid4(),
        email="hr.admin@nippontoyota.com",
        hashed_password=hash_password("secretpassword"),
        full_name="HR Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    mock_db.scalar.return_value = mock_user

    mock_response = Mock()
    req = LoginRequest(email="  HR.Admin@nippontoyota.com  ", password="secretpassword")
    token_response = login(req, mock_response, mock_db)

    assert token_response.user.email == "hr.admin@nippontoyota.com"
    assert token_response.user.role == "ADMIN"
    assert token_response.access_token is not None
