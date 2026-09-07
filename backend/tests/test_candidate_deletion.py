import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.services.candidate_service import _candidate_storage_paths, delete_candidates
from app.models.enums import UserRole


def test_candidate_storage_paths_include_orphaned_prefix_files_and_profile_refs():
    candidate_id = uuid4()
    profile = SimpleNamespace(
        photo_url=f"candidates/{candidate_id}/photo.png",
        raw_data={"resumeFileObject": f"candidates/{candidate_id}/legacy.pdf"},
    )
    db = MagicMock()
    db.scalars.return_value.all.return_value = [f"candidates/{candidate_id}/resume.pdf"]
    db.scalar.return_value = profile

    with patch(
        "app.services.candidate_service.storage.list_objects",
        return_value=[f"candidates/{candidate_id}/orphaned.pdf"],
    ):
        paths = _candidate_storage_paths(db, [SimpleNamespace(id=candidate_id)])

    assert paths == sorted(
        [
            f"candidates/{candidate_id}/legacy.pdf",
            f"candidates/{candidate_id}/orphaned.pdf",
            f"candidates/{candidate_id}/photo.png",
            f"candidates/{candidate_id}/resume.pdf",
        ]
    )


def test_delete_candidates_deletes_storage_before_database_commit():
    candidate_id = uuid4()
    candidate = SimpleNamespace(id=candidate_id)
    user = SimpleNamespace(id=uuid4(), role=UserRole.ADMIN)
    db = MagicMock()
    db.scalars.return_value.all.return_value = [candidate]
    db.scalar.return_value = None

    with (
        patch("app.services.candidate_service.assert_candidate_access"),
        patch("app.services.candidate_service.assert_local_hr_can_mutate"),
        patch(
            "app.services.candidate_service._candidate_storage_paths",
            return_value=[f"candidates/{candidate_id}/resume.pdf", f"candidates/{candidate_id}/photo.png"],
        ),
        patch("app.services.candidate_service.storage.delete_objects_strict") as delete_files,
        patch("app.services.candidate_service._delete_candidate_rows") as delete_rows,
    ):
        result = asyncio.run(delete_candidates(db, [candidate_id], user))

    assert result == {
        "status": "success",
        "deleted_count": 1,
        "success_count": 1,
        "failed_ids": [],
    }
    delete_files.assert_called_once()
    delete_rows.assert_called_once_with(db, [candidate_id])
    assert db.commit.called
    assert delete_files.call_args_list[0] is not None


def test_delete_candidates_does_not_commit_when_storage_cleanup_fails():
    candidate_id = uuid4()
    candidate = SimpleNamespace(id=candidate_id)
    user = SimpleNamespace(id=uuid4(), role=UserRole.ADMIN)
    db = MagicMock()
    db.scalars.return_value.all.return_value = [candidate]

    with (
        patch("app.services.candidate_service.assert_candidate_access"),
        patch("app.services.candidate_service.assert_local_hr_can_mutate"),
        patch("app.services.candidate_service._candidate_storage_paths", return_value=["candidates/file.pdf"]),
        patch(
            "app.services.candidate_service.storage.delete_objects_strict",
            side_effect=RuntimeError("storage unavailable"),
        ),
    ):
        with pytest.raises(RuntimeError, match="storage unavailable"):
            asyncio.run(delete_candidates(db, [candidate_id], user))

    db.commit.assert_not_called()
