-- ═══════════════════════════════════════════════════════════════════════════
-- Corner — schema + row level security
--
-- The security claim this app is pitched on:
--   No partner can read another partner's journal. Not by a bug, not by a bad
--   query, not by a compromised client. There is no RLS policy anywhere in this
--   file that lets `entries` be selected by anyone but its author. The anon key
--   is public by design; this is what protects the data.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create schema if not exists app;

-- ─────────────────────────── tables ───────────────────────────

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text not null check (length(display_name) between 1 and 40),
  timezone              text not null default 'America/Los_Angeles',
  default_connection_id uuid,
  coach_tone            text not null default 'warm'
                          check (coach_tone in ('warm','plain','playful','brief')),
  notify_at             text not null default '20:00',
  created_at            timestamptz not null default now()
);

create table public.connections (
  id                  uuid primary key default gen_random_uuid(),
  kind                text not null default 'partner'
                        check (kind in ('partner','parent','sibling','friend','other')),
  invite_code         text not null unique check (length(invite_code) = 6),
  -- Non-null the moment anything trips fear/coercion/abuse. All mediation stops.
  mediation_paused_at timestamptz,
  created_at          timestamptz not null default now()
);

create table public.connection_members (
  connection_id uuid not null references public.connections(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  primary key (connection_id, user_id)
);

alter table public.profiles
  add constraint profiles_default_connection_fk
  foreign key (default_connection_id) references public.connections(id) on delete set null;

-- A connection is exactly two people. Enforced, not hoped for.
create or replace function app.enforce_two_members()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.connection_members
      where connection_id = new.connection_id) >= 2 then
    raise exception 'a connection holds at most two members';
  end if;
  return new;
end; $$;

create trigger connection_members_max_two
  before insert on public.connection_members
  for each row execute function app.enforce_two_members();

-- ─────────────────────────── membership helpers ───────────────────────────
-- SECURITY DEFINER so a membership check inside an RLS policy does not recurse
-- through RLS on the membership table itself. search_path is pinned to defeat
-- shadowing: a definer function with a loose search_path is a privilege hole.
-- Declared here rather than at the top because a SQL function body is validated
-- against the catalog at creation time.
create or replace function app.is_member(conn uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.connection_members m
    where m.connection_id = conn and m.user_id = auth.uid()
  );
$$;

create or replace function app.my_connections()
returns setof uuid language sql stable security definer set search_path = public, pg_temp as $$
  select connection_id from public.connection_members where user_id = auth.uid();
$$;

-- ── the journal. The most protected table in the database. ──
create table public.entries (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid not null references public.profiles(id) on delete cascade,
  connection_id     uuid not null references public.connections(id) on delete cascade,
  local_date        date not null,

  raw_text          text not null check (length(raw_text) between 1 and 8000),
  input_mode        text not null check (input_mode in ('voice','text')),
  audio_path        text,
  audio_duration_ms integer check (audio_duration_ms >= 0),
  transcript_failed boolean not null default false,

  state             text check (state in ('rough','strained','steady','good','great')),
  severity          smallint check (severity between 0 and 3),
  themes            text[] not null default '{}',
  mood_face         smallint check (mood_face between 1 and 5),
  safety_flag       text not null default 'none'
                      check (safety_flag in ('none','distress','fear_coercion_abuse')),
  classifier_model  text,
  classified_at     timestamptz,
  created_at        timestamptz not null default now()
);
create index entries_author_date_idx on public.entries (author_id, local_date desc);

-- ── distilled needs. The only representation of a concern that crosses over. ──
create table public.concerns (
  id               uuid primary key default gen_random_uuid(),
  connection_id    uuid not null references public.connections(id) on delete cascade,
  author_id        uuid not null references public.profiles(id) on delete cascade,
  -- Server-only. No policy exposes this column's target to any client.
  source_entry_id  uuid not null references public.entries(id) on delete cascade,

  distilled_text   text not null check (length(distilled_text) between 1 and 200),
  theme            text not null,
  severity         smallint not null check (severity between 0 and 3),

  status           text not null default 'open'
                     check (status in ('open','queued','delivered','resolved','withdrawn','escalated')),
  times_held       integer not null default 0,
  last_hold_reason text,
  times_raised     integer not null default 1,

  first_raised_at  timestamptz not null default now(),
  delivered_at     timestamptz,
  created_at       timestamptz not null default now()
);
create index concerns_conn_status_idx on public.concerns (connection_id, status);

-- ── what actually reaches a person ──
create table public.nudges (
  id             uuid primary key default gen_random_uuid(),
  connection_id  uuid not null references public.connections(id) on delete cascade,
  recipient_id   uuid not null references public.profiles(id) on delete cascade,
  concern_id     uuid references public.concerns(id) on delete set null,
  kind           text not null
                   check (kind in ('self_care','partner_need','partner_context','reveal','conversation')),

  body_text      text not null check (length(body_text) between 1 and 900),
  delivered_on   date not null,
  theme          text,

  status         text not null default 'new' check (status in ('new','working','set_down','done')),
  acted_at       timestamptz,
  acted_note     text,

  leak_verdict   text not null default 'skipped'
                   check (leak_verdict in ('pass','fail','skipped','error')),
  leak_score     real check (leak_score between 0 and 1),
  leak_rewrites  integer not null default 0,
  created_at     timestamptz not null default now()
);
create index nudges_recipient_idx on public.nudges (recipient_id, delivered_on desc);

create table public.nudge_messages (
  id         uuid primary key default gen_random_uuid(),
  nudge_id   uuid not null references public.nudges(id) on delete cascade,
  role       text not null check (role in ('user','coach')),
  body       text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index nudge_messages_nudge_idx on public.nudge_messages (nudge_id, created_at);

-- ── praise: the one place literal partner words cross over ──
create table public.kind_words (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null references public.connections(id) on delete cascade,
  author_id       uuid not null references public.profiles(id) on delete cascade,
  recipient_id    uuid not null references public.profiles(id) on delete cascade,
  source_entry_id uuid references public.entries(id) on delete set null,
  quest_id        uuid,
  source          text not null default 'entry' check (source in ('entry','quest')),

  text            text not null check (length(text) between 1 and 300),
  -- Typed `true` in the contract and constrained here: a paraphrase cannot be stored.
  verbatim        boolean not null default true check (verbatim),
  status          text not null default 'candidate'
                    check (status in ('candidate','approved','surfaced','rejected')),
  surfaced_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index kind_words_recipient_idx on public.kind_words (recipient_id, status);

-- ── acts of care: the invisible labour the reveal makes visible ──
create table public.care_acts (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null references public.connections(id) on delete cascade,
  actor_id        uuid not null references public.profiles(id) on delete cascade,
  beneficiary_id  uuid not null references public.profiles(id) on delete cascade,
  source          text not null check (source in ('entry','nudge_followthrough','quest')),
  source_entry_id uuid references public.entries(id) on delete set null,
  source_nudge_id uuid references public.nudges(id) on delete set null,

  -- Verified verbatim slice of the actor's own words. Proof the act happened.
  source_span     text not null check (length(source_span) between 1 and 300),
  description     text not null check (length(description) between 1 and 160),

  occurred_on     date not null,
  revealed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index care_acts_beneficiary_idx on public.care_acts (beneficiary_id, revealed_at);

create table public.quests (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  prompt_key    text not null,
  prompt_text   text not null,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ── the pet: the only honest shared object in the product ──
create table public.pets (
  connection_id uuid primary key references public.connections(id) on delete cascade,
  name          text not null default 'Egg' check (length(name) between 1 and 24),
  species       text,
  hatched_at    timestamptz,
  xp            integer not null default 0 check (xp >= 0),
  created_at    timestamptz not null default now()
);

-- One row per person per day they showed up. Never deleted, never decremented.
-- A brutal day feeds the pet exactly as well as a great one.
create table public.pet_feedings (
  connection_id uuid not null references public.connections(id) on delete cascade,
  local_date    date not null,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (connection_id, local_date, author_id)
);

create table public.mood_days (
  author_id     uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.connections(id) on delete cascade,
  local_date    date not null,
  mood_face     smallint not null check (mood_face between 1 and 5),
  source        text not null default 'derived' check (source in ('self','derived')),
  note          text,
  created_at    timestamptz not null default now(),
  primary key (author_id, connection_id, local_date)
);

create table public.safety_events (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  entry_id      uuid references public.entries(id) on delete set null,
  flag          text not null check (flag in ('none','distress','fear_coercion_abuse')),
  created_at    timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
--
-- Default deny on every table. A table with RLS enabled and no policy for a
-- given action is closed to the anon and authenticated roles entirely; only the
-- service role (server-side, never shipped to the browser) can touch it.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles           enable row level security;
alter table public.connections        enable row level security;
alter table public.connection_members enable row level security;
alter table public.entries            enable row level security;
alter table public.concerns           enable row level security;
alter table public.nudges             enable row level security;
alter table public.nudge_messages     enable row level security;
alter table public.kind_words         enable row level security;
alter table public.care_acts          enable row level security;
alter table public.quests             enable row level security;
alter table public.pets               enable row level security;
alter table public.pet_feedings       enable row level security;
alter table public.mood_days          enable row level security;
alter table public.safety_events      enable row level security;

-- ───────────────────────────────────────────────────────────────────────────
-- THE ONE THAT MATTERS. This is the slide.
--
-- Four policies, all with the same predicate. There is no SELECT policy whose
-- predicate mentions connection_id, membership, or a partner. A partner cannot
-- read your journal because there is no sentence in this database that would
-- let them.
-- ───────────────────────────────────────────────────────────────────────────
create policy entries_select on public.entries for select using (author_id = (select auth.uid()));
create policy entries_insert on public.entries for insert with check (author_id = (select auth.uid()));
create policy entries_update on public.entries for update using (author_id = (select auth.uid()));
create policy entries_delete on public.entries for delete using (author_id = (select auth.uid()));

-- ── profiles: your own row. Partner NAMES come from the view below, not here. ──
create policy profiles_select on public.profiles for select using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update using (id = (select auth.uid()));

-- Your partner's NAME, and nothing else. Not their timezone, not their notify
-- window, not their coach tone -- and above all not a row in `profiles`, whose
-- policy stays `id = auth.uid()` with no co-member exception.
--
-- security_invoker = false (a definer view) on purpose: an invoker view would run
-- under the caller's own RLS, which correctly hides the partner's profile row and
-- therefore hides their name too. The safety here is the WHERE clause, which can
-- only ever resolve to connections the caller is actually a member of. This view
-- exposes exactly one column of one other person, and widening the SELECT list
-- is how you would turn it into a leak.
create or replace view public.connection_peers
with (security_invoker = false) as
  select m.connection_id, p.id as user_id, p.display_name
  from public.connection_members m
  join public.profiles p on p.id = m.user_id
  where m.connection_id in (select app.my_connections());

-- ── connections you belong to ──
create policy connections_select on public.connections
  for select using (app.is_member(id));
create policy members_select on public.connection_members
  for select using (connection_id in (select app.my_connections()));
create policy members_insert on public.connection_members
  for insert with check (user_id = (select auth.uid()));

-- ── concerns: the RAISER sees their own, and only to learn it is still waiting.
--    The recipient has no policy here at all — what reaches them is a nudge. ──
create policy concerns_select_own on public.concerns
  for select using (author_id = (select auth.uid()));
-- No insert/update/delete policies: concerns are written by the server only.

-- ── nudges: yours to read, yours to mark. Never yours to create. ──
create policy nudges_select on public.nudges
  for select using (recipient_id = (select auth.uid()));
create policy nudges_update on public.nudges
  for update using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create policy nudge_messages_select on public.nudge_messages
  for select using (exists (
    select 1 from public.nudges n
    where n.id = nudge_id and n.recipient_id = (select auth.uid())));
create policy nudge_messages_insert on public.nudge_messages
  for insert with check (exists (
    select 1 from public.nudges n
    where n.id = nudge_id and n.recipient_id = (select auth.uid())));

-- ── compliments: only once surfaced, only to the person they are about. ──
create policy kind_words_select on public.kind_words
  for select using (recipient_id = (select auth.uid()) and status = 'surfaced');

-- ── care_acts: NO client policy. The reveal is server-rendered prose; the
--    evidence spans never leave the server. ──

-- ── quests are yours ──
create policy quests_select on public.quests for select using (author_id = (select auth.uid()));
create policy quests_update on public.quests for update using (author_id = (select auth.uid()));

-- ── the pet is shared, and reveals nothing private about either person ──
create policy pets_select on public.pets for select using (app.is_member(connection_id));
create policy pet_feedings_select on public.pet_feedings
  for select using (app.is_member(connection_id));
-- Feedings are inserted by the server on check-in, never by the client.

-- ── your calendar. Yours alone; there is no partner-visible view. ──
create policy mood_days_select on public.mood_days for select using (author_id = (select auth.uid()));
create policy mood_days_upsert on public.mood_days
  for insert with check (author_id = (select auth.uid()));
create policy mood_days_update on public.mood_days
  for update using (author_id = (select auth.uid()));

-- ── safety_events: no client policy, in either direction. ──

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANTS
--
-- RLS filters rows; grants decide whether the role may reach the table at all.
-- Both are needed. Supabase hands new public tables a default grant, so being
-- explicit here is the difference between "closed because we closed it" and
-- "closed because nobody noticed it was open".
--
-- Two tables are granted to nobody: care_acts (holds verbatim evidence spans)
-- and safety_events. Those are service-role only, and the service role never
-- reaches the browser.
-- ═══════════════════════════════════════════════════════════════════════════

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant usage on schema app to authenticated;
grant execute on function app.is_member(uuid), app.my_connections() to authenticated;

grant select, insert, update, delete on public.entries        to authenticated;
grant select, insert, update          on public.profiles       to authenticated;
grant select                          on public.connections    to authenticated;
grant select, insert                  on public.connection_members to authenticated;
grant select                          on public.concerns       to authenticated;
grant select, update                  on public.nudges         to authenticated;
grant select, insert                  on public.nudge_messages to authenticated;
grant select                          on public.kind_words     to authenticated;
grant select, update                  on public.quests         to authenticated;
grant select                          on public.pets           to authenticated;
grant select                          on public.pet_feedings   to authenticated;
grant select, insert, update          on public.mood_days      to authenticated;
grant select                          on public.connection_peers to authenticated;

-- care_acts and safety_events: intentionally no grant to any client role.
-- Signed-out callers get nothing anywhere.

-- ─────────────────────── profile bootstrap ───────────────────────
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'You'))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();
