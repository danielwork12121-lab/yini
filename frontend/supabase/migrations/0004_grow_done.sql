-- ═══════════════════════════════════════════════════════════════════════════
-- Yini — Grow: things you have done
--
-- A Grow suggestion is just a line of text on a daily_feedback row, and Yini can
-- rewrite a day's lines as the day goes on. So "done" is remembered against the
-- words themselves: one row per person per suggestion they ticked off. Written and
-- read only by the API, which checks the line really is one of theirs.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.grow_done (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.connections(id) on delete cascade,
  body_text     text not null check (length(body_text) between 1 and 900),
  done_at       timestamptz not null default now(),
  unique (recipient_id, body_text)
);
create index grow_done_recipient_idx on public.grow_done (recipient_id, done_at desc);

alter table public.grow_done enable row level security;
revoke all on public.grow_done from anon, authenticated;
