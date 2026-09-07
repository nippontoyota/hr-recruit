"""Create a portable PostgreSQL + Supabase Storage backup.

The script is intentionally dependency-free so it can run on a GitHub-hosted
runner without changing the application runtime or enabling paid Supabase
features. It never prints credentials or file contents.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import tarfile
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


PAGE_SIZE = 1000


def _headers(service_role_key: str, *, content_type: str | None = None) -> dict[str, str]:
    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _request_json(
    url: str,
    service_role_key: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
) -> object:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(url, data=body, headers=_headers(service_role_key, content_type="application/json"), method=method)
    try:
        with urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        raise RuntimeError("Supabase Storage request failed.") from exc


def _download(url: str, service_role_key: str) -> bytes:
    request = Request(url, headers=_headers(service_role_key), method="GET")
    try:
        with urlopen(request, timeout=120) as response:
            return response.read()
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError("Supabase Storage download failed.") from exc


def list_storage_objects(base_url: str, service_role_key: str, bucket: str, prefix: str = "") -> list[str]:
    """Recursively list every file path below a Storage prefix."""
    endpoint = f"{base_url.rstrip('/')}/storage/v1/object/list/{bucket}"
    paths: list[str] = []
    offset = 0

    while True:
        entries = _request_json(
            endpoint,
            service_role_key,
            method="POST",
            payload={
                "prefix": prefix,
                "limit": PAGE_SIZE,
                "offset": offset,
                "sortBy": {"column": "name", "order": "asc"},
            },
        )
        if not isinstance(entries, list):
            raise RuntimeError("Supabase Storage returned an invalid object listing.")

        for entry in entries:
            if not isinstance(entry, dict):
                continue
            name = str(entry.get("name") or "").strip()
            if not name:
                continue
            if entry.get("id") is None:
                child_prefix = f"{prefix.rstrip('/')}/{name}/" if prefix else f"{name}/"
                paths.extend(list_storage_objects(base_url, service_role_key, bucket, child_prefix))
            else:
                paths.append(f"{prefix.rstrip('/')}/{name}" if prefix else name)

        if len(entries) < PAGE_SIZE:
            return paths
        offset += PAGE_SIZE


def _safe_storage_path(root: Path, object_path: str) -> Path:
    relative = Path(object_path)
    if relative.is_absolute() or ".." in relative.parts:
        raise RuntimeError("Supabase Storage returned an unsafe object path.")
    destination = (root / relative).resolve()
    root_resolved = root.resolve()
    if destination != root_resolved and root_resolved not in destination.parents:
        raise RuntimeError("Supabase Storage returned an unsafe object path.")
    return destination


def normalize_database_url(database_url: str) -> str:
    """Convert SQLAlchemy's PostgreSQL URL to a pg_dump-compatible URL."""
    return database_url.replace("postgresql+psycopg2://", "postgresql://", 1).replace("postgresql+asyncpg://", "postgresql://", 1)


def build_pg_dump_command(database_url: str, output_path: Path) -> list[str]:
    return [
        "pg_dump",
        normalize_database_url(database_url),
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--file",
        str(output_path),
    ]


def create_backup(output_dir: Path) -> Path:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "candidate-documents").strip()
    if not database_url or not supabase_url or not service_role_key or not bucket:
        raise RuntimeError("DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET are required.")
    if shutil.which("pg_dump") is None:
        raise RuntimeError("pg_dump is required to create a database backup.")

    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    output_dir.mkdir(parents=True, exist_ok=True)
    archive_path = output_dir / f"supabase-backup-{timestamp}.tar.gz"

    with tempfile.TemporaryDirectory(prefix="supabase-backup-") as temporary:
        work_dir = Path(temporary)
        database_dump = work_dir / "database.dump"
        try:
            subprocess.run(
                build_pg_dump_command(database_url, database_dump),
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
            )
        except subprocess.CalledProcessError as exc:
            detail = (exc.stderr or "").replace(database_url, "[redacted]").strip()
            raise RuntimeError(f"PostgreSQL backup failed: {detail[-1000:]}") from exc

        storage_root = work_dir / "storage"
        objects = list_storage_objects(supabase_url, service_role_key, bucket)
        manifest: list[dict[str, int | str]] = []
        for object_path in objects:
            destination = _safe_storage_path(storage_root, object_path)
            destination.parent.mkdir(parents=True, exist_ok=True)
            content = _download(
                f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{object_path}",
                service_role_key,
            )
            destination.write_bytes(content)
            manifest.append({"path": object_path, "size": len(content)})

        (work_dir / "manifest.json").write_text(
            json.dumps({"created_at": timestamp, "bucket": bucket, "objects": manifest}, indent=2),
            encoding="utf-8",
        )
        with tarfile.open(archive_path, "w:gz") as archive:
            archive.add(database_dump, arcname="database.dump")
            archive.add(work_dir / "manifest.json", arcname="manifest.json")
            if storage_root.exists():
                archive.add(storage_root, arcname="storage")

    return archive_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a PostgreSQL and Supabase Storage backup archive.")
    parser.add_argument("--output-dir", type=Path, default=Path("backup"))
    args = parser.parse_args()
    archive_path = create_backup(args.output_dir)
    print(f"Backup created: {archive_path}")


if __name__ == "__main__":
    main()
