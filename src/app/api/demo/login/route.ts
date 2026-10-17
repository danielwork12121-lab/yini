/**
 * One-tap demo sign-in.
 *
 * A judge scans a QR on their phone and must be inside the app in about five
 * seconds, looking at a connection with history — not an empty signup form.
 * Idempotently seeds two users and one connection, then signs in as the chosen one.
 *
 * Gated on NEXT_PUBLIC_DEMO_MODE. It creates real accounts with a known password,
 * so it must be off anywhere real people have data.
 */
import { NextResponse } from 'next/server';
import { DemoLoginRequestSchema } from '@/contract';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { env } from '@/lib/env';


const DEMO = {
  avery: { email: 'avery@corner.demo', name: 'Avery' },
  sam:   { email: 'sam@corner.demo',   name: 'Sam' },
} as const;
const DEMO_PASSWORD = 'corner-demo-not-a-real-account';
const INVITE = 'CORNER';

export async function POST(request: Request) {
  if (!env.demoMode()) {
    return NextResponse.json({ error: 'Demo mode is off', code: 'unauthenticated', recoverable: false }, { status: 403 });
  }
  const parsed = DemoLoginRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pick avery or sam', code: 'invalid_input', recoverable: true }, { status: 400 });
  }

  const db = createAdminSupabase();

  // users
  const ids: Record<string, string> = {};
  for (const [key, who] of Object.entries(DEMO)) {
    const { data: existing } = await db.from('profiles').select('id').eq('display_name', who.name).maybeSingle();
    if (existing) { ids[key] = existing.id; continue; }
    const { data: created, error } = await db.auth.admin.createUser({
      email: who.email, password: DEMO_PASSWORD, email_confirm: true,
      user_metadata: { display_name: who.name },
    });
    if (error || !created.user) {
      return NextResponse.json({ error: `Seed failed: ${error?.message}`, code: 'server_error', recoverable: false }, { status: 500 });
    }
    ids[key] = created.user.id;
    await db.from('profiles').upsert({ id: created.user.id, display_name: who.name });
  }

  // connection + pet
  let { data: conn } = await db.from('connections').select('id').eq('invite_code', INVITE).maybeSingle();
  if (!conn) {
    const { data: made } = await db.from('connections').insert({ invite_code: INVITE, kind: 'partner' }).select('id').single();
    conn = made!;
    await db.from('connection_members').insert([
      { connection_id: conn.id, user_id: ids.avery },
      { connection_id: conn.id, user_id: ids.sam },
    ]);
    await db.from('pets').insert({ connection_id: conn.id, name: 'Pip' });
  }
  await db.from('profiles').update({ default_connection_id: conn.id }).in('id', [ids.avery, ids.sam]);

  const supabase = await createServerSupabase();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: DEMO[parsed.data.role].email, password: DEMO_PASSWORD,
  });
  if (signInError) {
    return NextResponse.json({ error: signInError.message, code: 'server_error', recoverable: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, display_name: DEMO[parsed.data.role].name });
}
