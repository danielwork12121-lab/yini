from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session

from app.auth import (Principal, _verify_supabase_token, clear_session_cookie, current_user,
                      mint_session, set_session_cookie, upsert_user)
from app.config import Settings, get_settings
from app.db import get_session
from app.models import User
from app.schemas import DevLoginIn, SessionIn, UpdateMeIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session", response_model=UserOut, summary="Exchange a Supabase access token for a Corner session cookie")
def create_session(body: SessionIn, response: Response, session: Session = Depends(get_session), settings: Settings = Depends(get_settings)):
    if settings.auth_mode != "supabase":
        raise HTTPException(400, "AUTH_MODE is not 'supabase'; use /auth/dev-login")
    p = _verify_supabase_token(body.access_token, settings)
    user = upsert_user(session, p)
    set_session_cookie(response, mint_session(p, settings), settings)
    return user


@router.post("/dev-login", response_model=UserOut, summary="[dev only] Create/sign in a fake user and set the cookie")
def dev_login(body: DevLoginIn, response: Response, session: Session = Depends(get_session), settings: Settings = Depends(get_settings)):
    if settings.auth_mode != "dev":
        raise HTTPException(404, "Not available")
    p = Principal(body.user_id, body.email, body.display_name)
    user = upsert_user(session, p)
    if user.timezone != body.timezone:
        user.timezone = body.timezone
        session.add(user); session.commit(); session.refresh(user)
    set_session_cookie(response, mint_session(p, settings), settings)
    return user


@router.post("/logout", status_code=204)
def logout(response: Response, settings: Settings = Depends(get_settings)):
    clear_session_cookie(response, settings)
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(body: UpdateMeIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    if body.display_name:
        user.display_name = body.display_name
    if body.timezone:
        from zoneinfo import ZoneInfo
        try:
            ZoneInfo(body.timezone)
        except Exception:
            raise HTTPException(422, "Unknown timezone")
        user.timezone = body.timezone
    session.add(user); session.commit(); session.refresh(user)
    return user
