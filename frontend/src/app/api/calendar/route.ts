import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { decodeDayNote } from '@/lib/calendar';

/** First day of the month after `month` (YYYY-MM), as YYYY-MM-DD. */
function nextMonthStart(month: string) {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

/** Your own calendar. The user's client, so RLS (author_id = auth.uid()) does the filtering. */
export const GET = actionRoute(actionTypes.getCalendar, async ({ input, supabase }) => {
  const from = `${input.month}-01`, to = nextMonthStart(input.month);

  const [{ data: days, error: dayErr }, { data: entries, error: entryErr }] = await Promise.all([
    supabase.from('mood_days').select('local_date, mood_face, note').gte('local_date', from).lt('local_date', to),
    supabase.from('entries').select('id, local_date, raw_text, input_mode, created_at')
      .gte('local_date', from).lt('local_date', to).order('created_at', { ascending: true }),
  ]);
  if (dayErr || entryErr) throw new ActionError('server_error', (dayErr ?? entryErr)!.message, 500);

  const byDate = new Map<string, { id: string; text: string; input_mode: 'voice' | 'text'; created_at: string }[]>();
  for (const e of entries ?? []) {
    const list = byDate.get(e.local_date) ?? [];
    list.push({ id: e.id, text: e.raw_text, input_mode: e.input_mode, created_at: e.created_at });
    byDate.set(e.local_date, list);
  }

  return {
    month: input.month,
    days: (days ?? []).map((d) => {
      const note = decodeDayNote(d.note, d.mood_face);
      return {
        local_date: d.local_date, mood_face: d.mood_face,
        emoji: note.emoji, headline: note.headline, jots: note.jots,
        entries: byDate.get(d.local_date) ?? [],
      };
    }).sort((a, b) => a.local_date.localeCompare(b.local_date)),
  };
});
