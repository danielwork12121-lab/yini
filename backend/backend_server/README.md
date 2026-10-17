# Corner backend

FastAPI + Pydantic/SQLModel + SQLite. Stores each person's private diary, runs a nightly
agent that reads both sides and writes separate feedback for each, and pushes a server-sent
event when new feedback lands.

```
backend/backend_server/      this package
  app/main.py                FastAPI app, CORS, routers, scheduler lifespan
  app/config.py              settings from .env
  app/models.py              tables (users, pairs, diary_entries, analysis_runs, feedback)
  app/schemas.py             API bodies + the agent's JSON contract (AgentPayload / AgentOutput)
  app/auth.py                dev headers | Supabase JWT → our httpOnly cookie
  app/analysis.py            the nightly run for one (pair, day)
  app/scheduler.py           polls; fires per pair at ANALYSIS_HOUR in the pair's timezone
  app/events.py              SSE hub
  app/agent/                 prompts, Gemini provider (tools + structured output), mock, leak check, DB tools
  app/routers/               auth, pairs, diary, feedback, events, admin
  tests/                     pytest, runs fully offline with the mock provider
  postman/                   collection + environment
backend/database/
  SCHEMA.md                  table reference + generated DDL
  data/corner.db             the SQLite file (gitignored)
```

## Run locally

```bash
cd backend/backend_server
cp .env.example .env            # defaults: dev auth, mock provider, SQLite
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Docs: http://localhost:8000/docs. Tests: `uv run pytest`.

## Test without the frontend

Import `postman/Corner-Backend.postman_collection.json` and `postman/Corner-Local.postman_environment.json`,
select the "Corner Local" environment, and run folders 0 → 6 in order. Dev auth is three headers
(`X-Dev-User-Id`, `X-Dev-User-Email`, `X-Dev-User-Name`), so any user id you type exists.

Equivalent curl flow:

```bash
A='-H X-Dev-User-Id:avery -H X-Dev-User-Name:Avery'; B='-H X-Dev-User-Id:sam -H X-Dev-User-Name:Sam'
CODE=$(curl -s $A -X POST localhost:8000/pairs | jq -r .invite_code)
curl -s $B -X POST localhost:8000/pairs/join -H content-type:application/json -d "{\"invite_code\":\"$CODE\"}"
curl -s $A -X POST localhost:8000/diary -H content-type:application/json -d '{"text":"I felt ignored at dinner.","mood":2}'
curl -s $B -X POST localhost:8000/diary -H content-type:application/json -d '{"text":"Work was brutal, I zoned out.","mood":3}'
curl -s -X POST localhost:8000/admin/analyze -H X-Admin-Token:dev-admin-token -H content-type:application/json -d "{\"day\":\"$(date +%F)\"}"
curl -s $A localhost:8000/feedback/latest
curl -N $A localhost:8000/events        # leave open; re-run analyze with "force":true in another shell
```

## Switch on the real model

In `.env`: `LLM_PROVIDER=gemini`, `GEMINI_API_KEY=...`. Each run is two Gemini calls: one with
tools (`get_entries_on_date`, `search_entries`, `get_recent_pair_summaries`) that produces private
working notes, one with a strict JSON schema that produces the final output. A bad JSON response is
retried once with the validation error, then the run is marked `failed` and nothing is written.

## Privacy, in one paragraph

`diary_entries.raw_text` is returned only to its author (every diary route filters by the caller's
id). The partner only ever sees rows from `feedback`. Before a feedback row is written, every bullet
is checked against the *other* person's raw text; any run of `LEAKCHECK_MIN_SPAN` consecutive words
in common drops that bullet. `/pairs/me` returns the partner's display name only: no "checked in
today", no streak, no mood. Those omissions are deliberate.

## Auth with the real frontend

Set `AUTH_MODE=supabase`, `SUPABASE_URL`, and either `SUPABASE_JWT_SECRET` (legacy HS256 projects)
or nothing (the backend fetches the project's JWKS). The frontend signs in with Supabase as it does
today, then calls `POST /auth/session {access_token}` once; the backend verifies it and sets an
httpOnly `corner_session` cookie that all later requests (and `EventSource`) send automatically.
The `users.id` column is the Supabase user id, so the two systems agree on who is who.

## Timezones and the nightly run

Each user has a `timezone`. A diary day is the author's local calendar day. The scheduler fires
per pair (user A's timezone) once the local clock passes `ANALYSIS_HOUR:ANALYSIS_MINUTE`, analysing
yesterday (`ANALYSIS_TARGET=previous_day`) or today (`same_day`). It is idempotent per (pair, day),
so restarts just catch up. `POST /admin/analyze` runs the same code on demand.
