"""Operator endpoints. Protected by X-Admin-Token. Used to trigger the nightly job on demand."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.agent.provider import get_provider
from app.analysis import run_analysis
from app.auth import require_admin
from app.config import Settings, get_settings
from app.db import get_session
from app.events import hub
from app.models import AnalysisRun, Pair, User
from app.scheduler import target_day_for
from app.schemas import AnalyzeIn, RunOut

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.post("/analyze", response_model=list[RunOut], summary="Run the analysis now for one pair or all pairs")
def analyze(body: AnalyzeIn, session: Session = Depends(get_session), settings: Settings = Depends(get_settings)):
    provider = get_provider(settings)
    if body.pair_id:
        pair = session.get(Pair, body.pair_id)
        if not pair:
            raise HTTPException(404, "No such pair")
        pairs = [pair]
    else:
        pairs = session.exec(select(Pair).where(Pair.user_b_id.is_not(None))).all()  # type: ignore[union-attr]
    runs = []
    for pair in pairs:
        day = body.day
        if day is None:
            owner = session.get(User, pair.user_a_id)
            day = target_day_for(owner.timezone if owner else "UTC", settings) or date.today()
        runs.append(run_analysis(session, pair, day, provider, settings, force=body.force))
    return runs


@router.get("/runs", response_model=list[RunOut])
def runs(limit: int = 50, session: Session = Depends(get_session)):
    return session.exec(select(AnalysisRun).order_by(AnalysisRun.started_at.desc()).limit(limit)).all()  # type: ignore[attr-defined]


@router.get("/status")
def status(settings: Settings = Depends(get_settings)):
    return {"llm_provider": settings.llm_provider, "auth_mode": settings.auth_mode, "scheduler": settings.scheduler_enabled,
            "analysis_at": f"{settings.analysis_hour:02d}:{settings.analysis_minute:02d}", "analysis_target": settings.analysis_target,
            "sse_connections": hub.connections()}
