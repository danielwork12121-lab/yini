"""
Deterministic stand-in for the model. No network. Lets the whole pipeline (scheduler, leak
check, persistence, SSE) be tested without a key. It deliberately leaks one bullet so the
leak check has something to catch in tests.
"""
from __future__ import annotations

from collections.abc import Callable

from app.schemas import AgentOutput, AgentPayload, FeedbackFor, SideAnalysis, SideInput


def _side(s: SideInput) -> SideAnalysis:
    if not s.raw_text:
        return SideAnalysis(summary=f"{s.display_name} did not write today.", state="steady", themes=["other"])
    words = len(s.raw_text.split())
    state = {1: "rough", 2: "strained", 3: "steady", 4: "good", 5: "great"}.get(s.mood or 3, "steady")
    return SideAnalysis(
        summary=f"{s.display_name} wrote about {words} words about the relationship and seems {state}.",
        state=state, themes=["communication"],
    )


def _feedback(me: SideInput, partner: SideInput) -> FeedbackFor:
    bullets = [
        "Name one thing you appreciated about yourself today, even a small one.",
        "Pick a low-stakes moment tomorrow for a two-minute check-in, no agenda.",
    ]
    if partner.raw_text:
        # a verbatim leak of the partner's text, to prove the scrubber works
        bullets.append("Your partner wrote: " + " ".join(partner.raw_text.split()[:12]))
    return FeedbackFor(headline=f"Thanks for showing up tonight, {me.display_name}.", bullets=bullets)


class MockProvider:
    name = "mock"

    def analyze(self, payload: AgentPayload, tools: list[Callable]) -> AgentOutput:
        a, b = payload.side_a, payload.side_b
        return AgentOutput(
            side_a=_side(a), side_b=_side(b),
            pair_summary=f"On {payload.day.isoformat()} both sides checked in. Mock run.",
            feedback_for_a=_feedback(a, b), feedback_for_b=_feedback(b, a),
        )
