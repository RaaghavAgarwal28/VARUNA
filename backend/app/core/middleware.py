"""
VARUNA — Security Middleware Stack
=====================================
Provides request-level security enforcement:
    1. Rate Limiting (SlowAPI) — per-IP throttling
    2. Request Logging — full audit trail of all API calls
    3. Security Headers — HSTS, CSP, X-Frame-Options
    4. Request ID Injection — unique trace ID per request
"""
from __future__ import annotations

import hashlib
import time
import uuid
from collections import defaultdict

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


# ── Request Audit Log ──
_request_log: list[dict] = []
_ip_request_counts: dict[str, list[float]] = defaultdict(list)

# Rate limit config
RATE_WINDOW = 60  # seconds
RATE_MAX = 120  # max requests per IP per window


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject security headers into every response."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # ── Security Headers ──
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"

        # Content Security Policy
        if settings.environment != "development":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data:; "
                "connect-src 'self'"
            )

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log every request for security audit and attach a unique request ID."""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        # Attach request ID to state for downstream use
        request.state.request_id = request_id

        # Get client IP
        ip = _get_client_ip(request)

        try:
            response: Response = await call_next(request)
        except Exception as exc:
            duration = round((time.time() - start_time) * 1000, 2)
            _log_request(request_id, request.method, str(request.url.path), ip, 500, duration)
            raise exc

        duration = round((time.time() - start_time) * 1000, 2)
        _log_request(request_id, request.method, str(request.url.path), ip, response.status_code, duration)

        # Inject request ID into response
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration}ms"

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter per IP address."""

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ("/api/health", "/docs", "/openapi.json"):
            return await call_next(request)

        ip = _get_client_ip(request)
        now = time.time()

        # Clean old entries
        _ip_request_counts[ip] = [
            t for t in _ip_request_counts[ip]
            if now - t < RATE_WINDOW
        ]

        if len(_ip_request_counts[ip]) >= RATE_MAX:
            from app.core.security import log_security_event
            log_security_event("RATE_LIMIT_EXCEEDED", "unknown", ip, f"Exceeded {RATE_MAX} req/{RATE_WINDOW}s", "WARNING")
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please slow down.",
                    "retry_after": RATE_WINDOW,
                    "limit": f"{RATE_MAX} requests per {RATE_WINDOW} seconds",
                },
                headers={
                    "Retry-After": str(RATE_WINDOW),
                    "X-RateLimit-Limit": str(RATE_MAX),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(now + RATE_WINDOW)),
                },
            )

        _ip_request_counts[ip].append(now)

        response = await call_next(request)

        # Add rate limit headers
        remaining = max(RATE_MAX - len(_ip_request_counts[ip]), 0)
        response.headers["X-RateLimit-Limit"] = str(RATE_MAX)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(now + RATE_WINDOW))

        return response


# ── Helpers ──

def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _log_request(request_id: str, method: str, path: str, ip: str, status_code: int, duration_ms: float):
    """Store request details in the audit log."""
    entry = {
        "request_id": request_id,
        "timestamp": time.time(),
        "method": method,
        "path": path,
        "ip": ip,
        "status_code": status_code,
        "duration_ms": duration_ms,
    }
    _request_log.append(entry)
    # Keep last 1000 entries
    if len(_request_log) > 1000:
        _request_log.pop(0)


def get_request_log() -> list[dict]:
    """Return the request audit log."""
    return _request_log[-50:]


def get_rate_limit_status() -> dict:
    """Return current rate limit status for all tracked IPs."""
    now = time.time()
    active_ips = {}
    for ip, timestamps in _ip_request_counts.items():
        active = [t for t in timestamps if now - t < RATE_WINDOW]
        if active:
            active_ips[ip] = {
                "requests_in_window": len(active),
                "remaining": max(RATE_MAX - len(active), 0),
                "window_seconds": RATE_WINDOW,
                "max_requests": RATE_MAX,
            }
    return active_ips


def register_middleware(app: FastAPI):
    """Register all security middleware in the correct order."""
    # Order matters: outermost middleware runs first
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware)
