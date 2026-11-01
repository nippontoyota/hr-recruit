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


def test_production_app_compresses_large_responses_with_gzip():
    client = TestClient(production_app)
    # Small payloads remain uncompressed to save CPU overhead
    res_small = client.get("/health")
    assert res_small.status_code == 200
    assert res_small.headers.get("content-encoding") is None

    # Payloads >= 1000 bytes receive transparent gzip compression
    @production_app.get("/_test_compression")
    def _test_payload():
        return {"data": "X" * 2000}

    res_large = client.get("/_test_compression")
    assert res_large.status_code == 200
    assert res_large.headers.get("content-encoding") == "gzip"
    assert res_large.json()["data"] == "X" * 2000
