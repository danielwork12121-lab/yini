-- ═══════════════════════════════════════════════════════════════════════════
-- Yini — the testing clock
--
--   app_clock   one row. `day_offset` moves "today" forwards for everybody at once,
--               so a demo can skip to tomorrow without waiting a real day. It is 0
--               in normal life. Service role only: the app reads it on the server and
--               hands the number to the browser through GET /api/clock.
--
-- Fast-forward a day (Supabase → SQL Editor):
--   update public.app_clock set day_offset = day_offset + 1, updated_at = now() where id = 1;
-- Back to real time:
--   update public.app_clock set day_offset = 0, updated_at = now() where id = 1;
-- ═══════════════════════════════════════════════════════════════════════════

create table public.app_clock (
  id          smallint primary key default 1 check (id = 1),
  day_offset  integer not null default 0 check (day_offset between -400 and 400),
  updated_at  timestamptz not null default now()
);

insert into public.app_clock (id, day_offset) values (1, 0) on conflict (id) do nothing;

alter table public.app_clock enable row level security;

-- Supabase grants new public tables to anon/authenticated by default. Undo that.
-- No policy and no grant: only the service role can read or move the clock.
revoke all on public.app_clock from anon, authenticated;
