from fastapi import FastAPI, Response
from fastapi.testclient import TestClient

from app.main import app as production_app
from app.middleware.server_timing import ServerTimingMiddleware


def test_server_timing_adds_non_negative_duration_header():
    app = FastAPI()
    app.add_middleware(ServerTimingMiddleware)

    @app.get("/ok")
    def ok():
        return {"ok": True}

    response = TestClient(app).get("/ok")

    assert response.status_code == 200
    assert float(response.headers["server-timing"].split("dur=")[1]) >= 0


def test_server_timing_preserves_application_headers():
    app = FastAPI()
    app.add_middleware(ServerTimingMiddleware)

    @app.get("/created")
    def created(response: Response):
        response.headers["X-Trace"] = "preserved"
        return {"ok": True}

    response = TestClient(app).get("/created")

    assert response.status_code == 200
    assert response.headers["x-trace"] == "preserved"


def test_production_app_exposes_server_timing_on_health_check():
    response = TestClient(production_app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert float(response.headers["server-timing"].split("dur=")[1]) >= 0
