import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { AuthFlow } from '@/components/yini/AuthFlow';
import { SetupNeeded } from '@/components/SetupNeeded';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!env.isSupabaseConfigured()) return <SetupNeeded />;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/pair');
  return <AuthFlow screen="create" />;
}
