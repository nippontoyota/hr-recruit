"""Supabase Storage REST client (service role)."""

from __future__ import annotations

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


class StorageError(Exception):
    pass


def _require_storage_config() -> tuple[str, str, str]:
    base = settings.supabase_url.rstrip("/")
    key = settings.supabase_service_role_key
    bucket = settings.supabase_storage_bucket
    if not base or not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
        )
    return base, key, bucket


def _headers(key: str, *, content_type: str | None = None) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def upload_object(path: str, data: bytes, content_type: str, *, upsert: bool = True) -> None:
    base, key, bucket = _require_storage_config()
    url = f"{base}/storage/v1/object/{bucket}/{path}"
    headers = _headers(key, content_type=content_type)
    if upsert:
        headers["x-upsert"] = "true"
    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, content=data, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage upload failed: {exc}",
        ) from exc
    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage upload failed: {response.status_code} {response.text}",
        )


def delete_object(path: str) -> None:
    """Best-effort delete; ignores missing objects."""
    base, key, bucket = _require_storage_config()
    url = f"{base}/storage/v1/object/{bucket}"
    try:
        with httpx.Client(timeout=30.0) as client:
            client.request(
                "DELETE",
                url,
                headers=_headers(key, content_type="application/json"),
                json={"prefixes": [path]},
            )
    except httpx.HTTPError:
        return


def create_signed_url(path: str, expires_in: int | None = None) -> str:
    base, key, bucket = _require_storage_config()
    expires = expires_in if expires_in is not None else settings.resume_signed_url_expires_seconds
    url = f"{base}/storage/v1/object/sign/{bucket}/{path}"
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                url,
                headers=_headers(key, content_type="application/json"),
                json={"expiresIn": expires},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage sign failed: {exc}",
        ) from exc
    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage sign failed: {response.status_code} {response.text}",
        )
    payload = response.json()
    signed = payload.get("signedURL") or payload.get("signedUrl")
    if not signed:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Storage sign failed: missing signedURL in response",
        )
    if signed.startswith("http"):
        return signed
    return f"{base}/storage/v1{signed}"
