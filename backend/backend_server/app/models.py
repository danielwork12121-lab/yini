"""
Corner tables. SQLModel = Pydantic model + SQLAlchemy table in one class.

  users          one row per account (id == Supabase auth user id when auth_mode=supabase)
  pairs          who is paired with whom; user_b is NULL until the invite is accepted
  diary_entries  one row per (user, local day): the raw text, the AI's compact summary of it
  analysis_runs  one row per (pair, day): the nightly job's bookkeeping + the pair-level memory
  feedback       one row per (recipient user, day): the bullets the agent wrote FOR that user

Privacy rule: `diary_entries.raw_text` is returned by the API only to its author.
Everything the partner sees comes from `feedback`, which is leak-checked before it is written.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Column, JSON, UniqueConstraint
from sqlmodel import Field, SQLModel


def _uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(primary_key=True)                     # supabase uid or dev id
    email: str = Field(index=True, unique=True)
    display_name: str
    timezone: str = "America/Los_Angeles"
    created_at: datetime = Field(default_factory=utcnow)


class Pair(SQLModel, table=True):
    __tablename__ = "pairs"
    id: str = Field(default_factory=_uuid, primary_key=True)
    invite_code: str = Field(index=True, unique=True)
    user_a_id: str = Field(foreign_key="users.id", index=True)
    user_b_id: str | None = Field(default=None, foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)

    def members(self) -> list[str]:
        return [u for u in (self.user_a_id, self.user_b_id) if u]

    def partner_of(self, user_id: str) -> str | None:
        if user_id == self.user_a_id:
            return self.user_b_id
        if user_id == self.user_b_id:
            return self.user_a_id
        return None


class DiaryEntry(SQLModel, table=True):
    __tablename__ = "diary_entries"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_entry_user_day"),)
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    pair_id: str = Field(foreign_key="pairs.id", index=True)
    day: date = Field(index=True)                          # author's LOCAL calendar day
    raw_text: str
    mood: int | None = Field(default=None, ge=1, le=5)     # optional self-reported 1..5
    ai_summary: str | None = None                          # compact, written by the nightly run
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class AnalysisRun(SQLModel, table=True):
    __tablename__ = "analysis_runs"
    __table_args__ = (UniqueConstraint("pair_id", "day", name="uq_run_pair_day"),)
    id: str = Field(default_factory=_uuid, primary_key=True)
    pair_id: str = Field(foreign_key="pairs.id", index=True)
    day: date = Field(index=True)
    status: str = "pending"                                # pending | running | done | failed | skipped
    model: str | None = None
    pair_summary: str | None = None                        # compact relationship memory carried to the next run
    error: str | None = None
    started_at: datetime = Field(default_factory=utcnow)
    finished_at: datetime | None = None


class Feedback(SQLModel, table=True):
    __tablename__ = "feedback"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_feedback_user_day"),)
    id: str = Field(default_factory=_uuid, primary_key=True)
    run_id: str = Field(foreign_key="analysis_runs.id", index=True)
    pair_id: str = Field(foreign_key="pairs.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)   # the RECIPIENT
    day: date = Field(index=True)
    headline: str
    bullets: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    leak_dropped: int = 0                                  # bullets removed by the leak check
    created_at: datetime = Field(default_factory=utcnow)
