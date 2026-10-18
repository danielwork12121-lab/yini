/**
 * Server-side env access. Importing this from a client component is a build error
 * waiting to happen, which is the point — nothing here is public.
 */
import 'server-only';

function opt(k: string): string | null {
  const v = process.env[k];
  return v && v.trim() ? v.trim() : null;
}
function req(k: string): string {
  const v = opt(k);
  if (!v) throw new Error(`Missing required env var ${k}. Copy .env.example to .env.local.`);
  return v;
}

export const env = {
  /** Non-throwing, so first run before any keys shows a setup screen, not a 500. */
  isSupabaseConfigured: () =>
    Boolean(opt('NEXT_PUBLIC_SUPABASE_URL') && opt('NEXT_PUBLIC_SUPABASE_ANON_KEY') && opt('SUPABASE_SERVICE_ROLE_KEY')),

  supabaseUrl: () => req('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => req('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: () => req('SUPABASE_SERVICE_ROLE_KEY'),

  anthropicKey: () => opt('ANTHROPIC_API_KEY'),
  openaiKey: () => opt('OPENAI_API_KEY'),
  geminiKey: () => opt('GEMINI_API_KEY'),

  hasKeyFor(p: 'anthropic' | 'openai' | 'gemini' | 'mock'): boolean {
    return p === 'mock' ? true
      : p === 'anthropic' ? Boolean(this.anthropicKey())
      : p === 'openai' ? Boolean(this.openaiKey())
      : Boolean(this.geminiKey());
  },

  /**
   * Resolution order: explicit LLM_PROVIDER, else the first provider with a key,
   * else 'mock'. The mock keeps the whole vertical path runnable with no key at
   * all — useful tonight, and a real fallback if the venue wifi dies mid-demo.
   */
  llmProvider(): 'anthropic' | 'openai' | 'gemini' | 'mock' {
    const explicit = opt('LLM_PROVIDER') as 'anthropic' | 'openai' | 'gemini' | 'mock' | null;
    // A named provider with no key would throw on every call and silently fall
    // back anyway, one failed round-trip at a time. Degrade up front instead.
    if (explicit === 'mock') return 'mock';
    if (explicit && this.hasKeyFor(explicit)) return explicit;
    if (this.geminiKey()) return 'gemini';
    if (this.anthropicKey()) return 'anthropic';
    if (this.openaiKey()) return 'openai';
    return 'mock';
  },

  /**
   * The attacker in the leak check. Deliberately a DIFFERENT provider from the
   * writer when one is available — an attacker sharing the writer's weights shares
   * its blind spots, and the measured leak rate comes out flattering and wrong.
   */
  leakCheckProvider(): 'anthropic' | 'openai' | 'gemini' | 'mock' {
    const explicit = opt('LEAKCHECK_PROVIDER') as 'anthropic' | 'openai' | 'gemini' | 'mock' | null;
    if (explicit === 'mock') return 'mock';
    if (explicit && this.hasKeyFor(explicit)) return explicit;
    const writer = this.llmProvider();
    const others = (['openai', 'anthropic', 'gemini'] as const)
      .filter((p) => p !== writer)
      .filter((p) => (p === 'openai' ? this.openaiKey() : p === 'anthropic' ? this.anthropicKey() : this.geminiKey()));
    return others[0] ?? writer;
  },

  leakCheckEnabled: () => opt('LEAKCHECK_ENABLED') !== 'false',

  /** `x-admin-token` for POST /api/admin/analyze. Unset means the route refuses everyone. */
  adminToken: () => opt('ADMIN_TOKEN'),
  /** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Unset means the cron route refuses. */
  cronSecret: () => opt('CRON_SECRET'),
  /** Which day the nightly sweep analyses. See `nightlyTargetDay`. */
  nightlyTarget: (): 'previous_day' | 'same_day' =>
    opt('NIGHTLY_TARGET') === 'same_day' ? 'same_day' : 'previous_day',
  /** How many earlier days of ai_summary lines go into the agent's prompt. */
  agentHistoryDays: () => Math.min(30, Math.max(0, Number(opt('AGENT_HISTORY_DAYS') ?? 7) || 7)),
  /** Gemini only: let the agent call its read tools before composing. */
  agentUseTools: () => opt('AGENT_USE_TOOLS') !== 'false',
  contextSignalEnabled: () => opt('CONTEXT_SIGNAL_ENABLED') !== 'false',
  demoMode: () => process.env.NEXT_PUBLIC_DEMO_MODE === 'true',

  model(kind: 'classify' | 'compose'): string {
    const p = this.llmProvider();
    if (p === 'anthropic') {
      return opt(kind === 'classify' ? 'ANTHROPIC_MODEL_CLASSIFY' : 'ANTHROPIC_MODEL_COMPOSE')
        ?? (kind === 'classify' ? 'claude-haiku-4-5' : 'claude-sonnet-4-5');
    }
    if (p === 'openai') {
      return opt(kind === 'classify' ? 'OPENAI_MODEL_CLASSIFY' : 'OPENAI_MODEL_COMPOSE')
        ?? (kind === 'classify' ? 'gpt-4.1-mini' : 'gpt-4.1');
    }
    if (p === 'gemini') {
      return opt(kind === 'classify' ? 'GEMINI_MODEL_CLASSIFY' : 'GEMINI_MODEL_COMPOSE')
        ?? (kind === 'classify' ? 'gemini-2.5-flash' : 'gemini-2.5-flash');
    }
    return 'mock';
  },
};
