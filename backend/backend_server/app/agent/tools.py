"""
Tools the agent can call during a run. Each is a plain Python function with type hints and a
docstring; the Gemini SDK turns them into function declarations and executes them automatically.
They are bound to one pair, so the agent cannot read another couple's data.
"""
from __future__ import annotations

from datetime import date

from sqlmodel import Session, select

from app.models import AnalysisRun, DiaryEntry, Pair, User


def build_tools(session: Session, pair: Pair, names: dict[str, str]):
    member_ids = pair.members()

    def _fmt(e: DiaryEntry) -> dict:
        return {
            "day": e.day.isoformat(),
            "who": names.get(e.user_id, "?"),
            "summary": e.ai_summary,
            "text": e.raw_text,
            "mood": e.mood,
        }

    def get_entries_on_date(day: str) -> list[dict]:
        """Return both people's diary entries (text, AI summary, mood) for one day. `day` is YYYY-MM-DD."""
        d = date.fromisoformat(day)
        rows = session.exec(
            select(DiaryEntry).where(DiaryEntry.pair_id == pair.id, DiaryEntry.day == d)
        ).all()
        return [_fmt(e) for e in rows]

    def search_entries(query: str, limit: int = 5) -> list[dict]:
        """Keyword search over this pair's past entries and summaries. Returns the most recent matches first."""
        q = f"%{query.strip()}%"
        rows = session.exec(
            select(DiaryEntry)
            .where(DiaryEntry.pair_id == pair.id)
            .where((DiaryEntry.raw_text.ilike(q)) | (DiaryEntry.ai_summary.ilike(q)))  # type: ignore[attr-defined]
            .order_by(DiaryEntry.day.desc())  # type: ignore[attr-defined]
            .limit(max(1, min(limit, 20)))
        ).all()
        return [_fmt(e) for e in rows]

    def get_recent_pair_summaries(limit: int = 7) -> list[dict]:
        """Return the relationship summaries written on previous nights, most recent first."""
        rows = session.exec(
            select(AnalysisRun)
            .where(AnalysisRun.pair_id == pair.id, AnalysisRun.status == "done")
            .order_by(AnalysisRun.day.desc())  # type: ignore[attr-defined]
            .limit(max(1, min(limit, 30)))
        ).all()
        return [{"day": r.day.isoformat(), "summary": r.pair_summary} for r in rows]

    return [get_entries_on_date, search_entries, get_recent_pair_summaries]
