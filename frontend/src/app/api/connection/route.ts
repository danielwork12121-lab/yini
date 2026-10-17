import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

/** No I, O, 0 or 1 — people read these aloud to each other. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

/** GET: where am I? Drives whether the app shows /pair or /today. */
export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first', code: 'unauthenticated', recoverable: false }, { status: 401 });

  const db = createAdminSupabase();
  const { data: me } = await db.from('profiles').select('display_name, default_connection_id').eq('id', user.id).single();
  if (!me?.default_connection_id) {
    return NextResponse.json({ paired: false, display_name: me?.display_name ?? null, invite_code: null, partner_display_name: null });
  }
  const [{ data: conn }, { data: members }] = await Promise.all([
    db.from('connections').select('invite_code').eq('id', me.default_connection_id).single(),
    db.from('connection_members').select('user_id, profiles(display_name)').eq('connection_id', me.default_connection_id),
  ]);
  const partner = (members ?? []).find((m) => m.user_id !== user.id)?.profiles as unknown as { display_name: string } | undefined;
  return NextResponse.json({
    paired: Boolean(partner),
    display_name: me.display_name,
    invite_code: conn?.invite_code ?? null,
    partner_display_name: partner?.display_name ?? null,
  });
}

/** POST: start a connection and get a code to hand to the other person. */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first', code: 'unauthenticated', recoverable: false }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim().slice(0, 40) : '';

  const db = createAdminSupabase();
  if (displayName) await db.from('profiles').update({ display_name: displayName }).eq('id', user.id);

  const { data: me } = await db.from('profiles').select('default_connection_id').eq('id', user.id).single();
  if (me?.default_connection_id) {
    const { data: existing } = await db.from('connections').select('invite_code').eq('id', me.default_connection_id).single();
    return NextResponse.json({ invite_code: existing?.invite_code });
  }

  // Codes are short enough to collide; retry rather than fail the user.
  for (let attempt = 0; attempt < 5; attempt++) {
    const invite = code();
    const { data: conn, error } = await db.from('connections')
      .insert({ invite_code: invite, kind: 'partner' }).select('id, invite_code').single();
    if (error) continue;
    await db.from('connection_members').insert({ connection_id: conn.id, user_id: user.id });
    await db.from('pets').insert({ connection_id: conn.id, name: 'Egg' });
    await db.from('profiles').update({ default_connection_id: conn.id }).eq('id', user.id);
    return NextResponse.json({ invite_code: conn.invite_code });
  }
  return NextResponse.json({ error: 'Could not create a code, try again', code: 'server_error', recoverable: true }, { status: 500 });
}
