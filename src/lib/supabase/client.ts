'use client';
import { createBrowserClient } from '@supabase/ssr';

/** Browser client. Holds the PUBLIC anon key — RLS is what protects the data. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
