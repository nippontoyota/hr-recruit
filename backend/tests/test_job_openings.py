from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.main import app
from app.models.enums import UserRole
from app.models.job_opening import JobOpening
from app.models.user import User

client = TestClient(app)

VALID = {
    "position": "Sales Executive",
    "department": "Sales",
    "location": "Cochin",
    "headcount": 2,
}


def _user(role: UserRole) -> User:
    return User(
        id=uuid4(),
        email=f"{role.value.lower()}@nippon.test",
        hashed_password="x",
        full_name=role.value,
        role=role,
        is_active=True,
        branch_location="Cochin" if role == UserRole.LOCAL_HR else None,
    )


def _opening(**overrides) -> JobOpening:
    now = datetime.now(timezone.utc)
    row = JobOpening(
        id=uuid4(),
        position=overrides.get("position", "Sales Executive"),
        department=overrides.get("department", "Sales"),
        location=overrides.get("location", "Cochin"),
        headcount=overrides.get("headcount", 2),
        created_by=overrides.get("created_by"),
    )
    row.created_at = now
    row.updated_at = now
    return row


class FakeDB:
    def __init__(self, rows: list[JobOpening] | None = None):
        self.rows = list(rows or [])

    def scalars(self, _stmt):
        ordered = sorted(self.rows, key=lambda row: row.created_at, reverse=True)
        return SimpleNamespace(all=lambda: ordered)

    def get(self, _model, opening_id):
        return next((row for row in self.rows if row.id == opening_id), None)

    def add(self, row):
        self.rows.insert(0, row)

    def delete(self, row):
        self.rows = [item for item in self.rows if item is not row]

    def commit(self):
        return None

    def refresh(self, row):
        if getattr(row, "id", None) is None:
            row.id = uuid4()
        now = datetime.now(timezone.utc)
        if getattr(row, "created_at", None) is None:
            row.created_at = now
        row.updated_at = now


def _override(role: UserRole, db: FakeDB | None = None):
    session = db if db is not None else FakeDB()
    user = _user(role)

    def override_user():
        return user

    def override_db():
        yield session

    app.dependency_overrides[get_current_active_user] = override_user
    app.dependency_overrides[get_db] = override_db


def _clear():
    app.dependency_overrides.clear()


def test_local_hr_lists_openings():
    existing = _opening()
    _override(UserRole.LOCAL_HR, FakeDB([existing]))
    try:
        response = client.get("/api/v1/openings")
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["position"] == "Sales Executive"
        assert body[0]["headcount"] == 2
    finally:
        _clear()


def test_admin_cannot_list_openings():
    _override(UserRole.ADMIN)
    try:
        response = client.get("/api/v1/openings")
        assert response.status_code == 403
    finally:
        _clear()


def test_ho_hr_creates_opening():
    db = FakeDB()
    _override(UserRole.HO_HR, db)
    try:
        response = client.post("/api/v1/openings", json=VALID)
        assert response.status_code == 201
        body = response.json()
        assert body["position"] == "Sales Executive"
        assert body["department"] == "Sales"
        assert body["location"] == "Cochin"
        assert body["headcount"] == 2
        assert len(db.rows) == 1
    finally:
        _clear()


def test_local_hr_cannot_create_opening():
    _override(UserRole.LOCAL_HR)
    try:
        response = client.post("/api/v1/openings", json=VALID)
        assert response.status_code == 403
    finally:
        _clear()


def test_create_rejects_bad_department_and_headcount():
    _override(UserRole.HO_HR)
    try:
        bad_dept = client.post("/api/v1/openings", json={**VALID, "department": "NotADept"})
        assert bad_dept.status_code == 422
        bad_count = client.post("/api/v1/openings", json={**VALID, "headcount": 0})
        assert bad_count.status_code == 422
        bad_loc = client.post("/api/v1/openings", json={**VALID, "location": "Mumbai"})
        assert bad_loc.status_code == 422
    finally:
        _clear()


def test_ho_hr_updates_and_deletes():
    existing = _opening()
    db = FakeDB([existing])
    _override(UserRole.HO_HR, db)
    try:
        updated = client.put(
            f"/api/v1/openings/{existing.id}",
            json={**VALID, "position": "HR Executive", "department": "HR", "headcount": 1},
        )
        assert updated.status_code == 200
        assert updated.json()["position"] == "HR Executive"
        assert updated.json()["headcount"] == 1

        deleted = client.delete(f"/api/v1/openings/{existing.id}")
        assert deleted.status_code == 204
        assert db.rows == []
    finally:
        _clear()


def test_local_hr_cannot_mutate():
    existing = _opening()
    db = FakeDB([existing])
    _override(UserRole.LOCAL_HR, db)
    try:
        updated = client.put(f"/api/v1/openings/{existing.id}", json=VALID)
        assert updated.status_code == 403
        deleted = client.delete(f"/api/v1/openings/{existing.id}")
        assert deleted.status_code == 403
        assert len(db.rows) == 1
    finally:
        _clear()


def test_update_missing_opening_404():
    _override(UserRole.HO_HR, FakeDB())
    try:
        response = client.put(f"/api/v1/openings/{uuid4()}", json=VALID)
        assert response.status_code == 404
    finally:
        _clear()
