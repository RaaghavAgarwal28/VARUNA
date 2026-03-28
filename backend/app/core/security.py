"""
VARUNA — Security Core Module
================================
Provides JWT authentication, role-based access control, API key validation,
password hashing, and security utilities for the VARUNA API.

Security Layers:
    1. JWT Bearer Token — for user sessions (analyst/admin)
    2. API Key Header — for inter-service communication
    3. Role-Based Access — ADMIN, ANALYST, VIEWER
    4. Rate Limiting — per-endpoint throttling
    5. Audit Logging — all security events recorded
"""
from __future__ import annotations

import hashlib
import time
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, APIKeyHeader
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings


# ── Password Hashing (direct bcrypt) ──
def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

# ── Security Schemes ──
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


# ── Enums ──
class UserRole(str, Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"


# ── Models ──
class TokenPayload(BaseModel):
    sub: str
    role: UserRole
    exp: float
    iat: float
    jti: str  # unique token ID for revocation


class UserInDB(BaseModel):
    username: str
    hashed_password: str
    role: UserRole
    full_name: str
    clearance_level: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str
    username: str


class LoginRequest(BaseModel):
    username: str
    password: str


# ── In-Memory User Store (demo) ──
_users_db: dict[str, UserInDB] = {}
_revoked_tokens: set[str] = set()
_security_events: list[dict] = []


def _init_users():
    """Initialize demo users from config."""
    global _users_db
    _users_db = {
        settings.admin_username: UserInDB(
            username=settings.admin_username,
            hashed_password=_hash_password(settings.admin_password),
            role=UserRole.ADMIN,
            full_name="VARUNA System Administrator",
            clearance_level="TOP SECRET / NATIONAL SECURITY",
        ),
        settings.analyst_username: UserInDB(
            username=settings.analyst_username,
            hashed_password=_hash_password(settings.analyst_password),
            role=UserRole.ANALYST,
            full_name="VARUNA Fraud Analyst",
            clearance_level="SECRET / FINANCIAL",
        ),
        "viewer": UserInDB(
            username="viewer",
            hashed_password=_hash_password("ViewOnly2026"),
            role=UserRole.VIEWER,
            full_name="Dashboard Viewer",
            clearance_level="RESTRICTED",
        ),
    }


_init_users()


# ── Security Event Logger ──

def log_security_event(
    event_type: str,
    username: str = "anonymous",
    ip_address: str = "unknown",
    details: str = "",
    severity: str = "INFO",
):
    """Record a security event for audit trail."""
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "username": username,
        "ip_address": ip_address,
        "details": details,
        "severity": severity,
        "event_hash": hashlib.sha256(
            f"{event_type}:{username}:{time.time()}".encode()
        ).hexdigest()[:16],
    }
    _security_events.append(event)
    # Keep last 500 events
    if len(_security_events) > 500:
        _security_events.pop(0)
    return event


# ── JWT Utilities ──

def create_access_token(username: str, role: UserRole) -> str:
    """Generate a signed JWT access token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_expire_minutes)
    jti = hashlib.sha256(f"{username}:{time.time()}".encode()).hexdigest()[:12]

    payload = {
        "sub": username,
        "role": role.value,
        "exp": expire.timestamp(),
        "iat": now.timestamp(),
        "jti": jti,
        "iss": "varuna-api",
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token


def verify_token(token: str) -> TokenPayload:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        jti = payload.get("jti", "")
        if jti in _revoked_tokens:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
            )
        return TokenPayload(
            sub=payload["sub"],
            role=UserRole(payload["role"]),
            exp=payload["exp"],
            iat=payload["iat"],
            jti=jti,
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def revoke_token(jti: str):
    """Add a token ID to the revocation set."""
    _revoked_tokens.add(jti)


# ── Authentication Functions ──

def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    """Validate credentials against the user store."""
    user = _users_db.get(username)
    if not user:
        return None
    if not _verify_password(password, user.hashed_password):
        return None
    return user


# ── Dependency Injectors ──

def _get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    x_api_key: Optional[str] = Depends(api_key_header),
) -> TokenPayload:
    """
    Authenticate the request via JWT token or API key.
    Returns the token payload for authorized requests.

    Priority:
        1. JWT Bearer token (user sessions)
        2. X-API-Key header (service-to-service)
        3. Bypass for demo mode in development
    """
    ip = _get_client_ip(request)

    # ── Try JWT Bearer ──
    if credentials and credentials.credentials:
        payload = verify_token(credentials.credentials)
        return payload

    # ── Try API Key ──
    if x_api_key and x_api_key == settings.api_key:
        log_security_event("API_KEY_AUTH", "api-service", ip, "Authenticated via API key")
        return TokenPayload(
            sub="api-service",
            role=UserRole.ADMIN,
            exp=(datetime.now(timezone.utc) + timedelta(hours=1)).timestamp(),
            iat=datetime.now(timezone.utc).timestamp(),
            jti="api-key-session",
        )

    # ── Development bypass (only in dev mode) ──
    if settings.environment == "development":
        return TokenPayload(
            sub="dev-user",
            role=UserRole.ADMIN,
            exp=(datetime.now(timezone.utc) + timedelta(hours=8)).timestamp(),
            iat=datetime.now(timezone.utc).timestamp(),
            jti="dev-bypass",
        )

    log_security_event("AUTH_FAILURE", "anonymous", ip, "No valid credentials provided", "WARNING")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a Bearer token or X-API-Key header.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_role(*roles: UserRole):
    """Dependency that enforces role-based access control."""

    async def _check_role(
        request: Request,
        user: TokenPayload = Depends(get_current_user),
    ) -> TokenPayload:
        if user.role not in roles:
            ip = _get_client_ip(request)
            log_security_event(
                "RBAC_DENIED",
                user.sub,
                ip,
                f"Required roles: {[r.value for r in roles]}, has: {user.role.value}",
                "WARNING",
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {[r.value for r in roles]}",
            )
        return user

    return _check_role


# ── Security Metrics ──

def get_security_metrics() -> dict:
    """Return security audit metrics for the dashboard."""
    now = datetime.now(timezone.utc)
    recent_events = [
        e for e in _security_events
        if (now - datetime.fromisoformat(e["timestamp"])).total_seconds() < 3600
    ]

    auth_failures = [e for e in recent_events if e["event_type"] in ("AUTH_FAILURE", "RBAC_DENIED")]
    successful_logins = [e for e in recent_events if e["event_type"] == "LOGIN_SUCCESS"]

    return {
        "total_events": len(_security_events),
        "recent_events_1h": len(recent_events),
        "auth_failures_1h": len(auth_failures),
        "successful_logins_1h": len(successful_logins),
        "revoked_tokens": len(_revoked_tokens),
        "active_users": len(_users_db),
        "security_posture": "ELEVATED" if len(auth_failures) > 5 else "NORMAL",
        "latest_events": _security_events[-10:],
        "encryption": {
            "jwt_algorithm": settings.jwt_algorithm,
            "password_hashing": "bcrypt",
            "audit_hashing": "SHA-256",
            "token_expiry_minutes": settings.jwt_expire_minutes,
        },
    }
