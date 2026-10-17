# Corner Backend Design

Owner: Ethan Pan (backend) · Frontend: Daniel Li · Last updated: 2026-10-17

## 1. What Corner is

Corner is a companion app for two people in a relationship, such as a couple. Each person writes a private daily diary about the relationship: how they feel, what is going right, and what is going wrong.

At a fixed time each night (for example midnight), a workflow runs one AI agent over both diaries. The agent gives each person feedback without revealing their partner's diary. The goal is a diary habit that is easy to keep up and helps the two people understand each other.

Work is split in two:

- **Frontend**: a Next.js web app, built by Daniel.
- **Backend**: the database, the agent, and multi-user support, built by Ethan.

The agent runs on the Gemini API, because Gemini is one of the LA Hacks sponsor tracks.

## 2. Requirements

| # | Requirement | Decision |
|---|---|---|
| 1 | Backend in Python, with Pydantic for type safety | FastAPI + SQLModel. Every table is a Pydantic model. |
| 2 | Server runs on a cloud server | One uvicorn process. It has no cloud-specific code, so any VM works. |
| 3 | Local database: SQLite or MongoDB, whichever fits the schema best | SQLite. The data is relational (users → pairs → entries → feedback). Switching to Postgres later only takes a new `DATABASE_URL`. |
| 4 | Supabase only for user login | The backend verifies the Supabase access token once, then uses its own session. Supabase stores no app data for the backend. |
| 5 | Each user keeps a login cookie | `POST /auth/session` exchanges the Supabase token for an httpOnly `corner_session` cookie, signed with `SESSION_SECRET`. |
| 6 | REST API. No streaming responses needed. | JSON REST endpoints, listed in section 6. |
| 7 | POST each day's diary; same day adds or updates, next day is a new entry | `POST /diary` upserts on (user, day). |
| 8 | GET the most recent result | `GET /feedback/latest`, and `GET /diary/today` for the user's own entry. |
| 9 | Server-sent event when a new analysis is published | `GET /events` (SSE) sends a `feedback.published` event to both partners. |
| 10 | Agent runs at a set time | A built-in scheduler runs at `ANALYSIS_HOUR:ANALYSIS_MINUTE` in each pair's timezone. `POST /admin/analyze` triggers a run on demand. |

## 3. Data model

There are three core tables, as specified, plus two that support the agent.

1. **users**: every account. `id` is the Supabase user id, so the frontend and backend agree on who a user is. Also stores email, display name, and timezone.
2. **pairs**: who is paired with whom. Stores `user_a_id`, `user_b_id` (empty until the partner joins), and a 6-character `invite_code`.
3. **diary_entries**: one row per user per day. Holds:
   - `raw_text`: the original text
   - `ai_summary`: the AI summary of that text
   - `mood`: 1–5, optional
   - unique on (`user_id`, `day`), which is what enables same-day updates
4. **analysis_runs**: one row per pair per night. Holds the status (pending, running, done, failed, or skipped), the model used, the compact `pair_summary` that carries memory forward, and any error.
5. **feedback**: the AI output for one recipient on one day. Holds a headline, bullets (a JSON list), and a count of bullets removed by the leak check.

**Where the AI output lives.** The agent produces one output for the left side and one for the right. Each side's output is stored as its own row in `feedback`, keyed to the person who receives it. In effect, each user's output sits in that user's own records, as the spec asked.

**Who can read what:**

- `raw_text` is returned only to its author.
- A partner only ever sees the `feedback` rows addressed to them.
- `/pairs/me` exposes the partner's display info only.

Full table reference and DDL: `backend/database/SCHEMA.md`.

## 4. Agent

### 4.1 Memory

Memory is kept deliberately simple:

- **Today's original text** from both sides.
- **Per-person summaries** (`ai_summary`) from the previous days, compact and limited to `AGENT_HISTORY_DAYS`, default 7.
- **The previous pair summary** from the last `analysis_runs` row. Each night's summary builds on the one before it, so context carries forward without growing.

### 4.2 Payload

The spec lists six parts. Each one maps to code as follows:

| Spec item | Implementation |
|---|---|
| System prompt | `app/agent/prompts.py` → `SYSTEM_PROMPT` |
| Left side | `AgentPayload.side_a` (`SideInput`: name, mood, previous summaries) |
| Right side | `AgentPayload.side_b` |
| Original text | `SideInput.raw_text` for each side |
| Summary from the previous day | `SideInput.previous_summaries` + `AgentPayload.previous_pair_summary` |
| Output example | The `AgentOutput` Pydantic schema, given to Gemini as `response_schema` |

### 4.3 Output (JSON)

```json
{
  "side_a": { "summary": "...", "state": "steady", "themes": ["communication"] },
  "side_b": { "summary": "...", "state": "strained", "themes": ["time_together"] },
  "pair_summary": "...",
  "feedback_for_a": { "headline": "...", "bullets": ["...", "..."] },
  "feedback_for_b": { "headline": "...", "bullets": ["...", "..."] }
}
```

- Each side gets 2–5 bullets.
- `state` and `themes` use the same fixed values as the frontend contract, so both sides of the app agree.

### 4.4 Tools: database access for the agent

Every tool is limited to the pair under analysis:

- `get_entries_on_date(day)`: look up a past day.
- `search_entries(query, limit)`: search past entries. For now this is keyword search; semantic search with embeddings can replace it later.
- `get_recent_pair_summaries(limit)`: read earlier pair summaries.

### 4.5 Flow

1. **Gather**: Gemini runs with the tools enabled and automatic function calling, up to 4 tool calls.
2. **Compose**: Gemini runs again in JSON mode with `response_schema=AgentOutput`. If the output fails validation, the error is sent back and the call is retried once.
3. **Leak check**: any bullet sharing 6 or more consecutive words with the partner's raw text is removed. The threshold is set by `LEAKCHECK_MIN_SPAN`.
4. **Save**: the run writes `ai_summary` back to each diary entry, saves the two `feedback` rows, and stores the new `pair_summary`.
5. **Notify**: the run sends `feedback.published` over SSE to both partners.

**Why two Gemini calls.** Gemini cannot use tools and enforce a JSON schema in the same call, so gathering and composing are separate steps.

**Why Gemini's own function calling.** The Claude Agent SDK was considered. Gemini's own function calling was chosen instead, because Gemini is the sponsor track and a second agent runtime would add cost with no benefit.

A `mock` provider is also available, so the full pipeline runs offline without a Gemini key.

### 4.6 Privacy rule

Feedback for A must never reveal B's entry. That means no quotes and no close paraphrases. The agent may use what B wrote to shape A's advice indirectly. This rule is enforced twice: once in the system prompt, and again by the leak check in code.

## 5. Auth

- **Production (`AUTH_MODE=supabase`)**: the frontend signs in with Supabase and calls `POST /auth/session` with the access token. The backend verifies the token, creates or updates the user, and sets the `corner_session` cookie. Every later request uses only the cookie.
- **Local (`AUTH_MODE=dev`)**: the backend trusts the headers `X-Dev-User-Id`, `X-Dev-Email`, and `X-Dev-Name`. `POST /auth/dev-login` sets the cookie. This lets Postman test everything before the frontend exists.

## 6. API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/auth/session` | Exchange a Supabase token for the session cookie |
| POST | `/auth/dev-login` | Get a session cookie in dev mode |
| POST | `/auth/logout` | Clear the cookie |
| GET / PATCH | `/auth/me` | Read or update profile (name, timezone) |
| POST | `/pairs` | Create a pair and get an invite code |
| POST | `/pairs/join` | Join a pair with an invite code |
| GET | `/pairs/me` | Current pair and partner display info |
| POST | `/diary` | Add or update today's entry, or a given past day |
| PUT | `/diary/{day}` | Update a specific day |
| GET | `/diary`, `/diary/today`, `/diary/{day}` | Read own entries |
| GET | `/feedback/latest`, `/feedback`, `/feedback/{day}` | Read own feedback |
| GET | `/events` | SSE stream, sends `feedback.published` |
| POST | `/admin/analyze` | Run analysis now (needs `X-Admin-Token`) |
| GET | `/admin/runs`, `/admin/status` | Inspect runs and the scheduler |

**Errors** use one format: `{"error": "...", "code": "unauthenticated | forbidden | not_found | conflict | invalid_input"}`.

**Diary rules:**

- Future days are rejected with 422.
- Writing before the user has a pair returns 409.
- Once a day has been analyzed, its entry is locked and edits return 409. *Still open: confirm this with Daniel, or switch to re-running the analysis when a late edit comes in.*

## 7. Scheduler

- Polls every `SCHEDULER_POLL_MINUTES` (default 5).
- Uses user A's timezone for each pair.
- Once the configured time passes, analyzes `previous_day` (default) or `same_day`.
- Runs are idempotent per (pair, day), so restarts simply catch up.
- Pairs where neither person wrote are marked `skipped`.

## 8. Configuration

All settings are environment variables. `backend/backend_server/.env.example` documents each one:

- `DATABASE_URL`
- `AUTH_MODE`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SESSION_SECRET`, cookie flags
- `LLM_PROVIDER` (`mock` or `gemini`), `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.5-flash`)
- `AGENT_USE_TOOLS`, `AGENT_HISTORY_DAYS`, `LEAKCHECK_MIN_SPAN`
- `SCHEDULER_ENABLED`, `ANALYSIS_HOUR`, `ANALYSIS_MINUTE`, `ANALYSIS_TARGET`
- `ADMIN_TOKEN`

Never commit `.env`. The Supabase service-role key must stay server-side only, never in a `NEXT_PUBLIC_*` variable.

## 9. Local testing

```bash
cd backend/backend_server
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8000
uv run pytest -q
```

- `uv run pytest -q` runs 11 tests, which pass with the mock provider.
- For Postman, import `postman/Corner-Backend.postman_collection.json` and `postman/Corner-Local.postman_environment.json`, then run folders 0–6 in order.

## 10. Code layout

```
backend/
  backend_server/
    app/
      main.py  config.py  db.py  models.py  schemas.py  auth.py  events.py
      analysis.py  scheduler.py
      agent/   prompts.py  provider.py  gemini.py  mock.py  tools.py  leakcheck.py
      routers/ auth.py  pairs.py  diary.py  feedback.py  events.py  admin.py
    tests/  postman/  .env.example  README.md  pyproject.toml
  database/
    SCHEMA.md  data/ (SQLite file, gitignored)
```

## 11. Open items and next steps

- Confirm the diary-locking behavior (section 6) with Daniel.
- Test against live Gemini with a real API key.
- Connect the frontend to `/auth/session` and the diary and feedback endpoints.
- Deploy to a cloud VM, with HTTPS and `COOKIE_SECURE=true`.
- Optional: replace keyword search with embedding-based semantic search.
- Rotate the Supabase service-role key and database password that were shared in plaintext.
