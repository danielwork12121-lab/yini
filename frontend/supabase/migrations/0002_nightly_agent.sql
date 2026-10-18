-- ═══════════════════════════════════════════════════════════════════════════
-- Corner — the nightly agent (ported from the Python backend)
--
--   entries.ai_summary   per-person memory, written by the nightly run
--   analysis_runs        one run per connection per day; holds the rolling
--                        pair_summary. Service role only.
--   daily_feedback       the run's output, one row per recipient. Readable by
--                        that recipient and nobody else; pushed over Realtime.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.entries
  add column ai_summary text check (ai_summary is null or length(ai_summary) <= 600);

create table public.analysis_runs (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  local_date    date not null,
  status        text not null check (status in ('running','done','skipped','failed')),
  model         text,
  -- Describes BOTH people. No client role may ever read this column.
  pair_summary  text check (pair_summary is null or length(pair_summary) <= 1200),
  tool_calls    integer not null default 0 check (tool_calls >= 0),
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  unique (connection_id, local_date)
);
create index analysis_runs_conn_date_idx on public.analysis_runs (connection_id, local_date desc);

create table public.daily_feedback (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.analysis_runs(id) on delete cascade,
  connection_id uuid not null references public.connections(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  local_date    date not null,
  headline      text not null check (length(headline) between 1 and 160),
  bullets       text[] not null check (cardinality(bullets) between 1 and 5),
  leak_dropped  integer not null default 0 check (leak_dropped >= 0),
  leak_verdict  text not null default 'skipped'
                  check (leak_verdict in ('pass','fail','skipped','error')),
  created_at    timestamptz not null default now(),
  unique (recipient_id, connection_id, local_date)
);
create index daily_feedback_recipient_idx on public.daily_feedback (recipient_id, local_date desc);

alter table public.analysis_runs  enable row level security;
alter table public.daily_feedback enable row level security;

-- Yours to read. Never yours to write; the nightly run inserts with the service role.
create policy daily_feedback_select on public.daily_feedback
  for select using (recipient_id = (select auth.uid()));

-- Supabase grants new public tables to anon/authenticated by default. Undo that,
-- then grant back exactly one privilege. analysis_runs gets nothing.
revoke all on public.analysis_runs, public.daily_feedback from anon, authenticated;
grant select on public.daily_feedback to authenticated;

-- Replaces the Python backend's SSE stream. Realtime applies the same RLS to
-- postgres_changes, so a row is only ever announced to its recipient.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.daily_feedback;
  end if;
end $$;
