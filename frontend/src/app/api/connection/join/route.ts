import { NextResponse } from 'next/server';
import { JoinRequestSchema } from '@/contract';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first', code: 'unauthenticated', recoverable: false }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = JoinRequestSchema.safeParse(
    raw && typeof raw.invite_code === 'string' ? { invite_code: raw.invite_code.trim().toUpperCase() } : raw,
  );
  if (!parsed.success) {
    return NextResponse.json({ error: 'That code should be 6 characters', code: 'invalid_input', recoverable: true }, { status: 400 });
  }

  const db = createAdminSupabase();
  const { data: conn } = await db.from('connections').select('id').eq('invite_code', parsed.data.invite_code).maybeSingle();
  if (!conn) {
    return NextResponse.json({ error: "No connection with that code. Check it with your partner.", code: 'invalid_input', recoverable: true }, { status: 404 });
  }

  const { data: members } = await db.from('connection_members').select('user_id').eq('connection_id', conn.id);
  if ((members ?? []).some((m) => m.user_id === user.id)) {
    await db.from('profiles').update({ default_connection_id: conn.id }).eq('id', user.id);
    return NextResponse.json({ ok: true, already: true });
  }
  if ((members ?? []).length >= 2) {
    return NextResponse.json({ error: 'That connection already has two people in it.', code: 'invalid_input', recoverable: false }, { status: 409 });
  }

  const body = await Promise.resolve(raw);
  const displayName = typeof body?.display_name === 'string' ? body.display_name.trim().slice(0, 40) : '';
  if (displayName) await db.from('profiles').update({ display_name: displayName }).eq('id', user.id);

  // The DB trigger also caps this at two; losing that race returns an error here.
  const { error: joinErr } = await db.from('connection_members').insert({ connection_id: conn.id, user_id: user.id });
  if (joinErr) {
    return NextResponse.json({ error: 'That connection just filled up.', code: 'invalid_input', recoverable: false }, { status: 409 });
  }
  await db.from('profiles').update({ default_connection_id: conn.id }).eq('id', user.id);
  return NextResponse.json({ ok: true });
}
