"""
The nightly job for one pair and one day.

  load both entries + history → agent → leak-check each side's feedback against the OTHER
  side's raw text → persist summaries, run, feedback → notify both users over SSE

Idempotent per (pair, day): a finished run is not repeated unless force=True.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta

from sqlmodel import Session, select

from app.agent.leakcheck import scrub
from app.agent.provider import AgentProvider
from app.agent.tools import build_tools
from app.config import Settings
from app.events import hub
from app.models import AnalysisRun, DiaryEntry, Feedback, Pair, User, utcnow
from app.schemas import AgentPayload, SideInput

log = logging.getLogger("corner.analysis")


def _entry(session: Session, user_id: str, day: date) -> DiaryEntry | None:
    return session.exec(select(DiaryEntry).where(DiaryEntry.user_id == user_id, DiaryEntry.day == day)).first()


def _history(session: Session, user_id: str, day: date, days: int) -> list[str]:
    rows = session.exec(
        select(DiaryEntry)
        .where(DiaryEntry.user_id == user_id, DiaryEntry.day < day, DiaryEntry.day >= day - timedelta(days=days))
        .where(DiaryEntry.ai_summary.is_not(None))  # type: ignore[union-attr]
        .order_by(DiaryEntry.day.desc())  # type: ignore[attr-defined]
    ).all()
    return [f"{r.day.isoformat()}: {r.ai_summary}" for r in rows]


def _last_pair_summary(session: Session, pair_id: str, day: date) -> str | None:
    run = session.exec(
        select(AnalysisRun)
        .where(AnalysisRun.pair_id == pair_id, AnalysisRun.day < day, AnalysisRun.status == "done")
        .order_by(AnalysisRun.day.desc())  # type: ignore[attr-defined]
    ).first()
    return run.pair_summary if run else None


def _upsert_feedback(session: Session, run: AnalysisRun, user_id: str, day: date, headline: str, bullets: list[str], dropped: int) -> Feedback:
    fb = session.exec(select(Feedback).where(Feedback.user_id == user_id, Feedback.day == day)).first()
    if fb is None:
        fb = Feedback(run_id=run.id, pair_id=run.pair_id, user_id=user_id, day=day, headline=headline, bullets=bullets, leak_dropped=dropped)
    else:
        fb.run_id, fb.headline, fb.bullets, fb.leak_dropped, fb.created_at = run.id, headline, bullets, dropped, utcnow()
    session.add(fb)
    return fb


def run_analysis(session: Session, pair: Pair, day: date, provider: AgentProvider, settings: Settings, *, force: bool = False) -> AnalysisRun:
    existing = session.exec(select(AnalysisRun).where(AnalysisRun.pair_id == pair.id, AnalysisRun.day == day)).first()
    if existing and existing.status == "done" and not force:
        return existing
    if existing and existing.status == "running" and not force:
        return existing

    run = existing or AnalysisRun(pair_id=pair.id, day=day)
    run.status, run.started_at, run.finished_at, run.error, run.model = "running", utcnow(), None, None, provider.name
    session.add(run)
    session.commit()
    session.refresh(run)

    try:
        if not pair.user_b_id:
            raise _Skip("pair has no second member yet")
        a = session.get(User, pair.user_a_id)
        b = session.get(User, pair.user_b_id)
        assert a and b
        ea, eb = _entry(session, a.id, day), _entry(session, b.id, day)
        if ea is None and eb is None:
            raise _Skip("no entries for that day")

        payload = AgentPayload(
            day=day,
            side_a=SideInput(label="A", display_name=a.display_name, raw_text=ea.raw_text if ea else None,
                             mood=ea.mood if ea else None, previous_summaries=_history(session, a.id, day, settings.agent_history_days)),
            side_b=SideInput(label="B", display_name=b.display_name, raw_text=eb.raw_text if eb else None,
                             mood=eb.mood if eb else None, previous_summaries=_history(session, b.id, day, settings.agent_history_days)),
            previous_pair_summary=_last_pair_summary(session, pair.id, day),
        )
        tools = build_tools(session, pair, {a.id: a.display_name, b.id: b.display_name})
        out = provider.analyze(payload, tools)

        # A's feedback is checked against B's words, and vice versa.
        ha, ba, da = scrub(out.feedback_for_a.bullets, out.feedback_for_a.headline, payload.side_b.raw_text, settings.leakcheck_min_span)
        hb, bb, db_ = scrub(out.feedback_for_b.bullets, out.feedback_for_b.headline, payload.side_a.raw_text, settings.leakcheck_min_span)

        if ea:
            ea.ai_summary, ea.updated_at = out.side_a.summary, utcnow()
            session.add(ea)
        if eb:
            eb.ai_summary, eb.updated_at = out.side_b.summary, utcnow()
            session.add(eb)
        _upsert_feedback(session, run, a.id, day, ha, ba, da)
        _upsert_feedback(session, run, b.id, day, hb, bb, db_)
        run.pair_summary, run.status, run.finished_at = out.pair_summary, "done", utcnow()
        session.add(run)
        session.commit()
        session.refresh(run)

        for uid in (a.id, b.id):
            hub.publish(uid, "feedback.published", {"day": day.isoformat(), "pair_id": pair.id, "run_id": run.id})
        log.info("run done pair=%s day=%s dropped=%d/%d", pair.id, day, da, db_)
    except _Skip as s:
        run.status, run.error, run.finished_at = "skipped", str(s), utcnow()
        session.add(run)
        session.commit()
    except Exception as e:
        log.exception("run failed pair=%s day=%s", pair.id, day)
        run.status, run.error, run.finished_at = "failed", f"{type(e).__name__}: {e}"[:1000], utcnow()
        session.add(run)
        session.commit()
    session.refresh(run)
    return run


class _Skip(Exception):
    pass
