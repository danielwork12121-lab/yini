from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth import current_user
from app.db import get_session
from app.models import AnalysisRun, DiaryEntry, User, utcnow
from app.routers.pairs import pair_for
from app.schemas import DiaryOut, DiaryUpsertIn

router = APIRouter(prefix="/diary", tags=["diary"])


def local_today(user: User) -> date:
    return datetime.now(ZoneInfo(user.timezone)).date()


def _analyzed(session: Session, pair_id: str, day: date) -> bool:
    run = session.exec(select(AnalysisRun).where(AnalysisRun.pair_id == pair_id, AnalysisRun.day == day, AnalysisRun.status == "done")).first()
    return run is not None


def _out(session: Session, e: DiaryEntry) -> DiaryOut:
    return DiaryOut(day=e.day, text=e.raw_text, mood=e.mood, ai_summary=e.ai_summary,
                    analyzed=_analyzed(session, e.pair_id, e.day), updated_at=e.updated_at)


def _upsert(session: Session, user: User, body: DiaryUpsertIn, day: date) -> DiaryEntry:
    pair = pair_for(session, user.id)
    if not pair:
        raise HTTPException(409, "Join or create a pair before writing")
    if day > local_today(user):
        raise HTTPException(422, "Cannot write an entry for a future day")
    if _analyzed(session, pair.id, day):
        raise HTTPException(409, "That day has already been analysed; it can no longer be edited")
    e = session.exec(select(DiaryEntry).where(DiaryEntry.user_id == user.id, DiaryEntry.day == day)).first()
    if e is None:
        e = DiaryEntry(user_id=user.id, pair_id=pair.id, day=day, raw_text=body.text, mood=body.mood)
    else:
        e.raw_text, e.mood, e.updated_at = body.text, body.mood, utcnow()
    session.add(e); session.commit(); session.refresh(e)
    return e


@router.post("", response_model=DiaryOut, summary="Write or update today's entry (or `day` if given)")
def write_entry(body: DiaryUpsertIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    return _out(session, _upsert(session, user, body, body.day or local_today(user)))


@router.put("/{day}", response_model=DiaryOut, summary="Write or update the entry for a specific day")
def put_entry(day: date, body: DiaryUpsertIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    return _out(session, _upsert(session, user, body, day))


@router.get("", response_model=list[DiaryOut], summary="My recent entries, newest first")
def list_entries(limit: int = Query(14, ge=1, le=90), user: User = Depends(current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(DiaryEntry).where(DiaryEntry.user_id == user.id).order_by(DiaryEntry.day.desc()).limit(limit)).all()  # type: ignore[attr-defined]
    return [_out(session, e) for e in rows]


@router.get("/today", response_model=DiaryOut)
def today_entry(user: User = Depends(current_user), session: Session = Depends(get_session)):
    return get_entry(local_today(user), user, session)


@router.get("/{day}", response_model=DiaryOut)
def get_entry(day: date, user: User = Depends(current_user), session: Session = Depends(get_session)):
    e = session.exec(select(DiaryEntry).where(DiaryEntry.user_id == user.id, DiaryEntry.day == day)).first()
    if not e:
        raise HTTPException(404, "No entry for that day")
    return _out(session, e)
