"""
Who is calling.

Two modes, chosen by AUTH_MODE:
  dev       Trust `X-Dev-User-Id` / `X-Dev-User-Email` / `X-Dev-User-Name` headers. For Postman and tests.
  supabase  Verify a Supabase access token (Bearer header, or exchanged once for our own cookie).

Either way the result is a `User` row, upserted on first sight so the rest of the app never
has to care where identity came from.
"""
from __future__ import annotations

import hmac
import time
from datetime import datetime, timezone

import jwt
from fastapi import Depends, HTTPException, Request, Response
from jwt import PyJWKClient
from sqlmodel import Session

from app.config import Settings, get_settings
from app.db import get_session
from app.models import User


class Principal:
    def __init__(self, user_id: str, email: str, display_name: str | None = None):
        self.user_id, self.email, self.display_name = user_id, email, display_name


_jwks_client: PyJWKClient | None = None


def _verify_supabase_token(token: str, settings: Settings) -> Principal:
    """Legacy projects sign with a shared HS256 secret; newer ones publish ES256 keys at a JWKS URL."""
    global _jwks_client
    try:
        if settings.supabase_jwt_secret:
            claims = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")
        else:
            if not settings.supabase_url:
                raise HTTPException(500, "SUPABASE_URL or SUPABASE_JWT_SECRET must be set for auth_mode=supabase")
            if _jwks_client is None:
                _jwks_client = PyJWKClient(f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json", cache_keys=True)
            key = _jwks_client.get_signing_key_from_jwt(token).key
            claims = jwt.decode(token, key, algorithms=["ES256", "RS256"], audience="authenticated")
    except jwt.PyJWTError as e:
        raise HTTPException(401, f"Invalid Supabase token: {e}") from e
    meta = claims.get("user_metadata") or {}
    return Principal(claims["sub"], claims.get("email") or f"{claims['sub']}@unknown", meta.get("display_name") or meta.get("full_name"))


# ── our own session cookie ──
def mint_session(principal: Principal, settings: Settings) -> str:
    now = int(time.time())
    return jwt.encode(
        {"sub": principal.user_id, "email": principal.email, "name": principal.display_name,
         "iat": now, "exp": now + settings.session_ttl_hours * 3600},
        settings.session_secret, algorithm="HS256",
    )


def read_session(token: str, settings: Settings) -> Principal:
    try:
        c = jwt.decode(token, settings.session_secret, algorithms=["HS256"])
    except jwt.PyJWTError as e:
        raise HTTPException(401, f"Invalid session: {e}") from e
    return Principal(c["sub"], c["email"], c.get("name"))


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        settings.cookie_name, token, httponly=True, secure=settings.cookie_secure,
        samesite=settings.cookie_samesite, max_age=settings.session_ttl_hours * 3600, path="/",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(settings.cookie_name, path="/")


# ── resolution ──
def _principal_from_request(request: Request, settings: Settings) -> Principal:
    # 1. our cookie (set by /auth/session or /auth/dev-login) — works for EventSource too
    cookie = request.cookies.get(settings.cookie_name)
    if cookie:
        return read_session(cookie, settings)
    # 2. ?token= for SSE clients that cannot set headers and have no cookie
    qtoken = request.query_params.get("token")
    if qtoken:
        return read_session(qtoken, settings)
    # 3. dev headers
    if settings.auth_mode == "dev":
        uid = request.headers.get("x-dev-user-id")
        if uid:
            return Principal(uid, request.headers.get("x-dev-user-email") or f"{uid}@dev.local",
                             request.headers.get("x-dev-user-name") or uid)
    # 4. Supabase bearer token
    authz = request.headers.get("authorization", "")
    if authz.lower().startswith("bearer "):
        token = authz[7:].strip()
        if settings.auth_mode == "supabase":
            return _verify_supabase_token(token, settings)
        return read_session(token, settings)
    raise HTTPException(401, "Not signed in")


def upsert_user(session: Session, p: Principal) -> User:
    user = session.get(User, p.user_id)
    if user is None:
        user = User(id=p.user_id, email=p.email, display_name=p.display_name or p.email.split("@")[0])
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


def current_user(
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User:
    return upsert_user(session, _principal_from_request(request, settings))


def require_admin(request: Request, settings: Settings = Depends(get_settings)) -> None:
    if not hmac.compare_digest(request.headers.get("x-admin-token", ""), settings.admin_token):
        raise HTTPException(403, "Admin token required")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
