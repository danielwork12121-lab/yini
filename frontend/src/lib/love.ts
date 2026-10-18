import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LoveNoteView } from '@/contract';

export const LOVE_BUCKET = 'love-voice';
export const LOVE_MAX_AUDIO_BYTES = 4 * 1024 * 1024; // the host's request limit is 4.5 MB
export const LOVE_MAX_VOICE_MS = 3 * 60_000;

export type LoveRow = {
  id: string; title: string | null; body: string; voice_path: string | null; voice_ms: number | null;
  is_favorite: boolean; seen_at: string | null; created_at: string;
};
export const LOVE_COLUMNS = 'id, title, body, voice_path, voice_ms, is_favorite, seen_at, created_at';

/** Rows to what a screen may see: voice becomes a one-hour link, and no storage path leaves the server. */
export async function toLoveViews(db: SupabaseClient, rows: LoveRow[], opts: { received: boolean }): Promise<LoveNoteView[]> {
  const paths = rows.map((r) => r.voice_path).filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data } = await db.storage.from(LOVE_BUCKET).createSignedUrls(paths, 3600);
    for (const u of data ?? []) if (u.path && u.signedUrl) urls.set(u.path, u.signedUrl);
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    created_at: r.created_at,
    voice: r.voice_path && urls.has(r.voice_path) ? { url: urls.get(r.voice_path)!, duration_ms: r.voice_ms ?? 0 } : null,
    is_favorite: opts.received ? r.is_favorite : false,
    is_new: opts.received && r.seen_at === null,
  }));
}
