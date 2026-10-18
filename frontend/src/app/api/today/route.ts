import { derivePetState, sharedStreak, type TodayResponse } from '@/contract';
import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { appToday } from '@/lib/clock';

export const GET = actionRoute(actionTypes.getToday, async ({ user }) => {
  const db = createAdminSupabase();
  const { data: me } = await db.from('profiles').select('*').eq('id', user.id).single();
  const connectionId = me?.default_connection_id;
  if (!me || !connectionId) throw new ActionError('no_connection', 'Not connected yet', 400, false);

  const today = await appToday(me.timezone);
  const [{ data: conn }, { data: members }, { data: petRow }, { count: total }, { data: todayFeeds }, { data: entryToday }, { data: nudge }] =
    await Promise.all([
      db.from('connections').select('kind').eq('id', connectionId).single(),
      db.from('connection_members').select('user_id, profiles(display_name)').eq('connection_id', connectionId),
      db.from('pets').select('*').eq('connection_id', connectionId).single(),
      db.from('pet_feedings').select('*', { count: 'exact', head: true }).eq('connection_id', connectionId),
      db.from('pet_feedings').select('author_id').eq('connection_id', connectionId).eq('local_date', today),
      db.from('entries').select('id').eq('author_id', user.id).eq('local_date', today).maybeSingle(),
      db.from('nudges').select('id, kind, body_text, theme, delivered_on, status')
        .eq('recipient_id', user.id).eq('delivered_on', today)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

  const partner = (members ?? []).find((m) => m.user_id !== user.id)?.profiles as unknown as { display_name: string } | undefined;

  // Shared streak: days where BOTH fed the pet. It stays through yesterday while today is still open.
  const { data: allFeeds } = await db.from('pet_feedings')
    .select('local_date, author_id').eq('connection_id', connectionId)
    .order('local_date', { ascending: false }).limit(200);
  const byDate = new Map<string, Set<string>>();
  for (const f of allFeeds ?? []) {
    if (!byDate.has(f.local_date)) byDate.set(f.local_date, new Set());
    byDate.get(f.local_date)!.add(f.author_id);
  }
  const streak = sharedStreak(new Map([...byDate].map(([d, who]) => [d, who.size])), today);
  const youFed = (todayFeeds ?? []).some((r) => r.author_id === user.id);
  const partnerFed = (todayFeeds ?? []).some((r) => r.author_id !== user.id);

  const body: TodayResponse = {
    you_checked_in: Boolean(entryToday),
    local_date: today,
    display_name: me.display_name,
    partner_display_name: partner?.display_name ?? 'your partner',
    connection_kind: (conn?.kind ?? 'partner') as TodayResponse['connection_kind'],
    pet: derivePetState({
      name: petRow?.name ?? 'Egg', species: petRow?.species ?? null,
      hatched_at: petRow?.hatched_at ?? null, xp: petRow?.xp ?? 0,
      total_half_days: total ?? 0,
      you_fed_today: youFed,
      both_fed_today: (todayFeeds ?? []).length >= 2,
    }),
    today_nudge: nudge ?? null,
    shared_streak: streak,
    partner_fed_today: partnerFed,
  };
  return body;
});
