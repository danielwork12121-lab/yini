from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.auth import current_user
from app.events import hub
from app.models import User

router = APIRouter(tags=["events"])


@router.get("/events", summary="Server-sent events: `feedback.published` when a new analysis lands for me")
async def events(user: User = Depends(current_user)):
    return StreamingResponse(
        hub.subscribe(user.id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )
