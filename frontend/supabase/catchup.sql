-- Yini catch-up: safe to run any number of times, on any database.
-- Creates whatever 0002_nightly_agent.sql, 0003_app_clock.sql and 0004_grow_done.sql would have created,
-- and skips whatever already exists. Existing data is never touched.

alter table public.entries
  add column if not exists ai_summary text check (ai_summary is null or length(ai_summary) <= 600);

create table if not exists public.analysis_runs (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  local_date    date not null,
  status        text not null check (status in ('running','done','skipped','failed')),
  model         text,
  pair_summary  text check (pair_summary is null or length(pair_summary) <= 1200),
  tool_calls    integer not null default 0 check (tool_calls >= 0),
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  unique (connection_id, local_date)
);
create index if not exists analysis_runs_conn_date_idx on public.analysis_runs (connection_id, local_date desc);

create table if not exists public.daily_feedback (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.analysis_runs(id) on delete cascade,
  connection_id uuid not null references public.connections(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  local_date    date not null,
  headline      text not null check (length(headline) between 1 and 160),
  bullets       text[] not null check (cardinality(bullets) between 1 and 5),
  leak_dropped  integer not null default 0 check (leak_dropped >= 0),
  leak_verdict  text not null default 'skipped' check (leak_verdict in ('pass','fail','skipped','error')),
  created_at    timestamptz not null default now(),
  unique (recipient_id, connection_id, local_date)
);
create index if not exists daily_feedback_recipient_idx on public.daily_feedback (recipient_id, local_date desc);

alter table public.analysis_runs  enable row level security;
alter table public.daily_feedback enable row level security;
drop policy if exists daily_feedback_select on public.daily_feedback;
create policy daily_feedback_select on public.daily_feedback for select using (recipient_id = (select auth.uid()));
revoke all on public.analysis_runs, public.daily_feedback from anon, authenticated;
grant select on public.daily_feedback to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_feedback') then
    alter publication supabase_realtime add table public.daily_feedback;
  end if;
end $$;

create table if not exists public.app_clock (
  id         smallint primary key default 1 check (id = 1),
  day_offset integer not null default 0 check (day_offset between -400 and 400),
  updated_at timestamptz not null default now()
);
insert into public.app_clock (id, day_offset) values (1, 0) on conflict (id) do nothing;
alter table public.app_clock enable row level security;
revoke all on public.app_clock from anon, authenticated;

create table if not exists public.grow_done (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.connections(id) on delete cascade,
  body_text     text not null check (length(body_text) between 1 and 900),
  done_at       timestamptz not null default now(),
  unique (recipient_id, body_text)
);
create index if not exists grow_done_recipient_idx on public.grow_done (recipient_id, done_at desc);
alter table public.grow_done enable row level security;
revoke all on public.grow_done from anon, authenticated;

-- Tell the API to notice the new tables right away.
notify pgrst, 'reload schema';

select 'ok' as catchup,
  (select count(*) from information_schema.tables where table_schema='public' and table_name in ('analysis_runs','daily_feedback','app_clock','grow_done')) as tables_present_of_4;
