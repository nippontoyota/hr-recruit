"""Supabase Storage REST client (service role)."""

from __future__ import annotations

import time
from urllib.parse import parse_qs, urljoin, urlparse

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

_client: httpx.Client | None = None
_signed_url_cache: dict[str, tuple[str, float]] = {}


def _get_client() -> httpx.Client:
    global _client
    if _client is None:
        _client = httpx.Client(timeout=8.0)
    return _client


def _require_storage_config() -> tuple[str, str, str]:
    base = settings.supabase_url.rstrip("/")
    key = settings.supabase_service_role_key
    bucket = settings.supabase_storage_bucket
    if not base or not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Storage is not configured.",
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


def _storage_failure(action: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Storage {action} failed.",
    )


def upload_object(path: str, data: bytes, content_type: str, *, upsert: bool = True) -> None:
    base, key, bucket = _require_storage_config()
    url = f"{base}/storage/v1/object/{bucket}/{path}"
    headers = _headers(key, content_type=content_type)
    if upsert:
        headers["x-upsert"] = "true"
    try:
        response = _get_client().post(url, content=data, headers=headers)
    except httpx.HTTPError as exc:
        raise _storage_failure("upload") from exc
    if response.status_code >= 400:
        raise _storage_failure("upload")


def create_signed_upload_url(path: str) -> dict[str, str]:
    """Create a short-lived Supabase signed upload URL for browser uploads."""
    base, key, bucket = _require_storage_config()
    url = f"{base}/storage/v1/object/upload/sign/{bucket}/{path}"
    try:
        response = _get_client().post(url, json={}, headers=_headers(key))
    except httpx.HTTPError as exc:
        raise _storage_failure("sign upload") from exc
    if response.status_code >= 400:
        raise _storage_failure("sign upload")
    payload = response.json()
    relative_url = payload.get("url")
    if not relative_url:
        raise _storage_failure("sign upload")
    signed_url = urljoin(f"{base}/", str(relative_url).lstrip("/"))
    token = parse_qs(urlparse(signed_url).query).get("token", [""])[0]
    if not token:
        raise _storage_failure("sign upload")
    return {"signed_url": signed_url, "token": token}


def object_exists(path: str) -> bool:
    """Verify that a browser upload reached Storage before recording it."""
    base, key, bucket = _require_storage_config()
    url = f"{base}/storage/v1/object/{bucket}/{path}"
    try:
        response = _get_client().head(url, headers=_headers(key))
    except httpx.HTTPError as exc:
        raise _storage_failure("verify upload") from exc
    if response.status_code == 404:
        return False
    if response.status_code >= 400:
        raise _storage_failure("verify upload")
    return True


def delete_object(path: str) -> None:
    """Best-effort delete; ignores failures."""
    delete_objects([path])


def delete_objects(paths: list[str]) -> None:
    """Best-effort bulk delete; ignores failures."""
    if not paths:
        return
    try:
        base, key, bucket = _require_storage_config()
    except HTTPException:
        return
    url = f"{base}/storage/v1/object/{bucket}"
    try:
        _get_client().request(
            "DELETE",
            url,
            headers=_headers(key, content_type="application/json"),
            json={"prefixes": paths},
        )
    except httpx.HTTPError:
        return


def download_object(path: str) -> tuple[bytes, str | None]:
    """Fetch object bytes via service role (avoids signed-URL round trip)."""
    base, key, bucket = _require_storage_config()
    url = f"{base}/storage/v1/object/{bucket}/{path}"
    try:
        response = _get_client().get(url, headers=_headers(key))
    except httpx.HTTPError as exc:
        raise _storage_failure("download") from exc
    if response.status_code >= 400:
        raise _storage_failure("download")
    return response.content, response.headers.get("content-type")


def create_signed_url(path: str, expires_in: int | None = None) -> str:
    expires = expires_in if expires_in is not None else settings.resume_signed_url_expires_seconds
    cached = _signed_url_cache.get(path)
    if cached:
        signed, until = cached
        if until > time.monotonic() + 30:
            return signed

    base, key, bucket = _require_storage_config()
    url = f"{base}/storage/v1/object/sign/{bucket}/{path}"
    try:
        response = _get_client().post(
            url,
            headers=_headers(key, content_type="application/json"),
            json={"expiresIn": expires},
        )
    except httpx.HTTPError as exc:
        raise _storage_failure("sign") from exc
    if response.status_code >= 400:
        raise _storage_failure("sign")
    payload = response.json()
    signed = payload.get("signedURL") or payload.get("signedUrl")
    if not signed:
        raise _storage_failure("sign")
    if not signed.startswith("http"):
        signed = f"{base}/storage/v1{signed}"
    _signed_url_cache[path] = (signed, time.monotonic() + max(expires - 60, 60))
    return signed
