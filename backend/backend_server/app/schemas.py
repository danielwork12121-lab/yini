"""
Wire shapes. Request/response bodies for the REST API, and the agent's I/O contract.
Nothing here is a table; see models.py for those.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

# ── closed vocabularies (kept identical to frontend/src/contract/enums.ts) ──
EmotionalState = Literal["rough", "strained", "steady", "good", "great"]
Theme = Literal[
    "quality_time", "communication", "chores_logistics", "affection",
    "space_autonomy", "money", "family_friends", "work_stress",
    "health_energy", "future_plans", "appreciation", "conflict_repair", "other",
]


# ── API: users / auth ──
class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    timezone: str


class SessionIn(BaseModel):
    access_token: str = Field(description="A Supabase access token from the browser session")


class DevLoginIn(BaseModel):
    user_id: str
    email: str
    display_name: str
    timezone: str = "America/Los_Angeles"


class UpdateMeIn(BaseModel):
    display_name: str | None = None
    timezone: str | None = None


# ── API: pairs ──
class PairOut(BaseModel):
    id: str
    invite_code: str
    partner: UserOut | None               # display info only; never partner activity
    complete: bool


class JoinPairIn(BaseModel):
    invite_code: str


# ── API: diary ──
class DiaryUpsertIn(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)
    mood: int | None = Field(default=None, ge=1, le=5)
    day: date | None = Field(default=None, description="Defaults to today in the author's timezone")


class DiaryOut(BaseModel):
    day: date
    text: str
    mood: int | None
    ai_summary: str | None
    analyzed: bool
    updated_at: datetime


# ── API: feedback ──
class FeedbackOut(BaseModel):
    day: date
    headline: str
    bullets: list[str]
    created_at: datetime


class RunOut(BaseModel):
    id: str
    pair_id: str
    day: date
    status: str
    model: str | None
    error: str | None
    started_at: datetime
    finished_at: datetime | None


class AnalyzeIn(BaseModel):
    pair_id: str | None = Field(default=None, description="Omit to run for every pair")
    day: date | None = Field(default=None, description="Omit for the scheduler's target day")
    force: bool = Field(default=False, description="Re-run even if a run for that day exists")


class ErrorOut(BaseModel):
    error: str
    code: str


# ── AGENT I/O ──
class SideInput(BaseModel):
    label: Literal["A", "B"]
    display_name: str
    raw_text: str | None                  # None = no entry that day
    mood: int | None
    previous_summaries: list[str]         # most recent first, compact


class AgentPayload(BaseModel):
    day: date
    side_a: SideInput
    side_b: SideInput
    previous_pair_summary: str | None


class SideAnalysis(BaseModel):
    summary: str = Field(description="2-3 sentences, compact, in the third person. This is the memory carried forward.")
    state: EmotionalState
    themes: list[Theme] = Field(max_length=3)


class FeedbackFor(BaseModel):
    headline: str = Field(description="One warm sentence addressed to the recipient.")
    bullets: list[str] = Field(min_length=2, max_length=5, description="Concrete, kind, actionable. Never quote or paraphrase specifics from the partner's entry.")


class AgentOutput(BaseModel):
    side_a: SideAnalysis
    side_b: SideAnalysis
    pair_summary: str = Field(description="2-3 sentences on where the relationship is, for tomorrow's run.")
    feedback_for_a: FeedbackFor
    feedback_for_b: FeedbackFor
