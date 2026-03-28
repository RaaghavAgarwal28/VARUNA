"""
VARUNA — Authentication & Security API Routes
================================================
Provides endpoints for:
    - POST /auth/login          → Authenticate and receive JWT token
    - POST /auth/logout         → Revoke current token
    - GET  /auth/me             → Current user profile
    - GET  /auth/security-status → Security dashboard metrics
    - GET  /auth/audit-log      → Request audit trail
    - GET  /auth/rate-limits    → Current rate limit status
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import (
    LoginRequest,
    TokenPayload,
    TokenResponse,
    UserRole,
    authenticate_user,
    create_access_token,
    get_current_user,
    get_security_metrics,
    log_security_event,
    require_role,
    revoke_token,
)
from app.core.middleware import get_request_log, get_rate_limit_status


auth_router = APIRouter(prefix="/auth", tags=["Authentication"])


@auth_router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request):
    """
    Authenticate with username/password and receive a JWT access token.

    Demo credentials:
    - Admin: varuna_admin / DevHouse2026$ecure
    - Analyst: analyst / Analyst2026$ecure
    - Viewer: viewer / ViewOnly2026
    """
    ip = request.client.host if request.client else "unknown"

    user = authenticate_user(payload.username, payload.password)
    if not user:
        log_security_event(
            "LOGIN_FAILURE",
            payload.username,
            ip,
            "Invalid credentials",
            "WARNING",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.username, user.role)

    log_security_event(
        "LOGIN_SUCCESS",
        user.username,
        ip,
        f"Role: {user.role.value}, Clearance: {user.clearance_level}",
    )

    return TokenResponse(
        access_token=token,
        expires_in=3600,
        role=user.role.value,
        username=user.username,
    )


@auth_router.post("/logout")
async def logout(
    request: Request,
    user: TokenPayload = Depends(get_current_user),
):
    """Revoke the current JWT token."""
    ip = request.client.host if request.client else "unknown"
    revoke_token(user.jti)
    log_security_event("LOGOUT", user.sub, ip, f"Token {user.jti} revoked")
    return {"status": "logged_out", "message": "Token has been revoked"}


@auth_router.get("/me")
async def get_profile(user: TokenPayload = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return {
        "username": user.sub,
        "role": user.role.value,
        "token_id": user.jti,
        "issued_at": user.iat,
        "expires_at": user.exp,
        "permissions": _role_permissions(user.role),
    }


@auth_router.get("/security-status")
async def security_status(
    user: TokenPayload = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
):
    """
    Return comprehensive security metrics for the dashboard.
    Requires ADMIN or ANALYST role.
    """
    metrics = get_security_metrics()
    metrics["rate_limits"] = get_rate_limit_status()
    return metrics


@auth_router.get("/audit-log")
async def audit_log(
    user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
):
    """
    Return the request audit trail. Requires ADMIN role.
    """
    return {
        "entries": get_request_log(),
        "total": len(get_request_log()),
        "viewer": user.sub,
    }


@auth_router.get("/rate-limits")
async def rate_limits(
    user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
):
    """Return current rate limit status per IP. Requires ADMIN role."""
    return get_rate_limit_status()


# ── Helpers ──

def _role_permissions(role: UserRole) -> list[str]:
    """Map role to permission list."""
    base = ["dashboard:read", "graph:read", "timeline:read", "events:read"]
    if role in (UserRole.ANALYST, UserRole.ADMIN):
        base += [
            "accounts:analyze",
            "chains:trace",
            "flags:inspect",
            "models:view",
            "security:view",
            "audit:read",
        ]
    if role == UserRole.ADMIN:
        base += [
            "accounts:freeze",
            "fraud:inject",
            "demo:reset",
            "security:manage",
            "audit:manage",
            "rate_limits:view",
        ]
    return base
