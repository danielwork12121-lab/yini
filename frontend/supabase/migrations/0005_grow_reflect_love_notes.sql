-- ═══════════════════════════════════════════════════════════════════════════
-- Yini — Grow bookmarks and reflections, and Love Notes
--
-- Grow: grow_done becomes "what you did with each suggestion". One row per person per
-- suggestion they touched: bookmarked it, did it, or skipped it, and how it went.
-- Love Notes: words (and optionally a voice note) one person sends to the other on
-- purpose. Server-only like the rest: the API checks who is sender and recipient.
-- Safe to run on a database that already ran 0004; it only adds.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.grow_done add column saved boolean not null default false;
alter table public.grow_done add column status text check (status in ('done', 'skipped'));
alter table public.grow_done add column outcome text check (outcome in ('went_well', 'okay', 'hard', 'no_time', 'not_right'));
alter table public.grow_done add column reflection text check (reflection is null or length(reflection) <= 600);
alter table public.grow_done add column done_on date;
alter table public.grow_done add column updated_at timestamptz not null default now();
alter table public.grow_done alter column done_at drop not null;
alter table public.grow_done alter column done_at drop default;
update public.grow_done set status = 'done', done_on = (done_at at time zone 'utc')::date where status is null and done_at is not null;
create index grow_done_day_idx on public.grow_done (recipient_id, done_on);

create table public.love_notes (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  title         text check (title is null or length(title) <= 60),
  body          text not null check (length(body) <= 4000),
  voice_path    text,
  voice_ms      integer check (voice_ms is null or voice_ms >= 0),
  is_favorite   boolean not null default false,
  seen_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index love_notes_recipient_idx on public.love_notes (recipient_id, created_at desc);
create index love_notes_sender_idx on public.love_notes (sender_id, created_at desc);

alter table public.love_notes enable row level security;
revoke all on public.love_notes from anon, authenticated;

-- A private place for voice notes. Only the server (service role) reads or writes it,
-- and hands the recipient a short-lived link.
insert into storage.buckets (id, name, public) values ('love-voice', 'love-voice', false) on conflict (id) do nothing;

notify pgrst, 'reload schema';
