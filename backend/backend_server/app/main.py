import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import init_db
from app.events import hub
from app.routers import admin, auth, diary, events, feedback, pairs
from app.scheduler import start_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.auth_mode == "supabase":
        weak = [k for k, v in (("SESSION_SECRET", settings.session_secret), ("ADMIN_TOKEN", settings.admin_token))
                if v in ("dev-only-change-me", "dev-admin-token") or len(v) < 32]
        if weak:
            raise RuntimeError(f"Refusing to start with AUTH_MODE=supabase: set strong values (32+ chars) for {', '.join(weak)}")
    init_db()
    hub.bind_loop(asyncio.get_running_loop())
    sched = start_scheduler(settings) if settings.scheduler_enabled else None
    yield
    if sched:
        sched.shutdown(wait=False)


app = FastAPI(
    title="Corner backend",
    version="0.1.0",
    description="Private two-sided diary with a nightly mediator agent. Raw text is only ever returned to its author.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origin_list, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    code = {401: "unauthenticated", 403: "forbidden", 404: "not_found", 409: "conflict", 422: "invalid_input"}.get(exc.status_code, "error")
    return JSONResponse({"error": exc.detail, "code": code}, status_code=exc.status_code, headers=exc.headers)


@app.get("/health", tags=["meta"])
def health():
    return {"ok": True, "env": settings.app_env, "provider": settings.llm_provider, "auth_mode": settings.auth_mode}


for r in (auth.router, pairs.router, diary.router, feedback.router, events.router, admin.router):
    app.include_router(r)
