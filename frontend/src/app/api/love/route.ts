import { randomUUID } from 'node:crypto';
import { actionTypes } from '@/ontology';
import { actionRoute, ActionError } from '@/lib/http/action-route';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getConnectionStatus } from '@/lib/connection-status';
import { LOVE_BUCKET, LOVE_COLUMNS, LOVE_MAX_AUDIO_BYTES, LOVE_MAX_VOICE_MS, toLoveViews, type LoveRow } from '@/lib/love';
import type { LoveNotesResponse, LoveSendResponse } from '@/contract';

export const dynamic = 'force-dynamic';

/** What your person sent you, and what you sent them. Opening it marks the new ones seen. */
export const GET = actionRoute(actionTypes.getLoveNotes, async ({ user }): Promise<LoveNotesResponse> => {
  const db = createAdminSupabase();
  const [got, sent, status] = await Promise.all([
    db.from('love_notes').select(LOVE_COLUMNS).eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100),
    db.from('love_notes').select(LOVE_COLUMNS).eq('sender_id', user.id).order('created_at', { ascending: false }).limit(100),
    getConnectionStatus(user.id),
  ]);
  // Before the Love Notes update is applied the page still opens, with nothing in it.
  if (got.error || sent.error) {
    console.error('[love] could not read love_notes:', (got.error ?? sent.error)!.message);
    return { partner_display_name: status.partner_display_name ?? 'Your person', received: [], sent: [] };
  }
  const received = await toLoveViews(db, (got.data ?? []) as LoveRow[], { received: true });
  const mine = await toLoveViews(db, (sent.data ?? []) as LoveRow[], { received: false });

  const fresh = (got.data ?? []).filter((r) => r.seen_at === null).map((r) => r.id);
  if (fresh.length) await db.from('love_notes').update({ seen_at: new Date().toISOString() }).in('id', fresh).eq('recipient_id', user.id);

  return { partner_display_name: status.partner_display_name ?? 'Your person', received, sent: mine };
});

/** Send your person a note, or a voice note with its words. Goes to them exactly as you confirmed it. */
export const POST = actionRoute(actionTypes.sendLoveNote, async ({ input, user }): Promise<LoveSendResponse> => {
  const db = createAdminSupabase();
  const body = input.body.trim();
  const title = input.title?.trim() || null;
  const audio = input.audio && input.audio.size > 0 ? input.audio : undefined;
  if (!body && !audio) throw new ActionError('invalid_input', 'Write something or record something first', 400);
  if (audio && audio.size > LOVE_MAX_AUDIO_BYTES) throw new ActionError('invalid_input', 'That recording is too long. Keep it under three minutes.', 400);
  if (audio && input.duration_ms > LOVE_MAX_VOICE_MS + 5_000) throw new ActionError('invalid_input', 'That recording is too long. Keep it under three minutes.', 400);

  // The recipient is always the other person in your connection. It cannot be aimed anywhere else.
  const { data: me } = await db.from('profiles').select('default_connection_id').eq('id', user.id).single();
  const connectionId = me?.default_connection_id;
  if (!connectionId) throw new ActionError('no_connection', 'Not connected yet', 400, false);
  const { data: members } = await db.from('connection_members').select('user_id').eq('connection_id', connectionId);
  const recipient = (members ?? []).find((m) => m.user_id !== user.id)?.user_id as string | undefined;
  if (!recipient) throw new ActionError('no_connection', 'Your person has not joined yet', 400, false);

  let voicePath: string | null = null;
  if (audio) {
    const ext = audio.type.includes('mp4') || audio.type.includes('aac') ? 'm4a' : audio.type.includes('wav') ? 'wav' : 'webm';
    voicePath = `${connectionId}/${randomUUID()}.${ext}`;
    const up = await db.storage.from(LOVE_BUCKET).upload(voicePath, audio, { contentType: audio.type || 'audio/webm' });
    if (up.error) throw new ActionError('server_error', `Could not save the recording: ${up.error.message}`, 500);
  }

  const { data, error } = await db.from('love_notes').insert({
    connection_id: connectionId, sender_id: user.id, recipient_id: recipient,
    title, body, voice_path: voicePath, voice_ms: audio ? input.duration_ms : null,
  }).select(LOVE_COLUMNS).single();
  if (error || !data) {
    if (voicePath) await db.storage.from(LOVE_BUCKET).remove([voicePath]);
    throw new ActionError('server_error', `Could not send it: ${error?.message ?? 'unknown'}`, 500);
  }
  const [note] = await toLoveViews(db, [data as LoveRow], { received: false });
  return { note };
});
