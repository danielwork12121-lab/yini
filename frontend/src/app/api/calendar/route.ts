import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import type { GrowOutcome } from '@/contract';
import { decodeDayNote, moodOfDay } from '@/lib/calendar';
import { createAdminSupabase } from '@/lib/supabase/admin';

/** First day of the month after `month` (YYYY-MM), as YYYY-MM-DD. */
function nextMonthStart(month: string) {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

/** Your own calendar. The user's client, so RLS (author_id = auth.uid()) does the filtering. */
export const GET = actionRoute(actionTypes.getCalendar, async ({ input, supabase, user }) => {
  const from = `${input.month}-01`, to = nextMonthStart(input.month);

  const [{ data: days, error: dayErr }, { data: entries, error: entryErr }, grow] = await Promise.all([
    supabase.from('mood_days').select('local_date, mood_face, note').gte('local_date', from).lt('local_date', to),
    supabase.from('entries').select('id, local_date, raw_text, input_mode, created_at')
      .gte('local_date', from).lt('local_date', to).order('created_at', { ascending: true }),
    // Little steps you did, from Grow. Missing before the Grow update is applied: the calendar still opens.
    createAdminSupabase().from('grow_done').select('body_text, outcome, done_on')
      .eq('recipient_id', user.id).eq('status', 'done').gte('done_on', from).lt('done_on', to).order('done_at', { ascending: true }),
  ]);
  if (dayErr || entryErr) throw new ActionError('server_error', (dayErr ?? entryErr)!.message, 500);

  const byDate = new Map<string, { id: string; text: string; input_mode: 'voice' | 'text'; created_at: string }[]>();
  for (const e of entries ?? []) {
    const list = byDate.get(e.local_date) ?? [];
    list.push({ id: e.id, text: e.raw_text, input_mode: e.input_mode, created_at: e.created_at });
    byDate.set(e.local_date, list);
  }

  const growByDate = new Map<string, { text: string; outcome: GrowOutcome | null }[]>();
  for (const g of grow.error ? [] : grow.data ?? []) {
    const list = growByDate.get(g.done_on as string) ?? [];
    list.push({ text: g.body_text, outcome: (g.outcome as GrowOutcome | null) ?? null });
    growByDate.set(g.done_on as string, list);
  }

  return {
    month: input.month,
    days: (days ?? []).map((d) => {
      const note = decodeDayNote(d.note, d.mood_face);
      return {
        local_date: d.local_date, mood_face: d.mood_face,
        emoji: note.emoji, mood: moodOfDay(note.emoji, d.mood_face), mood_by: note.by === 'you' ? 'you' as const : 'yini' as const,
        headline: note.headline, jots: note.jots, grow: growByDate.get(d.local_date) ?? [],
        entries: byDate.get(d.local_date) ?? [],
      };
    }).sort((a, b) => a.local_date.localeCompare(b.local_date)),
  };
});
