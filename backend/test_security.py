"""Quick security layer validation."""
from app.core.config import settings
print(f"[1] Config loaded: env={settings.environment}, jwt={settings.jwt_algorithm}")

from app.core.security import (
    authenticate_user, create_access_token, verify_token,
    get_security_metrics, log_security_event, UserRole,
)

# Test password hashing & auth
user = authenticate_user("viewer", "ViewOnly2026")
assert user is not None, "viewer auth failed"
print(f"[2] Auth OK: {user.username} role={user.role.value}")

# Test JWT creation & verification
token = create_access_token(user.username, user.role)
print(f"[3] Token created: {token[:50]}...")

payload = verify_token(token)
print(f"[4] Token verified: sub={payload.sub}, role={payload.role}, jti={payload.jti}")

# Test admin auth (password has special chars)
admin = authenticate_user(settings.admin_username, settings.admin_password)
assert admin is not None, "admin auth failed"
print(f"[5] Admin auth OK: {admin.username} role={admin.role.value} clearance={admin.clearance_level}")

# Test security event logging
evt = log_security_event("TEST_EVENT", "test-user", "127.0.0.1", "Validation test")
print(f"[6] Security event logged: {evt['event_hash']}")

# Test metrics
metrics = get_security_metrics()
print(f"[7] Security metrics: {metrics['active_users']} users, posture={metrics['security_posture']}")
print(f"    Encryption: {metrics['encryption']}")

# Test wrong password rejection
bad = authenticate_user("viewer", "wrong-password")
assert bad is None, "should reject wrong password"
print(f"[8] Bad password correctly rejected")

# Test app import
from app.main import app
print(f"[9] FastAPI app loaded: {app.title} v{app.version}")

routes = [r.path for r in app.routes if hasattr(r, 'path')]
auth_routes = [r for r in routes if '/auth' in r]
print(f"[10] Total routes: {len(routes)}, Auth routes: {auth_routes}")

print("\n✅ ALL SECURITY TESTS PASSED")
