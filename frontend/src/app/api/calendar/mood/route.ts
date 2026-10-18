import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { DAY_MOOD_EMOJI, DAY_MOOD_FACE, decodeDayNote, encodeDayNote } from '@/lib/calendar';

/** Change a day's face. Through the user's own client, so RLS means it can only be their own day. */
export const POST = actionRoute(actionTypes.setDayMood, async ({ input, supabase }) => {
  const { data: day, error } = await supabase.from('mood_days').select('mood_face, note')
    .eq('local_date', input.local_date).maybeSingle();
  if (error) throw new ActionError('server_error', error.message, 500);
  if (!day) throw new ActionError('not_found', 'There is no check-in on that day', 404);

  const note = decodeDayNote(day.note, day.mood_face);
  const next = { ...note, emoji: DAY_MOOD_EMOJI[input.mood], by: 'you' as const };
  const up = await supabase.from('mood_days')
    .update({ mood_face: DAY_MOOD_FACE[input.mood], source: 'self', note: encodeDayNote(next) })
    .eq('local_date', input.local_date);
  if (up.error) throw new ActionError('server_error', up.error.message, 500);
  return { local_date: input.local_date, mood: input.mood, mood_by: 'you' as const };
});
