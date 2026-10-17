"""
Polls every few minutes. For each complete pair, in the pair's timezone (user A's), if the
clock has passed ANALYSIS_HOUR:ANALYSIS_MINUTE and the target day has no finished run yet,
run it. Catches up after a restart on its own, so there is nothing to babysit.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import select

from app.agent.provider import get_provider
from app.analysis import run_analysis
from app.config import Settings
from app.db import session_scope
from app.models import AnalysisRun, Pair, User

log = logging.getLogger("corner.scheduler")


def target_day_for(pair_tz: str, settings: Settings, now: datetime | None = None) -> date | None:
    """The day that should be analysed right now, or None if it is not time yet today."""
    tz = ZoneInfo(pair_tz)
    local = (now or datetime.now(tz)).astimezone(tz)
    fire_at = time(settings.analysis_hour, settings.analysis_minute)
    if local.time() < fire_at:
        return None
    return local.date() - timedelta(days=1) if settings.analysis_target == "previous_day" else local.date()


def tick(settings: Settings) -> int:
    ran = 0
    provider = get_provider(settings)
    with session_scope() as session:
        pairs = session.exec(select(Pair).where(Pair.user_b_id.is_not(None))).all()  # type: ignore[union-attr]
        for pair in pairs:
            owner = session.get(User, pair.user_a_id)
            day = target_day_for(owner.timezone if owner else "UTC", settings)
            if day is None:
                continue
            done = session.exec(
                select(AnalysisRun).where(AnalysisRun.pair_id == pair.id, AnalysisRun.day == day,
                                          AnalysisRun.status.in_(["done", "skipped", "running"]))  # type: ignore[attr-defined]
            ).first()
            if done:
                continue
            run_analysis(session, pair, day, provider, settings)
            ran += 1
    if ran:
        log.info("scheduler tick ran %d analyses", ran)
    return ran


def start_scheduler(settings: Settings) -> BackgroundScheduler:
    sched = BackgroundScheduler(timezone="UTC")
    sched.add_job(tick, "interval", minutes=settings.scheduler_poll_minutes, args=[settings],
                  id="corner-nightly", max_instances=1, coalesce=True, next_run_time=datetime.now(timezone.utc) + timedelta(seconds=10))
    sched.start()
    return sched
