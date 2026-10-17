"""
Server-sent events. One in-process hub; each connected client owns a queue keyed by user id.
Good enough for one server. If you run several, swap the hub for Redis pub/sub and keep the API.
"""
from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from collections.abc import AsyncIterator
from typing import Any

HEARTBEAT_SECONDS = 15


class EventHub:
    def __init__(self) -> None:
        self._queues: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def publish(self, user_id: str, event: str, data: dict[str, Any]) -> None:
        """Thread-safe: the scheduler calls this from a worker thread."""
        msg = {"event": event, "data": data}
        for q in list(self._queues.get(user_id, ())):
            if self._loop and self._loop.is_running():
                self._loop.call_soon_threadsafe(q.put_nowait, msg)
            else:
                q.put_nowait(msg)

    async def subscribe(self, user_id: str) -> AsyncIterator[str]:
        q: asyncio.Queue = asyncio.Queue()
        self._queues[user_id].add(q)
        try:
            yield _sse("connected", {"user_id": user_id})
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=HEARTBEAT_SECONDS)
                    yield _sse(msg["event"], msg["data"])
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            self._queues[user_id].discard(q)
            if not self._queues[user_id]:
                del self._queues[user_id]

    def connections(self) -> int:
        return sum(len(s) for s in self._queues.values())


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


hub = EventHub()
