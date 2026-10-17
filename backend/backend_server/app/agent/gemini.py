"""
Gemini provider. Two calls per run:

  1. gather   tools enabled, free text. The model may look up history, then writes private notes.
  2. compose  strict JSON against `AgentOutput`. Tools and response_schema cannot be combined
              in one Gemini call, which is why the phases are split.

Any schema failure is retried once with the validation error fed back; a second failure raises
and the run is marked failed. Nothing half-formed is ever written.
"""
from __future__ import annotations

import logging
from collections.abc import Callable

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.agent.prompts import COMPOSE_INSTRUCTIONS, GATHER_INSTRUCTIONS, SYSTEM_PROMPT
from app.config import Settings
from app.schemas import AgentOutput, AgentPayload

log = logging.getLogger("corner.agent")


def _render_payload(p: AgentPayload) -> str:
    def side(s):
        text = s.raw_text if s.raw_text else "(no entry today)"
        hist = "\n".join(f"  - {h}" for h in s.previous_summaries) or "  (none yet)"
        mood = f" (self-reported mood {s.mood}/5)" if s.mood else ""
        return f"SIDE {s.label} — {s.display_name}{mood}\nToday's entry:\n{text}\n\nRecent summaries (most recent first):\n{hist}\n"
    pair = p.previous_pair_summary or "(first run for this pair)"
    return f"DATE: {p.day.isoformat()}\n\nRELATIONSHIP SUMMARY FROM LAST RUN:\n{pair}\n\n{side(p.side_a)}\n{side(p.side_b)}"


class GeminiProvider:
    name = "gemini"

    def __init__(self, settings: Settings):
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.gemini_model
        self.use_tools = settings.agent_use_tools

    def _gather(self, rendered: str, tools: list[Callable]) -> str:
        if not self.use_tools or not tools:
            return ""
        cfg = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            tools=tools,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(maximum_remote_calls=4),
            temperature=0.4,
        )
        resp = self.client.models.generate_content(
            model=self.model, contents=f"{rendered}\n\n{GATHER_INSTRUCTIONS}", config=cfg,
        )
        return (resp.text or "").strip()

    def _compose(self, rendered: str, notes: str, feedback_on_error: str | None = None) -> AgentOutput:
        cfg = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=AgentOutput,
            temperature=0.5,
        )
        body = f"{rendered}\n\nWORKING NOTES:\n{notes or '(none)'}\n\n{COMPOSE_INSTRUCTIONS}"
        if feedback_on_error:
            body += f"\n\nYour previous answer failed validation:\n{feedback_on_error}\nFix it."
        resp = self.client.models.generate_content(model=self.model, contents=body, config=cfg)
        parsed = getattr(resp, "parsed", None)
        if isinstance(parsed, AgentOutput):
            return parsed
        return AgentOutput.model_validate_json(resp.text or "")

    def analyze(self, payload: AgentPayload, tools: list[Callable]) -> AgentOutput:
        rendered = _render_payload(payload)
        notes = ""
        try:
            notes = self._gather(rendered, tools)
        except Exception as e:  # tools are optional; never let them sink the run
            log.warning("gather phase failed, composing without notes: %s", e)
        try:
            return self._compose(rendered, notes)
        except (ValidationError, ValueError) as e:
            log.warning("compose failed validation, retrying once: %s", e)
            return self._compose(rendered, notes, feedback_on_error=str(e)[:1500])
