# Corner database schema

Source of truth is `backend/backend_server/app/models.py` (SQLModel). This file is a readable
mirror plus the DDL SQLAlchemy generates for SQLite. Regenerate the DDL block with
`uv run python -c` snippet at the bottom whenever models change.

## Tables

| table | one row per | purpose |
|---|---|---|
| `users` | account | `id` equals the Supabase auth user id in production. Holds `timezone`, which defines what "today" means for that person. |
| `pairs` | relationship | `user_a_id` created it, `user_b_id` joined with `invite_code` (NULL until then). The nightly job runs per pair. |
| `diary_entries` | (user, local day) | `raw_text` is the person's own words. `ai_summary` is the compact memory the agent writes back that night. Unique on (user_id, day), so same-day writes overwrite. |
| `analysis_runs` | (pair, day) | Bookkeeping for one nightly run: status, model, error, and `pair_summary`, the relationship-level memory fed to the next run. Unique on (pair_id, day) makes the job idempotent. |
| `feedback` | (recipient user, day) | What the agent wrote FOR that user: `headline` + `bullets` (JSON array). `leak_dropped` counts bullets the leak check removed. |

## Who may read what

- `diary_entries.raw_text`: the author only. Every diary route filters on the caller's id.
- `feedback`: the recipient only. It is derived from both entries but checked against the partner's raw text before being written.
- `pairs`: both members, but the API exposes only the partner's display info, never their activity.
- `analysis_runs`: admin only.

## Memory model for the agent

For a run on day D, the agent receives: both raw entries for D, each side's `ai_summary` for the
previous `AGENT_HISTORY_DAYS` days, and the latest `pair_summary` before D. Tools let it reach
further back by date or keyword. It returns new per-side summaries and a new pair summary, which
become tomorrow's memory. Nothing else is stored about the model's reasoning.

## Moving to Postgres

Set `DATABASE_URL` to a Postgres URL and add the driver (`uv add "psycopg[binary]"`). The
`bullets` JSON column maps to `JSON` on Postgres as well. Row-level security is not needed on
this schema because only the backend connects; if the frontend ever reads these tables directly
through Supabase, add policies mirroring the "who may read what" table above.

## Generated DDL (SQLite dialect)

```sql
CREATE TABLE users (
	id VARCHAR NOT NULL, 
	email VARCHAR NOT NULL, 
	display_name VARCHAR NOT NULL, 
	timezone VARCHAR NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE pairs (
	id VARCHAR NOT NULL, 
	invite_code VARCHAR NOT NULL, 
	user_a_id VARCHAR NOT NULL, 
	user_b_id VARCHAR, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_a_id) REFERENCES users (id), 
	FOREIGN KEY(user_b_id) REFERENCES users (id)
);

CREATE INDEX ix_pairs_user_b_id ON pairs (user_b_id);

CREATE UNIQUE INDEX ix_pairs_invite_code ON pairs (invite_code);

CREATE INDEX ix_pairs_user_a_id ON pairs (user_a_id);

CREATE TABLE analysis_runs (
	id VARCHAR NOT NULL, 
	pair_id VARCHAR NOT NULL, 
	day DATE NOT NULL, 
	status VARCHAR NOT NULL, 
	model VARCHAR, 
	pair_summary VARCHAR, 
	error VARCHAR, 
	started_at DATETIME NOT NULL, 
	finished_at DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_run_pair_day UNIQUE (pair_id, day), 
	FOREIGN KEY(pair_id) REFERENCES pairs (id)
);

CREATE INDEX ix_analysis_runs_pair_id ON analysis_runs (pair_id);

CREATE INDEX ix_analysis_runs_day ON analysis_runs (day);

CREATE TABLE diary_entries (
	id VARCHAR NOT NULL, 
	user_id VARCHAR NOT NULL, 
	pair_id VARCHAR NOT NULL, 
	day DATE NOT NULL, 
	raw_text VARCHAR NOT NULL, 
	mood INTEGER, 
	ai_summary VARCHAR, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_entry_user_day UNIQUE (user_id, day), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(pair_id) REFERENCES pairs (id)
);

CREATE INDEX ix_diary_entries_pair_id ON diary_entries (pair_id);

CREATE INDEX ix_diary_entries_day ON diary_entries (day);

CREATE INDEX ix_diary_entries_user_id ON diary_entries (user_id);

CREATE TABLE feedback (
	id VARCHAR NOT NULL, 
	run_id VARCHAR NOT NULL, 
	pair_id VARCHAR NOT NULL, 
	user_id VARCHAR NOT NULL, 
	day DATE NOT NULL, 
	headline VARCHAR NOT NULL, 
	bullets JSON, 
	leak_dropped INTEGER NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_feedback_user_day UNIQUE (user_id, day), 
	FOREIGN KEY(run_id) REFERENCES analysis_runs (id), 
	FOREIGN KEY(pair_id) REFERENCES pairs (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE INDEX ix_feedback_pair_id ON feedback (pair_id);

CREATE INDEX ix_feedback_day ON feedback (day);

CREATE INDEX ix_feedback_run_id ON feedback (run_id);

CREATE INDEX ix_feedback_user_id ON feedback (user_id);
```

Regenerate:

```bash
cd backend/backend_server && uv run python - <<'PY'
from sqlalchemy.schema import CreateTable; from sqlalchemy.dialects import sqlite
from app import models; from sqlmodel import SQLModel
for t in SQLModel.metadata.sorted_tables: print(str(CreateTable(t).compile(dialect=sqlite.dialect())).strip()+";")
PY
```
