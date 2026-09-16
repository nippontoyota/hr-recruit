"""Low-overhead request duration instrumentation."""

from __future__ import annotations

from time import perf_counter

from starlette.types import ASGIApp, Message, Receive, Scope, Send


class ServerTimingMiddleware:
    """Append application handling time to each HTTP response.

    This is deliberately pure ASGI rather than ``BaseHTTPMiddleware`` so it does
    not add task or response-buffering overhead to latency-sensitive endpoints.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started = perf_counter()

        async def send_timed(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                duration_ms = (perf_counter() - started) * 1000
                headers.append((b"server-timing", f"app;dur={duration_ms:.1f}".encode("ascii")))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_timed)
