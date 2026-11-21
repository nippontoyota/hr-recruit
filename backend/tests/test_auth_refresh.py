"""Tests for session refresh and token sustaining."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, decode_token_for_refresh
from app.main import app
from app.models.enums import UserRole
from app.models.user import User

client = TestClient(app)


def test_decode_token_for_refresh_valid():
    user_id = uuid4()
    token = create_access_token(
        user_id=user_id,
        email="test@nippon.test",
        role="LOCAL_HR",
    )
    payload = decode_token_for_refresh(token)
    assert payload["sub"] == str(user_id)
    assert payload["email"] == "test@nippon.test"


def test_decode_token_for_refresh_expired_within_grace():
    user_id = uuid4()
    expire = datetime.now(UTC) - timedelta(hours=2)
    payload_data = {
        "sub": str(user_id),
        "email": "expired@nippon.test",
        "role": "LOCAL_HR",
        "exp": expire,
    }
    token = jwt.encode(payload_data, settings.secret_key, algorithm=settings.algorithm)
    # decode_token_for_refresh allows up to 7 days grace
    payload = decode_token_for_refresh(token)
    assert payload["sub"] == str(user_id)


def test_decode_token_for_refresh_expired_beyond_grace():
    user_id = uuid4()
    expire = datetime.now(UTC) - timedelta(days=10)
    payload_data = {
        "sub": str(user_id),
        "email": "old@nippon.test",
        "role": "LOCAL_HR",
        "exp": expire,
    }
    token = jwt.encode(payload_data, settings.secret_key, algorithm=settings.algorithm)
    with pytest.raises(ValueError, match="Token expired beyond refresh window"):
        decode_token_for_refresh(token)


def test_decode_token_for_refresh_invalid_signature():
    token = jwt.encode({"sub": str(uuid4())}, "wrong-secret", algorithm="HS256")
    with pytest.raises(ValueError, match="Invalid token"):
        decode_token_for_refresh(token)


def test_auth_refresh_endpoint_success():
    user_id = uuid4()
    active_user = User(
        id=user_id,
        email="recruiter@nippon.test",
        hashed_password="pw",
        full_name="Recruiter",
        role=UserRole.LOCAL_HR,
        branch_location="Ernakulam",
        is_active=True,
    )

    class MockDB:
        def scalar(self, stmt):
            return active_user

    app.dependency_overrides[get_db] = lambda: MockDB()
    try:
        # Issue a token
        token = create_access_token(
            user_id=user_id,
            email=active_user.email,
            role="LOCAL_HR",
        )
        response = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token"] == data["access_token"]
        assert data["user"]["email"] == active_user.email
        assert "access_token" in response.cookies
    finally:
        app.dependency_overrides.clear()


def test_auth_refresh_endpoint_unauthenticated():
    client.cookies.clear()
    class MockDB:
        def scalar(self, stmt):
            return None

    app.dependency_overrides[get_db] = lambda: MockDB()
    try:
        response = client.post("/api/v1/auth/refresh")
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_auth_refresh_endpoint_inactive_user():
    user_id = uuid4()
    inactive_user = User(
        id=user_id,
        email="inactive@nippon.test",
        hashed_password="pw",
        full_name="Former Recruiter",
        role=UserRole.LOCAL_HR,
        is_active=False,
    )

    class MockDB:
        def scalar(self, stmt):
            return inactive_user

    app.dependency_overrides[get_db] = lambda: MockDB()
    try:
        token = create_access_token(
            user_id=user_id,
            email=inactive_user.email,
            role="LOCAL_HR",
        )
        response = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        assert "Inactive user" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()
