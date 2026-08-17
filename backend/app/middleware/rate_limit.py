from collections import defaultdict, deque
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


def public_rate_bucket(path: str) -> str | None:
    if path.endswith("/auth/login"):
        return "auth/login"
    if "/candidates/public" in path:
        return "candidates/public"
    if "/candidates/portal/" in path:
        return "candidates/portal"
    if "/evaluations/public/" in path:
        return "evaluations/public"
    if "/auth/users/" in path and path.endswith("/public"):
        return "auth/public-user"
    return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter for auth and public candidate endpoints."""

    def __init__(self, app, *, limit: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _should_limit(self, path: str) -> bool:
        return public_rate_bucket(path) is not None

    def _client_key(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

    def _allow(self, key: str) -> bool:
        now = time.monotonic()
        bucket = self._hits[key]
        while bucket and now - bucket[0] > self.window_seconds:
            bucket.popleft()
        if len(bucket) >= self.limit:
            return False
        bucket.append(now)
        return True

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or not self._should_limit(request.url.path):
            return await call_next(request)

        key = f"{self._client_key(request)}:{public_rate_bucket(request.url.path)}"
        if not self._allow(key):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Try again later."},
            )
        return await call_next(request)
