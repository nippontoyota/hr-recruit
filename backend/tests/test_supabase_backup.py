from pathlib import Path

import pytest

from scripts.backup_supabase import (
    _safe_storage_path,
    build_pg_dump_command,
    normalize_database_url,
)


def test_normalize_database_url_for_pg_dump():
    assert normalize_database_url("postgresql+psycopg2://user:pass@db.example/app") == (
        "postgresql://user:pass@db.example/app"
    )


def test_pg_dump_command_does_not_use_plain_sql_or_owner_options(tmp_path: Path):
    command = build_pg_dump_command("postgresql://user:pass@db.example/app", tmp_path / "database.dump")
    assert command[0] == "pg_dump"
    assert "--format=custom" in command
    assert "--no-owner" in command
    assert "--no-privileges" in command
    assert "--no-password" in command
    assert str(tmp_path / "database.dump") in command


def test_storage_path_rejects_traversal(tmp_path: Path):
    with pytest.raises(RuntimeError, match="unsafe"):
        _safe_storage_path(tmp_path, "../../outside.txt")


def test_storage_path_stays_inside_backup_root(tmp_path: Path):
    destination = _safe_storage_path(tmp_path, "candidates/example/resume.pdf")
    assert destination == (tmp_path / "candidates/example/resume.pdf").resolve()
