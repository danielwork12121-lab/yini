-- ═══════════════════════════════════════════════════════════════════════════
-- Corner — executable proof that a partner cannot read the other's journal.
--
-- Seeds two real users in one connection, then logs in as each and attacks.
-- Every assertion runs as the `authenticated` role, which is exactly the role
-- the browser holds when it uses the public anon key.
--
--   psql -d corner -f supabase/tests/rls_proof.sql
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\pset pager off

-- ─────────────────────────── seed ───────────────────────────
do $$
declare avery uuid; sam uuid; conn uuid; e_avery uuid; e_sam uuid; c1 uuid; n1 uuid; run1 uuid;
begin
  -- Scoped teardown: only this test's own fixture, never the whole table.
  delete from public.connections where invite_code = 'RLSTST';
  delete from auth.users where email in ('rls-avery@corner.test','rls-sam@corner.test');
  insert into auth.users (id, email, raw_user_meta_data)
    values (gen_random_uuid(), 'rls-avery@corner.test', '{"display_name":"RLSTEST Avery"}') returning id into avery;
  insert into auth.users (id, email, raw_user_meta_data)
    values (gen_random_uuid(), 'rls-sam@corner.test',   '{"display_name":"RLSTEST Sam"}')   returning id into sam;

  insert into public.connections (invite_code) values ('RLSTST') returning id into conn;
  insert into public.connection_members (connection_id, user_id) values (conn, avery), (conn, sam);
  update public.profiles set default_connection_id = conn;
  insert into public.pets (connection_id, name) values (conn, 'Egg');

  insert into public.entries (author_id, connection_id, local_date, raw_text, input_mode, state, mood_face)
    values (avery, conn, current_date, 'AVERY_SECRET: he forgot our anniversary dinner on the 14th', 'text', 'rough', 2)
    returning id into e_avery;
  insert into public.entries (author_id, connection_id, local_date, raw_text, input_mode, state, mood_face)
    values (sam, conn, current_date, 'SAM_SECRET: work was brutal, I am wiped', 'text', 'rough', 2)
    returning id into e_sam;

  insert into public.concerns (connection_id, author_id, source_entry_id, distilled_text, theme, severity)
    values (conn, avery, e_avery, 'would like more planned time together', 'quality_time', 2)
    returning id into c1;

  insert into public.nudges (connection_id, recipient_id, concern_id, kind, body_text, delivered_on)
    values (conn, sam, c1, 'partner_need', 'Putting one evening on the calendar this week would take pressure off you both.', current_date)
    returning id into n1;

  insert into public.kind_words (connection_id, author_id, recipient_id, source_entry_id, text, status, surfaced_at)
    values (conn, avery, sam, e_avery, 'he always makes me laugh when it is bad', 'surfaced', now());

  insert into public.care_acts (connection_id, actor_id, beneficiary_id, source, source_entry_id, source_span, description, occurred_on)
    values (conn, avery, sam, 'entry', e_avery, 'I covered dinner so he could rest', 'covered dinner', current_date);

  insert into public.mood_days (author_id, connection_id, local_date, mood_face, note)
    values (avery, conn, current_date, 2, 'A hard one.');

  insert into public.safety_events (connection_id, user_id, entry_id, flag)
    values (conn, avery, e_avery, 'distress');

  -- the nightly agent's output: one private row each, and a pair summary nobody may read
  insert into public.analysis_runs (connection_id, local_date, status, pair_summary)
    values (conn, current_date, 'done', 'PAIR_SECRET: both are stretched thin')
    returning id into run1;
  insert into public.daily_feedback (run_id, connection_id, recipient_id, local_date, headline, bullets)
    values (run1, conn, avery, current_date, 'For Avery', array['AVERY_FEEDBACK: a small thing for you']),
           (run1, conn, sam,   current_date, 'For Sam',   array['SAM_FEEDBACK: a small thing for you']);

  perform set_config('test.avery', avery::text, false);
  perform set_config('test.sam',   sam::text,   false);
end $$;

-- ─────────────────────────── harness ───────────────────────────
create or replace function pg_temp.expect(label text, as_user uuid, query text, expected text)
returns void language plpgsql as $$
declare got text;
begin
  begin
    -- Real Supabase auth.uid() reads the JWT claim off the request; a local
    -- sandbox stub reads test.uid. Set both so this file is one file.
    perform set_config('request.jwt.claim.sub', coalesce(as_user::text, ''), true);
    perform set_config('request.jwt.claims',
      case when as_user is null then '' else json_build_object('sub', as_user::text, 'role', 'authenticated')::text end, true);
    perform set_config('test.uid', coalesce(as_user::text, ''), true);
    execute 'set local role authenticated';
    execute query into got;
    got := coalesce(got, 'NULL');
  exception
    when insufficient_privilege then got := 'DENIED';
    when others then got := 'ERROR:' || SQLERRM;
  end;
  execute 'reset role';
  if got = expected then
    perform set_config('test.pass', (coalesce(nullif(current_setting('test.pass', true), ''),'0')::int + 1)::text, false);
  else
    perform set_config('test.fail', (coalesce(nullif(current_setting('test.fail', true), ''),'0')::int + 1)::text, false);
  end if;
  raise notice '%  %  (got %)',
    case when got = expected then ' ok ' else 'FAIL' end, rpad(label, 52), got;
end $$;

-- ─────────────────────────── the attack ───────────────────────────
do $$
declare avery uuid := current_setting('test.avery')::uuid;
        sam   uuid := current_setting('test.sam')::uuid;
begin
raise notice '';
raise notice '── Sam is signed in. Sam attacks Avery. ──';

perform pg_temp.expect('entries: Sam sees only his own', sam,
  'select count(*)::text from public.entries', '1');
perform pg_temp.expect('entries: Sam targets Avery''s rows directly', sam,
  format('select count(*)::text from public.entries where author_id = %L', avery), '0');
perform pg_temp.expect('entries: Sam greps for the secret string', sam,
  'select count(*)::text from public.entries where raw_text like ''AVERY_SECRET%''', '0');
perform pg_temp.expect('entries: Sam joins through his own connection', sam,
  'select count(*)::text from public.entries e join public.connection_members m on m.connection_id = e.connection_id where m.user_id = ' || quote_literal(sam), '1');

perform pg_temp.expect('concerns: Sam cannot see what Avery raised', sam,
  'select count(*)::text from public.concerns', '0');
perform pg_temp.expect('care_acts: table is ungranted entirely', sam,
  'select count(*)::text from public.care_acts', 'DENIED');
perform pg_temp.expect('safety_events: table is ungranted entirely', sam,
  'select count(*)::text from public.safety_events', 'DENIED');
perform pg_temp.expect('mood_days: Avery''s calendar is invisible', sam,
  'select count(*)::text from public.mood_days', '0');
perform pg_temp.expect('daily_feedback: Sam cannot read Avery''s feedback', sam,
  format('select count(*)::text from public.daily_feedback where recipient_id = %L', avery), '0');
perform pg_temp.expect('analysis_runs: pair summary is ungranted', sam,
  'select count(*)::text from public.analysis_runs', 'DENIED');
perform pg_temp.expect('daily_feedback: Sam cannot write feedback', sam,
  format('insert into public.daily_feedback (run_id, connection_id, recipient_id, local_date, headline, bullets) select run_id, connection_id, %L, local_date, ''x'', array[''x''] from public.daily_feedback limit 1 returning ''inserted''', avery), 'DENIED');

raise notice '';
raise notice '── What Sam is SUPPOSED to see ──';
perform pg_temp.expect('nudges: his own delivered item', sam,
  'select count(*)::text from public.nudges', '1');
perform pg_temp.expect('kind_words: surfaced praise about him', sam,
  'select count(*)::text from public.kind_words', '1');
perform pg_temp.expect('daily_feedback: his own nightly feedback', sam,
  'select bullets[1] from public.daily_feedback', 'SAM_FEEDBACK: a small thing for you');
perform pg_temp.expect('pet: the shared object', sam,
  'select count(*)::text from public.pets', '1');
perform pg_temp.expect('peers: Avery''s NAME only', sam,
  'select display_name from public.connection_peers where user_id = ' || quote_literal(avery), 'RLSTEST Avery');

raise notice '';
raise notice '── Avery''s side ──';
perform pg_temp.expect('concerns: Avery sees her own, still pending', avery,
  'select status from public.concerns', 'open');
perform pg_temp.expect('nudges: Avery sees none (it went to Sam)', avery,
  'select count(*)::text from public.nudges', '0');
perform pg_temp.expect('entries: Avery sees only her own', avery,
  'select count(*)::text from public.entries', '1');
perform pg_temp.expect('daily_feedback: Avery sees only her own', avery,
  'select headline from public.daily_feedback', 'For Avery');

raise notice '';
raise notice '── Signed out ──';
perform pg_temp.expect('anon: no entries', null,
  'select count(*)::text from public.entries', '0');
raise notice '─────────────────────────────────────────────────────────';
raise notice '%  passed, %  failed',
  coalesce(nullif(current_setting('test.pass', true), ''),'0'),
  coalesce(nullif(current_setting('test.fail', true), ''),'0');
if coalesce(nullif(current_setting('test.fail', true), ''),'0')::int > 0 then
  raise exception 'RLS PROOF FAILED';
end if;
raise notice '';
end $$;
