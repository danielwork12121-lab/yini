# Corner Architecture

Owners: Ethan Pan, Daniel Li · Last updated: 2026-10-17

## 1. What Corner is

Corner is a companion app for two people in a relationship. Each person keeps a private daily journal: how they feel, what is going right, what is going wrong. The app helps them understand each other without either one ever reading the other's words.

It does that in two ways:

- **Right away, on check-in.** The writer gets a short reply, the shared pet is fed, and sometimes one small item reaches the partner. The partner item is built from a distilled need, never from the raw text.
- **Overnight.** An agent reads both journals for the day and writes private feedback for each person. Each person's feedback is checked against the other person's words before it is saved.

## 2. One app

Corner used to be two codebases: a Next.js app, and a Python FastAPI service that ran the nightly agent. They are now one Next.js app in `frontend/`, deployed to Vercel, with Supabase for auth and Postgres. The reasons are in issue #1: one deploy target, one database, and both people sharing state from their phones during a demo.

Every Python feature was ported:

| Python backend | Next.js app |
|---|---|
| SQLModel tables (Pydantic) | Zod object types in `src/ontology/objects/`, one file each |
| SQLite `diary_entries.ai_summary` | `entries.ai_summary` column (migration 0002) |
| `analysis_runs` + rolling `pair_summary` | `analysis_runs` table, service role only |
| `feedback` rows | `daily_feedback` table, readable by the recipient only |
| Gemini agent: tools, then JSON schema | `src/lib/agent/`: Gemini function-calling loop, then `generateJSON` |
| Agent DB tools | Same three tools, each bound to one connection |
| Shingle leak check (6 words) | `sharesSpan` / `scrubFeedback` in `src/contract/policy.ts` |
| APScheduler nightly job | Vercel Cron → `GET /api/cron/nightly` |
| `POST /admin/analyze` | `POST /api/admin/analyze` |
| SSE `feedback.published` | Supabase Realtime on `daily_feedback`, filtered by RLS |
| Cookie session from a Supabase token | Supabase SSR cookies (already in the app) |
| Postman collection | `frontend/postman/` |

## 3. Repository layout

```
frontend/
  src/
    ontology/        object, link and action types: the definition of the app
    contract/        closed vocabularies, model I/O and HTTP shapes, pure policy
    lib/
      checkin.ts     the instant check-in pipeline
      agent/         the nightly agent: prompts, tools, Gemini loop, pipeline, stores
      http/          actionRoute: turns an ontology action into a route handler
      llm/           generateJSON for every provider, plus the keyless mock
      supabase/      user client (RLS), admin client (service role), browser client
    app/api/         one route file per action
    components/      UI, including DailyFeedback (Realtime)
  supabase/
    migrations/      0001 schema + RLS, 0002 nightly agent
    tests/           rls_proof.sql: signs in as each partner and attacks
  postman/           collection + local environment
  vercel.json        the nightly cron
docs/
  ontology/          generated: one page per object and per action
  design_doc/        this file
```

## 4. The ontology

The app is described as three kinds of thing:

- **Objects** are the nouns: journal entry, nudge, pet, daily feedback, and so on. Each object is one file with a Zod schema, and every field carries its own description. Zod plays the role Pydantic played in the Python service. An object also declares its table, its primary key, who may read it, whether its content crosses between partners, and which fields must never leave the server.
- **Links** are typed relationships between objects. Each one is backed by a foreign key.
- **Actions** are the verbs. Every API route is exactly one action. An action declares:
  - who may call it: a signed-in user, the public, an admin, or the cron job
  - its route
  - its input and output schemas
  - which objects it reads and writes
  - what a model sees while it runs

Routes are built from actions: `export const POST = actionRoute(actionTypes.checkIn, handler)`. The wrapper checks who is calling, validates the input, checks the output against the schema, and returns the one error format. Each handler only contains business logic.

Every object and action renders to its own Markdown page under `docs/ontology/` (`npm run ontology:docs`), so each feature can be read on its own. The test suite keeps the ontology true:

- each object's fields must exactly match its table's columns in the migrations
- each object's declared visibility must match its RLS policy and grants
- each action must be served by its route file, and every route must be an action
- links and action references must point at real objects and fields
- the generated docs must be up to date

To add a feature:
1. Add or extend an object file.
2. Add a migration.
3. Add an action file and its route.
4. Run `npm run ontology:docs`.

The tests point to anything you missed.

## 5. Check-in (instant)

`POST /api/checkin` runs these steps:
1. Save the entry.
2. Classify it (the only call that sees the author's raw text).
3. Store the derived rows: concerns, kind words, care acts.
4. Feed the pet.
5. Run the safety gate.
6. Decide whether one partner item can be delivered today.
7. Compose the reply.
8. Run the adversarial leak check.
9. Store the nudge.

The entry is saved before any model call, so an outage costs the reply but never the journal. Full detail: `docs/ontology/actions/checkIn.md`.

## 6. The nightly agent

### 6.1 Memory

The agent's memory is deliberately small:

- **Today:** all of each person's entries for the day, oldest first.
- **Per person:** the `ai_summary` lines from earlier days, up to `AGENT_HISTORY_DAYS` (default 7).
- **Per pair:** the `pair_summary` from the last finished run. Each night reads the last summary and writes the next one, so context carries forward without growing.

### 6.2 Input and output

The input is `NightlyInput` (`src/contract/ai.ts`): the date, side A, side B, and the previous pair summary. Each side holds the person's name, the day's text, their mood, and their recent summaries. Side A is the person who joined the connection first, and their timezone decides the day.

The output is validated against `NightlyOutputSchema`:

```json
{
  "side_a": { "summary": "...", "state": "steady", "themes": ["communication"] },
  "side_b": { "summary": "...", "state": "strained", "themes": ["work_stress"] },
  "pair_summary": "...",
  "feedback_for_a": { "headline": "...", "bullets": ["...", "..."] },
  "feedback_for_b": { "headline": "...", "bullets": ["...", "..."] }
}
```

### 6.3 Tools

The agent has three read tools. Each one is bound to the connection being analysed, so no argument the model passes can reach another couple:

- `get_entries_on_date(day)`
- `search_entries(query, limit)`: keyword search
- `get_recent_pair_summaries(limit)`

### 6.4 Run steps

1. **Gather** (Gemini only, `AGENT_USE_TOOLS=true`): a function-calling loop of up to 4 rounds, which ends in private working notes. Gemini cannot use tools and enforce JSON in the same call, so this is a separate step.
2. **Compose**: `generateJSON` against the schema, with one retry that feeds the validation error back to the model. This step works with any provider.
3. **Shingle check**: any bullet that shares 6 consecutive words with the *other* person's raw text is dropped. If every bullet leaks, self-care bullets ship instead.
4. **Adversarial check** (real providers only): the same reconstruction attack the check-in uses. If it fails, self-care bullets ship.
5. **Save**: the two `daily_feedback` rows, `ai_summary` on each entry of the day, and `pair_summary` on the run.

A run is idempotent per (connection, day). A finished day is not repeated unless it is forced. A run stuck in `running` for more than 15 minutes is retried. A connection with mediation paused, a missing partner, or no entries that day is marked `skipped`. Model errors mark the run `failed` and write nothing.

### 6.5 Scheduling and triggers

- **Vercel Cron** calls `GET /api/cron/nightly` at 09:00 UTC daily (1–2am in California) with `Authorization: Bearer $CRON_SECRET`. For each connection it analyses the previous local day in side A's timezone. The free Vercel plan allows one cron run per day, which is enough for this design. On a paid plan, an hourly schedule would land each couple's run closer to their own midnight; the code does not change.
- **Admin:** `POST /api/admin/analyze` with `x-admin-token` runs one connection or all of them, for any day, optionally forced.
- **Demo:** `POST /api/feedback/run`, which only works when demo mode is on, forces today's run for the signed-in user's own connection. The Today screen has a button for it, so a judge can watch the overnight feedback land.

### 6.6 Notifications

`daily_feedback` is published to Supabase Realtime. Realtime applies the table's RLS to change events, so each person is only told about their own row. This was tested with both users subscribed: each received exactly one event, for their own row. `DailyFeedback.tsx` subscribes and refetches `GET /api/feedback/latest`.

## 7. Privacy model

- The `entries` policy is `author_id = auth.uid()`. No policy anywhere lets a partner read another person's entry.
- `raw_text` reaches a model in exactly two places:
  - the classifier, inside the author's own check-in
  - the nightly agent, which no user triggers and whose output is checked twice
- `daily_feedback` can only be read by its recipient. `analysis_runs`, which holds the pair summary describing both people, is not granted to any client role.
- `supabase/tests/rls_proof.sql` signs in as each partner and attacks the policies. It runs 21 assertions, including 5 for the nightly tables. Run it with `npm run db:proof`.

## 8. API

Each route is one action. For inputs, outputs and invariants, see `docs/ontology/README.md`.

| Route | Caller | Purpose |
|---|---|---|
| `POST /api/demo/login` | public | Demo sign-in as Avery or Sam |
| `GET/POST /api/connection` | user | Connection status / create an invite code |
| `POST /api/connection/join` | user | Join with an invite code |
| `POST /api/checkin` | user | Check in, with an instant reply |
| `POST /api/transcribe` | user | Audio to text |
| `GET /api/today` | user | Home screen data |
| `GET /api/entries` | user | Your own entries, with `ai_summary` |
| `GET /api/feedback/latest`, `GET /api/feedback` | user | Your nightly feedback |
| `POST /api/feedback/run` | user (demo) | Run tonight's analysis now |
| `GET /api/cron/nightly` | cron | Nightly sweep |
| `POST /api/admin/analyze` | admin | Run analysis on demand |

Errors always use one format: `{ "error", "code", "recoverable" }`.

## 9. Configuration

`frontend/.env.example` documents every variable. The ones for the nightly agent:

- `GEMINI_API_KEY`, with `LLM_PROVIDER=gemini`. If no provider has a key, everything runs on the mock.
- `CRON_SECRET` and `ADMIN_TOKEN`. If either is unset, its route refuses every call.
- `NIGHTLY_TARGET` (`previous_day` or `same_day`), `AGENT_HISTORY_DAYS`, and `AGENT_USE_TOOLS`.

## 10. Local development

```bash
cd frontend
npm install
supabase start                 # local Postgres + Auth + Realtime in Docker, applies migrations
# put the printed API URL, anon key and service role key in .env.local (see .env.example)
npm run dev
```

| Check | Command |
|---|---|
| Unit and contract tests (ontology vs SQL, nightly pipeline, policy, route wrapper) | `npm test` |
| Policy self-test | `npm run contract:test` |
| RLS attack proof against the local database | `npm run db:proof` |
| Types / lint / production build | `npm run typecheck` · `npm run lint` · `npm run build` |
| Regenerate ontology docs | `npm run ontology:docs` |
| API without the frontend | Import `postman/*.json`, then run the folders in order |

## 11. Open items

- Migration `0002_nightly_agent.sql` has been applied locally only. Run `npm run db:migrate` against the hosted Supabase project before deploying.
- Set `CRON_SECRET`, `ADMIN_TOKEN` and `GEMINI_API_KEY` in Vercel.
- Rotate the Supabase service-role key and database password that were shared in plaintext.
- Keyword search could later be replaced with embedding search behind the same tool.
- Problems that were already in the code before this change: `next build` warns that `middleware.ts` should be renamed to `proxy.ts`, and `npm run lint` reports one error in `src/app/pair/page.tsx`.
