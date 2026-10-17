from __future__ import annotations

from collections.abc import Callable
from typing import Protocol

from app.config import Settings
from app.schemas import AgentOutput, AgentPayload


class AgentProvider(Protocol):
    name: str

    def analyze(self, payload: AgentPayload, tools: list[Callable]) -> AgentOutput: ...


def get_provider(settings: Settings) -> AgentProvider:
    if settings.llm_provider == "gemini":
        if not settings.gemini_api_key:
            raise RuntimeError("LLM_PROVIDER=gemini but GEMINI_API_KEY is empty")
        from app.agent.gemini import GeminiProvider
        return GeminiProvider(settings)
    from app.agent.mock import MockProvider
    return MockProvider()
