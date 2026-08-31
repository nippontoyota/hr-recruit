from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.api.v1.auth import login
from app.schemas.auth import LoginRequest


def test_login_returns_clear_error_when_database_is_unavailable():
    database = Mock()
    database.scalar.side_effect = OperationalError("select", {}, Exception("offline"))

    with pytest.raises(HTTPException) as error:
        login(LoginRequest(email="hq@example.com", password="password123"), database)

    assert error.value.status_code == 503
    assert "database is temporarily unavailable" in error.value.detail
