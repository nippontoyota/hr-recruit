from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(
    *,
    user_id: UUID,
    email: str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    expire = datetime.now(UTC) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def decode_token_for_refresh(token: str, max_expired_seconds: int = 7 * 86400) -> dict[str, Any]:
    """Decode a token for session refresh, allowing a grace window after expiration.

    Signature verification is always strictly enforced.
    """
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except jwt.ExpiredSignatureError:
        try:
            payload = jwt.decode(
                token,
                settings.secret_key,
                algorithms=[settings.algorithm],
                options={"verify_exp": False},
            )
        except JWTError as exc:
            raise ValueError("Invalid token") from exc
        exp = payload.get("exp")
        now = datetime.now(UTC).timestamp()
        if exp is not None and (now - exp) > max_expired_seconds:
            raise ValueError("Token expired beyond refresh window")
        return payload
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def generate_secure_token() -> str:
    """Create a URL-safe token with 32 bytes of entropy."""
    import secrets

    return secrets.token_urlsafe(32)
