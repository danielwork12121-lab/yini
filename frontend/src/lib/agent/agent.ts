/**
 * Production wiring for the nightly agent: which model runs, whether it gets tools,
 * and the adversarial leak check. `nightly.ts` stays free of env and I/O.
 */
import 'server-only';
import { FeedbackForSchema, NightlyOutputSchema, SAFE_BULLETS, SAFE_HEADLINE } from '@/contract';
import { env } from '@/lib/env';
import { generateJSON } from '@/lib/llm/provider';
import { leakCheckAndRewrite } from '@/lib/leakcheck';
import { COMPOSE_INSTRUCTIONS, GATHER_INSTRUCTIONS, NIGHTLY_SYSTEM, renderNightlyInput } from './prompts';
import { geminiGather } from './gemini';
import { mockNightly } from './mock';
import type { NightlyDeps } from './nightly';

export function productionNightlyDeps(): NightlyDeps {
  const provider = env.llmProvider();
  const model = env.model('compose');
  const label = provider === 'mock' ? 'mock' : `${provider}:${model}`;

  return {
    historyDays: env.agentHistoryDays(),
    modelLabel: label,

    async agent(input, tools) {
      if (provider === 'mock') return { output: mockNightly(input), model: 'mock', toolCalls: 0 };
      const rendered = renderNightlyInput(input);

      let notes = '';
      let toolCalls = 0;
      if (provider === 'gemini' && env.agentUseTools()) {
        try {
          ({ notes, toolCalls } = await geminiGather({
            model, system: NIGHTLY_SYSTEM, prompt: `${rendered}\n\n${GATHER_INSTRUCTIONS}`, tools,
          }));
        } catch (e) {
          // Tools are an enhancement. A failed gather composes from today's memory alone.
          console.warn('[nightly] gather failed, composing without notes:', (e as Error).message);
        }
      }

      const output = await generateJSON({
        schema: NightlyOutputSchema, kind: 'compose', system: NIGHTLY_SYSTEM,
        user: `${rendered}\n\nWORKING NOTES:\n${notes || '(none)'}\n\n${COMPOSE_INSTRUCTIONS}`,
        mockFn: () => mockNightly(input),
      }).catch((e) => {
        // A night that fails leaves Grow empty. A plainer night is a better outcome than none.
        console.error('[nightly] model output unusable, using the keyless fallback:', (e as Error).message);
        return null;
      });
      return output
        ? { output, model: label, toolCalls }
        : { output: mockNightly(input), model: 'mock-fallback', toolCalls };
    },

    async adversarial(feedback) {
      // The mock attacker flags every capitalised word, which would fail every
      // sentence. With no real model there is nothing adversarial to run.
      if (provider === 'mock' || !env.leakCheckEnabled()) return { feedback, verdict: 'skipped' };
      const checked = await leakCheckAndRewrite(feedback.bullets.join('\n'), []);
      if (checked.dropped) return { feedback: { headline: SAFE_HEADLINE, bullets: [...SAFE_BULLETS] }, verdict: checked.result.verdict };
      if (checked.rewrites === 0) return { feedback, verdict: checked.result.verdict };
      const rewritten = FeedbackForSchema.safeParse({
        headline: feedback.headline,
        bullets: checked.text.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).slice(0, 5),
      });
      return {
        feedback: rewritten.success ? rewritten.data : { headline: SAFE_HEADLINE, bullets: [...SAFE_BULLETS] },
        verdict: checked.result.verdict,
      };
    },
  };
}
