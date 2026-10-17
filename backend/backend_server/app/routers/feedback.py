from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth import current_user
from app.db import get_session
from app.models import Feedback, User
from app.schemas import FeedbackOut

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("/latest", response_model=FeedbackOut, summary="The most recent feedback written for me")
def latest(user: User = Depends(current_user), session: Session = Depends(get_session)):
    fb = session.exec(select(Feedback).where(Feedback.user_id == user.id).order_by(Feedback.day.desc()).limit(1)).first()  # type: ignore[attr-defined]
    if not fb:
        raise HTTPException(404, "No feedback yet")
    return fb


@router.get("", response_model=list[FeedbackOut], summary="My feedback history, newest first")
def history(limit: int = Query(14, ge=1, le=90), user: User = Depends(current_user), session: Session = Depends(get_session)):
    return session.exec(select(Feedback).where(Feedback.user_id == user.id).order_by(Feedback.day.desc()).limit(limit)).all()  # type: ignore[attr-defined]


@router.get("/{day}", response_model=FeedbackOut)
def for_day(day: date, user: User = Depends(current_user), session: Session = Depends(get_session)):
    fb = session.exec(select(Feedback).where(Feedback.user_id == user.id, Feedback.day == day)).first()
    if not fb:
        raise HTTPException(404, "No feedback for that day")
    return fb
