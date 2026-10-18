/**
 * Yini — the daily check-in. The one vertical path.
 *
 *   save entry → classify → derive (concerns, kind words, care acts) → feed pet
 *   → decide delivery → compose → leak-check → persist nudge → render
 *
 * The ordering is load-bearing. The entry is saved BEFORE anything can fail, so a
 * model outage costs the reply but never the journal. Safety is checked before any
 * mediation work happens, so a flagged entry cannot produce a nudge even in a race.
 */
import 'server-only';
import {
  ClassifyOutputSchema, ComposeOutputSchema, ContextSignalOutputSchema, DaySummarySchema,
  decideDelivery, derivePetState, isVerbatimSpan, shouldReveal, shouldSendContextSignal,
  type CheckinRequest, type CheckinResponse, type EmotionalState, type OpenConcern, type Theme,
} from '@/contract';
import { generateJSON } from '@/lib/llm/provider';
import { mockClassify, mockCompose, mockContextSignal, mockDaySummary } from '@/lib/llm/mock';
import {
  CLASSIFY_SYSTEM, classifyUser, COMPOSE_SYSTEM, composeUser, CONTEXT_SIGNAL_SYSTEM, DAY_SUMMARY_SYSTEM, daySummaryUser,
} from '@/lib/prompts';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { leakCheckAndRewrite } from '@/lib/leakcheck';
import { env } from '@/lib/env';
import { encodeDayNote, faceEmoji, isSingleEmoji, jotBudget, noteAsSummary, normalizeJots, timeLabel, wordCount, type DayNote } from '@/lib/calendar';
import type { SupabaseClient } from '@supabase/supabase-js';

const SAFETY_RESOURCES = [
  { label: 'National Domestic Violence Hotline', detail: '1-800-799-7233, or text START to 88788. Free, 24/7.' },
  { label: 'Crisis Text Line', detail: 'Text HOME to 741741.' },
  { label: '988 Suicide & Crisis Lifeline', detail: 'Call or text 988.' },
];

export class CheckinError extends Error {
  constructor(message: string, readonly code: string, readonly recoverable = true) { super(message); }
}

export async function runCheckin(
  userClient: SupabaseClient,
  userId: string,
  req: CheckinRequest,
): Promise<CheckinResponse> {
  const db = createAdminSupabase();

  // ── who, and with whom ──────────────────────────────────────────────
  const { data: me } = await db.from('profiles').select('*').eq('id', userId).single();
  if (!me) throw new CheckinError('No profile', 'unauthenticated', false);

  const connectionId = req.connection_id ?? me.default_connection_id;
  if (!connectionId) throw new CheckinError('You are not connected with anyone yet', 'no_connection', false);

  const { data: connection } = await db.from('connections').select('*').eq('id', connectionId).single();
  const { data: members } = await db.from('connection_members')
    .select('user_id, profiles(id, display_name)').eq('connection_id', connectionId);
  const partnerRow = (members ?? []).find((m) => m.user_id !== userId);
  const partner = partnerRow?.profiles as unknown as { id: string; display_name: string } | undefined;
  if (!partner) throw new CheckinError('Your connection has no partner yet', 'no_connection', false);

  // ── 1. save the entry FIRST. Nothing below may cost the user their words. ──
  // Written through the USER's client, so this insert passes the same RLS a
  // browser would. If that policy were wrong, this line would fail.
  const { data: entry, error: entryErr } = await userClient
    .from('entries')
    .insert({
      author_id: userId, connection_id: connectionId, local_date: req.local_date,
      raw_text: req.text, input_mode: req.input_mode, audio_path: req.audio_path,
      audio_duration_ms: req.audio_duration_ms, transcript_failed: req.transcript_failed,
    })
    .select('id').single();
  if (entryErr || !entry) throw new CheckinError(`Could not save entry: ${entryErr?.message}`, 'server_error');

  // ── 2. classify. The only call that sees raw_text. ──
  const recent = await recentStates(db, userId, req.local_date, 7);

  // The calendar summarises the WHOLE day: everything said so far today plus this entry, oldest
  // first. It runs alongside classify (author-only output), so it adds no wait.
  const { data: earlier } = await db.from('entries').select('raw_text, created_at')
    .eq('author_id', userId).eq('connection_id', connectionId).eq('local_date', req.local_date)
    .neq('id', entry.id).order('created_at', { ascending: true });
  const dayEntries = [
    ...(earlier ?? []).map((e) => ({ when: timeLabel(e.created_at, me.timezone), text: e.raw_text as string })),
    { when: timeLabel(new Date().toISOString(), me.timezone), text: req.text },
  ];
  const dayText = dayEntries.map((e) => e.text).join('\n\n');
  // Say a little and the ideas stay as they are; say a lot and they are condensed to fit.
  const maxJots = jotBudget(wordCount(dayText));
  const [cls, daySummary] = await Promise.all([
    generateJSON({
      schema: ClassifyOutputSchema, kind: 'classify',
      system: CLASSIFY_SYSTEM,
      user: classifyUser({
        raw_text: req.text, recent_states: recent,
        author_display_name: me.display_name, partner_display_name: partner.display_name,
      }),
      mockFn: () => mockClassify(req.text),
    }).catch((e) => { // the entry is already safe; degrade, don't fail
      console.error('[checkin] classify fell back to the keyless mock:', (e as Error).message);
      return mockClassify(req.text);
    }),
    generateJSON({
      schema: DaySummarySchema, kind: 'classify',
      system: DAY_SUMMARY_SYSTEM,
      user: daySummaryUser({ author_display_name: me.display_name, max_jots: maxJots, entries: dayEntries }),
      mockFn: () => mockDaySummary(dayText, maxJots),
    }).catch((e) => {
      console.error('[checkin] day summary fell back to the keyless mock:', (e as Error).message);
      return mockDaySummary(dayText, maxJots);
    }),
  ]);

  await db.from('entries').update({
    state: cls.state, severity: cls.severity, themes: cls.themes, mood_face: cls.mood_face,
    safety_flag: cls.safety.flag, classifier_model: env.model('classify'), classified_at: new Date().toISOString(),
  }).eq('id', entry.id);

  // The calendar: one emoji, one overall mood and a few key points per day, private to the author.
  // Every check-in rewrites the day from everything said that day, so a rough morning and a good
  // afternoon settle into one honest mood instead of the last entry winning.
  const dayFace = daySummary.mood ?? await dayMoodFace(db, userId, connectionId, req.local_date, entry.id, cls.mood_face);
  const dayNote: DayNote = {
    emoji: isSingleEmoji(daySummary.emoji) ? daySummary.emoji.trim() : faceEmoji(dayFace),
    headline: daySummary.headline || cls.day_note,
    jots: normalizeJots(daySummary.jots.length ? daySummary.jots : maxJots ? cls.jots : [], maxJots),
  };
  await db.from('mood_days').upsert({
    author_id: userId, connection_id: connectionId, local_date: req.local_date,
    mood_face: dayFace, source: 'derived', note: encodeDayNote(dayNote),
  }, { onConflict: 'author_id,connection_id,local_date' });

  // This entry's own memory, so the nightly joint analysis can read it straight away.
  // Separate from the classification write: a missing column must never cost the calendar.
  await db.from('entries').update({
    ai_summary: noteAsSummary(dayNote),
  }).eq('id', entry.id);

  // ── 3. feeding. Participation only — a brutal day feeds it exactly as well. ──
  await db.from('pet_feedings')
    .upsert({ connection_id: connectionId, local_date: req.local_date, author_id: userId },
            { onConflict: 'connection_id,local_date,author_id' });
  const pet = await loadPetState(db, connectionId, userId, req.local_date);

  // ── 4. safety gate. Before any mediation work exists to leak. ──
  if (cls.safety.flag === 'fear_coercion_abuse') {
    await db.from('safety_events').insert({
      connection_id: connectionId, user_id: userId, entry_id: entry.id, flag: cls.safety.flag,
    });
    if (!connection?.mediation_paused_at) {
      await db.from('connections').update({ mediation_paused_at: new Date().toISOString() }).eq('id', connectionId);
    }
    return {
      entry_id: entry.id, mood_face: cls.mood_face, pet, pet_hatched_now: false,
      reply: {
        acknowledgement: 'Thank you for writing that down. I want to stop here rather than keep going as normal.',
        for_you: 'What you described is outside what this app should try to mediate, and you deserve someone who can actually help. These are free and confidential.',
        reveal: null, partner_item: null, nudge_id: null,
      },
      safety: { level: 'fear_coercion_abuse', message: 'Mediation is paused for this connection.', resources: SAFETY_RESOURCES },
    };
  }

  const mediationPaused = Boolean(connection?.mediation_paused_at);

  // ── 5. derive. Verbatim claims are verified, never trusted. ──
  if (cls.concerns.length && !mediationPaused) {
    await db.from('concerns').insert(cls.concerns.map((c) => ({
      connection_id: connectionId, author_id: userId, source_entry_id: entry.id,
      distilled_text: c.distilled_text, theme: c.theme, severity: c.severity,
    })));
  }
  const verifiedWords = cls.kind_words.filter((k) => isVerbatimSpan(k.text, req.text));
  if (verifiedWords.length) {
    await db.from('kind_words').insert(verifiedWords.map((k) => ({
      connection_id: connectionId, author_id: userId, recipient_id: partner.id,
      source_entry_id: entry.id, source: 'entry', text: k.text, verbatim: true, status: 'approved',
    })));
  }
  const verifiedActs = cls.care_acts.filter((a) => isVerbatimSpan(a.source_span, req.text));
  if (verifiedActs.length) {
    await db.from('care_acts').insert(verifiedActs.map((a) => ({
      connection_id: connectionId, actor_id: userId, beneficiary_id: partner.id,
      source: 'entry', source_entry_id: entry.id,
      source_span: a.source_span, description: a.description, occurred_on: req.local_date,
    })));
  }

  // ── 6. what do I get today? ──
  const { data: openRows } = await db.from('concerns')
    .select('id, distilled_text, theme, severity, times_held, times_raised, first_raised_at')
    .eq('connection_id', connectionId).eq('author_id', partner.id).eq('status', 'open');
  const openConcerns: OpenConcern[] = (openRows ?? []) as OpenConcern[];

  const { count: deliveredToday } = await db.from('nudges')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId).eq('delivered_on', req.local_date)
    .in('kind', ['partner_need', 'conversation']);

  const decision = decideDelivery({
    recipient_state: cls.state, recipient_recent_states: recent as EmotionalState[],
    open_concerns: openConcerns, already_delivered_today: (deliveredToday ?? 0) > 0,
    mediation_paused: mediationPaused,
  });

  const { data: unrevealed } = await db.from('care_acts')
    .select('id, description').eq('beneficiary_id', userId)
    .eq('connection_id', connectionId).is('revealed_at', null).limit(5);
  const revealDecision = shouldReveal({
    recipient_state: cls.state, recipient_previous_states: recent as EmotionalState[],
    unrevealed_act_count: mediationPaused ? 0 : (unrevealed?.length ?? 0),
  });
  const revealActs = revealDecision.reveal ? (unrevealed ?? []).map((a) => a.description) : [];

  const selected = decision.deliver && decision.concern_id
    ? openConcerns.find((c) => c.id === decision.concern_id) ?? null
    : null;

  // ── 7. compose. Has never seen the partner's raw text. ──
  const composed = await generateJSON({
    schema: ComposeOutputSchema, kind: 'compose',
    system: COMPOSE_SYSTEM,
    user: composeUser({
      recipient_display_name: me.display_name, partner_display_name: partner.display_name,
      coach_tone: me.coach_tone, own_entry_excerpt: req.text.slice(0, 1200),
      state: cls.state, themes: cls.themes,
      selected_concern: selected ? { distilled_text: selected.distilled_text, theme: selected.theme } : null,
      reveal_acts: revealActs,
    }),
    mockFn: () => mockCompose({
      state: cls.state, own_entry_excerpt: req.text,
      selected_concern: selected ? { distilled_text: selected.distilled_text } : null,
      reveal_acts: revealActs,
    }),
  }).catch(() => mockCompose({
    state: cls.state, own_entry_excerpt: req.text,
    selected_concern: selected ? { distilled_text: selected.distilled_text } : null,
    reveal_acts: revealActs,
  }));

  // ── 8. leak check anything derived from the partner's side ──
  let partnerItem = composed.partner_item;
  let nudgeId: string | null = null;
  if (partnerItem && selected) {
    const checked = await leakCheckAndRewrite(partnerItem, [partner.display_name]);
    if (checked.dropped) {
      partnerItem = null; // self-care only. A worse product, a correct outcome.
      await db.from('concerns').update({ times_held: selected.times_held + 1, last_hold_reason: 'leak_check_failed' })
        .eq('id', selected.id);
    } else {
      partnerItem = checked.text;
      const { data: n } = await db.from('nudges').insert({
        connection_id: connectionId, recipient_id: userId, concern_id: selected.id,
        kind: 'partner_need', body_text: checked.text, delivered_on: req.local_date,
        theme: selected.theme as Theme, leak_verdict: checked.result.verdict,
        leak_score: checked.result.confidence, leak_rewrites: checked.rewrites,
      }).select('id').single();
      nudgeId = n?.id ?? null;
      await db.from('concerns').update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', selected.id);
    }
  } else if (!decision.deliver && decision.concern_id && !decision.escalate) {
    // Held. Record why, so "waiting for a good moment" is true and not a guess.
    const held = openConcerns.find((c) => c.id === decision.concern_id);
    if (held) {
      await db.from('concerns')
        .update({ times_held: held.times_held + 1, last_hold_reason: decision.hold_reason })
        .eq('id', held.id);
    }
  }
  if (decision.escalate && decision.concern_id) {
    await db.from('concerns').update({ status: 'escalated' }).eq('id', decision.concern_id);
  }

  if (revealActs.length) {
    await db.from('care_acts').update({ revealed_at: new Date().toISOString() })
      .in('id', (unrevealed ?? []).map((a) => a.id));
  }

  // ── 9. tell the partner nothing except, sometimes, "go gently" ──
  await maybeSendContextSignal(db, {
    connectionId, subjectName: me.display_name, partnerId: partner.id,
    partnerName: partner.display_name, recentStates: [cls.state, ...recent] as EmotionalState[],
    localDate: req.local_date, mediationPaused,
  });

  const hatchedNow = await maybeHatch(db, connectionId, req.local_date);

  return {
    entry_id: entry.id,
    mood_face: cls.mood_face,
    reply: {
      acknowledgement: composed.acknowledgement,
      for_you: composed.for_you,
      reveal: revealActs.length ? composed.reveal : null,
      partner_item: partnerItem,
      nudge_id: nudgeId,
    },
    pet: hatchedNow ? await loadPetState(db, connectionId, userId, req.local_date) : pet,
    pet_hatched_now: hatchedNow,
    safety: cls.safety.flag === 'distress'
      ? { level: 'distress', message: 'If you want to talk to someone, these are free and confidential.', resources: SAFETY_RESOURCES }
      : null,
  };
}

/* ───────────────────────────── helpers ───────────────────────────── */

/** The day's face is the average of everything said that day, so one bad hour does not erase a good evening. */
async function dayMoodFace(db: SupabaseClient, userId: string, connectionId: string, date: string, thisEntry: string, latest: number): Promise<number> {
  const { data } = await db.from('entries').select('mood_face')
    .eq('author_id', userId).eq('connection_id', connectionId)
    .eq('local_date', date).neq('id', thisEntry).not('mood_face', 'is', null);
  const faces = [...(data ?? []).map((r) => r.mood_face as number), latest];
  return Math.min(5, Math.max(1, Math.round(faces.reduce((a, b) => a + b, 0) / faces.length)));
}

async function recentStates(db: SupabaseClient, userId: string, before: string, n: number): Promise<string[]> {
  const { data } = await db.from('entries').select('state, local_date')
    .eq('author_id', userId).lt('local_date', before)
    .order('local_date', { ascending: false }).limit(n);
  return (data ?? []).map((r) => r.state).filter(Boolean) as string[];
}

async function loadPetState(db: SupabaseClient, connectionId: string, userId: string, today: string) {
  const { data: petRow } = await db.from('pets').select('*').eq('connection_id', connectionId).single();
  const { count: total } = await db.from('pet_feedings')
    .select('*', { count: 'exact', head: true }).eq('connection_id', connectionId);
  const { data: todayRows } = await db.from('pet_feedings')
    .select('author_id').eq('connection_id', connectionId).eq('local_date', today);

  return derivePetState({
    name: petRow?.name ?? 'Egg',
    species: petRow?.species ?? null,
    hatched_at: petRow?.hatched_at ?? null,
    xp: petRow?.xp ?? 0,
    total_half_days: total ?? 0,
    you_fed_today: (todayRows ?? []).some((r) => r.author_id === userId),
    both_fed_today: (todayRows ?? []).length >= 2,
  });
}

/** The egg opens on the first day both people showed up. That is the pitch's beat. */
async function maybeHatch(db: SupabaseClient, connectionId: string, today: string): Promise<boolean> {
  const { data: petRow } = await db.from('pets').select('hatched_at').eq('connection_id', connectionId).single();
  if (petRow?.hatched_at) return false;
  const { data: rows } = await db.from('pet_feedings')
    .select('author_id').eq('connection_id', connectionId).eq('local_date', today);
  if ((rows ?? []).length < 2) return false;
  await db.from('pets').update({ hatched_at: new Date().toISOString() }).eq('connection_id', connectionId);
  return true;
}

/**
 * The only thing one person's state can ever cause on the other's screen, and the
 * guards live in `shouldSendContextSignal` where they are unit-tested. The composer
 * receives a run length and nothing else, so it cannot leak a cause it never had.
 */
async function maybeSendContextSignal(db: SupabaseClient, a: {
  connectionId: string; subjectName: string; partnerId: string; partnerName: string;
  recentStates: EmotionalState[]; localDate: string; mediationPaused: boolean;
}) {
  const { data: lastSignal } = await db.from('nudges')
    .select('delivered_on').eq('recipient_id', a.partnerId).eq('kind', 'partner_context')
    .order('delivered_on', { ascending: false }).limit(1).maybeSingle();

  const daysSince = lastSignal
    ? Math.round((Date.parse(a.localDate) - Date.parse(lastSignal.delivered_on)) / 86_400_000)
    : null;

  const run = (() => { let n = 0; for (const s of a.recentStates) { if (s !== 'rough' && s !== 'strained') break; n++; } return n; })();

  const verdict = shouldSendContextSignal({
    subject_recent_states: a.recentStates, days_since_last_signal: daysSince,
    mediation_paused: a.mediationPaused, enabled: env.contextSignalEnabled(),
  });
  if (!verdict.send) return;

  const signal = await generateJSON({
    schema: ContextSignalOutputSchema, kind: 'compose',
    system: CONTEXT_SIGNAL_SYSTEM,
    user: `Recipient: ${a.partnerName}\nPerson having the hard stretch: ${a.subjectName}\nConsecutive hard days: ${Math.min(run, 14)}`,
    mockFn: () => mockContextSignal(a.subjectName),
  }).catch(() => mockContextSignal(a.subjectName));

  const checked = await leakCheckAndRewrite(signal.body_text, []);
  if (checked.dropped) return;

  await db.from('nudges').insert({
    connection_id: a.connectionId, recipient_id: a.partnerId, kind: 'partner_context',
    body_text: checked.text, delivered_on: a.localDate,
    leak_verdict: checked.result.verdict, leak_score: checked.result.confidence,
    leak_rewrites: checked.rewrites,
  });
}
