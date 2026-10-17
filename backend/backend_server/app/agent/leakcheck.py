"""
Deterministic leak check: does any run of N consecutive words from the partner's raw text
appear verbatim in the feedback for the other person? Cheap, explainable, and it catches the
most common failure, which is the model quoting.
"""
from __future__ import annotations

import re

_WORD = re.compile(r"[a-z0-9']+")


def _words(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def shingles(text: str, n: int) -> set[tuple[str, ...]]:
    w = _words(text)
    return {tuple(w[i:i + n]) for i in range(0, max(0, len(w) - n + 1))}


def leaks(candidate: str, source: str | None, min_span: int) -> bool:
    if not source:
        return False
    src = shingles(source, min_span)
    if not src:
        return False
    return any(s in src for s in shingles(candidate, min_span))


def scrub(bullets: list[str], headline: str, source: str | None, min_span: int) -> tuple[str, list[str], int]:
    """Drop any bullet (or the headline) that leaks. Returns (headline, bullets, dropped_count)."""
    dropped = 0
    if leaks(headline, source, min_span):
        headline = "A few thoughts for you tonight."
        dropped += 1
    kept = []
    for b in bullets:
        if leaks(b, source, min_span):
            dropped += 1
        else:
            kept.append(b)
    if not kept:
        kept = ["Take a quiet moment for yourself tonight. You showed up and wrote, and that matters."]
    return headline, kept, dropped
